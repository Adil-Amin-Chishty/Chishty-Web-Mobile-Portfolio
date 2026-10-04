'use strict';
const crypto = require('node:crypto');
const BUSINESS_EMAIL = 'chishtyproduction001@gmail.com';
const SITE = 'https://chishty-productions.vercel.app';
const services = ['Web development','Mobile app development','Video editing','A combination of services'];
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function createHandler({ env = process.env, clock = Date.now, sendMail } = {}) {
  const requests = new Map(), limits = new Map();
  const password = () => String(env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  const ip = req => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const digest = value => crypto.createHmac('sha256', password()).update(value).digest('hex');
  const reply = (res, status, data) => {res.setHeader('Cache-Control','no-store');res.status(status).json(data);};
  function clean() {for (const [key,value] of limits) if (value.until < clock()) limits.delete(key);for (const [key,value] of requests) if (value.until < clock()) requests.delete(key);}
  function limited(key,max,period) {const item=limits.get(key);if(item&&item.until>clock()){if(item.count>=max)return true;item.count++;}else limits.set(key,{count:1,until:clock()+period});return false;}
  async function send(message) {
    if (sendMail) return sendMail(message);
    const nodemailer = require('nodemailer');
    const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:BUSINESS_EMAIL,pass:password()},connectionTimeout:7000,greetingTimeout:7000,socketTimeout:15000});
    const result = await transport.sendMail(message);
    if (!result.accepted?.length) throw new Error('recipient_rejected');
    return result;
  }
  return async function handler(req,res) {
    clean();
    if (req.method==='GET') {
      if (!password()) return reply(res,200,{configured:false});
      if(limited('token:'+ip(req),30,15*60000))return reply(res,429,{error:'Please try again later.'});
      const payload=Buffer.from(JSON.stringify({issued:clock(),id:crypto.randomUUID(),client:digest(ip(req))})).toString('base64url');
      return reply(res,200,{configured:true,token:payload+'.'+digest(payload)});
    }
    if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return reply(res,405,{error:'Method not allowed.'});}
    const origin=req.headers.origin;
    const allowed=[SITE,env.VERCEL_URL?'https://'+env.VERCEL_URL:null,...(env.NODE_ENV==='test'?['http://127.0.0.1:4173']:[])].filter(Boolean);
    if(!allowed.includes(origin))return reply(res,403,{error:'Submit your enquiry from our website.'});
    if(!password())return reply(res,503,{error:'Online sending is temporarily unavailable. Please use the email option below.',code:'EMAIL_NOT_CONFIGURED'});
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return reply(res,415,{error:'Use JSON.'});
    let body=req.body;
    try{if(Buffer.isBuffer(body))body=body.toString();if(typeof body==='string')body=JSON.parse(body);if(!body||typeof body!=='object'||Array.isArray(body)||JSON.stringify(body).length>12000)throw new Error();}catch{return reply(res,400,{error:'Invalid enquiry.'});}
    if(body.website)return reply(res,400,{error:'Unable to accept this enquiry.'});
    let token;
    try{const parts=String(body.token||'').split('.');if(parts.length!==2||parts[1].length!==64||!crypto.timingSafeEqual(Buffer.from(parts[1]),Buffer.from(digest(parts[0]))))throw new Error();token=JSON.parse(Buffer.from(parts[0],'base64url').toString());if(token.client!==digest(ip(req))||clock()-token.issued<1500||clock()-token.issued>30*60000)throw new Error();}catch{return reply(res,400,{error:'Please wait a moment, then try again.',code:'TOKEN_INVALID'});}
    const value=(key,max)=>typeof body[key]==='string'?body[key].trim().slice(0,max+1):'';
    const name=value('name',100),email=value('email',254),idea=value('idea',4000),service=value('service',80),budget=value('budget',80),kind=body.kind==='call'?'call':'project';
    if(!name||name.length>100||/[\r\n]/.test(name)||email.length>254||!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(email)||idea.length<10||idea.length>4000||!services.includes(service)||budget.length>80)return reply(res,400,{error:'Check your name, email and project details.'});
    let proposed='';
    if(kind==='call'){const time=new Date(body.proposedTime);try{if(!Number.isFinite(time.getTime())||time.getTime()<=clock()||String(body.timezone).length>80)throw new Error();proposed=new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeStyle:'short',timeZone:body.timezone}).format(time)+' ('+body.timezone+')';}catch{return reply(res,400,{error:'Choose a valid future time and time zone.'});}}
    const fingerprint=digest(JSON.stringify([kind,name,email,idea,service,budget,proposed]));
    let request=requests.get(token.id);
    if(request){if(request.fingerprint!==fingerprint)return reply(res,409,{error:'Open a fresh form to send another enquiry.'});if(request.sending)return reply(res,409,{error:'This enquiry is already being sent.'});if(request.received)return reply(res,200,{received:true,acknowledgementSent:request.acknowledgementSent,reference:token.id});}
    else {
      if(limited('submit:'+ip(req),5,15*60000)||limited('email:'+email.toLowerCase(),2,30*60000))return reply(res,429,{error:'Please wait before sending another enquiry.'});
      request={fingerprint,sending:false,received:false,acknowledgementSent:false,until:clock()+30*60000};requests.set(token.id,request);
    }
    request.sending=true;
    const title=kind==='call'?'Discovery call request':'Project enquiry';
    const details=`${title} — CHISHTY PRODUCTIONS\n\nReference: ${token.id}\nName: ${name}\nEmail: ${email}\nService: ${service}\nBudget: ${budget||'Let’s discuss'}${proposed?'\nProposed call: '+proposed+'\nDuration: 30 minutes — awaiting confirmation':''}\n\nProject details:\n${idea}`;
    try {
      await send({from:{name:'Chishty Productions',address:BUSINESS_EMAIL},to:BUSINESS_EMAIL,replyTo:{name,address:email},subject:title+' — '+name,text:details,html:'<h2>'+escape(title)+'</h2><pre style="white-space:pre-wrap;font-family:Arial;line-height:1.6">'+escape(details)+'</pre>'});
      request.received=true;
    } catch {request.sending=false;console.error('Enquiry owner email delivery failed.');return reply(res,502,{error:'Your enquiry could not be sent. Please try again or use the email option below.'});}
    const acknowledgement=`Hi ${name},\n\nWe’ve received your enquiry. Thank you for contacting Chishty Productions. We’ll contact you shortly to discuss your project.${proposed?'\n\nYour proposed call time is '+proposed+'. We’ll confirm availability and share the meeting link in our reply.':''}\n\nService: ${service}\nReference: ${token.id}\n\nBest regards,\nChishty Productions\n${BUSINESS_EMAIL}\n${SITE}`;
    try {
      await send({from:{name:'Chishty Productions',address:BUSINESS_EMAIL},to:email,replyTo:BUSINESS_EMAIL,subject:'We’ve received your enquiry — Chishty Productions',text:acknowledgement,html:'<div style="background:#f2eaf8;padding:32px;font-family:Arial;color:#301c42;line-height:1.7"><strong style="font-size:22px">CHISHTY PRODUCTIONS</strong><h2>We’ve received your enquiry.</h2><p>Hi '+escape(name)+',</p><p>Thank you for contacting Chishty Productions. We’ll contact you shortly to discuss your project.</p>'+(proposed?'<p>Your proposed call time: <strong>'+escape(proposed)+'</strong>. We’ll confirm availability and share the meeting link in our reply.</p>':'')+'<p>Service: '+escape(service)+'<br>Reference: '+escape(token.id)+'</p><p>Best regards,<br>Chishty Productions</p><a href="'+SITE+'">Visit our studio</a></div>'});
      request.acknowledgementSent=true;
    }catch{console.error('Enquiry acknowledgement email delivery failed.');}
    request.sending=false;
    return reply(res,201,{received:true,acknowledgementSent:request.acknowledgementSent,reference:token.id});
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
