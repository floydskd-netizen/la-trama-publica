import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const run=(file)=>{const r=spawnSync(process.execPath,[path.join(ROOT,'tools',file)],{cwd:ROOT,stdio:'inherit'});if(r.status!==0)process.exit(r.status??1)};

run('install-growth-client.mjs');
run('update-distribution.mjs');
console.log('Publication preparation complete. Review git diff before commit/push; external publishing remains manual/authorized.');
