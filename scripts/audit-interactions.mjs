#!/usr/bin/env node
/**
 * SGQ ERP — Auditoria estática de telas/interações.
 * Uso: node scripts/audit-interactions.mjs [diretorio]
 * Default: src
 * Exit code 1 quando encontra suspeitas; não altera arquivos.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'src');
const exts = new Set(['.tsx','.jsx','.js']);
const skip = new Set(['node_modules','dist','.git']);
const files=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(skip.has(ent.name)) continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(exts.has(path.extname(ent.name))) files.push(p);
  }
}
walk(root);

const findings=[];
const interactiveRe=/<(?:button|a|Link)\b[\s\S]*?>/g;
const hasHandler=/\bonClick\s*=|\bto\s*=|\bhref\s*=/;
const placeholder=/(console\.log\s*\(|TODO|FIXME|em breve|em\s+desenvolvimento|coming\s+soon|placeholder)/i;
const handlerBody=/onClick\s*=\s*\{?\s*\(?[^=]*\)?\s*=>\s*([\s\S]{0,500}?)(?=\}\s*>|\}\s*\n|>)/i;
const norm=s=>s.replace(/\s+/g,' ').replace(/\b[a-zA-Z_$][\w$]*\b/g,'ID').trim();

for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  const lines=text.split(/\r?\n/);
  let m;
  while((m=interactiveRe.exec(text))){
    const tag=m[0];
    const line=text.slice(0,m.index).split(/\r?\n/).length;
    if(!hasHandler.test(tag)) findings.push({type:'SEM_ACAO',file:path.relative(process.cwd(),file),line,label:tag.slice(0,180)});
    if(placeholder.test(tag)) findings.push({type:'PLACEHOLDER',file:path.relative(process.cwd(),file),line,label:tag.slice(0,180)});
  }
  const handlerBodies=[];
  let hm;
  while((hm=handlerBody.exec(text))) handlerBodies.push({line:text.slice(0,hm.index).split(/\r?\n/).length,body:hm[1]||''});
  const groups=new Map();
  for(const h of handlerBodies){
    const key=norm(h.body);
    if(!key || key.length<8) continue;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(h.line);
  }
  for(const [key,linesFound] of groups){
    if(linesFound.length>1) findings.push({type:'DUPLICADO_POTENCIAL',file:path.relative(process.cwd(),file),line:linesFound.join(','),label:key.slice(0,180)});
  }
}

console.log('\nSGQ ERP — AUDITORIA DE INTERAÇÕES');
console.log(`Arquivos analisados: ${files.length}`);
console.log(`Suspeitas encontradas: ${findings.length}\n`);
for(const f of findings) console.log(`[${f.type}] ${f.file}:${f.line} — ${f.label}`);
if(!findings.length) console.log('OK — nenhuma suspeita estática encontrada.');
console.log('\nNota: navegação por href/to e ações de UI/estado são interações válidas; o script não as classifica como CRUD de banco. Duplicação é marcada como potencial e exige confirmação semântica antes de remoção.');
process.exitCode=findings.length?1:0;
