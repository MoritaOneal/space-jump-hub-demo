'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase, cloudEnabled, configurationError } from './supabase';
import { SHIFTS, ageOnDate, developmentCategory, localDateISO } from './config';
import { CURRENT_SEASON, DEFAULT_PLAN_BY_SHIFT, PLAN_CATEGORIES } from './plan';

const KEY='space_jump_hub_public_demo_v1';
const todayISO=()=>localDateISO();
const uid=()=>crypto.randomUUID();
const emptyData=()=>({students:[],sessions:[],attendance:[],history:[],profiles:[],planProgress:[],planSettings:[],evaluations:[],trainingPlans:{}});

const demoStudents=[
  {id:'demo-1',first_name:'Mateo',last_name:'Quispe',birth_date:'2018-04-16',sex:'Masculino',phone:'',guardian_name:'Rosa Quispe',guardian_phone:'900111101',emergency_name:'Rosa Quispe',emergency_phone:'900111101',join_date:'2026-09-01',status:'Activo',level:'Iniciación',shift_id:1,notes:'Buen entusiasmo. Reforzar mano no dominante.'},
  {id:'demo-2',first_name:'Sofía',last_name:'Torres',birth_date:'2018-10-10',sex:'Femenino',phone:'',guardian_name:'Marco Torres',guardian_phone:'900111102',emergency_name:'Marco Torres',emergency_phone:'900111102',join_date:'2026-08-18',status:'Activo',level:'Desarrollo',shift_id:1,notes:'Mejoró coordinación y cambios de dirección.'},
  {id:'demo-3',first_name:'Thiago',last_name:'Mendoza',birth_date:'2017-07-22',sex:'Masculino',phone:'',guardian_name:'Elena Mendoza',guardian_phone:'900111103',emergency_name:'Elena Mendoza',emergency_phone:'900111103',join_date:'2026-09-20',status:'Prueba',level:'Iniciación',shift_id:1,notes:'Nuevo en el grupo. Priorizar adaptación y diversión.'},
  {id:'demo-4',first_name:'Valentina',last_name:'Ramos',birth_date:'2015-11-03',sex:'Femenino',phone:'',guardian_name:'Carlos Ramos',guardian_phone:'900222201',emergency_name:'Carlos Ramos',emergency_phone:'900222201',join_date:'2026-07-15',status:'Activo',level:'Desarrollo',shift_id:2,notes:'Buena toma de decisiones en 2v2.'},
  {id:'demo-5',first_name:'Luciana',last_name:'Flores',birth_date:'2014-10-12',sex:'Femenino',phone:'',guardian_name:'María Flores',guardian_phone:'900222202',emergency_name:'María Flores',emergency_phone:'900222202',join_date:'2026-04-05',status:'Activo',level:'Intermedio',shift_id:2,notes:'Trabajar consistencia de tiro y lectura del closeout.'},
  {id:'demo-6',first_name:'Sebastián',last_name:'Cruz',birth_date:'2013-01-27',sex:'Masculino',phone:'',guardian_name:'José Cruz',guardian_phone:'900222203',emergency_name:'José Cruz',emergency_phone:'900222203',join_date:'2026-05-11',status:'Activo',level:'Desarrollo',shift_id:2,notes:'Muy buen pase. Mejorar finalización con contacto.'},
  {id:'demo-7',first_name:'Diego',last_name:'Salazar',birth_date:'2010-02-21',sex:'Masculino',phone:'900333301',guardian_name:'Ana Salazar',guardian_phone:'900333311',emergency_name:'Ana Salazar',emergency_phone:'900333311',join_date:'2025-03-10',status:'Activo',level:'Intermedio',shift_id:3,notes:'Trabajar balance defensivo y finalización con contacto.'},
  {id:'demo-8',first_name:'Camila',last_name:'Vargas',birth_date:'2009-10-09',sex:'Femenino',phone:'900333302',guardian_name:'Paola Vargas',guardian_phone:'900333312',emergency_name:'Paola Vargas',emergency_phone:'900333312',join_date:'2025-11-02',status:'Activo',level:'Avanzado',shift_id:3,notes:'Liderazgo positivo. Enfocar toma de decisiones bajo presión.'},
  {id:'demo-9',first_name:'Joaquín',last_name:'Salas',birth_date:'2008-06-15',sex:'Masculino',phone:'900333303',guardian_name:'Miguel Salas',guardian_phone:'900333313',emergency_name:'Miguel Salas',emergency_phone:'900333313',join_date:'2026-01-08',status:'Pausa',level:'Competitivo',shift_id:3,notes:'Seguimiento de carga y retorno progresivo.'},
];

