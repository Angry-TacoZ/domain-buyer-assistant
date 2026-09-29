import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../', import.meta.url));
const live = process.env.PORTFOLIO_VERIFY_URL;
const server = live ? null : createServer((request, response) => {
  const file = request.url?.endsWith('austin_domain_portfolio_interactive.html') ? 'austin_domain_portfolio_interactive.html' : 'index.html';
  response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(readFileSync(path.join(root, 'dist', file)));
});
if (server) await new Promise(resolve => server.listen(4191, '127.0.0.1', resolve));
const url = live || 'http://127.0.0.1:4191/';
const browser = await chromium.launch();
const errors = [];
const output = path.join(root, 'output/portfolio'); mkdirSync(output, { recursive: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width:390, height:844 } : { width:1440, height:1000 }, isMobile:mobile, hasTouch:mobile });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type()==='error') errors.push(message.text()); });
    const response = await page.goto(url); assert.equal(response.status(), 200);
    assert.equal(await page.locator('#rows tr').count(),94);
    assert.equal(await page.locator('#domainApp .kpi .value').allTextContents().then(values => values.join('|')), '94|$306,607|$72,720|4.22×');
    await page.getByLabel('Search domains').fill('DesMoines.plumbing');
    assert.equal(await page.locator('#rows tr').count(),1);
    const selected = page.getByRole('button',{name:'DesMoines.plumbing',exact:true});
    if (mobile) await selected.tap(); else await selected.click();
    assert.equal(await page.locator('#detail h3').textContent(),'DesMoines.plumbing');
    assert((await page.locator('#detail').textContent()).includes('$4,999'));
    await page.getByLabel('Search domains').fill('not-a-domain-in-this-file');
    assert(await page.locator('#empty').isVisible()); assert((await page.locator('#detail').textContent()).includes('No domain selected'));
    await page.getByLabel('Search domains').fill(''); await page.getByLabel('Filter by city').selectOption('Manila');
    const cityRows = await page.locator('#rows tr td:last-child').allTextContents(); assert(cityRows.length>0); assert(cityRows.every(city=>city==='Manila'));
    await page.getByLabel('Filter by pricing gap').selectOption('under');
    assert((await page.locator('#rows tr').count())>0);
    assert((await page.locator('#rows tr td:nth-child(4) b').allTextContents()).every(value=>Number.parseFloat(value)<=1));
    await page.getByLabel('Filter by city').selectOption(''); await page.getByLabel('Filter by pricing gap').selectOption('2');
    assert((await page.locator('#rows tr td:nth-child(4) b').allTextContents()).every(value=>Number.parseFloat(value)>1&&Number.parseFloat(value)<=2));
    await page.getByLabel('Filter by pricing gap').selectOption(''); await page.getByLabel('Sort domains').selectOption('domain');
    const names = await page.locator('#rows .domain-choice').allTextContents(); assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b)));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false,'Page overflow');
    const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    assert.deepEqual(accessibility.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)})),[]);
    await page.screenshot({path:path.join(output,`${live?'live-':''}${mobile?'mobile':'desktop'}.png`),fullPage:true});
    const download = page.waitForEvent('download'); await page.getByRole('link',{name:'Download the unchanged original HTML'}).click(); const artifact=await download;
    assert.deepEqual(readFileSync(await artifact.path()),readFileSync(path.join(root,'portfolio/source/austin_domain_portfolio_interactive.html')));
    await context.close();
  }
  const page = await browser.newPage(); await page.goto(url);
  let reached=false;
  for(let count=0;count<20;count++){await page.keyboard.press('Tab'); if(await page.evaluate(()=>document.activeElement?.classList.contains('domain-choice'))){reached=true;break;}}
  assert(reached,'Keyboard could not reach a domain button');
  const name=await page.evaluate(()=>document.activeElement.textContent); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#detail h3').textContent(),name);
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),name,'Selection lost keyboard focus');
  await page.keyboard.press('Tab'); const next=await page.evaluate(()=>document.activeElement.textContent); await page.keyboard.press('Space'); assert.equal(await page.locator('#detail h3').textContent(),next);
  await page.close(); assert.deepEqual(errors,[],'Browser errors');
  writeFileSync(path.join(output,`${live?'live-':''}verification.json`),JSON.stringify({url,sourceCount:94,sourceTotals:'pass',search:'pass',city:'pass',pricingGap:'pass',sort:'pass',empty:'pass',detail:'pass',originalDownload:'pass',mobileTouch:'pass',keyboard:'pass',accessibility:'pass',browserErrors:errors},null,2)+'\n');
  console.log(`PASS: ${live?'live':'local'} portfolio, original download, filters/sort/detail, mobile/touch/keyboard, accessibility; no browser errors.`);
} finally {await browser.close(); if(server) await new Promise(resolve=>server.close(resolve));}
