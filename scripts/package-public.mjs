import {readdirSync,readFileSync,existsSync,statSync,mkdirSync,writeFileSync,cpSync,rmSync} from 'node:fs';
import {join,dirname,resolve,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const R=resolve(dirname(fileURLToPath(import.meta.url)),'..'),D=join(R,'dist');
const exclude=new Set(['.git','node_modules','scripts','content','data','src','templates','components','reports','functions','dist']);
function htmlFiles(p=R){return readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?((p===R&&exclude.has(e.name))?[]:htmlFiles(join(p,e.name))):e.name.endsWith('.html')?[join(p,e.name)]:[])}
rmSync(D,{recursive:true,force:true});mkdirSync(D,{recursive:true});
const copied=new Set(),pending=htmlFiles();
for(let n of ['robots.txt','sitemap.xml','llms.txt','ai.txt','_headers','_redirects'])if(existsSync(join(R,n)))pending.push(join(R,n));
// Public JavaScript modules and styles retain their relative imports.
function addAssets(p){for(let e of readdirSync(p,{withFileTypes:true})){let f=join(p,e.name);if(e.isDirectory())addAssets(f);else if(/\.(?:js|mjs|css|json|svg|woff2?|ttf)$/.test(e.name))pending.push(f)}}
addAssets(join(R,'assets'));
function enqueue(ref,from){
 if(!ref||/^(?:[a-z]+:|\/\/|#|data:)/i.test(ref))return;
 let raw=ref.split(/[?#]/)[0];try{raw=decodeURIComponent(raw)}catch{}
 let f=raw.startsWith('/')?join(R,raw):resolve(dirname(from),raw);
 if(!f.startsWith(R+'/'))return;
 let rel=relative(R,f),top=rel.split('/')[0];if(exclude.has(top))return;
 if(existsSync(f)&&statSync(f).isFile()&&!/\.(?:md|nef|mov|zip|sqlite|toml)$/i.test(f))pending.push(f);
}
while(pending.length){let f=pending.pop();if(copied.has(f))continue;copied.add(f);let to=join(D,relative(R,f));mkdirSync(dirname(to),{recursive:true});cpSync(f,to);
 if(/\.(?:html|css|js|mjs)$/.test(f)){
  let s=readFileSync(f,'utf8');for(let m of s.matchAll(/(?:src|href|poster)=["']([^"']+)["']/g))enqueue(m[1],f);
  for(let m of s.matchAll(/srcset=["']([^"']+)["']/g))for(let x of m[1].split(','))enqueue(x.trim().split(/\s+/)[0],f);
  for(let m of s.matchAll(/url\(["']?([^"')]+)["']?\)/g))enqueue(m[1],f);
 }
}
writeFileSync(join(R,'reports/public-package.json'),JSON.stringify({files:copied.size,bytes:[...copied].reduce((n,f)=>n+statSync(f).st_size,0)},null,2));
console.log('Packaged '+copied.size+' public files to dist/; source content excluded');