const demoDates=['2026-10-05','2026-10-07'];
const demoSessions=demoDates.flatMap((date,di)=>SHIFTS.map(sh=>({
  id:`demo-session-${di+1}-${sh.id}`,session_date:date,shift_id:sh.id,start_time:sh.start,end_time:sh.end,created_by:'demo'
})));
const demoAttendance=demoSessions.flatMap((session,si)=>demoStudents.filter(s=>Number(s.shift_id)===Number(session.shift_id)&&!['Inactivo','Retirado'].includes(s.status)).map((s,i)=>({
  id:`demo-att-${si+1}-${s.id}`,session_id:session.id,student_id:s.id,
  status:(si+i)%9===0?'Tardanza':(si+i)%11===0?'Falta':'Presente',recorded_by:'demo'
})));
const demoHistory=demoStudents.map((s,i)=>({id:`demo-history-${i+1}`,student_id:s.id,kind:'alta',old_value:'',new_value:s.status,effective_date:s.join_date,changed_by:'demo'}));

const demoEvaluations=[
  {id:'demo-eval-2',season_id:CURRENT_SEASON,student_id:'demo-2',plan_category:'U9',eval_n:1,eval_date:'2026-10-07',sprint:'Verde',jump:'Amarillo',braking:'Verde',balance:'Verde',ball_handling:'Verde',passing:'Verde',finishing:'Amarillo',shooting:'Amarillo',spacing:'Verde',defense:'Amarillo',transition:'Verde',decision_making:'Verde',sprint_seconds:2.41,jump_cm:24,notes:'Buena evolución general.',plan_notes:'1) Mano izquierda en 1v1\n2) Frenado y salida\n3) Finalizaciones cercanas\n4) Decidir rápido en 2v1'},
  {id:'demo-eval-5',season_id:CURRENT_SEASON,student_id:'demo-5',plan_category:'U13',eval_n:1,eval_date:'2026-10-07',sprint:'Verde',jump:'Verde',braking:'Verde',balance:'Verde',ball_handling:'Verde',passing:'Verde',finishing:'Verde',shooting:'Amarillo',spacing:'Verde',defense:'Amarillo',transition:'Verde',decision_making:'Verde',sprint_seconds:2.15,jump_cm:31,notes:'Buen ritmo competitivo.',plan_notes:'1) Tiro tras recepción\n2) Lectura de closeout\n3) Defensa del 1v1\n4) Finalización con ambas manos'},
  {id:'demo-eval-8',season_id:CURRENT_SEASON,student_id:'demo-8',plan_category:'U17',eval_n:1,eval_date:'2026-10-07',sprint:'Verde',jump:'Verde',braking:'Verde',balance:'Verde',ball_handling:'Verde',passing:'Verde',finishing:'Verde',shooting:'Verde',spacing:'Verde',defense:'Verde',transition:'Verde',decision_making:'Amarillo',sprint_seconds:1.92,jump_cm:42,notes:'Nivel alto y buena capacidad de liderazgo.',plan_notes:'1) Decisión bajo presión\n2) Tiro tras bote\n3) Lectura PnR\n4) Liderazgo defensivo'}
];

