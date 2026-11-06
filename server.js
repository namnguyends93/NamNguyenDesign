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

const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.mp4':'video/mp4','.webm':'video/webm'};

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

async function listMedia(){await ensureDirs();const out=[];for(const name of await fsp.readdir(UPLOADS)){const full=path.join(UPLOADS,name);const st=await fsp.stat(full);if(st.isFile())out.push({name,url:'/uploads/'+encodeURIComponent(name),size:st.size,modified:st.mtime.toISOString()})}return out.sort((a,b)=>b.modified.localeCompare(a.modified))}
async function listBackups(){await ensureDirs();const files=(await fsp.readdir(BACKUPS)).filter(x=>x.endsWith('.json')).sort().reverse();const out=[];for(const name of files){const st=await fsp.stat(path.join(BACKUPS,name));out.push({name,size:st.size,modified:st.mtime.toISOString()})}return out}

const TEMPLATE_FILE=path.join(ROOT,'project-template.js');
async function serveProject(res,slug){delete require.cache[require.resolve(TEMPLATE_FILE)];const {renderProjectPage}=require(TEMPLATE_FILE);const html=renderProjectPage(await readContent(),slug);return html?send(res,200,html,MIME['.html']):send(res,404,'Project not found (or unpublished): '+slug)}
const CMS_RUNTIME_FILE=path.join(ROOT,'cms-runtime.js');


async function serveStatic(res,pathname){
  let file=safePath(pathname);if(!file)return send(res,400,'Bad request');
  let st;try{st=await fsp.stat(file)}catch{return send(res,404,'404')}
  if(st.isDirectory()){file=path.join(file,'index.html');try{st=await fsp.stat(file)}catch{return send(res,404,'404')}}
  const ext=path.extname(file).toLowerCase();
  if(ext==='.html'){
    let html=await fsp.readFile(file,'utf8');
    if(!html.includes('/cms-runtime.js'))html=html.replace(/<\/body>/i,'<script src="/cms-runtime.js"></script></body>');
    return send(res,200,html,MIME['.html']);
  }
  return send(res,200,await fsp.readFile(file),MIME[ext]||'application/octet-stream');
}

async function handleAPI(req,res,u){
  if(u.pathname==='/api/content'&&req.method==='GET')return sendJSON(res,200,await readContent());
  if(u.pathname==='/api/content'&&req.method==='PUT'){const body=await readJSONBody(req);await saveContent(body);return sendJSON(res,200,{ok:true,content:body})}
  if(u.pathname==='/api/media'&&req.method==='GET')return sendJSON(res,200,{ok:true,media:await listMedia()});
  if(u.pathname==='/api/media/upload'&&req.method==='POST'){
    const body=await readJSONBody(req);const type=String(body.type||'');
    if(!/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(type))return sendJSON(res,415,{ok:false,error:'Only image files are allowed'});
    const buf=Buffer.from(String(body.base64||''),'base64');if(!buf.length||buf.length>20*1024*1024)return sendJSON(res,413,{ok:false,error:'Image too large or empty'});
    const name=cleanName(body.name||'upload.jpg');await fsp.writeFile(path.join(UPLOADS,name),buf,{flag:'wx'});
    return sendJSON(res,201,{ok:true,name,url:'/uploads/'+encodeURIComponent(name)});
  }
  const md=u.pathname.match(/^\/api\/media\/(.+)$/);if(md&&req.method==='DELETE'){await fsp.unlink(path.join(UPLOADS,path.basename(decodeURIComponent(md[1])))).catch(()=>{});return sendJSON(res,200,{ok:true})}
  if(u.pathname==='/api/backups'&&req.method==='GET')return sendJSON(res,200,{ok:true,backups:await listBackups()});
  if(u.pathname==='/api/backups/create'&&req.method==='POST'){await backupCurrent();return sendJSON(res,201,{ok:true})}
  const rs=u.pathname.match(/^\/api\/backups\/restore\/(.+)$/);if(rs&&req.method==='POST'){const name=path.basename(decodeURIComponent(rs[1]));const raw=await fsp.readFile(path.join(BACKUPS,name),'utf8');const parsed=JSON.parse(raw);await backupCurrent();await atomicWrite(CONTENT,raw);return sendJSON(res,200,{ok:true,content:parsed})}
  return sendJSON(res,404,{ok:false,error:'API route not found'});
}

(async()=>{await ensureDirs();http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');if(u.pathname.startsWith('/api/'))return await handleAPI(req,res,u);if(u.pathname==='/cms-runtime.js')return send(res,200,await fsp.readFile(CMS_RUNTIME_FILE),'application/javascript; charset=utf-8');{const pm=u.pathname.match(/^\/projects\/([^/]+)\.html$/i);if(pm)return await serveProject(res,decodeURIComponent(pm[1]))}if(u.pathname==='/admin')return await serveStatic(res,'/admin.html');return await serveStatic(res,u.pathname)}catch(e){console.error(e);return sendJSON(res,500,{ok:false,error:e.message||'Server error'})}}).listen(PORT,HOST,()=>{console.log('');console.log('NAM NGUYEN DESIGN CMS FULL');console.log('Website : http://127.0.0.1:'+PORT+'/');console.log('CMS     : http://127.0.0.1:'+PORT+'/admin');console.log('')})})();
