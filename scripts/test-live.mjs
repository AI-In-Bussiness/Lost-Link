import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout } from 'node:timers/promises';
const probe=net.createServer();
await new Promise((resolve,reject)=>{probe.once('error',()=>reject(new Error('Port 3000 is occupied. Stop the existing app before test:live.')));probe.listen(3000,'localhost',()=>probe.close(resolve));});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','localhost'],{stdio:['ignore','ignore','inherit']});
let code=1;
try{
 let ready=false;
 for(let i=0;i<60;i++){
  if(server.exitCode!==null)throw new Error('Application server exited before readiness.');
  try{const r=await fetch('http://localhost:3000');if(r.ok){ready=true;break;}}catch{}
  await setTimeout(500);
 }
 if(!ready)throw new Error('Application failed readiness check.');
 for(const script of ['scripts/smoke-auth.mjs','scripts/smoke-backend.mjs']){
  const smoke=spawn(process.execPath,[script],{stdio:'inherit'});
  code=await new Promise(resolve=>{smoke.on('error',()=>resolve(1));smoke.on('exit',c=>resolve(c??1));});
  if(code!==0)break;
 }
 if(server.exitCode!==null)throw new Error('Application server exited during smoke tests.');
}finally{server.kill('SIGTERM');}
process.exitCode=code;
