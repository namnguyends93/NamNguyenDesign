/**
 * Nam Nguyen Design CMS Full
 * Node.js 18+ / no npm install required
 * Run: node server.js
 * Site: http://127.0.0.1:3000/
 * Admin: http://127.0.0.1:3000/admin
 */
'use strict';
const http=require('http');
const fs=require('fs');
const fsp=fs.promises;
const path=require('path');
const crypto=require('crypto');
const {URL}=require('url');

const ROOT=path.resolve(__dirname);
const CONTENT=path.join(ROOT,'content.json');
const UPLOADS=path.join(ROOT,'uploads');
const BACKUPS=path.join(ROOT,'backups');
const HOST='127.0.0.1';
const PORT=Number(process.env.PORT||3000);
const MAX_BODY=35*1024*1024;

// ---- Cloudflare R2 (optional) ----
// media.config.json: {"r2":{"bucket":"…","publicUrl":"https://pub-….r2.dev"}}. When set, uploads go to R2
// through Wrangler (logged in once with `npx wrangler login`, no keys stored here) and are
// listed in media-r2.json, which is committed so every machine sees the same media.
const {execFile}=require('child_process');
const MEDIA_CONFIG=path.join(ROOT,'media.config.json');
const R2_MANIFEST=path.join(ROOT,'media-r2.json');
function r2Config(){try{const c=JSON.parse(fs.readFileSync(MEDIA_CONFIG,'utf8')).r2;return c&&c.bucket&&c.publicUrl?c:null}catch{return null}}
function wranglerBin(){const bin=path.join(ROOT,'node_modules','wrangler','bin','wrangler.js');return fs.existsSync(bin)?bin:null}
function wrangler(args){return new Promise((resolve,reject)=>{const bin=wranglerBin();if(!bin)return reject(new Error('Chưa cài wrangler: chạy npm install'));execFile(process.execPath,[bin,...args],{cwd:ROOT,timeout:120000,windowsHide:true},(err,stdout,stderr)=>{if(err){const msg=(stderr||stdout||err.message).toString();return reject(new Error(/login|auth|token/i.test(msg)?'Wrangler chưa đăng nhập Cloudflare: chạy npx wrangler login':msg.split('\n').filter(Boolean).slice(-3).join(' ')))}resolve(stdout)})})}
async function readManifest(){try{return JSON.parse(await fsp.readFile(R2_MANIFEST,'utf8'))}catch{return []}}
async function writeManifest(list){await atomicWrite(R2_MANIFEST,JSON.stringify(list,null,2)+'\n')}
async function uploadToR2(cfg,name,buf,type){
  const tmp=path.join(require('os').tmpdir(),'nnd-'+name);await fsp.writeFile(tmp,buf);
  try{await wrangler(['r2','object','put',`${cfg.bucket}/${name}`,'--file',tmp,'--content-type',type,'--cache-control','public, max-age=31536000, immutable','--remote'])}
  finally{await fsp.unlink(tmp).catch(()=>{})}
  const item={name,url:cfg.publicUrl.replace(/\/$/,'')+'/'+encodeURIComponent(name),size:buf.length,modified:new Date().toISOString(),storage:'r2'};
  const list=await readManifest();list.unshift(item);await writeManifest(list);return item}

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.pdf':'application/pdf','.woff':'font/woff','.woff2':'font/woff2','.mp4':'video/mp4','.webm':'video/webm'};

