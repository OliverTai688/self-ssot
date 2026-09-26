/** Auditable source port. Compile trusted prototype handlers to closures at development time.
 * No eval, Function constructor, inline event attributes, iframe or browser script execution.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { patchCss } from '../src/components/yuanzhan/v5/css-token-patches.mjs';
const sourcePath='docs/03_feature-reference/REF-004_yuanzhan-operating-interface/originals/圓展_Operating_System_原型_v5_兩人上線版.html';
const html=fs.readFileSync(sourcePath,'utf8');
let source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
let shell=html.split('<body>')[1].split('<script>')[0];
// Only scope the body element selector; preserve class names such as .dr-body.
let css=html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/:root/g,':host').replace(/html,body/g,'.v5-root').replace(/(?<![\w-])body(?![\w-])/g,'.v5-root');
css=patchCss(css);
const dataStart=source.indexOf('const DB = '),dataEnd=source.indexOf('\n\n/* 模板庫',dataStart);
const rawData=source.slice(dataStart+'const DB = '.length,dataEnd).trim().replace(/;$/,'');
const histStart=source.indexOf('function genHistory()'), histEnd=source.indexOf('DB.history=genHistory();')+'DB.history=genHistory();'.length;
const history=source.slice(histStart,histEnd);
const rng=source.slice(source.indexOf('function mulberry'),source.indexOf('/* ---------- data ---------- */'));
fs.writeFileSync('src/lib/ui-data/yuanzhan/v5-seed.js',`// Generated from the owner-provided v5 reference. Synthetic UI fixtures only.\nexport function referenceSeed(){\n${rng}\nconst TODAY='2026-09-12';\nconst DB=${rawData};\n${history}\nreturn DB;\n}\n`);
source=source.slice(0,dataStart)+'const DB = initialState.data;\n'+source.slice(dataEnd);
source=source.replace(/DB\.history=genHistory\(\);/,'');
source=source.replace(/const TODAY='2026-09-12';/,"const TODAY=initialState.referenceDate;");
source=source.replace(/(?<!const )\bDRAWERS=\{\};/,'const DRAWERS={};');
source=source.replace(/document\.body/g,'root').replace(/document\.querySelectorAll/g,'root.querySelectorAll').replace(/document\.querySelector/g,'root.querySelector').replace(/document\.getElementById\(([^;\n]*?)\)/g,'getById($1)');
source=source.replace(/document\.addEventListener\(/g,'listen(').replace(/window\._/g,'runtime._');
// Browser selection belongs to the shadow root; fall back for browsers without getSelection.
source=source.replace(/\bgetSelection\(\)/g,'selection()');
source=source.replace("b.getAttribute('onclick').includes(`'${v}'`)","b.dataset.value===v");
source=source.replace('onclick="pickChip(\'${id}\',\'${esc(ov)}\')"','data-value="${esc(ov)}" onclick="pickChip(\'${id}\',\'${esc(ov)}\')"');
// The source interpolated double quotes inside an attribute. Use a closed-over word instead.
source=source.replace('this.value!==${JSON.stringify(word)}',"this.value!=='${word}'");
// Source's visual baseline remains intact. Behaviour corrections are explicit and versioned separately.
const patchPath='src/components/yuanzhan/v5/source-patches.mjs';
if(fs.existsSync(patchPath)){const{patchSource}=await import('../'+patchPath+'?v='+Date.now());source=patchSource(source);}
const initAt=source.lastIndexOf('paintUser(); renderRail(); render(); paintFlowBadge();');
// Extension sources are appended before init, inside mountV5's scope. Order is cosmetic:
// function declarations hoist, so operating-spine's helpers are visible to every view.
const EXTENSIONS=['operating-spine','extensions','replies','journal-cockpit','timeline-participants','template-objects','agenda-object','object-index','operating-canvas','operating-forms','operating-converge','operating-persistence','notifications','cashflow-faces','form-modal'];
source=source.slice(0,initAt)+EXTENSIONS.map(n=>fs.readFileSync('src/components/yuanzhan/v5/'+n+'.source.js','utf8')).join('\n')+'\n'+source.slice(initAt);
source=source.replace("setTimeout(()=>toast('v5：右上可切換 <b>戴宇星 / Lily</b> 視角看權限邊界　·　側欄「訊號」是 AI 的唯一出口'),900);",'');
// Closure attributes are first compiled while all template expressions still have lexical scope.
let compiled=0, markerSeq=0;
const marker=()=>`__V5EXPR${markerSeq++}__`;
function parts(node){if(t.isStringLiteral(node))return {text:node.value,vars:new Map()};
 if(!t.isTemplateLiteral(node))throw Error('Not a code template: '+node.type);
 const vars=new Map();let text='';node.quasis.forEach((q,i)=>{text+=q.value.cooked??q.value.raw;if(i<node.expressions.length){const k=marker();vars.set(k,node.expressions[i]);text+=k;}});return{text,vars};}
function mixed(str,vars){const re=/__V5EXPR\d+__/g;let match,last=0;const bits=[];while((match=re.exec(str))){if(match.index>last)bits.push(t.stringLiteral(str.slice(last,match.index)));bits.push(t.cloneNode(vars.get(match[0]),true));last=re.lastIndex;}if(last<str.length)bits.push(t.stringLiteral(str.slice(last)));return bits.length?bits.reduce((a,b)=>t.binaryExpression('+',a,b)):t.stringLiteral(str);}
function callback(node){
 if(t.isArrowFunctionExpression(node)||t.isFunctionExpression(node))return node;
 if(t.isConditionalExpression(node))return t.conditionalExpression(node.test,callback(node.consequent),callback(node.alternate));
 if(!t.isTemplateLiteral(node)&&!t.isStringLiteral(node))return t.arrowFunctionExpression([t.identifier('event'),t.identifier('element')],t.callExpression(node,[t.identifier('event'),t.identifier('element')]));
 const {text,vars}=parts(node);return compileCode(text,vars);
}
function compileCode(code,vars){
 let ast;try{ast=parse(code,{allowReturnOutsideFunction:true});}catch(e){throw new Error('Handler parse failed: '+code+'\n'+e.message);}
 traverse(ast,{
  ThisExpression(p){p.replaceWith(t.identifier('element'));},
  StringLiteral(p){if(/__V5EXPR\d+__/.test(p.node.value)){p.replaceWith(mixed(p.node.value,vars));p.skip();}},
  Identifier(p){if(!vars.has(p.node.name))return;const n=t.cloneNode(vars.get(p.node.name),true);
   if(p.parentPath.isExpressionStatement())p.replaceWith(t.callExpression(callback(n),[t.identifier('event'),t.identifier('element')]));else p.replaceWith(n);p.skip();}
 });
 return t.arrowFunctionExpression([t.identifier('event'),t.identifier('element')],t.blockStatement(ast.program.body));
}
function compileMarkup(node){const {text:input,vars}=parts(node);if(!/\son\w+=/.test(input))return null;
 const text=input.replace(/\s(on\w+)="([\s\S]*?)"/g,(_,on,code)=>{const k=marker();vars.set(k,t.callExpression(t.identifier('bind'),[t.stringLiteral(on.slice(2)),compileCode(code,vars)]));compiled++;return ' '+k;});
 const qs=[],xs=[];let last=0,m;const re=/__V5EXPR\d+__/g;while((m=re.exec(text))){const s=text.slice(last,m.index);qs.push(t.templateElement({raw:s.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${'),cooked:s}));xs.push(vars.get(m[0]));last=re.lastIndex;}const s=text.slice(last);qs.push(t.templateElement({raw:s.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${'),cooked:s},true));return t.templateLiteral(qs,xs);
}
const ast=parse(source,{sourceType:'module'});
traverse(ast,{CallExpression:{exit(p){if(t.isIdentifier(p.node.callee,{name:'mini'})&&p.node.arguments[1])p.node.arguments[1]=callback(p.node.arguments[1]);}},'TemplateLiteral|StringLiteral':{exit(p){const out=compileMarkup(p.node);if(out){p.replaceWith(out);p.skip();}}}});
const shellAst=compileMarkup(t.stringLiteral(shell));
const prelude=fs.readFileSync('src/components/yuanzhan/v5/runtime-prelude.source.js','utf8');
const code=`// GENERATED by scripts/generate-yuanzhan-v5.mjs. Edit the reference patch/extension sources.\n// Reference SHA256: ${crypto.createHash('sha256').update(html).digest('hex')}\nimport { evaluateFormula } from '@/lib/ui-data/yuanzhan/formulas';\nimport { buildSpine, TRACK_REF_TYPES, detectConflicts, expandRule, parseRule, rhythmAdherence, weekStarts, addDays as spineAddDays, isoWeek as spineIsoWeek } from '@/lib/ui-data/yuanzhan/operating-spine';\nimport { snapshotCollections, diffCollections, identifyRow, WRITE_ENABLED_COLLECTIONS as OP_WRITE_ENABLED, MAX_CHANGES_PER_COMMAND as OP_MAX_CHANGES, MAX_COMMANDS_PER_BATCH as OP_MAX_COMMANDS, MAX_COMMAND_BYTES as OP_MAX_BYTES, OPERATING_COMMANDS_ENDPOINT } from '@/lib/ui-data/yuanzhan/operating-commands';\nexport function mountV5(root, initialState, hooks={}){\n${prelude}\nroot.innerHTML=${generate(shellAst).code};\n${generate(ast,{comments:true}).code}\nreturn { destroy, snapshot:()=>structuredClone(DB), navigate:nav };\n}\n`;
fs.writeFileSync('src/components/yuanzhan/v5/runtime.js',code);
fs.writeFileSync('src/components/yuanzhan/v5/styles.ts','// Original v5 CSS, isolated in Shadow DOM.\nexport const v5Styles = '+JSON.stringify(css+fs.readFileSync('src/components/yuanzhan/v5/additions.css','utf8')+fs.readFileSync('src/components/yuanzhan/v5/replies.css','utf8')+fs.readFileSync('src/components/yuanzhan/v5/journal-cockpit.css','utf8')+fs.readFileSync('src/components/yuanzhan/v5/timeline-participants.css','utf8')+fs.readFileSync('src/components/yuanzhan/v5/object-index.css','utf8')+fs.readFileSync('src/components/yuanzhan/v5/agenda-object.css','utf8')+fs.readFileSync('src/components/yuanzhan/v5/operating-canvas.css','utf8')+fs.readFileSync('src/components/yuanzhan/v5/notifications.css','utf8')+fs.readFileSync('src/components/yuanzhan/v5/cashflow-faces.css','utf8')+fs.readFileSync('src/components/yuanzhan/v5/form-modal.css','utf8'))+'\n');
console.log(`Compiled ${compiled} handler templates into lexical closures; generated runtime + styles + seed.`);
