'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSpaceJumpData } from '@/lib/store';
import { SHIFTS, STUDENT_STATUSES, LEVELS, ATTENDANCE_STATUSES, ALERT_ABSENCES, TRAINING_DAYS, ageOnDate, developmentCategory, suggestedShift, formatTime, localDateISO } from '@/lib/config';
import { PlanView, PlanCards, PlanStrip, PlanSettings } from '@/components/PlanViews';
import { StudentEvaluations } from '@/components/EvalViews';

const fmtDate=v=>v?new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${v}T12:00:00`)):'—';
const dayName=date=>new Intl.DateTimeFormat('es-PE',{weekday:'long'}).format(new Date(`${date}T12:00:00`));
const initials=s=>`${s.first_name?.[0]||''}${s.last_name?.[0]||''}`.toUpperCase();
const activeStudent=s=>!['Inactivo','Retirado'].includes(s.status);
const canManageStudents=role=>['owner','admin'].includes(role);
const roleLabel=role=>role==='owner'?'Dueño / Propietario':role==='admin'?'Administrador / Entrenador principal':'Entrenador';
const statusTone=s=>s==='Activo'?'ok':s==='Prueba'?'info':s==='Pausa'?'warn':s==='Retirado'?'danger':'neutral';
const isTrainingDate=date=>TRAINING_DAYS.includes(new Date(`${date}T12:00:00`).getDay());
const isNewStudent=s=>{if(!s.join_date)return false;const days=(Date.now()-new Date(`${s.join_date}T12:00:00`).getTime())/86400000;return days>=0&&days<=28;};
const birthdayDistance=birth=>{if(!birth)return 999;const now=new Date();const [,m,d]=birth.split('-').map(Number);const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());let next=new Date(now.getFullYear(),m-1,d);if(next<today)next=new Date(now.getFullYear()+1,m-1,d);return Math.ceil((next-today)/86400000);};
const phoneDigits=v=>String(v||'').replace(/\D/g,'');
const peruPhone=v=>{const d=phoneDigits(v);if(!d)return'';if(d.startsWith('51')&&d.length>=11)return d;if(d.length===9)return `51${d}`;return d;};
const backupDateStamp=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const displayBackupDate=v=>{if(!v)return'Nunca';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:v;};
const downloadFile=(name,content,type='text/plain;charset=utf-8')=>{const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const csvCell=v=>`"${String(v??'').replaceAll('"','""')}"`;
const downloadCsv=(name,rows)=>downloadFile(name,'\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
function Login({signIn,cloudEnabled}){
  const [username,setUsername]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setBusy(true);setError('');const r=await signIn(username,password);if(!r.ok)setError(r.error||'No se pudo ingresar.');setBusy(false);}
  return <main className="login-screen"><section className="login-card"><img src="/logo-spacejump.png" className="login-logo" alt="Space Jump"/><p className="eyebrow">SPACE JUMP AREQUIPA</p><h1>Space Jump Hub</h1><p className="muted">Alumnos · asistencia · seguimiento</p><form onSubmit={submit} className="form-stack"><label>Usuario<input required value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} placeholder="demo o coach" autoComplete="username"/></label><label>Contraseña<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>{error&&<div className="error-box">{error}</div>}<button className="primary" disabled={busy}>{busy?'Ingresando…':'Ingresar'}</button></form>{cloudEnabled?<p className="demo-note good">La sesión queda guardada en este dispositivo hasta que cierres sesión.</p>:<p className="demo-note">Demo pública: usa demo o coach con cualquier contraseña.</p>}</section></main>;
}

function NewPassword({updatePassword}){
  const [p,setP]=useState('');const [c,setC]=useState('');const [msg,setMsg]=useState('');
  async function save(e){e.preventDefault();if(p!==c){setMsg('Las contraseñas no coinciden.');return;}const r=await updatePassword(p);setMsg(r.ok?'Contraseña actualizada.':r.error);}
  return <main className="login-screen"><section className="login-card"><img src="/logo-spacejump.png" className="login-logo" alt="Space Jump"/><h1>Nueva contraseña</h1><form className="form-stack" onSubmit={save}><label>Nueva contraseña<input type="password" minLength="8" required value={p} onChange={e=>setP(e.target.value)}/></label><label>Repetir<input type="password" minLength="8" required value={c} onChange={e=>setC(e.target.value)}/></label>{msg&&<div className="inline-notice">{msg}</div>}<button className="primary">Guardar</button></form></section></main>;
}

function Stat({label,value,sub,tone=''}){return <div className={`stat-card ${tone}`}><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>;}
function Badge({children,tone=''}){return <span className={`badge ${tone}`}>{children}</span>;}
function Avatar({student,size=''}){return <div className={`avatar ${size}`}>{student.photo_url?<img src={student.photo_url} alt=""/>:initials(student)}</div>;}

function Empty({text}){return <div className="empty">{text}</div>;}
function clockMinutes(d=new Date()){return d.getHours()*60+d.getMinutes();}
function shiftIdByClock(d=new Date()){
  const m=clockMinutes(d);
  const toMin=t=>{const[h,mm]=t.split(':').map(Number);return h*60+mm;};
  const live=SHIFTS.find(sh=>m>=toMin(sh.start)&&m<toMin(sh.end));
  if(live)return live.id;
  if(m<toMin(SHIFTS[0].start))return 1;
  if(m<toMin(SHIFTS[1].start))return 1;
  if(m<toMin(SHIFTS[2].start))return 2;
  return 3;
}
function isShiftLive(sh,d=new Date()){
  const m=clockMinutes(d);const toMin=t=>{const[h,mm]=t.split(':').map(Number);return h*60+mm;};
  return TRAINING_DAYS.includes(d.getDay())&&m>=toMin(sh.start)&&m<toMin(sh.end);
}