function send(res,status,body,type='text/plain; charset=utf-8'){const b=Buffer.isBuffer(body)?body:Buffer.from(String(body));res.writeHead(status,{'Content-Type':type,'Content-Length':b.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(b)}
function sendJSON(res,status,obj){send(res,status,JSON.stringify(obj,null,2),'application/json; charset=utf-8')}
async function ensureDirs(){await fsp.mkdir(UPLOADS,{recursive:true});await fsp.mkdir(BACKUPS,{recursive:true})}
async function readContent(){return JSON.parse(await fsp.readFile(CONTENT,'utf8'))}
async function atomicWrite(file,data){const tmp=file+'.tmp';await fsp.writeFile(tmp,data,'utf8');await fsp.rename(tmp,file)}
async function backupCurrent(){try{const raw=await fsp.readFile(CONTENT,'utf8');const stamp=new Date().toISOString().replace(/[:.]/g,'-');await fsp.writeFile(path.join(BACKUPS,stamp+'.json'),raw,'utf8');const files=(await fsp.readdir(BACKUPS)).filter(x=>x.endsWith('.json')).sort().reverse();for(const old of files.slice(40))await fsp.unlink(path.join(BACKUPS,old)).catch(()=>{})}catch{}}
async function saveContent(obj){await backupCurrent();await atomicWrite(CONTENT,JSON.stringify(obj,null,2))}
async function readJSONBody(req,max=MAX_BODY){return new Promise((resolve,reject)=>{const chunks=[];let size=0;req.on('data',c=>{size+=c.length;if(size>max){reject(new Error('Payload too large'));req.destroy();return}chunks.push(c)});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'))}catch{reject(new Error('Invalid JSON'))}});req.on('error',reject)})}
function cleanName(name='file'){const ext=path.extname(name).toLowerCase();const base=path.basename(name,ext).normalize('NFKD').replace(/[^\w-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'file';return `${base}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`}
function safePath(urlPath){let d;try{d=decodeURIComponent(urlPath)}catch{return null}if(d==='/')d='/index.html';const full=path.resolve(ROOT,'.'+d);return full===ROOT||full.startsWith(ROOT+path.sep)?full:null}

async function listMedia(){await ensureDirs();const out=[];for(const name of await fsp.readdir(UPLOADS)){const full=path.join(UPLOADS,name);const st=await fsp.stat(full);if(st.isFile())out.push({name,url:'/uploads/'+encodeURIComponent(name),size:st.size,modified:st.mtime.toISOString()})}out.push(...await readManifest());return out.sort((a,b)=>b.modified.localeCompare(a.modified))}
async function listBackups(){await ensureDirs();const files=(await fsp.readdir(BACKUPS)).filter(x=>x.endsWith('.json')).sort().reverse();const out=[];for(const name of files){const st=await fsp.stat(path.join(BACKUPS,name));out.push({name,size:st.size,modified:st.mtime.toISOString()})}return out}

const TEMPLATE_FILE=path.join(ROOT,'project-template.js');
async function serveWork(res){delete require.cache[require.resolve(TEMPLATE_FILE)];const {renderWorkPage}=require(TEMPLATE_FILE);return send(res,200,renderWorkPage(await readContent()),MIME['.html'])}
async function serveProject(res,slug){delete require.cache[require.resolve(TEMPLATE_FILE)];const {renderProjectPage}=require(TEMPLATE_FILE);const html=renderProjectPage(await readContent(),slug);return html?send(res,200,html,MIME['.html']):send(res,404,'Project not found (or unpublished): '+slug)}
const CMS_RUNTIME_FILE=path.join(ROOT,'cms-runtime.js');


async function serveStatic(res,pathname){
  let file=safePath(pathname);if(!file)return send(res,400,'Bad request');
  let st;try{st=await fsp.stat(file)}catch{return send(res,404,'404')}
  if(st.isDirectory()){file=path.join(file,'index.html');try{st=await fsp.stat(file)}catch{return send(res,404,'404')}}
  const ext=path.extname(file).toLowerCase();
  if(ext==='.html'){
    let html=await fsp.readFile(file,'utf8');
    // the site pages get the CMS; the admin page itself must not be rewritten by it
    if(!['admin.html','editor.html'].includes(path.basename(file))&&!html.includes('/cms-runtime.js'))html=html.replace(/<\/body>/i,'<script src="/cms-runtime.js"></script></body>');
    return send(res,200,html,MIME['.html']);
  }
  return send(res,200,await fsp.readFile(file),MIME[ext]||'application/octet-stream');
}

// ---- Publish jobs (Admin → Xuất bản): build + Cloudflare, or commit + push to GitHub ----
const {spawn}=require('child_process');
let job=null;   // one job at a time: {id,kind,done,ok,log}
function runStep(cmd,args,log){return new Promise(resolve=>{log.push('$ '+[cmd==process.execPath?'node':cmd,...args].join(' '));const p=spawn(cmd,args,{cwd:ROOT,windowsHide:true,env:{...process.env,FORCE_COLOR:'0',GIT_TERMINAL_PROMPT:'0'}});const add=d=>{for(const l of d.toString().replace(/\x1b\[[0-9;]*m/g,'').split(/\r?\n/))if(l.trim())log.push(l)};p.stdout.on('data',add);p.stderr.on('data',add);p.on('error',e=>{log.push('Lỗi: '+e.message);resolve(1)});p.on('close',code=>resolve(code))})}
async function startJob(kind,message){
  const log=[];job={id:Date.now().toString(36),kind,done:false,ok:false,log};
  try{
    if(kind==='build'){
      if(await runStep(process.execPath,['build.js'],log))throw new Error('Build lỗi, xem log phía trên.');
    }else if(kind==='cloudflare'){
      const bin=wranglerBin();if(!bin)throw new Error('Chưa cài wrangler: chạy npm install');
      if(await runStep(process.execPath,['build.js'],log))throw new Error('Build lỗi, xem log phía trên.');
      if(await runStep(process.execPath,[bin,'deploy'],log))throw new Error('Đưa lên Cloudflare lỗi. Nếu log báo chưa đăng nhập: mở cửa sổ lệnh trong thư mục dự án, chạy  npx.cmd wrangler login  rồi thử lại.');
    }else if(kind==='github'){
      await runStep('git',['add','-A'],log);
      const msg=String(message||'').trim()||('Update portfolio '+new Date().toISOString().slice(0,16).replace('T',' '));
      const c=await runStep('git',['commit','-m',msg],log);
      if(c&&!log.some(l=>/nothing to commit|nothing added/i.test(l)))throw new Error('Commit lỗi, xem log phía trên.');
      if(await runStep('git',['push','origin','HEAD'],log))throw new Error('Push lỗi. Nếu log báo cần đăng nhập GitHub: chạy  git push  một lần trong cửa sổ lệnh để đăng nhập, rồi thử lại.');
    }
    job.ok=true;log.push('✓ Xong.');
  }catch(e){log.push('✗ '+e.message)}
  job.done=true;
}
function gitInfo(){return new Promise(resolve=>{execFile('git',['status','--porcelain'],{cwd:ROOT,windowsHide:true},(e,out)=>{const changed=e?null:out.split(/\r?\n/).filter(Boolean).length;execFile('git',['log','-1','--format=%s|%cr'],{cwd:ROOT,windowsHide:true},(e2,o2)=>{const [last,when]=(e2?'':o2.trim()).split('|');resolve({changed,last:last||'',when:when||''})})})})}

async function handleAPI(req,res,u){
  // Only this admin page may change things: block requests sent from other websites
  if(req.method!=='GET'){const o=req.headers.origin;if(o&&!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o))return sendJSON(res,403,{ok:false,error:'Forbidden origin'})}
  if(u.pathname==='/api/publish/status'&&req.method==='GET')return sendJSON(res,200,{ok:true,git:await gitInfo(),job:job&&{id:job.id,kind:job.kind,done:job.done,ok:job.ok,log:job.log}});
  const pj=u.pathname.match(/^\/api\/publish\/(build|cloudflare|github)$/);
  if(pj&&req.method==='POST'){if(job&&!job.done)return sendJSON(res,409,{ok:false,error:'Đang có một lần xuất bản chạy, đợi xong đã.'});const body=await readJSONBody(req).catch(()=>({}));startJob(pj[1],body.message);return sendJSON(res,202,{ok:true,id:job.id})}
  if(u.pathname==='/api/content'&&req.method==='GET')return sendJSON(res,200,await readContent());
  if(u.pathname==='/api/content'&&req.method==='PUT'){const body=await readJSONBody(req);await saveContent(body);return sendJSON(res,200,{ok:true,content:body})}
  if(u.pathname==='/api/media'&&req.method==='GET')return sendJSON(res,200,{ok:true,media:await listMedia()});
  if(u.pathname==='/api/media/upload'&&req.method==='POST'){
    const body=await readJSONBody(req);const type=String(body.type||'');
    if(!/^(image\/(jpeg|png|webp|gif|svg\+xml)|application\/pdf)$/.test(type))return sendJSON(res,415,{ok:false,error:'Only images or PDF files are allowed'});
    const buf=Buffer.from(String(body.base64||''),'base64');if(!buf.length||buf.length>20*1024*1024)return sendJSON(res,413,{ok:false,error:'Image too large or empty'});
    const name=cleanName(body.name||'upload.jpg');
    const cfg=r2Config();
    if(cfg){const item=await uploadToR2(cfg,name,buf,type);return sendJSON(res,201,{ok:true,name,url:item.url,storage:'r2'})}
    await fsp.writeFile(path.join(UPLOADS,name),buf,{flag:'wx'});
    return sendJSON(res,201,{ok:true,name,url:'/uploads/'+encodeURIComponent(name)});
  }
  const md=u.pathname.match(/^\/api\/media\/(.+)$/);if(md&&req.method==='DELETE'){const name=path.basename(decodeURIComponent(md[1]));
    const list=await readManifest();const hit=list.find(x=>x.name===name);const cfg=r2Config();
    if(hit&&cfg){await wrangler(['r2','object','delete',`${cfg.bucket}/${name}`,'--remote']);await writeManifest(list.filter(x=>x!==hit))}
    else await fsp.unlink(path.join(UPLOADS,name)).catch(()=>{});
    return sendJSON(res,200,{ok:true})}
  if(u.pathname==='/api/backups'&&req.method==='GET')return sendJSON(res,200,{ok:true,backups:await listBackups()});
  if(u.pathname==='/api/backups/create'&&req.method==='POST'){await backupCurrent();return sendJSON(res,201,{ok:true})}
  const rs=u.pathname.match(/^\/api\/backups\/restore\/(.+)$/);if(rs&&req.method==='POST'){const name=path.basename(decodeURIComponent(rs[1]));const raw=await fsp.readFile(path.join(BACKUPS,name),'utf8');const parsed=JSON.parse(raw);await backupCurrent();await atomicWrite(CONTENT,raw);return sendJSON(res,200,{ok:true,content:parsed})}
  return sendJSON(res,404,{ok:false,error:'API route not found'});
}

(async()=>{await ensureDirs();http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');if(u.pathname.startsWith('/api/'))return await handleAPI(req,res,u);if(u.pathname==='/cms-runtime.js')return send(res,200,await fsp.readFile(CMS_RUNTIME_FILE),'application/javascript; charset=utf-8');{if(/^\/projects\/(index\.html)?$/i.test(u.pathname))return await serveWork(res);const pm=u.pathname.match(/^\/projects\/([^/]+)\.html$/i);if(pm)return await serveProject(res,decodeURIComponent(pm[1]))}if(u.pathname==='/admin')return await serveStatic(res,'/admin.html');if(u.pathname==='/edit')return await serveStatic(res,'/editor.html');return await serveStatic(res,u.pathname)}catch(e){console.error(e);return sendJSON(res,500,{ok:false,error:e.message||'Server error'})}}).listen(PORT,HOST,()=>{console.log('');console.log('NAM NGUYEN DESIGN CMS FULL');console.log('Website : http://127.0.0.1:'+PORT+'/');console.log('CMS     : http://127.0.0.1:'+PORT+'/admin');console.log('')})})();
