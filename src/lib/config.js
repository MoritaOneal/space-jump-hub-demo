export const SHIFTS = [
  { id: 1, name: '7–9 años', minAge: 7, maxAge: 9, start: '17:00', end: '18:00' },
  { id: 2, name: '10–13 años', minAge: 10, maxAge: 13, start: '18:00', end: '19:10' },
  { id: 3, name: '14+ años', minAge: 14, maxAge: null, start: '19:10', end: '20:30' },
];
export const TRAINING_DAYS = [1,3,5];
export const STUDENT_STATUSES = ['Prueba','Activo','Pausa','Inactivo','Retirado','Reingresado'];
export const LEVELS = ['Iniciación','Desarrollo','Intermedio','Avanzado','Competitivo'];
export const ATTENDANCE_STATUSES = ['Presente','Tardanza','Falta','Justificado'];
export const ALERT_ABSENCES = 3;

export function localDateISO(date=new Date()) {
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

export function ageOnDate(birthDate, ref=new Date()) {
  if(!birthDate) return null;
  const b=new Date(`${birthDate}T12:00:00`); let age=ref.getFullYear()-b.getFullYear();
  const m=ref.getMonth()-b.getMonth(); if(m<0 || (m===0 && ref.getDate()<b.getDate())) age--;
  return age;
}
export function developmentCategory(age){
  if(age==null) return '—';
  if(age<=9) return 'U9'; if(age<=11) return 'U11'; if(age<=13) return 'U13';
  if(age<=15) return 'U15'; if(age<=17) return 'U17'; if(age<=19) return 'U19'; return 'U21';
}
export function suggestedShift(age){
  if(age==null) return 1; if(age<=9) return 1; if(age<=13) return 2; return 3;
}
export function formatTime(t){
  const [h,m]=t.split(':').map(Number); const hh=h>12?h-12:h; return `${hh}:${String(m).padStart(2,'0')} ${h>=12?'p. m.':'a. m.'}`;
}