function Dashboard({data,setView,profile,plans,planMap,onOpenPlan}){
  const active=data.students.filter(activeStudent);
  const alerts=studentsWithAbsenceAlerts(data);
  const birthdays=data.students.filter(s=>birthdayDistance(s.birth_date)<=7).sort((a,b)=>birthdayDistance(a.birth_date)-birthdayDistance(b.birth_date));
  const today=localDateISO();
  const todayLabel=new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  const currentId=shiftIdByClock();
  const currentShift=SHIFTS.find(s=>s.id===currentId);
  const live=isShiftLive(currentShift);
  const todaySessionIds=new Set(data.sessions.filter(s=>s.session_date===today).map(s=>s.id));
  const attendedToday=new Set(data.attendance.filter(a=>todaySessionIds.has(a.session_id)&&['Presente','Tardanza'].includes(a.status)).map(a=>a.student_id)).size;
  const currentCount=active.filter(s=>Number(s.shift_id)===currentId).length;
  return <div className="view">
    <header className="page-head home-head"><div><p className="eyebrow">SPACE JUMP · HOY</p><h2>Hola, {profile?.full_name?.split(' ')[0]||'coach'} 👋</h2><p className="muted capitalize">{todayLabel}</p></div></header>
    <section className="today-command">
      <div className="today-command-copy"><div className="today-command-label"><span className={live?'live-dot active':'live-dot'}/><span>{live?'TURNO EN CURSO':'TURNO SUGERIDO'}</span></div><strong>{currentShift.name}</strong><small>{formatTime(currentShift.start)} – {formatTime(currentShift.end)} · {currentCount} alumnos activos</small></div>
      <div className="today-command-actions"><button className="primary" onClick={()=>setView('attendance')}>Tomar asistencia</button><button className="secondary" onClick={()=>onOpenPlan(currentId)}>Ver entrenamiento de hoy</button></div>
    </section>
    <div className="stats-grid home-stats"><Stat label="Alumnos activos" value={active.length}/><Stat label="Vinieron hoy" value={attendedToday}/><Stat label="Alertas" value={alerts.length} tone={alerts.length?'danger':''}/><Stat label="Cumpleaños · 7 días" value={birthdays.length}/></div>
    <PlanCards data={data} plans={plans} planMap={planMap} onOpen={onOpenPlan}/>
    {(birthdays.length>0||alerts.length>0)&&<div className="dashboard-grid compact-dashboard">
      {birthdays.length>0&&<section className="panel compact-panel"><div className="panel-title"><div><p className="eyebrow">PRÓXIMOS 7 DÍAS</p><h3>Cumpleaños</h3></div></div><div className="compact-list">{birthdays.slice(0,4).map(s=><div key={s.id} className="compact-row"><Avatar student={s}/><div><strong>{s.first_name} {s.last_name}</strong><small>{birthdayDistance(s.birth_date)===0?'Hoy':`En ${birthdayDistance(s.birth_date)} día${birthdayDistance(s.birth_date)===1?'':'s'}`}</small></div></div>)}</div></section>}
      {alerts.length>0&&<section className="panel warning-panel compact-panel"><div className="panel-title"><div><p className="eyebrow">SEGUIMIENTO</p><h3>Faltas consecutivas</h3></div><button className="link-btn" onClick={()=>setView('alerts')}>Ver</button></div><div className="alert-pills">{alerts.slice(0,5).map(x=><span key={x.student.id}>{x.student.first_name} {x.student.last_name} · {x.count}</span>)}</div></section>}
    </div>}
  </div>;
}

function Students({data,role,onEdit,onSelect}){
  const [q,setQ]=useState('');const [shift,setShift]=useState('all');const [status,setStatus]=useState('all');const [level,setLevel]=useState('all');
  const statusOptions=['all','Prueba','Activo','Pausa','Inactivo','Retirado','Reingresado'];
  const rows=data.students.filter(s=>{const text=`${s.first_name} ${s.last_name} ${s.guardian_name||''} ${s.guardian_phone||''}`.toLowerCase();return text.includes(q.toLowerCase())&&(shift==='all'||String(s.shift_id)===shift)&&(status==='all'||s.status===status)&&(level==='all'||s.level===level);}).sort((a,b)=>a.last_name.localeCompare(b.last_name));
  return <div className="view"><header className="page-head"><div><p className="eyebrow">JUGADORES</p><h2>Alumnos</h2><p className="muted">{rows.length} mostrados · {data.students.length} registrados</p></div>{canManageStudents(role)&&<button className="primary desktop-new-student" onClick={()=>onEdit(null)}>+ Nuevo alumno</button>}</header>
    <section className="panel student-browser">
      <input className="search student-search" placeholder="Buscar por nombre, apoderado o teléfono…" value={q} onChange={e=>setQ(e.target.value)}/>
      <div className="status-chips">{statusOptions.map(x=><button key={x} className={status===x?'active':''} onClick={()=>setStatus(x)}>{x==='all'?'Todos':x}</button>)}</div>
      <div className="student-secondary-filters"><label>Turno<select value={shift} onChange={e=>setShift(e.target.value)}><option value="all">Todos</option>{SHIFTS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Nivel<select value={level} onChange={e=>setLevel(e.target.value)}><option value="all">Todos</option>{LEVELS.map(s=><option key={s}>{s}</option>)}</select></label></div>
      <div className="student-table"><div className="table-head"><span>Alumno</span><span>Turno</span><span>Categoría</span><span>Nivel</span><span>Estado</span><span></span></div>{rows.map(s=><button key={s.id} className="table-row" onClick={()=>onSelect(s)}><span className="student-cell"><Avatar student={s}/><span><strong>{s.first_name} {s.last_name} {isNewStudent(s)&&<em className="new-tag">NUEVO</em>}</strong><small>{s.age} años · ingreso {fmtDate(s.join_date)}</small></span></span><span>{SHIFTS.find(x=>x.id===Number(s.shift_id))?.name||'—'}</span><span><Badge>{s.category}</Badge></span><span>{s.level}</span><span><Badge tone={statusTone(s.status)}>{s.status}</Badge></span><span>›</span></button>)}</div>{!rows.length&&<Empty text="No encontramos alumnos con esos filtros"/>}
    </section>
  </div>;
}

function StudentForm({student,onClose,onSave}){
  const base=student||{first_name:'',last_name:'',birth_date:'',sex:'',phone:'',guardian_name:'',guardian_phone:'',emergency_name:'',emergency_phone:'',join_date:localDateISO(),status:'Prueba',level:'Iniciación',shift_id:1,notes:'',exit_date:null,exit_reason:null};
  const [form,setForm]=useState(base);const [photoFile,setPhotoFile]=useState(null);const [removePhoto,setRemovePhoto]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const age=ageOnDate(form.birth_date);const category=developmentCategory(age);const recommended=suggestedShift(age);const preview=photoFile?URL.createObjectURL(photoFile):(!removePhoto?student?.photo_url:null);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{await onSave({...form,shift_id:Number(form.shift_id),_photoFile:photoFile,_removePhoto:removePhoto});}catch(err){setError(err?.message||'No se pudo guardar.');setBusy(false);}}
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">{student?'EDITAR FICHA':'ALTA DE ALUMNO'}</p><h2>{student?'Editar alumno':'Nuevo alumno'}</h2></div><button type="button" className="icon-btn" onClick={onClose}>×</button></div>
  <div className="photo-editor"><div className="avatar xl">{preview?<img src={preview} alt="Vista previa"/>:initials(form)}</div><div><label className="file-btn">Elegir foto<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0]||null;setPhotoFile(f);if(f)setRemovePhoto(false);}}/></label>{student?.photo_url&&!removePhoto&&<button type="button" className="link-btn danger-text" onClick={()=>{setRemovePhoto(true);setPhotoFile(null)}}>Quitar foto</button>}<small>PNG/JPG · máximo 5 MB · privada</small></div></div>
  <div className="form-grid"><label>Nombres *<input required value={form.first_name} onChange={e=>set('first_name',e.target.value)}/></label><label>Apellidos *<input required value={form.last_name} onChange={e=>set('last_name',e.target.value)}/></label><label>Fecha de nacimiento *<input required type="date" value={form.birth_date} onChange={e=>{const v=e.target.value;set('birth_date',v);set('shift_id',suggestedShift(ageOnDate(v)));}}/></label><label>Sexo<select value={form.sex||''} onChange={e=>set('sex',e.target.value)}><option value="">Seleccionar</option><option>Masculino</option><option>Femenino</option><option>Otro / no especificar</option></select></label><div className="auto-card"><small>Edad calculada</small><strong>{age??'—'} años</strong></div><div className="auto-card"><small>Etapa de desarrollo</small><strong>{category}</strong></div>
  <label>Turno actual *<select value={form.shift_id} onChange={e=>set('shift_id',e.target.value)}>{SHIFTS.map(s=><option key={s.id} value={s.id}>{s.name} · {formatTime(s.start)}</option>)}</select>{age!=null&&Number(form.shift_id)!==recommended&&<small className="warn-text">Por edad se sugiere {SHIFTS.find(s=>s.id===recommended)?.name}; tú decides el cambio.</small>}</label><label>Nivel<select value={form.level} onChange={e=>set('level',e.target.value)}>{LEVELS.map(x=><option key={x}>{x}</option>)}</select></label><label>Estado<select value={form.status} onChange={e=>set('status',e.target.value)}>{STUDENT_STATUSES.map(x=><option key={x}>{x}</option>)}</select></label><label>Fecha de ingreso *<input required type="date" value={form.join_date} onChange={e=>set('join_date',e.target.value)}/></label>
  <label>Teléfono del alumno<input inputMode="tel" value={form.phone||''} onChange={e=>set('phone',e.target.value)} placeholder="Opcional"/></label><label>Padre / madre / apoderado *<input required value={form.guardian_name||''} onChange={e=>set('guardian_name',e.target.value)}/></label><label>Teléfono del apoderado *<input required inputMode="tel" value={form.guardian_phone||''} onChange={e=>set('guardian_phone',e.target.value)} placeholder="9 dígitos"/></label><label>Contacto de emergencia<input value={form.emergency_name||''} onChange={e=>set('emergency_name',e.target.value)}/></label><label>Teléfono de emergencia<input inputMode="tel" value={form.emergency_phone||''} onChange={e=>set('emergency_phone',e.target.value)}/></label><label className="full">Observaciones<textarea rows="4" value={form.notes||''} onChange={e=>set('notes',e.target.value)} placeholder="Información útil para el trabajo del entrenador."/></label></div>{error&&<div className="error-box">{error}</div>}<div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={busy}>{busy?'Guardando…':'Guardar ficha'}</button></div></form></div>;
}

