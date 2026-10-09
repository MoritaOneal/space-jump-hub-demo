'use client';

export const CURRENT_SEASON='2026-2027';
export const DEFAULT_PLAN_BY_SHIFT={1:'U9',2:'U13',3:'U17'};
export const PLAN_CATEGORIES=['U9','U11','U13','U15','U17','U19','U21'];
export const PLAN_CATEGORY_LABELS={U9:'7–9',U11:'10–11',U13:'12–13',U15:'14–15',U17:'16–17',U19:'18–19',U21:'20–21'};

export function shiftRows(progress,shiftId,seasonId=CURRENT_SEASON,planCategory=null){
  return(progress||[]).filter(p=>Number(p.shift_id)===Number(shiftId)&&(!p.season_id||p.season_id===seasonId)&&(!planCategory||!p.plan_category||p.plan_category===planCategory));
}
export function planState(plan,rows,todayISO){
  if(!plan?.sessions?.length)return{total:0,done:0,expected:0,diff:0,next:null,realized:new Map(),complete:false,notStarted:false,startsOn:null};
  const realized=new Map();
  rows.filter(r=>r.status==='Realizada').sort((a,b)=>String(a.session_date).localeCompare(String(b.session_date))).forEach(r=>realized.set(Number(r.session_n),r));
  const sessions=plan.sessions;
  const next=sessions.find(s=>!realized.has(Number(s.n)))||null;
  const expected=sessions.filter(s=>s.d<=todayISO).length;
  const done=realized.size;
  return{total:sessions.length,done,expected,diff:done-expected,next,realized,complete:!next,notStarted:todayISO<sessions[0].d,startsOn:sessions[0].d};
}
export function sessionRecords(rows,n){
  const mine=rows.filter(r=>Number(r.session_n)===Number(n));
  return{
    realized:mine.filter(r=>r.status==='Realizada').sort((a,b)=>String(b.session_date).localeCompare(String(a.session_date)))[0]||null,
    suspended:mine.filter(r=>r.status==='Suspendida').sort((a,b)=>String(b.session_date).localeCompare(String(a.session_date))),
    all:mine.sort((a,b)=>String(b.session_date).localeCompare(String(a.session_date)))
  };
}
export function paceText(st){
  if(!st.total)return'Sin plan cargado';
  if(st.complete)return'Plan completo';
  if(st.notStarted)return`El plan inicia el ${fmt(st.startsOn)}`;
  if(st.diff===0)return'Al día con el calendario';
  if(st.diff<0)return`${-st.diff} sesión${st.diff===-1?'':'es'} por recuperar`;
  return`${st.diff} sesión${st.diff===1?'':'es'} adelantado`;
}
export function paceTone(st){
  if(st.complete||st.diff>=0||st.notStarted)return'ok';
  return st.diff<=-4?'danger':'warn';
}
function fmt(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');return`${d}/${m}/${y}`;}
