const toggle=document.querySelector('.menu');const nav=document.getElementById('navigation');toggle.hidden=false;document.body.classList.add('js');toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.focus()}});(()=>{
const form=document.getElementById('contact-form'),button=form.querySelector('.send'),label=button.querySelector('span'),status=document.getElementById('form-status');
const endpoint=window.PORTFOLIO_CONTACT_ENDPOINT||'';
const configured=/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint);
if(configured){form.action=endpoint;button.disabled=false;document.getElementById('setup-note').hidden=true;}
let sending=false;
form.addEventListener('submit',async event=>{
event.preventDefault();if(sending)return;
for(const field of [form.elements.name,form.elements.email,form.elements.message]){field.value=field.value.trim();}
if(!form.reportValidity())return;
if(!configured){status.textContent='The online form is not connected yet. Please email glen26noel@gmail.com or use WhatsApp.';return;}
if(form.elements._gotcha.value){status.textContent='Your message could not be sent. Please contact me directly by email.';return;}
sending=true;button.disabled=true;label.textContent='Sending…';form.setAttribute('aria-busy','true');status.textContent='Sending your message…';
const data=new FormData(form);data.set('subject','Portfolio Contact Form — '+form.elements.subject.value);data.set('submitted_at',new Date().toISOString());
const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);
try{
const response=await fetch(endpoint,{method:'POST',body:data,headers:{Accept:'application/json'},signal:controller.signal});
if(!response.ok)throw new Error('Submission rejected');
const result=await response.json();if(result.ok!==true)throw new Error('Submission not confirmed');
status.textContent='Thank you. Your message has been sent successfully. I’ll get back to you as soon as possible.';form.reset();
}catch(error){status.textContent='Your message could not be sent at this time. Please try again or contact me directly at glen26noel@gmail.com. Your message is still here.';}
finally{clearTimeout(timeout);sending=false;button.disabled=false;label.textContent='Send Message';form.removeAttribute('aria-busy');}
});
})();