function StudentProfile({student,data,role,plans,planMap,onOpenPlan,onSaveStudent,onSaveEval,onBack,onEdit,onStatus,onDelete}){
  const [tab,setTab]=useState('summary');const [quickText,setQuickText]=useState('');const [quickMsg,setQuickMsg]=useState('');
  const sh=SHIFTS.find(x=>x.id===Number(student.shift_id));
  const records=studentAttendance(data,student.id);
  const counts=Object.fromEntries(ATTENDANCE_STATUSES.map(x=>[x,records.filter(r=>r.status===x).length]));
  const pct=records.length?Math.round(records.filter(r=>['Presente','Tardanza'].includes(r.status)).length/records.length*100):0;
  const history=data.history.filter(h=>h.student_id===student.id);
  const wa=peruPhone(student.guardian_phone);
  const evals=(data.evaluations||[]).filter(e=>e.student_id===student.id).sort((a,b)=>String(b.eval_date||'').localeCompare(String(a.eval_date||''))||Number(b.eval_n)-Number(a.eval_n));
  const latestEval=evals[0]||null;
  const evalFields=['sprint','jump','braking','balance','ball_handling','passing','finishing','shooting','spacing','defense','transition','decision_making'];
  const greenCount=latestEval?evalFields.filter(k=>latestEval[k]==='Verde').length:0;
  const cat=planMap?.[Number(student.shift_id)];
  const plan=plans?.[cat];
  const lastProgress=(data.planProgress||[]).filter(p=>Number(p.shift_id)===Number(student.shift_id)&&p.status==='Realizada'&&(!cat||!p.plan_category||p.plan_category===cat)).sort((a,b)=>String(b.session_date).localeCompare(String(a.session_date)))[0]||null;
  const lastSession=plan&&lastProgress?plan.sessions?.find(s=>Number(s.n)===Number(lastProgress.session_n)):null;
  async function changeStatus(status){let note='';if(['Inactivo','Retirado'].includes(status)){note=window.prompt(`Motivo para cambiar a ${status}:`,'')??'';if(!note)return;}await onStatus(student.id,status,note);}
  async function addObservation(text){
    const clean=String(text||'').trim();if(!clean)return;
    setQuickMsg('Guardando…');
    const stamp=fmtDate(localDateISO());
    const next=[student.notes?.trim(),`${stamp} · ${clean}`].filter(Boolean).join('\n');
    try{await onSaveStudent({...student,notes:next});setQuickText('');setQuickMsg('✓ Guardado');setTimeout(()=>setQuickMsg(''),1800);}catch(e){setQuickMsg(e?.message||'No se pudo guardar.');}
  }
  const tabs=[['summary','Resumen'],['attendance','Asistencia'],['evaluation','Evaluación'],['history','Historial']];
  return <div className="view player-profile-v2">
    <button className="back-btn" onClick={onBack}>← Alumnos</button>
    <section className="player-hero">
      <Avatar student={student} size="xl"/>
      <div className="player-identity"><div className="player-name-line"><h2>{student.first_name} {student.last_name}</h2><Badge tone={statusTone(student.status)}>{student.status}</Badge>{isNewStudent(student)&&<Badge tone="info">Nuevo</Badge>}</div><p>{student.age} años · {student.category} · {sh?.name}</p><div className="player-contact-mini"><span>Ingreso {fmtDate(student.join_date)}</span>{student.guardian_name&&<span>Apoderado: {student.guardian_name}</span>}</div></div>
      <div className="player-hero-actions">{wa&&<a className="primary action-link" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>}<details className="player-menu"><summary>•••</summary><div className="player-menu-pop">{canManageStudents(role)&&<button onClick={()=>onEdit(student)}>Editar ficha</button>}<a href={`tel:${phoneDigits(student.guardian_phone)}`}>Llamar apoderado</a>{canManageStudents(role)&&<><div className="menu-separator"/><small>Cambiar estado</small>{STUDENT_STATUSES.filter(x=>x!==student.status).map(x=><button key={x} onClick={()=>changeStatus(x)}>{x}</button>)}<div className="menu-separator"/><button className="danger-text" onClick={()=>onDelete(student)}>Eliminar definitivamente</button></>}</div></details></div>
    </section>
    <nav className="profile-tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>

    {tab==='summary'&&<>
      <div className="profile-summary-grid">
        <div className="summary-metric"><small>Asistencia</small><strong>{pct}%</strong><span>{records.length} registros</span></div>
        <div className="summary-metric"><small>Nivel actual</small><strong>{student.level}</strong><span>{student.category}</span></div>
        <div className="summary-metric"><small>Última evaluación</small><strong>{latestEval?`Ciclo ${latestEval.eval_n}`:'—'}</strong><span>{latestEval?`${greenCount}/${evalFields.length} verdes`:'Sin evaluar'}</span></div>
        <div className="summary-metric"><small>Faltas</small><strong>{counts.Falta||0}</strong><span>{counts.Tardanza||0} tardanzas</span></div>
      </div>
      <div className="profile-summary-layout">
        <section className="panel quick-observation"><div className="panel-title"><div><p className="eyebrow">SEGUIMIENTO RÁPIDO</p><h3>Observaciones</h3></div></div><div className="quick-note-buttons"><button onClick={()=>addObservation('Buen entrenamiento')}>Buen entrenamiento</button><button onClick={()=>addObservation('Mejorar defensa')}>Mejorar defensa</button><button onClick={()=>addObservation('Mejorar tiro')}>Mejorar tiro</button><button onClick={()=>addObservation('Conducta / actitud')}>Conducta</button></div><div className="quick-note-input"><input placeholder="Escribir observación…" value={quickText} onChange={e=>setQuickText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addObservation(quickText)}}}/><button className="secondary" onClick={()=>addObservation(quickText)}>Guardar</button></div>{quickMsg&&<small className="quick-msg">{quickMsg}</small>}{student.notes&&<p className="notes-preview">{student.notes.split('\n').slice(-3).join('\n')}</p>}</section>
        <section className="panel last-training-card"><div className="panel-title"><div><p className="eyebrow">ÚLTIMO ENTRENAMIENTO</p><h3>{lastSession?lastSession.obj:'Sin sesión registrada'}</h3></div></div>{lastProgress?<><p className="muted">{fmtDate(lastProgress.session_date)} · {cat} · S{String(lastProgress.session_n).padStart(3,'0')}</p>{lastProgress.rpe&&<Badge tone="info">RPE {lastProgress.rpe}/10</Badge>}{lastProgress.notes&&<p className="notes-box">{lastProgress.notes}</p>}{lastSession&&<button className="secondary" onClick={()=>onOpenPlan(student.shift_id,lastProgress.session_n)}>Ver sesión</button>}</>:<Empty text="Cuando marques una sesión como realizada aparecerá aquí"/>}</section>
        <section className="panel personal-plan"><div className="panel-title"><div><p className="eyebrow">PRÓXIMAS 4 SEMANAS</p><h3>Plan individual</h3></div></div>{latestEval?.plan_notes?<p className="personal-plan-text">{latestEval.plan_notes}</p>:<p className="muted">Aún no hay un plan individual registrado desde la evaluación.</p>}</section>
      </div>
      <section className="panel contact-summary"><div className="panel-title"><div><p className="eyebrow">CONTACTO</p><h3>Datos esenciales</h3></div></div><dl className="details compact-details"><div><dt>Nacimiento</dt><dd>{fmtDate(student.birth_date)}</dd></div><div><dt>Alumno</dt><dd>{student.phone||'—'}</dd></div><div><dt>Apoderado</dt><dd>{student.guardian_name||'—'} · {student.guardian_phone||'—'}</dd></div><div><dt>Emergencia</dt><dd>{student.emergency_name||'—'} · {student.emergency_phone||'—'}</dd></div></dl></section>
    </>}

    {tab==='attendance'&&<><div className="attendance-summary-strip"><div><small>Asistencia general</small><strong>{pct}%</strong></div><div><small>Presente</small><strong>{counts.Presente||0}</strong></div><div><small>Tardanza</small><strong>{counts.Tardanza||0}</strong></div><div><small>Justificado</small><strong>{counts.Justificado||0}</strong></div><div><small>Falta</small><strong>{counts.Falta||0}</strong></div></div><section className="panel"><div className="panel-title"><div><p className="eyebrow">REGISTROS</p><h3>Asistencia</h3></div></div>{records.length?<div className="records">{records.slice(0,40).map(r=><div key={r.id}><span>{fmtDate(r.session_date)}</span><span className="capitalize">{dayName(r.session_date)}</span><Badge tone={statusClass(r.status)}>{r.status}</Badge></div>)}</div>:<Empty text="Aún no tiene asistencias registradas"/>}</section></>}

    {tab==='evaluation'&&<StudentEvaluations student={student} data={data} onSave={onSaveEval}/>}

    {tab==='history'&&<div className="profile-history-grid"><section className="panel"><h3>Datos y contacto</h3><dl className="details"><div><dt>Nacimiento</dt><dd>{fmtDate(student.birth_date)}</dd></div><div><dt>Turno</dt><dd>{sh?.name} · {formatTime(sh?.start||'00:00')}–{formatTime(sh?.end||'00:00')}</dd></div><div><dt>Apoderado</dt><dd>{student.guardian_name||'—'}</dd></div><div><dt>Tel. apoderado</dt><dd>{student.guardian_phone||'—'}</dd></div><div><dt>Tel. alumno</dt><dd>{student.phone||'—'}</dd></div><div><dt>Emergencia</dt><dd>{student.emergency_name||'—'} · {student.emergency_phone||'—'}</dd></div>{student.exit_date&&<div><dt>Última baja</dt><dd>{fmtDate(student.exit_date)} · {student.exit_reason||'sin motivo'}</dd></div>}</dl></section><section className="panel"><h3>Observaciones completas</h3><p className="notes-box preline">{student.notes||'Sin observaciones.'}</p></section>{history.length>0&&<section className="panel history-full"><h3>Historial administrativo</h3><div className="records">{history.map(h=><div key={h.id}><span>{fmtDate(h.effective_date)}</span><span>{historyLabel(h.kind)}</span><span>{h.old_value||'—'} → {h.new_value}{h.note?` · ${h.note}`:''}</span></div>)}</div></section>}</div>}
  </div>;
}

