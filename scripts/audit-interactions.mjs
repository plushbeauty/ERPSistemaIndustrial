#!/usr/bin/env node
/**
 * SGQ ERP — Auditoria estática de telas/interações.
 * Bloqueia somente defeitos de interação claramente identificáveis.
 * Duplicações potenciais permanecem como alerta para revisão semântica.
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

const blocking=[];
const warnings=[];
const interactiveRe=/<(?:button|a|Link)\b[\s\S]*?>/g;
const hasHandler=/\bonClick\s*=|\bto\s*=|\bhref\s*=/;
const placeholder=/(console\.log\s*\(|TODO|FIXME|em breve|em\s+desenvolvimento|coming\s+soon)/i;
const handlerBody=/onClick\s*=\s*\{?\s*\(?[^=]*\)?\s*=>\s*([\s\S]{0,500}?)(?=\}\s*>|\}\s*\n|>)/i;
const norm=s=>s.replace(/\s+/g,' ').replace(/\b[a-zA-Z_$][\w$]*\b/g,'ID').trim();

for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  let m;
  while((m=interactiveRe.exec(text))){
    const tag=m[0];
    const line=text.slice(0,m.index).split(/\r?\n/).length;
    if(!hasHandler.test(tag)) blocking.push({type:'SEM_ACAO',file:path.relative(process.cwd(),file),line,label:tag.slice(0,180)});
    if(placeholder.test(tag)) blocking.push({type:'PLACEHOLDER',file:path.relative(process.cwd(),file),line,label:tag.slice(0,180)});
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
    if(linesFound.length>1) warnings.push({type:'DUPLICADO_POTENCIAL',file:path.relative(process.cwd(),file),line:linesFound.join(','),label:key.slice(0,180)});
  }
}

console.log('\nSGQ ERP — AUDITORIA DE INTERAÇÕES');
console.log(`Arquivos analisados: ${files.length}`);
console.log(`Bloqueios: ${blocking.length}`);
console.log(`Alertas de revisão: ${warnings.length}\n`);
for(const f of blocking) console.log(`[BLOQUEIO:${f.type}] ${f.file}:${f.line} — ${f.label}`);
for(const f of warnings) console.log(`[ALERTA:${f.type}] ${f.file}:${f.line} — ${f.label}`);
if(!blocking.length) console.log('OK — nenhum bloqueio estático encontrado.');
process.exitCode=blocking.length?1:0;
