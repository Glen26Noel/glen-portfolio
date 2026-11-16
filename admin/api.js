import {supabaseUrl,supabasePublishableKey} from './config.js';
const client=window.supabase.createClient(supabaseUrl,supabasePublishableKey,{auth:{storage:sessionStorage,storageKey:'glen-portfolio-admin',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
function check(result){if(result.error)throw result.error;return result.data;}
export const api={
 async setVisitorPassword(password){check(await client.rpc('portfolio_set_visitor_password',{new_password:password}));},
 async login(email,password){check(await client.auth.signInWithPassword({email,password}));return this.authorize();},
 async authorize(){const {data,error}=await client.auth.getUser();if(error||!data.user)return null;const rows=check(await client.from('portfolio_site_settings').select('id').limit(1));if(!rows.length){await client.auth.signOut({scope:'local'});throw Error('This account is not authorised to manage the portfolio.');}return data.user;},
 async logout(){check(await client.auth.signOut({scope:'local'}));},
 onLogout(fn){client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')fn();});},
 async list(table){let rows=[];for(let start=0;;start+=200){const page=check(await client.from('portfolio_'+table).select('*').order(table==='access_requests'?'created_at':'display_order',{ascending:table!=='access_requests'}).order('id').range(start,start+199));rows.push(...page);if(page.length<200)return rows;}},
 async relations(table,key,id){return check(await client.from('portfolio_'+table).select('*').eq(key,id));},
 async save(table,payload,record,categories){if(table==='projects'){const data=check(await client.rpc('portfolio_save_project',{project_data:payload,category_ids:categories,project_id:record?.id||null,expected_updated_at:record?.updated_at||null}));return data;}const query=record?.id?client.from('portfolio_'+table).update(payload).eq('id',record.id).eq('updated_at',record.updated_at):client.from('portfolio_'+table).insert(payload);const rows=check(await query.select());if(!rows.length)throw Error('This record changed in another window. Close and reopen it before saving.');return rows[0];},
 async insert(table,payload){return check(await client.from('portfolio_'+table).insert(payload).select().single());},
 async update(table,id,payload){return check(await client.from('portfolio_'+table).update(payload).eq('id',id).select().single());},
 async remove(table,record){const rows=check(await client.from('portfolio_'+table).delete().eq('id',record.id).eq('updated_at',record.updated_at).select('id'));if(!rows.length)throw Error('The record changed. Refresh before deleting it.');},
 async removeRelation(table,id){check(await client.from('portfolio_'+table).delete().eq('id',id));},
 async upload(file,bucket,title,visibility){const path=crypto.randomUUID()+'/'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');check(await client.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false}));try{return await this.insert('files',{title,bucket_id:bucket,object_path:path,original_name:file.name,mime_type:file.type,size_bytes:file.size,visibility,published:true});}catch(error){await client.storage.from(bucket).remove([path]);throw error;}},
 async fileUrl(file){return check(await client.storage.from(file.bucket_id).createSignedUrl(file.object_path,60)).signedUrl;},
 async deleteFile(file){/* FK restrictions prevent deleting files still attached to documents/media. Featured images are checked explicitly. */
 for(const [table,col] of [['projects','featured_file_id'],['certifications','logo_file_id']]){const rows=check(await client.from('portfolio_'+table).select('id').eq(col,file.id).limit(1));if(rows.length)throw Error('This image is still in use. Remove it from its content record first.');}
 // Delete metadata first: FK rejection leaves the object untouched. Failed storage cleanup is retryable with the retained metadata.
 check(await client.from('portfolio_files').delete().eq('id',file.id));const result=await client.storage.from(file.bucket_id).remove([file.object_path]);if(result.error){await client.from('portfolio_files').insert(file);throw Error('Storage removal failed. The file record was restored; retry when connected.');}
 }
};