function demoTrainingDates(count=144){
  const out=[];const d=new Date('2026-10-05T12:00:00');
  while(out.length<count){
    if([1,3,5].includes(d.getDay()))out.push(localDateISO(d));
    d.setDate(d.getDate()+1);
  }
  return out;
}
function makeDemoPlan(cat){
  const focus=['Fundamentos y coordinación','Manejo y cambios de dirección','Pase y recepción','Finalizaciones','Tiro y spacing','1v1 ofensivo','Defensa individual','Transición','2v2 y 3v3','Rebote y salida','Lectura del juego','Integración y evaluación'];
  const blocks=focus.map((f,i)=>({name:`Bloque ${i+1}`,focus:f,ev:[2,5,8,11].includes(i)}));
  const dates=demoTrainingDates();
  const sessions=dates.map((d,i)=>{
    const n=i+1,m=Math.floor(i/12)+1,t=Math.floor(i/3)+1,s=i%3+1;
    const objectives=['Control de balón y cambios de ritmo','Pase, corte y ocupación de espacios','Finalización y toma de decisiones'];
    return {n,m,t,s,d,obj:objectives[i%objectives.length],warm:['Movilidad dinámica y coordinación','Juego breve de reacción con balón'],main:[
      ['Activación técnica',10,'Trabajo dinámico con balón, cambios de mano y percepción del espacio.'],
      ['Juego reducido',15,'Situación 1v1 o 2v2 con una regla que obligue a leer al defensor.'],
      ['Decisión aplicada',15,'Resolver ventajas en espacio reducido con pase, corte o finalización.'],
      ['Competencia',10,'Juego corto con puntuación y objetivo técnico de la sesión.']
    ],cool:['Respiración y movilidad suave','Pregunta rápida: qué decisión funcionó mejor hoy'],obs:['Evitar filas largas','Corregir con preguntas cortas','Priorizar intensidad y participación'],mat:['Balones','Conos','Petos'],hid:'h_1v1',fid:'f_trans',hcap:'1v1 con espacio y lectura del defensor',fcap:'Transición y ocupación de carriles',flip:i%2===1,ev:[12,24,36,48].includes(t)&&[1,3].includes(s)};
  });
  const ages={U9:'7–9',U11:'10–11',U13:'12–13',U15:'14–15',U17:'16–17',U19:'18–19',U21:'20–21'};
  return {cat,ages:ages[cat],total:60,blocks,sessions};
}
const demoTrainingPlans=Object.fromEntries(PLAN_CATEGORIES.map(cat=>[cat,makeDemoPlan(cat)]));

function seedLocal(){
  try{const raw=localStorage.getItem(KEY);if(raw)return JSON.parse(raw);}catch{}
  const data={...emptyData(),students:demoStudents,sessions:demoSessions,attendance:demoAttendance,history:demoHistory,evaluations:demoEvaluations,trainingPlans:demoTrainingPlans};
  localStorage.setItem(KEY,JSON.stringify(data));return data;
}
function saveLocal(data){localStorage.setItem(KEY,JSON.stringify(data));}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
function safeFileName(name='foto.jpg'){return name.toLowerCase().replace(/[^a-z0-9._-]/g,'-').replace(/-+/g,'-');}
function readPlanCache(){try{return JSON.parse(localStorage.getItem('space_jump_training_plans_2026-2027')||'{}')}catch{return{}}}
function writePlanCache(v){try{localStorage.setItem('space_jump_training_plans_2026-2027',JSON.stringify(v||{}))}catch{}}

