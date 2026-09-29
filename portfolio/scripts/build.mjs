import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../', import.meta.url));
const original = path.join(root, 'portfolio/source/austin_domain_portfolio_interactive.html');
const raw = readFileSync(original);
assert.equal(createHash('sha256').update(raw).digest('hex'), '761305269f1767b74230ab2cf2ddd07eae7590329d45bb7b90a7bb4ffc8d274a', 'Original artifact differs from the supplied snapshot');
let content = raw.toString('utf8');
const data = JSON.parse(content.match(/const data = (\[.*\]);/)[1]);
assert.equal(data.length, 94);
assert.equal(data.reduce((sum, item) => sum + item.ask, 0), 306607);
assert.equal(data.reduce((sum, item) => sum + item.mid, 0), 72720);
assert.equal(new Set(data.map(item => item.domain)).size, data.length);
for (const item of data) {
  assert(/^[A-Za-z0-9.-]+\.[A-Za-z]+$/.test(item.domain));
  assert(Object.values(item).every(value => typeof value !== 'string' || !/[<>]/.test(value)), 'Unsafe text in embedded data');
  assert(['ask', 'lease', 'mid', 'ratio', 'score', 'commission'].every(key => Number.isFinite(item[key]) && item[key] >= 0));
}
function replace(oldText, newText) { assert(content.includes(oldText), `Missing expected fragment: ${oldText}`); content = content.replace(oldText, newText); }
replace('<option value="2">≤ 2× midpoint</option>', '<option value="2">1–2× midpoint</option>');
replace("const arr=filtered(), tbody=$('rows'); tbody.innerHTML='';", "const focusedDomain=document.activeElement?.dataset.domain; const arr=filtered(), tbody=$('rows'); tbody.innerHTML='';");
replace("const tr=document.createElement('tr'); tr.tabIndex=0;", "const tr=document.createElement('tr');");
replace('<td><b>${d.domain}</b>', '<td><button class="domain-choice" type="button" data-domain="${d.domain}">${d.domain}</button>');
replace("tr.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();showDetail(d);} });", '');
replace("if(!selected && arr[0]) showDetail(arr[0]);", "if(!arr.some(d=>d.domain===selected)){ if(arr[0]) showDetail(arr[0]); else { selected=null; $('detail').textContent='No domain selected. Adjust the filters to inspect a domain.'; } } if(focusedDomain){ [...tbody.querySelectorAll('button')].find(button=>button.dataset.domain===focusedDomain)?.focus({preventScroll:true}); }");
const prefix = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="A supplied domain portfolio screening snapshot. Asking prices and automated appraisals are not independently verified."><title>Austin’s domain portfolio · Screening snapshot</title><style>
:root{--viz-text:#233328;--viz-muted:#596b5c;--viz-card:#fff;--viz-border:#dae3db;--viz-panel:#f0f4ef;--viz-accent:#205c53;--viz-accent-bg:#e6efe7;--viz-series-3:#896022;--viz-series-4:#507a67;color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f7f8f5;color:var(--viz-text);font-family:system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:32px}header{margin-bottom:28px}header .eyebrow{font-size:11px;letter-spacing:.12em;color:var(--viz-muted);text-transform:uppercase}h1{font-size:32px;letter-spacing:-.8px;margin:10px 0}header p{color:var(--viz-muted);font-size:14px;line-height:1.7;max-width:800px;margin:0}a{color:var(--viz-accent)}footer{margin-top:24px;border-top:1px solid var(--viz-border);padding-top:18px;font-size:12px;line-height:1.8;color:var(--viz-muted)}button,input,select{font:inherit}button,a,select,input{touch-action:manipulation}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--viz-accent);outline-offset:3px}#domainApp .domain-choice{display:block;border:0;background:transparent;color:var(--viz-text);font-weight:650;text-align:left;padding:8px 0;cursor:pointer;min-height:40px}#domainApp tbody tr:hover{background:#f4f7f2}#domainApp .detail{line-height:1.7}#domainApp .foot{font-size:12px}#domainApp .metric{font-size:12px}.skip{position:absolute;left:20px;top:-100px;padding:12px;background:white}.skip:focus{top:10px}#domainApp select{padding-right:28px}@media(max-width:760px){main{padding:20px 16px}h1{font-size:27px}header p{font-size:13px}}
</style></head><body><a class="skip" href="#portfolio">Skip to portfolio</a><main id="portfolio"><header><div class="eyebrow">Supplied portfolio snapshot</div><h1>Austin’s domain portfolio</h1><p>Explore the supplied asking prices alongside one automated appraisal benchmark. Prices, availability, and appraisal provenance have not been independently verified; this page makes no current valuation or sales claim.</p></header>`;
const suffix = `<footer>Source: the HTML artifact supplied by James on 29 September 2026. No live appraisal, research, or sales service is connected. Totals describe the complete supplied portfolio; filters change the table only.<br><a href="austin_domain_portfolio_interactive.html" download>Download the unchanged original HTML</a></footer></main></body></html>`;
mkdirSync(path.join(root, 'dist'), { recursive: true });
writeFileSync(path.join(root, 'dist/index.html'), prefix + content + suffix);
copyFileSync(original, path.join(root, 'dist/austin_domain_portfolio_interactive.html'));
console.log('Built standalone snapshot: 94 domains; supplied totals and original SHA-256 verified.');
