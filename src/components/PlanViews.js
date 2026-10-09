'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { SHIFTS, formatTime, localDateISO } from '@/lib/config';
import { CURRENT_SEASON, PLAN_CATEGORIES, PLAN_CATEGORY_LABELS, paceText, paceTone, planState, sessionRecords, shiftRows } from '@/lib/plan';
import { HALF, FULL } from '@/lib/plan-diagrams';
import { EvalBoard } from '@/components/EvalViews';

const fmt=v=>v?new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${v}T12:00:00`)):'—';
const canManage=role=>['owner','admin'].includes(role);
const active=s=>!['Inactivo','Retirado'].includes(s.status);
function Badge({children,tone=''}){return <span className={`badge ${tone}`}>{children}</span>}
function Empty({text}){return <div className="empty">{text}</div>}

function Timer({minutes}){
  const total=Number(minutes||0)*60;
  const [left,setLeft]=useState(total);
  const [running,setRunning]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{setLeft(total);setRunning(false)},[total]);
  useEffect(()=>{if(!running)return;ref.current=setInterval(()=>setLeft(v=>Math.max(0,v-1)),1000);return()=>clearInterval(ref.current)},[running]);
  useEffect(()=>{if(left===0&&running){setRunning(false);try{navigator.vibrate?.([220,100,220])}catch{}}},[left,running]);
  const mm=String(Math.floor(left/60)).padStart(2,'0'),ss=String(left%60).padStart(2,'0');
  return <span className={`plan-timer ${left===0?'done':''}`}><b>{mm}:{ss}</b><button type="button" onClick={()=>{if(left===0)setLeft(total);setRunning(v=>!v)}}>{running?'❚❚':'▶'}</button><button type="button" onClick={()=>{setRunning(false);setLeft(total)}}>↺</button></span>
}

function Arrow({a,color,dashed=false}){
  const [x1,y1,x2,y2]=a;return <line x1={x1*100} y1={y1*100} x2={x2*100} y2={y2*100} stroke={color} strokeWidth="1.3" strokeDasharray={dashed?'3 2':undefined} markerEnd="url(#arr)"/>
}
function Court({kind,id,caption,flip=false}){
  const spec=(kind==='half'?HALF:FULL)[id];if(!spec)return null;
  const px=x=>flip?1-x:x;
  return <figure className="plan-figure"><svg viewBox="0 0 100 64" className="plan-court" role="img" aria-label={caption}>
    <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
    <rect x="1" y="1" width="98" height="62" rx="1.5" className="court-floor"/>
    <line x1="50" y1="1" x2="50" y2="63" className="court-line"/><circle cx="50" cy="32" r="9" className="court-line"/>
    {kind==='half'?<><line x1="30" y1="1" x2="30" y2="28" className="court-line"/><line x1="70" y1="1" x2="70" y2="28" className="court-line"/><path d="M30 28 Q50 48 70 28" className="court-line"/></>:null}
    {(spec.dm||[]).map((a,i)=><Arrow key={'d'+i} a={[px(a[0]),a[1],px(a[2]),a[3]]} color="#ffaf2d"/>)}
    {(spec.mv||[]).map((a,i)=><Arrow key={'m'+i} a={[px(a[0]),a[1],px(a[2]),a[3]]} color="#78ef52"/>)}
    {(spec.ps||[]).map((a,i)=><Arrow key={'p'+i} a={[px(a[0]),a[1],px(a[2]),a[3]]} color="#e8eef6" dashed/>)}
    {(spec.dfn||[]).map((p,i)=><g key={'x'+i}><circle cx={px(p[0])*100} cy={p[1]*100} r="3.2" className="court-def"/><text x={px(p[0])*100} y={p[1]*100+1.5} textAnchor="middle" className="court-text">X</text></g>)}
    {(spec.off||[]).map((p,i)=><g key={'o'+i}><circle cx={px(p[1])*100} cy={p[2]*100} r="3.2" className="court-off"/><text x={px(p[1])*100} y={p[2]*100+1.5} textAnchor="middle" className="court-text">{p[0]}</text></g>)}
  </svg><figcaption>{caption}</figcaption></figure>
}

function SessionDetail({plan,shift,session,rows,role,students,evaluations,onBack,onOpen,onSave,onDelete,onSaveEvals}){
  const [date,setDate]=useState(localDateISO());const[rpe,setRpe]=useState('');const[notes,setNotes]=useState('');const[msg,setMsg]=useState('');const[busy,setBusy]=useState(false);const[board,setBoard]=useState(null);
  const [courtMode,setCourtMode]=useState(false);const[courtStep,setCourtStep]=useState(0);
  const block=plan.blocks?.[Number(session.m)-1];const rec=sessionRecords(rows,session.n);
  const evalMode=session.ev&&session.s===1?'athletic':session.ev&&session.s===3?'game':null;
  const evalN=session.ev?Math.max(1,Math.min(4,Math.round(Number(session.m)/3))):null;
  const tasks=session.main||[];const activeTask=tasks[courtStep]||tasks[0]||['Actividad',0,''];
  async function submit(status){setBusy(true);setMsg('');const r=await onSave({shiftId:shift.id,planCategory:plan.cat,sessionN:session.n,date,status,rpe:status==='Realizada'?rpe:'',notes});setBusy(false);setMsg(r?.ok?(status==='Realizada'?'✓ Sesión marcada como realizada':'✓ Sesión suspendida; el plan no avanzó'):(r?.error||'No se pudo guardar.'));if(r?.ok)setNotes('')}
  async function remove(id){if(!confirm('¿Eliminar este registro de la sesión?'))return;const r=await onDelete(id);if(!r?.ok)alert(r?.error||'No se pudo eliminar.')}
  const list=items=><ul className="plan-list">{(items||[]).map((x,i)=><li key={i}>{x}</li>)}</ul>;
  return <div className="view"><button className="back-btn" onClick={onBack}>← Volver al plan</button>
    <section className="profile-hero plan-hero"><div className="grow"><p className="eyebrow">SESIÓN {session.n} DE {plan.sessions.length} · {plan.cat} · {CURRENT_SEASON}</p><h2>{session.obj}</h2><div className="profile-badges"><Badge tone="info">Bloque {session.m}: {block?.name}</Badge><Badge>Semana {session.t}</Badge><Badge>{plan.total} min</Badge>{session.ev?<Badge tone="warn">Evaluación</Badge>:null}{rec.realized?<Badge tone="ok">Realizada {fmt(rec.realized.session_date)}</Badge>:<Badge>Pendiente</Badge>}</div></div><div className="plan-nav"><button className="primary court-launch" onClick={()=>{setCourtStep(0);setCourtMode(true)}}>Modo cancha</button>{session.n>1?<button className="secondary" onClick={()=>onOpen(session.n-1)}>← Anterior</button>:null}{session.n<plan.sessions.length?<button className="secondary" onClick={()=>onOpen(session.n+1)}>Siguiente →</button>:null}</div></section>
    {courtMode&&<div className="court-mode-overlay">
      <div className="court-mode-top"><div><p className="eyebrow">{plan.cat} · SESIÓN {session.n} · EJERCICIO {courtStep+1}/{tasks.length}</p><h2>{session.obj}</h2></div><button className="court-close" onClick={()=>setCourtMode(false)}>×</button></div>
      <div className="court-mode-body">
        <div className="court-mode-task"><span className="court-step-number">{courtStep+1}</span><div><small>{activeTask[1]} min</small><h3>{activeTask[0]}</h3><p>{activeTask[2]}</p></div></div>
        <div className="court-mode-timer"><Timer key={`${session.n}-${courtStep}`} minutes={activeTask[1]}/></div>
        <div className="court-mode-diagram"><Court kind={courtStep%2===0?'half':'full'} id={courtStep%2===0?session.hid:session.fid} flip={session.flip} caption={courtStep%2===0?session.hcap:session.fcap}/></div>
        <div className="court-mode-notes"><strong>Claves del entrenador</strong>{list(session.obs)}</div>
      </div>
      <div className="court-mode-nav"><button className="secondary" disabled={courtStep===0} onClick={()=>setCourtStep(x=>Math.max(0,x-1))}>← Anterior</button><button className="primary" disabled={courtStep>=tasks.length-1} onClick={()=>setCourtStep(x=>Math.min(tasks.length-1,x+1))}>Siguiente →</button></div>
    </div>}
    <div className="plan-grid"><div><section className="panel"><h3>Calentamiento</h3>{list(session.warm)}</section><section className="panel"><h3>Parte principal</h3><ol className="plan-tasks">{tasks.map(([name,min,desc],i)=><li key={i}><div className="plan-task-head"><strong>{name}</strong><span className="plan-min">{min} min</span><Timer minutes={min}/></div><p>{desc}</p></li>)}</ol></section><section className="panel"><h3>Vuelta a la calma</h3>{list(session.cool)}</section></div>
      <div><section className="panel"><h3>Diagramas</h3><Court kind="half" id={session.hid} flip={session.flip} caption={session.hcap}/><Court kind="full" id={session.fid} flip={session.flip} caption={session.fcap}/></section><section className="panel"><h3>Observaciones del entrenador</h3>{list(session.obs)}</section><section className="panel"><h3>Materiales</h3>{list(session.mat)}</section></div></div>
    {evalMode?<section className="panel"><div className="panel-title"><div><p className="eyebrow">CICLO {evalN} · SEMÁFORO</p><h3>{evalMode==='athletic'?'Evaluación atlética':'Evaluación técnico-táctica'}</h3></div></div><p className="muted">Evalúa al turno completo sin salir de la sesión. Los resultados también aparecen en la ficha individual.</p><button className="primary" onClick={()=>setBoard(evalMode)}>Evaluar {students.length} alumnos</button>{board?<EvalBoard students={students} evaluations={evaluations} evalN={evalN} mode={board} planCategory={plan.cat} onClose={()=>setBoard(null)} onSave={onSaveEvals}/>:null}</section>:null}
    <section className="panel"><div className="panel-title"><div><p className="eyebrow">REGISTRO REAL</p><h3>Registrar esta sesión</h3></div></div><div className="plan-form"><label>Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Esfuerzo percibido (RPE)<select value={rpe} onChange={e=>setRpe(e.target.value)}><option value="">Sin registrar</option>{[1,2,3,4,5,6,7,8,9,10].map(n=><option key={n} value={n}>{n}/10</option>)}</select></label><label className="full">Notas<textarea rows="3" maxLength="500" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Qué funcionó, qué ajustar, motivo si se suspendió…"/></label></div><div className="plan-actions"><button className="primary" disabled={busy} onClick={()=>submit('Realizada')}>Marcar realizada</button><button className="secondary" disabled={busy} onClick={()=>submit('Suspendida')}>Suspendida ese día</button>{msg?<span className="plan-msg">{msg}</span>:null}</div><p className="muted plan-hint">Una sesión suspendida no avanza el plan. El progreso pertenece a {CURRENT_SEASON} y al plan {plan.cat}.</p>{rec.all.length?<div className="records">{rec.all.map(r=><div key={r.id||r.session_date+r.status}><span>{fmt(r.session_date)}</span><span>{[r.rpe?`RPE ${r.rpe}/10`:null,r.notes].filter(Boolean).join(' · ')||'—'}</span><span><Badge tone={r.status==='Realizada'?'ok':'warn'}>{r.status}</Badge>{canManage(role)&&r.id?<button className="link-btn danger-text" onClick={()=>remove(r.id)}> Eliminar</button>:null}</span></div>)}</div>:null}</section>
  </div>
}

export function PlanView({data,plans,planMap,role,sel,onSave,onDelete,onSaveEvals}){
  const [shiftId,setShiftId]=useState(Number(sel?.shiftId||1));const [sessionN,setSessionN]=useState(sel?.n||null);const [block,setBlock]=useState(null);
  useEffect(()=>{if(sel?.shiftId)setShiftId(Number(sel.shiftId));if(sel?.n)setSessionN(Number(sel.n))},[sel]);
  const shift=SHIFTS.find(s=>s.id===shiftId);const cat=planMap[shiftId];const plan=plans?.[cat];const rows=shiftRows(data.planProgress,shiftId,CURRENT_SEASON,cat);const st=plan?planState(plan,rows,localDateISO()):null;const students=data.students.filter(s=>active(s)&&Number(s.shift_id)===shiftId);
  if(sessionN&&plan){const session=plan.sessions.find(s=>Number(s.n)===Number(sessionN));if(session)return <SessionDetail plan={plan} shift={shift} session={session} rows={rows} role={role} students={students} evaluations={data.evaluations||[]} onBack={()=>setSessionN(null)} onOpen={setSessionN} onSave={onSave} onDelete={onDelete} onSaveEvals={onSaveEvals}/>}
  const blocks=plan?.blocks||[];const selectedBlock=block||st?.next?.m||1;const sessions=plan?.sessions?.filter(s=>Number(s.m)===Number(selectedBlock))||[];
  return <div className="view"><header className="page-head"><div><p className="eyebrow">PLAN INTERACTIVO · {CURRENT_SEASON}</p><h2>Entrenamientos</h2><p className="muted">Sesión que toca, cronómetros, diagramas, evaluaciones y progreso real.</p></div></header>
    <div className="plan-tabs">{SHIFTS.map(sh=><button key={sh.id} className={sh.id===shiftId?'active':''} onClick={()=>{setShiftId(sh.id);setSessionN(null);setBlock(null)}}><strong>{sh.name}</strong><small>{planMap[sh.id]} · {formatTime(sh.start)}–{formatTime(sh.end)}</small></button>)}</div>
    {!plan?<section className="panel"><Empty text={`Aún no está cargado el plan ${cat}. Luis o Morita puede importarlo desde Configuración.`}/></section>:<>
      <section className="panel"><div className="panel-title"><div><p className="eyebrow">{cat} · {plan.ages||PLAN_CATEGORY_LABELS[cat]} AÑOS</p><h3>{st.complete?'Plan anual completado':st.next?`Siguiente: S${String(st.next.n).padStart(3,'0')} · ${st.next.obj}`:'Plan anual'}</h3></div><Badge tone={paceTone(st)}>{paceText(st)}</Badge></div><div className="plan-bar big"><span style={{width:`${st.total?Math.round(st.done/st.total*100):0}%`}}/></div><p className="muted">{st.done} de {st.total} realizadas · {students.length} alumnos activos en el turno.</p>{st.next?<button className="primary" onClick={()=>setSessionN(st.next.n)}>Abrir sesión que toca</button>:null}</section>
      <section className="panel"><div className="panel-title"><div><p className="eyebrow">BIBLIOTECA ANUAL</p><h3>12 bloques · 144 sesiones</h3></div></div><div className="plan-blocks">{blocks.map((b,i)=><button key={i} className={Number(selectedBlock)===i+1?'active':''} onClick={()=>setBlock(i+1)}>B{i+1}{b.ev?<i>●</i>:null}</button>)}</div><p className="muted plan-focus">{blocks[Number(selectedBlock)-1]?.focus}</p><div className="plan-sessions">{sessions.map(s=>{const rec=sessionRecords(rows,s.n);return <button className={`plan-session ${st.next?.n===s.n?'next':''}`} key={s.n} onClick={()=>setSessionN(s.n)}><span className="plan-n">S{String(s.n).padStart(3,'0')}</span><span className="plan-s-body"><strong>{s.obj}</strong><small>{fmt(s.d)} · semana {s.t}</small></span><Badge tone={rec.realized?'ok':rec.suspended.length?'warn':''}>{rec.realized?'Realizada':rec.suspended.length?'Reprogramar':'Pendiente'}</Badge></button>})}</div></section>
    </>}
  </div>
}

export function PlanCards({data,plans,planMap,onOpen}){
  const today=localDateISO();
  return <section className="panel"><div className="panel-title"><div><p className="eyebrow">PLAN {CURRENT_SEASON}</p><h3>Próximas sesiones</h3></div></div><div className="plan-cards">{SHIFTS.map(sh=>{const cat=planMap[sh.id],plan=plans?.[cat];if(!plan)return <div className="plan-card" key={sh.id}><strong>{sh.name}</strong><small className="muted">{cat} · plan pendiente de importar</small></div>;const st=planState(plan,shiftRows(data.planProgress,sh.id,CURRENT_SEASON,cat),today);return <div className="plan-card" key={sh.id}><div className="plan-card-top"><strong>{sh.name}</strong><Badge tone={paceTone(st)}>{st.done}/{st.total}</Badge></div><button className="plan-card-main" onClick={()=>onOpen(sh.id,st.next?.n)} disabled={!st.next}><small>{cat} · siguiente</small><strong>{st.next?`S${String(st.next.n).padStart(3,'0')} · ${st.next.obj}`:'Plan completo'}</strong></button><div className="plan-bar"><span style={{width:`${st.total?Math.round(st.done/st.total*100):0}%`}}/></div><small className="muted">{paceText(st)}</small></div>})}</div></section>
}

export function PlanStrip({data,plans,planMap,shiftId,date,onOpen,onSave}){
  const cat=planMap[shiftId],plan=plans?.[cat];const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');
  if(!plan)return <div className="plan-strip"><span><strong>Plan {cat}</strong> · aún no cargado</span></div>;
  const rows=shiftRows(data.planProgress,shiftId,CURRENT_SEASON,cat);const st=planState(plan,rows,date);const s=st.next;
  async function done(){if(!s)return;setBusy(true);const r=await onSave({shiftId,planCategory:cat,sessionN:s.n,date,status:'Realizada'});setBusy(false);setMsg(r?.ok?'✓ Plan actualizado':r?.error||'No se pudo guardar')}
  return <div className="plan-strip"><span><strong>{cat} · {s?`S${String(s.n).padStart(3,'0')} ${s.obj}`:'Plan completo'}</strong><small>{s?` · ${paceText(st)}`:''}</small></span><span className="plan-strip-actions">{s?<><button className="secondary" onClick={()=>onOpen(shiftId,s.n)}>Ver sesión</button><button className="secondary" disabled={busy} onClick={done}>Marcar realizada</button></>:null}{msg?<small>{msg}</small>:null}</span></div>
}

export function PlanSettings({planMap,onChange,onImport,loaded=[]}){
  const[msg,setMsg]=useState('');const[busy,setBusy]=useState(false);
  async function change(id,cat){const r=await onChange(id,cat);setMsg(r?.ok?'Plan del turno actualizado.':r?.error||'No se pudo cambiar.')}
  async function importZip(file){
    if(!file)return;
    setBusy(true);
    setMsg(`Leyendo ${file.name}…`);
    try{
      if(/sesiones.*space.*jump/i.test(file.name)&&!/solo-plan|hub-completo/i.test(file.name)){
        throw new Error(`Seleccionaste “${file.name}”. Ese es el ZIP de sesiones/PDFs. Para el plan usa “space-jump-solo-plan.zip” o “space-jump-hub-completo.zip”.`);
      }

      const found={};
      const invalid=[];
      const scanZip=async(zip,depth=0)=>{
        if(depth>3)return;
        for(const entry of Object.values(zip.files)){
          if(entry.dir)continue;
          const lower=entry.name.toLowerCase();
          if(lower.endsWith('.json')){
            const base=entry.name.split('/').pop().replace(/\.json$/i,'');
            if(!PLAN_CATEGORIES.includes(base))continue;
            try{
              const plan=JSON.parse(await entry.async('text'));
              if(plan.cat!==base||!Array.isArray(plan.sessions)||plan.sessions.length<100){
                invalid.push(base);
                continue;
              }
              found[base]=plan;
            }catch{
              invalid.push(base);
            }
          }else if(lower.endsWith('.zip')){
            try{
              const nested=await JSZip.loadAsync(await entry.async('arraybuffer'));
              await scanZip(nested,depth+1);
            }catch{/* ignorar ZIP auxiliar inválido */}
          }
        }
      };

      const zip=await JSZip.loadAsync(file);
      await scanZip(zip);
      const cats=PLAN_CATEGORIES.filter(cat=>found[cat]);

      if(!cats.length){
        throw new Error(`No encontré planes U9–U21 válidos dentro de “${file.name}”. Usa “space-jump-solo-plan.zip” o “space-jump-hub-completo.zip”.`);
      }
      if(invalid.length){
        throw new Error(`Encontré archivos de plan, pero tienen formato inválido: ${[...new Set(invalid)].join(', ')}.`);
      }

      setMsg(`Detectados: ${cats.join(', ')}. Guardando ${cats.length} planes en Supabase…`);
      const result=await onImport(found);
      setMsg(result?.ok?`✓ Planes cargados: ${cats.join(', ')} · temporada ${CURRENT_SEASON}.`:result?.error||'No se pudieron guardar los planes.');
    }catch(e){
      setMsg(`No se pudo importar: ${e.message}`);
    }finally{
      setBusy(false);
    }
  }
  return <section className="panel"><div className="panel-title"><div><p className="eyebrow">PLANIFICACIÓN · {CURRENT_SEASON}</p><h3>Plan por turno</h3><p className="muted">El progreso queda separado por temporada y categoría.</p></div><Badge tone="info">{loaded.length}/7 planes cargados</Badge></div><div className="team-list">{SHIFTS.map(sh=><div className="team-row" key={sh.id}><div><strong>{sh.name}</strong><small>{formatTime(sh.start)}–{formatTime(sh.end)}</small></div><select value={planMap[sh.id]} onChange={e=>change(sh.id,e.target.value)}>{PLAN_CATEGORIES.map(c=><option key={c} value={c}>{c} · {PLAN_CATEGORY_LABELS[c]} años</option>)}</select></div>)}</div><div className="plan-import-row"><div><strong>Biblioteca anual</strong><small className="muted">Importa una sola vez el archivo space-jump-hub-completo.zip. Solo se extraen los 7 JSON del plan; no se sube código ni datos personales.</small></div><label className="file-btn">{busy?'Importando…':'Importar ZIP'}<input type="file" accept=".zip,application/zip" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)importZip(f);e.target.value=''}}/></label></div>{msg?<div className="inline-notice">{msg}</div>:null}</section>
}