export function useSpaceJumpData(){
  const [mode]=useState(configurationError?'error':cloudEnabled?'cloud':'local');
  const [loading,setLoading]=useState(true);
  const [user,setUser]=useState(null);
  const [role,setRole]=useState(cloudEnabled||configurationError?null:'admin');
  const [profile,setProfile]=useState(cloudEnabled||configurationError?null:{full_name:'Demo Admin',username:'demo',role:'admin'});
  const [recoveryMode,setRecoveryMode]=useState(false);
  const [data,setData]=useState(emptyData());

  useEffect(()=>{
    if(configurationError){setLoading(false);return;}
    if(!cloudEnabled){setData(seedLocal());setUser({email:'demo@spacejump.invalid',name:'Demo Admin'});setLoading(false);return;}
    let mounted=true;
    (async()=>{const {data:{session}}=await supabase.auth.getSession();if(!mounted)return;if(session?.user){setUser(session.user);await loadCloud(session.user.id);}else setLoading(false);})();
    const {data:listener}=supabase.auth.onAuthStateChange(async(evt,session)=>{
      if(evt==='PASSWORD_RECOVERY')setRecoveryMode(true);
      if(session?.user){setUser(session.user);await loadCloud(session.user.id);}else{setUser(null);setRole(null);setProfile(null);setData(emptyData());setLoading(false);}
    });
    return()=>{mounted=false;listener.subscription.unsubscribe();};
  },[]);

  async function attachPhotoUrls(students){
    if(!cloudEnabled)return students;
    return Promise.all(students.map(async s=>{
      if(!s.photo_path)return {...s,photo_url:null};
      const {data:signed}=await supabase.storage.from('student-photos').createSignedUrl(s.photo_path,3600);
      return {...s,photo_url:signed?.signedUrl||null};
    }));
  }

  async function loadCloud(userId,{showLoading=true}={}){
    if(showLoading)setLoading(true);
    const {data:p,error:profileError}=await supabase.from('profiles').select('*').eq('id',userId).maybeSingle();
    if(profileError)console.error(profileError);
    const effective=p||{full_name:'Entrenador',username:'coach',role:'coach'};
    setRole(effective.role||'coach');setProfile(effective);
    const [studentsRes,sessionsRes,attendanceRes,historyRes,profilesRes,progressRes,settingsRes,evalRes,plansRes]=await Promise.all([
      supabase.from('students').select('*').order('last_name'),
      supabase.from('training_sessions').select('*').order('session_date',{ascending:false}),
      supabase.from('attendance').select('*'),
      supabase.from('student_history').select('*').order('effective_date',{ascending:false}),
      ['owner','admin'].includes(effective.role)?supabase.from('profiles').select('*').order('created_at'):Promise.resolve({data:[effective]}),
      supabase.from('plan_progress').select('*').eq('season_id',CURRENT_SEASON).order('session_date',{ascending:false}),
      supabase.from('plan_settings').select('*').eq('season_id',CURRENT_SEASON),
      supabase.from('student_evaluations').select('*').eq('season_id',CURRENT_SEASON).order('eval_n'),
      supabase.from('training_plans').select('season_id,category,plan_data,updated_at').eq('season_id',CURRENT_SEASON)
    ]);
    const students=await attachPhotoUrls(studentsRes.data||[]);
    let trainingPlans=Object.fromEntries((plansRes.data||[]).filter(x=>PLAN_CATEGORIES.includes(x.category)&&x.plan_data).map(x=>[x.category,x.plan_data]));
    if(Object.keys(trainingPlans).length)writePlanCache(trainingPlans);else trainingPlans=readPlanCache();
    setData({
      students,
      sessions:sessionsRes.data||[],
      attendance:attendanceRes.data||[],
      history:historyRes.data||[],
      profiles:profilesRes.data||[effective],
      planProgress:progressRes.data||[],
      planSettings:settingsRes.data||[],
      evaluations:evalRes.data||[],
      trainingPlans
    });
    setLoading(false);
  }

  function patchLocal(fn){setData(prev=>{const next=fn(prev);saveLocal(next);return next;});}
  function normalizeUsername(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9._-]/g,'');}
  function internalEmail(username){return `${normalizeUsername(username)}@spacejump.invalid`;}

  async function signIn(username,password){
    const clean=normalizeUsername(username);if(!clean)return{ok:false,error:'Escribe tu usuario.'};
    if(!cloudEnabled){const users={demo:{full_name:'Demo Admin',role:'admin'},coach:{full_name:'Demo Coach',role:'coach'}};const p=users[clean];if(!p)return{ok:false,error:'Usuario no reconocido.'};setUser({email:internalEmail(clean),name:p.full_name});setRole(p.role);setProfile({...p,username:clean});return{ok:true};}
    const {error}=await supabase.auth.signInWithPassword({email:internalEmail(clean),password});return{ok:!error,error:error?.message};
  }
  async function signOut(){if(cloudEnabled)await supabase.auth.signOut();else setUser(null);}
  async function updatePassword(password){if(!cloudEnabled)return{ok:false,error:'Disponible al conectar Supabase.'};if(!password||password.length<8)return{ok:false,error:'Usa al menos 8 caracteres.'};const {error}=await supabase.auth.updateUser({password});if(!error)setRecoveryMode(false);return{ok:!error,error:error?.message};}
  async function updateTeamRole(profileId,newRole){if(!cloudEnabled)return{ok:false,error:'Disponible al conectar Supabase.'};if(role!=='owner')return{ok:false,error:'Solo Luis puede cambiar roles.'};const {error}=await supabase.from('profiles').update({role:newRole}).eq('id',profileId);if(!error)await loadCloud(user.id,{showLoading:false});return{ok:!error,error:error?.message};}

  async function upsertStudent(student){
    const photoFile=student._photoFile||null;const removePhoto=Boolean(student._removePhoto);
    const clean={...student};delete clean._photoFile;delete clean._removePhoto;delete clean.age;delete clean.category;delete clean.photo_url;
    const enriched={...clean,id:clean.id||uid(),updated_at:new Date().toISOString()};
    if(mode==='local'){
      if(photoFile)enriched.photo_url=await fileToDataUrl(photoFile);
      if(removePhoto)enriched.photo_url=null;
      patchLocal(prev=>{const exists=prev.students.some(s=>s.id===enriched.id);const old=prev.students.find(s=>s.id===enriched.id);const students=exists?prev.students.map(s=>s.id===enriched.id?{...s,...enriched}:s):[...prev.students,{...enriched,created_at:new Date().toISOString()}];const history=[...prev.history];if(old){['status','shift_id','level'].forEach(k=>{if(String(old[k])!==String(enriched[k]))history.push({id:uid(),student_id:enriched.id,kind:k,old_value:String(old[k]??''),new_value:String(enriched[k]??''),effective_date:todayISO()});});}else history.push({id:uid(),student_id:enriched.id,kind:'alta',old_value:'',new_value:enriched.status,effective_date:enriched.join_date||todayISO()});return{...prev,students,history};});
      return enriched;
    }
    const previous=data.students.find(s=>s.id===enriched.id);
    if(photoFile){
      if(!photoFile.type?.startsWith('image/'))throw new Error('La foto debe ser una imagen.');
      if(photoFile.size>5*1024*1024)throw new Error('La foto no puede superar 5 MB.');
      const path=`${enriched.id}/${Date.now()}-${safeFileName(photoFile.name)}`;
      const {error:uploadError}=await supabase.storage.from('student-photos').upload(path,photoFile,{upsert:false,contentType:photoFile.type});
      if(uploadError)throw uploadError;
      if(previous?.photo_path)await supabase.storage.from('student-photos').remove([previous.photo_path]);
      enriched.photo_path=path;
    }else if(removePhoto&&previous?.photo_path){
      await supabase.storage.from('student-photos').remove([previous.photo_path]);enriched.photo_path=null;
    }
    const {data:row,error}=await supabase.from('students').upsert(enriched).select().single();if(error)throw error;
    const hist=[];
    if(!previous)hist.push({student_id:row.id,kind:'alta',old_value:'',new_value:row.status,effective_date:row.join_date,changed_by:user.id});
    else{
      if(previous.status!==row.status)hist.push({student_id:row.id,kind:'status',old_value:previous.status,new_value:row.status,effective_date:todayISO(),note:row.exit_reason||null,changed_by:user.id});
      if(Number(previous.shift_id)!==Number(row.shift_id))hist.push({student_id:row.id,kind:'shift_id',old_value:String(previous.shift_id),new_value:String(row.shift_id),effective_date:todayISO(),changed_by:user.id});
      if(previous.level!==row.level)hist.push({student_id:row.id,kind:'level',old_value:previous.level,new_value:row.level,effective_date:todayISO(),changed_by:user.id});
    }
    if(hist.length)await supabase.from('student_history').insert(hist);
    await loadCloud(user.id,{showLoading:false});return row;
  }

  async function setStudentStatus(studentId,status,note=''){
    const student=data.students.find(s=>s.id===studentId);if(!student)return{ok:false,error:'Alumno no encontrado.'};
    const leaving=['Inactivo','Retirado'].includes(status);
    const changes={status,exit_date:leaving?todayISO():null,exit_reason:leaving?(note||'Sin motivo registrado'):null};
    if(mode==='local'){await upsertStudent({...student,...changes});return{ok:true};}
    const {error}=await supabase.from('students').update(changes).eq('id',studentId);if(error)return{ok:false,error:error.message};
    await supabase.from('student_history').insert({student_id:studentId,kind:'status',old_value:student.status,new_value:status,effective_date:todayISO(),note:note||null,changed_by:user.id});
    await loadCloud(user.id,{showLoading:false});return{ok:true};
  }

  async function deleteStudent(studentId){
    const student=data.students.find(s=>s.id===studentId);if(!student)return{ok:false,error:'Alumno no encontrado.'};if(!['owner','admin'].includes(role))return{ok:false,error:'No tienes permiso.'};
    if(mode==='local'){patchLocal(prev=>({...prev,students:prev.students.filter(s=>s.id!==studentId),attendance:prev.attendance.filter(a=>a.student_id!==studentId),history:prev.history.filter(h=>h.student_id!==studentId)}));return{ok:true};}
    if(student.photo_path)await supabase.storage.from('student-photos').remove([student.photo_path]);
    const {error}=await supabase.from('students').delete().eq('id',studentId);if(error)return{ok:false,error:error.message};await loadCloud(user.id,{showLoading:false});return{ok:true};
  }

  async function saveAttendance({date,shiftId,marks}){
    if(mode==='local'){patchLocal(prev=>{let session=prev.sessions.find(s=>s.session_date===date&&Number(s.shift_id)===Number(shiftId));let sessions=prev.sessions;if(!session){const sh=SHIFTS.find(s=>s.id===Number(shiftId));session={id:uid(),session_date:date,shift_id:Number(shiftId),start_time:sh.start,end_time:sh.end,created_by:profile?.username};sessions=[...sessions,session];}let attendance=prev.attendance.filter(a=>!(a.session_id===session.id && Object.prototype.hasOwnProperty.call(marks,a.student_id)));attendance=[...attendance,...Object.entries(marks).map(([student_id,status])=>({id:uid(),session_id:session.id,student_id,status,recorded_by:profile?.username}))];return{...prev,sessions,attendance};});return{ok:true};}
    const sh=SHIFTS.find(s=>s.id===Number(shiftId));let {data:session}=await supabase.from('training_sessions').select('*').eq('session_date',date).eq('shift_id',shiftId).maybeSingle();
    if(!session){const res=await supabase.from('training_sessions').insert({session_date:date,shift_id:shiftId,start_time:sh.start,end_time:sh.end,created_by:user.id}).select().single();if(res.error)return{ok:false,error:res.error.message};session=res.data;}
    const rows=Object.entries(marks).map(([student_id,status])=>({session_id:session.id,student_id,status,recorded_by:user.id}));
    if(rows.length){const {error}=await supabase.from('attendance').upsert(rows,{onConflict:'session_id,student_id'});if(error)return{ok:false,error:error.message};}
    await loadCloud(user.id,{showLoading:false});return{ok:true};
  }

  // ---- Plan interactivo + evaluaciones ----
  const moduleError=error=>{
    const m=error?.message||'';
    if(/training_plans|plan_progress|plan_settings|student_evaluations|schema cache|does not exist/i.test(m)||error?.code==='42P01')return'Falta instalar el módulo de Plan/Evaluaciones en Supabase. Ejecuta supabase/PLAN_Y_EVALUACIONES_V3.sql.';
    return m||'No se pudo completar la operación.';
  };
  async function saveTrainingPlans(plans){
    const cats=Object.keys(plans||{}).filter(x=>PLAN_CATEGORIES.includes(x));
    if(!cats.length)return{ok:false,error:'No se encontraron planes válidos.'};
    if(!['owner','admin'].includes(role))return{ok:false,error:'Solo Luis o Morita pueden importar planes.'};
    if(mode==='local'){patchLocal(prev=>{const next={...(prev.trainingPlans||{}),...plans};writePlanCache(next);return{...prev,trainingPlans:next}});return{ok:true};}
    const rows=cats.map(category=>({season_id:CURRENT_SEASON,category,plan_data:plans[category],updated_by:user.id,updated_at:new Date().toISOString()}));
    const {error}=await supabase.from('training_plans').upsert(rows,{onConflict:'season_id,category'});
    if(error)return{ok:false,error:moduleError(error)};
    writePlanCache({...data.trainingPlans,...plans});
    await loadCloud(user.id,{showLoading:false});return{ok:true};
  }
  async function saveSessionProgress({shiftId,planCategory,sessionN,date,status,rpe='',notes=''}){
    if(!['Realizada','Suspendida'].includes(status))return{ok:false,error:'Estado no válido.'};
    const cat=PLAN_CATEGORIES.includes(planCategory)?planCategory:(planMap[Number(shiftId)]||DEFAULT_PLAN_BY_SHIFT[Number(shiftId)]);
    const row={season_id:CURRENT_SEASON,shift_id:Number(shiftId),plan_category:cat,session_n:Number(sessionN),session_date:date,status,rpe:rpe?Number(rpe):null,notes:notes?String(notes).slice(0,500):null};
    if(mode==='local'){patchLocal(prev=>{const rest=(prev.planProgress||[]).filter(p=>!(p.season_id===CURRENT_SEASON&&Number(p.shift_id)===row.shift_id&&p.plan_category===cat&&p.session_date===row.session_date));return{...prev,planProgress:[...rest,{...row,id:uid(),recorded_by:profile?.username}]}});return{ok:true};}
    const {error}=await supabase.from('plan_progress').upsert({...row,recorded_by:user.id},{onConflict:'season_id,shift_id,plan_category,session_date'});
    if(error)return{ok:false,error:moduleError(error)};
    await loadCloud(user.id,{showLoading:false});return{ok:true};
  }
  async function deleteSessionProgress(id){
    if(!['owner','admin'].includes(role))return{ok:false,error:'Solo Luis o Morita pueden borrar registros del plan.'};
    if(mode==='local'){patchLocal(prev=>({...prev,planProgress:(prev.planProgress||[]).filter(p=>p.id!==id)}));return{ok:true};}
    const {error}=await supabase.from('plan_progress').delete().eq('id',id);if(error)return{ok:false,error:moduleError(error)};
    await loadCloud(user.id,{showLoading:false});return{ok:true};
  }
  async function savePlanSetting(shiftId,planCategory){
    if(!['owner','admin'].includes(role))return{ok:false,error:'Solo Luis o Morita pueden cambiar el plan de un turno.'};
    if(!PLAN_CATEGORIES.includes(planCategory))return{ok:false,error:'Plan no válido.'};
    const row={season_id:CURRENT_SEASON,shift_id:Number(shiftId),plan_category:planCategory,updated_by:user?.id||null,updated_at:new Date().toISOString()};
    if(mode==='local'){patchLocal(prev=>({...prev,planSettings:[...(prev.planSettings||[]).filter(r=>!(r.season_id===CURRENT_SEASON&&Number(r.shift_id)===row.shift_id)),row]}));return{ok:true};}
    const {error}=await supabase.from('plan_settings').upsert(row,{onConflict:'season_id,shift_id'});if(error)return{ok:false,error:moduleError(error)};
    await loadCloud(user.id,{showLoading:false});return{ok:true};
  }
  async function saveEvaluations(rows){
    if(!rows?.length)return{ok:true};
    const normalized=rows.map(r=>({...r,season_id:r.season_id||CURRENT_SEASON,plan_category:r.plan_category||planMap[Number(data.students.find(s=>s.id===r.student_id)?.shift_id)]||null}));
    if(mode==='local'){patchLocal(prev=>{const list=[...(prev.evaluations||[])];normalized.forEach(row=>{const i=list.findIndex(e=>e.student_id===row.student_id&&e.season_id===row.season_id&&Number(e.eval_n)===Number(row.eval_n));if(i>=0)list[i]={...list[i],...row};else list.push({...row,id:uid()})});return{...prev,evaluations:list}});return{ok:true};}
    const {error}=await supabase.from('student_evaluations').upsert(normalized.map(row=>({...row,evaluated_by:user.id,updated_at:new Date().toISOString()})),{onConflict:'student_id,season_id,eval_n'});
    if(error)return{ok:false,error:moduleError(error)};
    await loadCloud(user.id,{showLoading:false});return{ok:true};
  }
  const planMap=useMemo(()=>{const m={...DEFAULT_PLAN_BY_SHIFT};(data.planSettings||[]).filter(r=>!r.season_id||r.season_id===CURRENT_SEASON).forEach(r=>{if(PLAN_CATEGORIES.includes(r.plan_category))m[Number(r.shift_id)]=r.plan_category});return m},[data.planSettings]);

  const derived=useMemo(()=>{const now=new Date();const students=data.students.map(s=>{const age=ageOnDate(s.birth_date,now);return{...s,age,category:developmentCategory(age)}});return{...data,students,planProgress:data.planProgress||[],planSettings:data.planSettings||[],evaluations:data.evaluations||[],trainingPlans:data.trainingPlans||{}};},[data]);
  return {mode,cloudEnabled,configurationError,loading,user,role,profile,recoveryMode,data:derived,signIn,signOut,updatePassword,updateTeamRole,upsertStudent,setStudentStatus,deleteStudent,saveAttendance,planMap,saveTrainingPlans,saveSessionProgress,deleteSessionProgress,savePlanSetting,saveEvaluations,reload:()=>cloudEnabled&&user?loadCloud(user.id):null};
}