function Attendance({data,onSave,plans,planMap,onOpenPlan,onSaveProgress}){
  const [date,setDate]=useState(localDateISO());const [shiftId,setShiftId]=useState(()=>shiftIdByClock());const [marks,setMarks]=useState({});const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  const students=data.students.filter(s=>activeStudent(s)&&Number(s.shift_id)===Number(shiftId));const existing=useMemo(()=>attendanceMap(data,date,shiftId),[data,date,shiftId]);const effective={...existing,...marks};const selectedShift=SHIFTS.find(s=>s.id===Number(shiftId));
  function mark(id,status){setMessage('');setMarks(m=>({...m,[id]:status}));}
  function markAll(status){setMessage('');setMarks(Object.fromEntries(students.map(s=>[s.id,status])));}
  async function save(){setMessage('');const missing=students.filter(s=>!effective[s.id]);if(missing.length){setMessage(`⚠ Falta marcar a ${missing.length} alumno${missing.length===1?'':'s'}. Revisa antes de guardar.`);return;}setBusy(true);const completed=Object.fromEntries(students.map(s=>[s.id,effective[s.id]]));const r=await onSave({date,shiftId,marks:completed});setBusy(false);if(r?.ok){setMarks({});setMessage('✓ Asistencia guardada');}else setMessage(r?.error||'No se pudo guardar.');}
  return <div className="view"><header className="page-head"><div><p className="eyebrow">CONTROL DIARIO</p><h2>Asistencia</h2><p className="muted">Lunes, miércoles y viernes</p></div></header><section className="panel"><div className="attendance-controls"><label>Fecha<input type="date" value={date} onChange={e=>{setDate(e.target.value);setMarks({});setMessage('')}}/></label><label>Turno<select value={shiftId} onChange={e=>{setShiftId(Number(e.target.value));setMarks({});setMessage('')}}>{SHIFTS.map(s=><option key={s.id} value={s.id}>{s.name} · {formatTime(s.start)}–{formatTime(s.end)}</option>)}</select></label><div className="attendance-meta"><small>Horario</small><strong>{formatTime(selectedShift.start)} – {formatTime(selectedShift.end)}</strong></div><div className="attendance-meta"><small>Alumnos</small><strong>{students.length}</strong></div></div><PlanStrip data={data} plans={plans} planMap={planMap} shiftId={shiftId} date={date} onOpen={onOpenPlan} onSave={onSaveProgress}/>{!isTrainingDate(date)&&<div className="inline-notice warn">⚠ {dayName(date)} no es un día habitual de entrenamiento. Puedes registrar si fue una sesión extraordinaria.</div>}<div className="quick-actions"><span>Marcación rápida:</span><button onClick={()=>markAll('Presente')}>Todos presentes</button><button onClick={()=>setMarks({})}>Limpiar cambios</button></div><div className="attendance-list">{students.map(s=><div key={s.id} className="attendance-row"><div className="student-cell"><Avatar student={s}/><span><strong>{s.first_name} {s.last_name}</strong><small>{s.age} años · {s.category} · {s.level}</small></span></div><div className="attendance-buttons">{ATTENDANCE_STATUSES.map(st=><button key={st} className={effective[s.id]===st?`selected ${statusClass(st)}`:''} onClick={()=>mark(s.id,st)}>{st}</button>)}</div></div>)}</div>{!students.length&&<Empty text="No hay alumnos activos en este turno"/>}<div className="sticky-save"><span>{message}</span><button className="primary" onClick={save} disabled={!students.length||busy}>{busy?'Guardando…':'Guardar asistencia'}</button></div></section></div>;
}


