const admin=require('firebase-admin'),nodemailer=require('nodemailer');
admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SA))});
const db=admin.firestore();
const gt=new Date(Date.now()-6*3600e3),iso=d=>d.toISOString().slice(0,10);
const today=iso(gt),hour=gt.getUTCHours(),tmr=iso(new Date(gt.getTime()+864e5));
const tr=nodemailer.createTransport({service:'gmail',auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_PASS}});
const esc=s=>String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const li=a=>`<li>${a.highlight?'★ ':''}<b>${esc(a.title)}</b>${a.time?' · '+esc(a.time):''}${a.company?' · '+esc(a.company):''}${a.priority==='alta'?' <b style="color:#b3261e">(alta)</b>':''}${a.notes?'<br><small>'+esc(a.notes)+'</small>':''}</li>`;
const sec=(t,l)=>l.length?`<h3>${t}</h3><ul>${l.map(li).join('')}</ul>`:'';
(async()=>{
 const us=await db.collection('users').where('emailEnabled','==',true).get();
 for(const u of us.docs){const d=u.data();
  if(!d.active||hour<d.sendHour||d.lastSentDate===today)continue;
  const as=(await db.collection('activities').where('ownerUid','==',u.id).get()).docs.map(x=>x.data()).filter(a=>a.type!=='titulo'&&a.status!=='hecha');
  const hoy=as.filter(a=>a.date===today),atr=as.filter(a=>a.date<today),man=as.filter(a=>a.date===tmr&&a.remindDayBefore);
  if(hoy.length+atr.length+man.length){
   await tr.sendMail({from:`Agenda <${process.env.GMAIL_USER}>`,to:d.email,subject:`Tus actividades de hoy (${hoy.length})`,
    html:`<p>Hola ${esc(d.name)}:</p>${sec('Hoy',hoy)}${sec('Atrasadas',atr)}${sec('Mañana (aviso previo)',man)}`});
   console.log('Enviado a',d.email)}
  await u.ref.update({lastSentDate:today})}
})().catch(e=>{console.error(e);process.exit(1)}); 
