import { spawn } from 'node:child_process';
const options={stdio:'inherit',detached:process.platform!=='win32'};
const children=[spawn(process.execPath,['node_modules/nodemon/bin/nodemon.js','--watch','ecommerce','--ignore','ecommerce/dist','--ignore','ecommerce/src','--ext','js','--exec','node --env-file-if-exists=ecommerce/.env','ecommerce/server.js'],options),spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','ecommerce/vite.config.js','--host','0.0.0.0'],options)];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children){try{process.platform==='win32'?child.kill('SIGTERM'):process.kill(-child.pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}}process.exitCode=code;}
for(const child of children){child.on('exit',code=>stop(code??0));child.on('error',()=>stop(1));}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
