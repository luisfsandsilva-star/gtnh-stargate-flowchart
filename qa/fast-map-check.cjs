const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const url='file://'+path.resolve('entrega/stargate-rc2-mapa.html');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1360,height:950}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForSelector('body[data-ready=true]');
 assert.equal(await page.locator('.inputs .node').count(),4);
 assert(await page.locator('*').count()<500);
 await page.screenshot({path:'qa/fast-root.png',fullPage:true});
 await page.locator('.inputs .node[data-node="sgcraft:stargatebase"]').click();
 assert.equal(await page.locator('.inputs .node').count(),8);
 assert.match(await page.locator('.inputs .pager').innerText(),/1–8 de 16/);
 await page.locator('.inputs .pager button').last().click();
 assert.match(await page.locator('.inputs .pager').innerText(),/9–16 de 16/);
 await page.getByText('Cuadrícula de crafteo 9 × 9',{exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.craft-grid td').length===81);
 await page.screenshot({path:'qa/fast-base.png',fullPage:true});
 await page.locator('#back').click();
 assert.equal(await page.locator('.inputs .node').count(),4);
 await page.locator('#forward').click();
 assert.equal(await page.locator('#recipe-view').getAttribute('data-key'),'isgcraft:stargatebase');
 const recipes=JSON.parse(fs.readFileSync(fs.existsSync('graph-data.json')?'graph-data.json':'entrega/stargate-rc2-recorrido.json','utf8')).recipes;
 const cases=['75536','277676','178442','eoh:74987','686','176362','75398','192839'];
 for(const id of cases){
  await page.goto(url+'?recipe='+encodeURIComponent(id));await page.waitForSelector('body[data-ready=true]');
  assert.equal(await page.locator('#recipe-view').getAttribute('data-recipe'),id);
  for(const side of ['inputs','outputs']){
   const found=[];
   while(true){
    const rows=await page.locator('.'+side+' .node').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.node,index:+n.dataset.slot,content:n.innerText})));
    found.push(...rows);
    const next=page.locator('.'+side+' .pager button').last();
    if(!(await next.count())||await next.isDisabled())break;
    await next.click();
   }
   assert.equal(found.length,recipes[id][side].length,id+' '+side);
   assert.deepEqual(found.map(s=>s.id),recipes[id][side].map(s=>s.id),id+' ordered slots');
  }
  if(id==='eoh:74987')assert.match(await page.locator('#recipe-view').innerText(),/timeCalculator/);
  console.log('recipe',id,'all slots accessible');
 }
 for(const width of [320,390,736,1000,1360]){
  await page.setViewportSize({width,height:950});
  await page.goto(url+'?item=sgcraft%3Astargatebase');await page.waitForSelector('body[data-ready=true]');
  assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1,'overflow '+width);
  const font=await page.locator('.node-name').first().evaluate(n=>parseFloat(getComputedStyle(n).fontSize));
  assert(font>=15,'font '+width);
  if(width===390)await page.screenshot({path:'qa/fast-mobile.png',fullPage:true});
 }
 await page.setViewportSize({width:1360,height:950});
 await page.goto(url);await page.waitForSelector('body[data-ready=true]');
 await page.locator('#search').fill('Stargate Core Crystal');await page.locator('#search').press('Enter');
 assert.equal(await page.locator('#recipe-view').getAttribute('data-key'),'isgcraft:sgcorecrystal');
 await page.locator('#map-mode').click();
 await page.waitForFunction(()=>window.__mapMetrics.canvasFrames>0);
 await page.locator('#zoom-in').click();await page.locator('#zoom-out').click();
 await page.screenshot({path:'qa/fast-map.png',fullPage:true});
 await page.locator('#fit-map').click();
 await page.waitForTimeout(100);
 await page.screenshot({path:'qa/fast-overview.png',fullPage:true});
 await page.locator('#open-selection').click();
 assert.equal(await page.locator('#recipe-view').getAttribute('data-key'),'isgcraft:sgcorecrystal');
 assert.deepEqual(errors,[]);
 console.log('All checks passed',await page.evaluate(()=>window.__mapMetrics));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