function Alerts({data,onSelect}){
  const abs=studentsWithAbsenceAlerts(data);const birthdays=data.students.filter(s=>birthdayDistance(s.birth_date)<=30).sort((a,b)=>birthdayDistance(a.birth_date)-birthdayDistance(b.birth_date));const promotions=data.students.filter(s=>activeStudent(s)&&suggestedShift(s.age)!==Number(s.shift_id));
  return <div className="view"><header className="page-head"><div><p className="eyebrow">SEGUIMIENTO</p><h2>Alertas</h2><p className="muted">La app avisa; el entrenador toma la decisión final.</p></div></header><div className="alert-grid"><section className="panel"><h3>⚠ 3 faltas consecutivas</h3>{abs.length?abs.map(x=><button className="compact-row clickable" key={x.student.id} onClick={()=>onSelect(x.student)}><Avatar student={x.student}/><div><strong>{x.student.first_name} {x.student.last_name}</strong><small>{x.count} faltas · apoderado: {x.student.guardian_phone||'sin número'}</small></div></button>):<Empty text="Sin alertas de asistencia"/>}</section><section className="panel"><h3>🎂 Cumpleaños próximos</h3>{birthdays.length?birthdays.map(s=><button className="compact-row clickable" key={s.id} onClick={()=>onSelect(s)}><Avatar student={s}/><div><strong>{s.first_name} {s.last_name}</strong><small>{birthdayDistance(s.birth_date)===0?'Cumple hoy':`En ${birthdayDistance(s.birth_date)} días`} · {s.category}</small></div></button>):<Empty text="Sin cumpleaños próximos"/>}</section><section className="panel"><h3>↗ Revisar cambio de turno</h3>{promotions.length?promotions.map(s=><button className="compact-row clickable" key={s.id} onClick={()=>onSelect(s)}><Avatar student={s}/><div><strong>{s.first_name} {s.last_name}</strong><small>{s.age} años · actual {SHIFTS.find(x=>x.id===Number(s.shift_id))?.name} · sugerido {SHIFTS.find(x=>x.id===suggestedShift(s.age))?.name}</small></div></button>):<Empty text="Todos están en un turno compatible"/>}</section></div></div>;
}

