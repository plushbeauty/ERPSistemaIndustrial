#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'src');
const exts=new Set(['.tsx','.jsx','.js']);
const skip=new Set(['node_modules','dist','.git']);
const blocking=[];let filesAnalyzed=0;
const TAG_START=/<(button|a|Link)\b/i;
const ACTION=/\b(onClick|onSubmit|onChange|to|href|type)\s*=/i;
const PLACEHOLDER=/(console\.log\s*\(|TODO|FIXME|em breve|coming\s+soon)/i;
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(ent.name))continue;const file=path.join(dir,ent.name);if(ent.isDirectory())walk(file);else if(exts.has(path.extname(ent.name)))scan(file)}}
function relative(file){return path.relative(process.cwd(),file)}
function analyzeTag(file,line,text){if(!ACTION.test(text))blocking.push({type:'SEM_ACAO',file:relative(file),line,label:text.slice(0,220)});if(PLACEHOLDER.test(text))blocking.push({type:'PLACEHOLDER',file:relative(file),line,label:text.slice(0,220)})}
function scan(file){filesAnalyzed++;const source=fs.readFileSync(file,'utf8');let i=0;while(i<source.length){const rest=source.slice(i),match=rest.match(TAG_START);if(!match)break;const start=i+match.index;let j=start,quote=null,braceDepth=0,end=-1;for(;j<source.length;j++){const ch=source[j];if(quote){if(ch===quote&&source[j-1]!== '\\')quote=null;continue}if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}if(ch==='{'){braceDepth++;continue}if(ch==='}'&&braceDepth>0){braceDepth--;continue}if(ch==='>'&&braceDepth===0){end=j;break}}if(end<0)break;const text=source.slice(start,end+1),before=source.slice(0,start),line=(before.match(/\n/g)||[]).length+1;analyzeTag(file,line,text);i=end+1}}
if(!fs.existsSync(root)){console.error(`Diretório não encontrado: ${root}`);process.exitCode=2}else{walk(root);console.log('\nSGQ ERP — AUDITORIA DE INTERAÇÕES');console.log(`Arquivos analisados: ${filesAnalyzed}`);console.log(`Bloqueios: ${blocking.length}`);for(const item of blocking)console.log(`[BLOQUEIO:${item.type}] ${item.file}:${item.line} — ${item.label}`);if(!blocking.length)console.log('OK — nenhum bloqueio estático encontrado.');process.exitCode=blocking.length?1:0}
