// One-time migration from the approved local website. Never overwrites existing records.
const text=e=>e?.textContent.replace(/\s+/g,' ').trim()||'';
const all=(e,s)=>[...e.querySelectorAll(s)];
async function source(path){const r=await fetch('../'+path,{cache:'no-store'});if(!r.ok)throw Error('Cannot read existing '+path);return new DOMParser().parseFromString(await r.text(),'text/html');}
async function stableId(key){const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('glen-approved-import-v1:'+key)));hash[6]=(hash[6]&15)|80;hash[8]=(hash[8]&63)|128;const s=[...hash.slice(0,16)].map(x=>x.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
export async function importExisting(api,report){
 const [edu,work,about]=await Promise.all(['education.html','work.html','about.html'].map(source));
 const certResponse=await fetch('../assets/education-certifications.js');if(!certResponse.ok)throw Error('Cannot read certification source');
 const certText=await certResponse.text();const certs=JSON.parse(certText.slice(certText.indexOf('['),certText.lastIndexOf(']')+1));
 if(edu.querySelectorAll('.degree').length!==3||work.querySelectorAll('.work-card').length!==4||about.querySelectorAll('.reference').length!==5||certs.length!==6)throw Error('Source content differs from the approved migration. No changes made.');
 let count=0;const cache={};const docs=[];
 async function ensure(table,key,payload){cache[table]??=await api.list(table);let row=cache[table].find(r=>payload.singleton?r.singleton:r[key]===payload[key]);if(!row){row=await api.insert(table,{id:await stableId(table+':'+payload[key]),published:true,...payload});cache[table].push(row);count++;}report(`Imported ${count} records. Reading ${table.replaceAll('_',' ')}…`);return row;}
 function queue(root,type,row){const seen=new Set();for(const a of all(root,'a[href$=".pdf"]')){const path=a.getAttribute('href');if(seen.has(path))continue;seen.add(path);docs.push({path,type,row,title:type==='about'?text(a.closest('.doc-card')?.querySelector('h3')):row.degree_title+' — '+text(a).replace(/^View\s*/, '')});}}
 const dates=['2026-08-01','2016-05-14','2012-07-19'];
 for(const [i,el] of all(edu,'.degree').entries()){const row=await ensure('education','degree_title',{degree_title:text(el.querySelector('h3')),institution:text(el.querySelector('h3').parentElement.querySelector('p')),completion_date:dates[i],date_label:text(el.querySelector('.date')),honours:text(el.querySelector('.award')),qualification_type:['Master’s degree','Bachelor’s degree','Associate degree'][i],display_order:i});queue(el,'education',row);}
 const ev=edu.querySelector('.evaluation');const evaluation=await ensure('education','degree_title',{degree_title:'Credential Evaluation',institution:text(ev.querySelector('h3')),qualification_type:'Credential evaluation',description:all(ev,'p').map(text).join('\n\n'),date_label:'1 November 2024',completion_date:'2024-11-01',display_order:3});queue(ev,'education',evaluation);
 for(const [i,c] of certs.entries())await ensure('certifications','title',{title:c.title,issuer:c.issuer,description:c.desc,competencies:c.skills,status:c.status,date_label:c.date||'',display_order:i});
 for(const [i,el] of all(work,'.timeline-row').entries()){const card=el.querySelector('.work-card');await ensure('experience','job_title',{job_title:text(card.querySelector('h2')),employer:text(card.querySelector('.organisation')),date_label:text(el.querySelector('.date-badge')),is_current_role:/Present/i.test(text(el.querySelector('.date-badge'))),responsibilities:all(card,'.achievements li').map(text),display_order:i});}
 const profile=all(about,'.profile dd').map(text);
 const ab=await ensure('about_profile','headline',{singleton:true,headline:'Professional Summary',professional_summary:all(about,'.summary p').map(text).join('\n\n'),philosophy:text(about.querySelector('.philosophy p')),quote:text(about.querySelector('.hero-quote p')),quote_attribution:text(about.querySelector('.hero-quote cite')),date_of_birth:'1991-03-26',gender:profile[1],nationality:profile[2],marital_status:profile[3],hobbies:all(about,'.interests li').map(text)});queue(about.querySelector('.document-grid'),'about',ab);
 for(const [i,el] of all(about,'.reference').entries())await ensure('professional_references','name',{name:text(el.querySelector('h3')),role_title:text(el.querySelector('.ref-role')),organisation:text(el.querySelector('.ref-org')),email:el.querySelector('a[href^="mailto:"]')?.getAttribute('href').slice(7)||'',telephone:text(el.querySelector('a[href^="tel:"]')),display_order:i});
 const files=await api.list('files');let attached=0;
 for(const d of docs){report(`Importing document ${attached+1} of ${docs.length}: ${d.title}`);const relation=d.type+'_documents',parent=d.type+'_id';const existing=await api.relations(relation,parent,d.row.id);if(existing.some(x=>x.title===d.title)){attached++;continue;}
 let file=files.find(f=>f.title===d.title);if(!file){const r=await fetch('../'+d.path);if(!r.ok)throw Error('Cannot read '+d.path);const blob=await r.blob();if((await blob.slice(0,5).text())!=='%PDF-')throw Error('Invalid PDF: '+d.path);file=await api.upload(new File([blob],d.path.split('/').pop(),{type:'application/pdf'}),'portfolio-private',d.title,'portfolio');files.push(file);}
 await api.insert(relation,{id:await stableId(relation+':'+d.path),[parent]:d.row.id,file_id:file.id,title:d.title,published:true,display_order:attached});attached++;
 }
 report(`Import complete: ${count} content records added; ${attached} existing documents attached. Existing records and website designs were preserved.`);
 return {count,attached};
}
