const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const ctx=await b.newContext({viewport:{width:1600,height:900},locale:'zh-TW',timezoneId:'Asia/Taipei',recordVideo:{dir:'record/video',size:{width:1600,height:900}}});
 const p=await ctx.newPage();const t0=Date.now();const marks=[];const mark=n=>marks.push([n,(Date.now()-t0)/1000]);
 await p.addInitScript(()=>{const s=document.createElement('style');s.textContent='nextjs-portal{display:none!important}';document.addEventListener('DOMContentLoaded',()=>document.head.appendChild(s));});
 await p.goto((process.env.BASE_URL||'http://127.0.0.1:3011')+'/company/operating',{timeout:120000});
 await p.locator('#wbName').waitFor({timeout:60000});
 await p.locator('.rail-i').filter({has:p.locator('em',{hasText:/^日誌$/})}).click();
 await p.locator('#jcMine #doc').waitFor();await p.waitForTimeout(1200);mark('ready');
 const ed=p.locator('#doc .eb-tx[data-id]').last();await ed.click();
 await p.keyboard.press('End');await p.keyboard.press('Enter');await p.waitForTimeout(600);mark('type1');
 await p.keyboard.type('今天先把教學影片的分鏡寫完',{delay:90});await p.waitForTimeout(900);
 await p.keyboard.press('Enter');mark('tab');await p.waitForTimeout(500);await p.keyboard.press('Tab');await p.waitForTimeout(400);
 await p.keyboard.type('第二章：開始寫',{delay:90});await p.waitForTimeout(900);
 await p.keyboard.press('Enter');await p.waitForTimeout(400);mark('hash');await p.keyboard.type('#');await p.waitForTimeout(2500);mark('end');
 await ctx.close();await b.close();fs.writeFileSync('record/marks.json',JSON.stringify(marks));console.log(marks);
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