function Reports({data}){
  const now=new Date();
  const [mode,setMode]=useState('day');
  const [date,setDate]=useState(localDateISO());
  const availableDates=useMemo(()=>[...new Set(data.sessions.filter(s=>data.attendance.some(a=>a.session_id===s.id)).map(s=>s.session_date).filter(Boolean))].sort((a,b)=>b.localeCompare(a)),[data.sessions,data.attendance]);
  useEffect(()=>{if(availableDates.length&&!availableDates.includes(date))setDate(availableDates[0]);},[availableDates,date]);
  const [month,setMonth]=useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const [shift,setShift]=useState('all');

  const daySessions=data.sessions.filter(s=>s.session_date===date);
  const daySessionIds=new Set(daySessions.map(s=>s.id));
  const dayAttendance=data.attendance.filter(a=>daySessionIds.has(a.session_id)&&['Presente','Tardanza'].includes(a.status));
  const dayGroups=SHIFTS.map(sh=>{
    const sessionIds=new Set(daySessions.filter(s=>Number(s.shift_id)===sh.id).map(s=>s.id));
    const records=dayAttendance.filter(a=>sessionIds.has(a.session_id)).map(a=>({
      ...a,
      student:data.students.find(s=>s.id===a.student_id)
    })).filter(x=>x.student).sort((a,b)=>(a.student.first_name||'').localeCompare(b.student.first_name||'','es'));
    return{shift:sh,records};
  });
  const dayTotal=dayGroups.reduce((n,g)=>n+g.records.length,0);

  const sessions=data.sessions.filter(s=>s.session_date?.startsWith(month)&&(shift==='all'||String(s.shift_id)===shift));
  const sessionIds=new Set(sessions.map(s=>s.id));
  const studentPool=data.students.filter(s=>shift==='all'||String(s.shift_id)===shift);
  const rows=studentPool.map(s=>{
    const a=data.attendance.filter(x=>x.student_id===s.id&&sessionIds.has(x.session_id));
    const count=k=>a.filter(x=>x.status===k).length;
    const present=count('Presente'),late=count('Tardanza'),absent=count('Falta'),just=count('Justificado');
    const pct=a.length?Math.round((present+late)/a.length*100):0;
    return{student:s,present,late,absent,just,total:a.length,pct};
  }).filter(r=>r.total>0||activeStudent(r.student)).sort((a,b)=>a.student.last_name.localeCompare(b.student.last_name));
  const allAttendance=data.attendance.filter(a=>sessionIds.has(a.session_id));
  const rate=allAttendance.length?Math.round(allAttendance.filter(a=>['Presente','Tardanza'].includes(a.status)).length/allAttendance.length*100):0;

  function exportCsv(){
    const header=['Alumno','Turno','Categoría','Presente','Tardanza','Falta','Justificado','Total','Asistencia %'];
    const lines=[header,...rows.map(r=>[`${r.student.first_name} ${r.student.last_name}`,SHIFTS.find(s=>s.id===Number(r.student.shift_id))?.name,r.student.category,r.present,r.late,r.absent,r.just,r.total,r.pct])];
    const csv='\uFEFF'+lines.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`space-jump-asistencia-${month}.csv`;a.click();URL.revokeObjectURL(url);
  }

  return <div className="view">
    <header className="page-head"><div><p className="eyebrow">REPORTES</p><h2>Asistencia</h2><p className="muted">Consulta rápida por día o resumen mensual.</p></div>{mode==='month'&&<button className="secondary" onClick={exportCsv}>Exportar CSV</button>}</header>
    <div className="report-mode-tabs">
      <button className={mode==='day'?'active':''} onClick={()=>setMode('day')}>Por día</button>
      <button className={mode==='month'?'active':''} onClick={()=>setMode('month')}>Mensual</button>
    </div>

    {mode==='day'&&<>
      <section className="panel daily-report">
        <div className="daily-report-head"><label>Fecha<select value={date} onChange={e=>setDate(e.target.value)}>{availableDates.length?availableDates.map(d=><option key={d} value={d}>{fmtDate(d)} · {dayName(d)}</option>):<option value="">Sin asistencias registradas</option>}</select></label><div><small>Vinieron ese día</small><strong>{dayTotal}</strong></div></div>
        <div className="daily-shifts">
          {dayGroups.map((group,index)=><section className="daily-shift" key={group.shift.id}>
            <div className="daily-shift-title"><div><p className="eyebrow">{index===0?'PRIMER TURNO':index===1?'SEGUNDO TURNO':'TERCER TURNO'}</p><h3>{group.shift.name}</h3><small>{formatTime(group.shift.start)} – {formatTime(group.shift.end)}</small></div><Badge tone="info">{group.records.length}</Badge></div>
            {group.records.length?<div className="daily-names">{group.records.map(r=><div key={r.id} className="daily-name"><Avatar student={r.student}/><span><strong>{r.student.first_name} {r.student.last_name}</strong>{r.status==='Tardanza'&&<small>Llegó tarde</small>}</span>{r.status==='Tardanza'&&<Badge tone="warn">Tardanza</Badge>}</div>)}</div>:<Empty text="Nadie registrado como presente en este turno"/>}
          </section>)}
        </div>
      </section>
    </>}

    {mode==='month'&&<>
      <div className="stats-grid"><Stat label="Asistencia" value={`${rate}%`}/><Stat label="Sesiones" value={sessions.length}/><Stat label="Registros" value={allAttendance.length}/><Stat label="Alumnos" value={rows.length}/></div>
      <section className="panel"><div className="report-controls"><label>Mes<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><label>Turno<select value={shift} onChange={e=>setShift(e.target.value)}><option value="all">Todos los turnos</option>{SHIFTS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div><div className="report-table"><div className="report-head"><span>Alumno</span><span>P</span><span>T</span><span>F</span><span>J</span><span>%</span></div>{rows.map(r=><div className="report-row" key={r.student.id}><span className="student-cell"><Avatar student={r.student}/><span><strong>{r.student.first_name} {r.student.last_name}</strong><small>{r.student.category} · {SHIFTS.find(s=>s.id===Number(r.student.shift_id))?.name}</small></span></span><span>{r.present}</span><span>{r.late}</span><span>{r.absent}</span><span>{r.just}</span><strong className={r.pct<70?'danger-text':''}>{r.pct}%</strong></div>)}</div>{!rows.length&&<Empty text="Sin registros para este periodo"/>}</section>
    </>}
  </div>;
}

function Settings({cloudEnabled,role,user,profile,data,onRoleChange,onPasswordChange,planMap,onPlanSetting,onImportPlans}){
  const [message,setMessage]=useState('');const [p,setP]=useState('');const [c,setC]=useState('');const [lastBackup,setLastBackup]=useState('');
  const canBackup=['owner','admin'].includes(role);
  useEffect(()=>{try{setLastBackup(localStorage.getItem('space_jump_last_full_backup')||'');}catch{}},[]);
  async function changeRole(id,newRole){const r=await onRoleChange(id,newRole);setMessage(r.ok?'Rol actualizado.':r.error);}
  async function changePassword(e){e.preventDefault();if(p!==c){setMessage('Las contraseñas no coinciden.');return;}const r=await onPasswordChange(p);setMessage(r.ok?'Contraseña actualizada.':r.error);if(r.ok){setP('');setC('');}}

  function studentName(id){const s=data.students.find(x=>x.id===id);return s?`${s.first_name} ${s.last_name}`:'Alumno no encontrado';}
  function shiftName(id){return SHIFTS.find(x=>x.id===Number(id))?.name||String(id??'');}
  function sessionFor(id){return data.sessions.find(x=>x.id===id);}

  function exportStudents(){
    const rows=[['ID','Nombres','Apellidos','Fecha nacimiento','Edad','Sexo','Fecha ingreso','Turno','Categoría','Nivel','Estado','Teléfono alumno','Apoderado','Teléfono apoderado','Contacto emergencia','Teléfono emergencia','Observaciones','Fecha baja','Motivo baja','Ruta foto']];
    for(const s of data.students)rows.push([s.id,s.first_name,s.last_name,s.birth_date,s.age,s.sex,s.join_date,shiftName(s.shift_id),s.category,s.level,s.status,s.phone,s.guardian_name,s.guardian_phone,s.emergency_name,s.emergency_phone,s.notes,s.exit_date,s.exit_reason,s.photo_path]);
    downloadCsv(`space-jump-alumnos-${backupDateStamp()}.csv`,rows);
  }

  function exportAttendance(){
    const rows=[['ID','Fecha','Turno','Alumno ID','Alumno','Estado','Registrado por']];
    for(const a of data.attendance){const session=sessionFor(a.session_id);rows.push([a.id,session?.session_date||'',shiftName(session?.shift_id),a.student_id,studentName(a.student_id),a.status,a.recorded_by]);}
    downloadCsv(`space-jump-asistencias-${backupDateStamp()}.csv`,rows);
  }

  function exportHistory(){
    const rows=[['ID','Fecha','Alumno ID','Alumno','Tipo','Valor anterior','Valor nuevo','Nota','Registrado por']];
    for(const h of data.history)rows.push([h.id,h.effective_date,h.student_id,studentName(h.student_id),historyLabel(h.kind),h.old_value,h.new_value,h.note,h.changed_by]);
    downloadCsv(`space-jump-historial-${backupDateStamp()}.csv`,rows);
  }

  function exportFullBackup(){
    const date=backupDateStamp();
    const students=data.students.map(s=>{const {photo_url,...safe}=s;return safe;});
    const payload={
      format:'space-jump-hub-backup',
      version:'2.1',
      created_at:new Date().toISOString(),
      created_by:{username:profile?.username||user?.email?.split('@')[0]||'',name:profile?.full_name||'',role},
      summary:{students:students.length,sessions:data.sessions.length,attendance:data.attendance.length,history:data.history.length,profiles:(data.profiles||[]).length,plan_progress:(data.planProgress||[]).length,evaluations:(data.evaluations||[]).length,training_plans:Object.keys(data.trainingPlans||{}).length},
      students,
      training_sessions:data.sessions,
      attendance:data.attendance,
      student_history:data.history,
      profiles:data.profiles||[],
      plan_progress:data.planProgress||[],
      plan_settings:data.planSettings||[],
      student_evaluations:data.evaluations||[],
      training_plans:data.trainingPlans||{},
      notes:['Las contraseñas de Supabase Auth no forman parte del respaldo.','Las fotos no se incrustan en este JSON; cada alumno conserva photo_path para identificar su archivo en Supabase Storage.']
    };
    downloadFile(`space-jump-respaldo-completo-${date}.json`,JSON.stringify(payload,null,2),'application/json;charset=utf-8');
    try{localStorage.setItem('space_jump_last_full_backup',date);}catch{}
    setLastBackup(date);
  }

  return <div className="view settings-v2"><header className="page-head"><div><p className="eyebrow">CONFIGURACIÓN</p><h2>Space Jump Hub</h2><p className="muted">Solo lo importante a mano; lo técnico queda en administración avanzada.</p></div></header>
  {['owner','admin'].includes(role)&&<PlanSettings planMap={planMap} onChange={onPlanSetting} onImport={onImportPlans} loaded={Object.keys(data.trainingPlans||{})}/>}
  {canBackup&&<section className="panel backup-panel"><div className="panel-title"><div><p className="eyebrow">RESPALDOS</p><h3>Copias de seguridad</h3><p className="muted">Guarda una copia fuera de la app de forma periódica.</p></div><Badge tone="info">Luis y Morita</Badge></div><div className="backup-actions"><button className="secondary backup-btn" onClick={exportStudents}><strong>Alumnos</strong><small>CSV</small></button><button className="secondary backup-btn" onClick={exportAttendance}><strong>Asistencias</strong><small>CSV</small></button><button className="secondary backup-btn" onClick={exportHistory}><strong>Historial</strong><small>CSV</small></button><button className="primary backup-btn backup-full" onClick={exportFullBackup}><strong>Respaldo completo</strong><small>JSON</small></button></div><div className="backup-status"><span>Último respaldo:</span><strong>{displayBackupDate(lastBackup)}</strong></div></section>}
  {cloudEnabled&&['owner','admin'].includes(role)&&<section className="panel"><div className="panel-title"><div><p className="eyebrow">USUARIOS</p><h3>Profesores con acceso</h3></div><Badge>{data.profiles?.length||0}</Badge></div><div className="team-list">{(data.profiles||[]).map(x=><div className="team-row" key={x.id}><div><strong>{x.full_name}</strong><small>@{x.username}{x.id===user?.id?' · tu cuenta':''}</small></div>{role==='owner'?<select value={x.role} onChange={e=>changeRole(x.id,e.target.value)} disabled={x.id===user?.id&&x.role==='owner'}><option value="owner">Dueño</option><option value="admin">Administrador</option><option value="coach">Entrenador</option></select>:<Badge>{roleLabel(x.role)}</Badge>}</div>)}</div></section>}
  <details className="advanced-settings"><summary><span><strong>Administración avanzada</strong><small>Cuenta, contraseña, permisos y reglas</small></span><b>⌄</b></summary><div className="advanced-settings-body"><div className="profile-grid"><section className="panel"><h3>Cuenta actual</h3><dl className="details"><div><dt>Nombre</dt><dd>{profile?.full_name||'—'}</dd></div><div><dt>Usuario</dt><dd>{profile?.username||user?.email?.split('@')[0]||'—'}</dd></div><div><dt>Rol</dt><dd>{roleLabel(role)}</dd></div><div><dt>Datos</dt><dd>{cloudEnabled?'Nube':'Demo local'}</dd></div></dl></section><section className="panel"><h3>Cambiar contraseña</h3><form className="form-stack" onSubmit={changePassword}><label>Nueva contraseña<input type="password" minLength="8" value={p} onChange={e=>setP(e.target.value)}/></label><label>Repetir<input type="password" minLength="8" value={c} onChange={e=>setC(e.target.value)}/></label><button className="primary" disabled={!cloudEnabled||!p}>Cambiar contraseña</button></form>{message&&<div className="inline-notice">{message}</div>}</section><section className="panel"><h3>Permisos</h3><ul className="rule-list"><li><strong>Administrador:</strong> gestión completa de alumnos, planes y respaldos.</li><li><strong>Entrenador:</strong> consulta, asistencia y seguimiento deportivo.</li><li><strong>Demo pública:</strong> todos los datos son ficticios y se guardan solo en este navegador.</li></ul></section><section className="panel"><h3>Reglas operativas</h3><ul className="rule-list"><li>Lunes, miércoles y viernes.</li><li>Turnos 7–9, 10–13 y 14+.</li><li>Alerta a las {ALERT_ABSENCES} faltas consecutivas.</li><li>U9–U21 se calcula por edad.</li><li>Las bajas conservan historial.</li></ul></section></div></div></details>
  </div>;
}

function studentAttendance(data,studentId){const sessions=Object.fromEntries(data.sessions.map(s=>[s.id,s]));return data.attendance.filter(a=>a.student_id===studentId).map(a=>({...a,...sessions[a.session_id]})).filter(x=>x.session_date).sort((a,b)=>b.session_date.localeCompare(a.session_date));}
function attendanceMap(data,date,shiftId){const session=data.sessions.find(s=>s.session_date===date&&Number(s.shift_id)===Number(shiftId));if(!session)return{};return Object.fromEntries(data.attendance.filter(a=>a.session_id===session.id).map(a=>[a.student_id,a.status]));}
function studentsWithAbsenceAlerts(data){return data.students.filter(activeStudent).map(student=>{const rec=studentAttendance(data,student.id);let count=0;for(const r of rec){if(r.status==='Falta')count++;else if(r.status==='Justificado')continue;else break;}return{student,count};}).filter(x=>x.count>=ALERT_ABSENCES).sort((a,b)=>b.count-a.count);}
function monthlyAttendanceRate(data){const now=new Date();const prefix=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;const ids=new Set(data.sessions.filter(s=>s.session_date?.startsWith(prefix)).map(s=>s.id));const rows=data.attendance.filter(a=>ids.has(a.session_id));if(!rows.length)return 0;return Math.round(rows.filter(r=>['Presente','Tardanza'].includes(r.status)).length/rows.length*100);}
function statusClass(s){return s==='Presente'?'ok':s==='Tardanza'?'info':s==='Justificado'?'warn':'danger';}
function historyLabel(k){return({alta:'Alta',status:'Estado',shift_id:'Turno',level:'Nivel',category:'Categoría'})[k]||k;}

export default function SpaceJumpApp(){
  const store=useSpaceJumpData();const [view,setView]=useState('dashboard');const [editing,setEditing]=useState(false);const [selected,setSelected]=useState(null);const [planSel,setPlanSel]=useState(null);const [mobileMore,setMobileMore]=useState(false);const plans=store.data.trainingPlans||{};
  if(store.configurationError)return <main className="login-screen"><section className="login-card"><img src="/logo-spacejump.png" className="login-logo" alt="Space Jump"/><p className="eyebrow">SPACE JUMP HUB</p><h1>Configuración incompleta</h1><p className="muted">Esta compilación requiere configuración de backend.</p><div className="error-box">Revisa la configuración del proyecto.</div></section></main>;
  if(store.loading)return <div className="splash"><img src="/logo-spacejump.png"/><span>Cargando Space Jump Hub…</span></div>;
  if(store.recoveryMode)return <NewPassword updatePassword={store.updatePassword}/>;
  if(!store.user)return <Login signIn={store.signIn} cloudEnabled={store.cloudEnabled}/>;
  async function saveStudent(s){await store.upsertStudent(s);setEditing(false);setSelected(null);setView('students');}
  function openPlan(shiftId,n){setPlanSel({shiftId,n});setView('plan');setSelected(null);}function openFromAlert(s){setSelected(s);setView('students');}
  const alertCount=studentsWithAbsenceAlerts(store.data).length;
  const nav=[['dashboard','⌂','Inicio'],['students','◉','Alumnos'],['attendance','✓','Asistencia'],['plan','◈','Entrenamientos'],['alerts','!','Alertas'],['reports','▥','Reportes'],['settings','⚙','Configuración']];
  const mobileNav=nav.filter(([id])=>['dashboard','students','attendance','plan'].includes(id));
  const mobileMoreActive=['alerts','reports','settings'].includes(view);
  function goMobile(id){setView(id);setSelected(null);setPlanSel(null);setMobileMore(false);}
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><img src="/logo-spacejump.png"/><div><strong>SPACE JUMP</strong><small>HUB</small></div></div><nav>{nav.map(([id,icon,label])=><button key={id} className={view===id?'active':''} onClick={()=>{setView(id);setSelected(null);setPlanSel(null)}}><span>{icon}</span>{label}{id==='alerts'&&alertCount>0&&<b className="nav-dot">{alertCount}</b>}</button>)}</nav><div className="sidebar-foot"><small>{store.cloudEnabled?'● Nube conectada':'● Demo pública local'}</small><strong>{store.profile?.full_name} · {roleLabel(store.role)}</strong><button onClick={store.signOut}>Cerrar sesión</button></div></aside><main className="content"><div className="mobile-top"><div className="brand mini"><img src="/logo-spacejump.png"/><strong>SPACE JUMP HUB</strong></div></div>
  {view==='dashboard'&&<Dashboard data={store.data} setView={setView} profile={store.profile} plans={plans} planMap={store.planMap} onOpenPlan={openPlan}/>} 
  {view==='students'&&!selected&&<Students data={store.data} role={store.role} onEdit={setEditing} onSelect={setSelected}/>} 
  {view==='students'&&selected&&<StudentProfile student={store.data.students.find(s=>s.id===selected.id)||selected} data={store.data} role={store.role} plans={plans} planMap={store.planMap} onOpenPlan={openPlan} onSaveStudent={store.upsertStudent} onSaveEval={store.saveEvaluations} onBack={()=>setSelected(null)} onEdit={setEditing} onStatus={async(id,status,note)=>{const r=await store.setStudentStatus(id,status,note);if(!r?.ok&&r?.error)window.alert(r.error);}} onDelete={async student=>{const ok=window.confirm(`¿Eliminar definitivamente a ${student.first_name} ${student.last_name}?\n\nSe eliminarán su ficha, asistencias, historial y foto. Esta acción NO se puede deshacer.`);if(!ok)return;const r=await store.deleteStudent(student.id);if(!r.ok){window.alert(r.error);return;}setSelected(null);}}/>}
  {view==='attendance'&&<Attendance data={store.data} onSave={store.saveAttendance} plans={plans} planMap={store.planMap} onOpenPlan={openPlan} onSaveProgress={store.saveSessionProgress}/>} 
  {view==='plan'&&<PlanView data={store.data} plans={plans} planMap={store.planMap} role={store.role} sel={planSel} onSave={store.saveSessionProgress} onDelete={store.deleteSessionProgress} onSaveEvals={store.saveEvaluations}/>} 
  {view==='alerts'&&<Alerts data={store.data} onSelect={openFromAlert}/>} 
  {view==='reports'&&<Reports data={store.data}/>} 
  {view==='settings'&&<Settings cloudEnabled={store.cloudEnabled} role={store.role} user={store.user} profile={store.profile} data={store.data} onRoleChange={store.updateTeamRole} onPasswordChange={store.updatePassword} planMap={store.planMap} onPlanSetting={store.savePlanSetting} onImportPlans={store.saveTrainingPlans}/>} 
  </main>
  {view==='students'&&!selected&&canManageStudents(store.role)&&<button className="mobile-fab" onClick={()=>setEditing(null)}>+</button>}
  {mobileMore&&<div className="mobile-more-backdrop" onClick={()=>setMobileMore(false)}>
    <section className="mobile-more-sheet" onClick={e=>e.stopPropagation()}>
      <div className="mobile-more-handle"/>
      <div className="mobile-more-head"><div><p className="eyebrow">SPACE JUMP HUB</p><h3>Más opciones</h3></div><button className="icon-btn" onClick={()=>setMobileMore(false)}>×</button></div>
      <div className="mobile-more-grid">
        <button onClick={()=>goMobile('reports')}><span>▥</span><strong>Reportes</strong><small>Asistencia por día y mensual</small></button>
        <button onClick={()=>goMobile('alerts')}><span>!</span><strong>Alertas</strong><small>Faltas, cumpleaños y cambios</small>{alertCount>0&&<b className="more-count">{alertCount}</b>}</button>
        <button onClick={()=>goMobile('settings')}><span>⚙</span><strong>Configuración</strong><small>Planes, respaldos y usuarios</small></button>
        <button className="logout-option" onClick={store.signOut}><span>↪</span><strong>Cerrar sesión</strong><small>Salir de esta cuenta</small></button>
      </div>
      <div className="mobile-more-user"><span>{store.cloudEnabled?'● Nube conectada':'● Demo pública local'}</span><strong>{store.profile?.full_name} · {roleLabel(store.role)}</strong></div>
    </section>
  </div>}
  <nav className="bottom-nav">
    {mobileNav.map(([id,icon,label])=><button key={id} className={view===id?'active':''} onClick={()=>goMobile(id)}><span>{icon}</span><small>{label}</small></button>)}
    <button className={mobileMoreActive||mobileMore?'active':''} onClick={()=>setMobileMore(v=>!v)}><span>•••</span><small>Más</small>{alertCount>0&&<b className="bottom-more-dot">{alertCount}</b>}</button>
  </nav>
  {editing!==false&&<StudentForm student={editing||null} onClose={()=>setEditing(false)} onSave={saveStudent}/>}
</div>;
}
