// GrantProof synthetic end-to-end test. Works against a RUNNING LOCAL app.
// This changes the app's SQLite demo workspace. Run `npm run reset` before and after.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.GRANTPROOF_URL || 'http://127.0.0.1:4317').replace(/\/$/, '');
const ORIGIN = new URL(BASE).origin;
const HOST = new URL(BASE).hostname;
if (!['localhost', '127.0.0.1', '[::1]'].includes(HOST)) {
  throw new Error('Safety stop: this test changes demo records. Run only against localhost.');
}

let passed = 0;
function pass(title) { ++passed; console.log(`PASS ${String(passed).padStart(2,'0')}  ${title}`); }
async function request(route, expected = 200) {
  const res = await fetch(BASE + route);
  assert.equal(res.status, expected, `${route}: ${await res.clone().text()}`);
  return res;
}
async function post(body, expected = 200) {
  const res = await fetch(BASE + '/api/workspace', {
    method: 'POST',
    headers: {'Content-Type':'application/json', Origin:ORIGIN},
    body:JSON.stringify(body),
  });
  assert.equal(res.status, expected, `${body.action}: ${await res.clone().text()}`);
  return res.json();
}
async function file(name) { return readFile(path.join(dir, name), 'utf8'); }
async function ingestSource(filename,start,end) {
  const data = await post({ action:'source',name:filename,text:await file(filename),start,end });
  const source = data.sources.find(x => x.name === filename);
  assert.ok(source,`source not found: ${filename}`);
  const facts = data.facts.filter(x=>x.sourceId===source.id);
  assert.ok(facts.length>0);
  assert.ok(facts.every(x=>x.approved===false),'imported facts must begin pending');
  return {source,facts};
}
async function main() {
  console.log(`GrantProof synthetic QA against ${BASE}\nCAUTION: this mutates only the local fictional workspace.\n`);
  const home = await request('/');
  assert.match(await home.text(),/GrantProof/i);
  let s = await (await request('/api/workspace')).json();
  assert.equal(s.reports.find(r=>r.grantId==='g1').spent,1620000,'reset first');
  assert.equal(s.reports.find(r=>r.grantId==='g2').spent,0,'reset first');
  pass('App and baseline seeded data available');
  await request('/api/export?grant=g1',409);
  pass('Unapproved export is blocked (409)');

  const achieved=await ingestSource('05-achieved-program-register-2026.txt','2026-01-01','2026-12-31');
  const future=await ingestSource('06-approved-goals-plan-2027.txt','2027-01-01','2027-06-30');
  const unsafe=await ingestSource('07-unapproved-unsafe-claims.txt','2026-01-01','2026-12-31');
  assert.equal(achieved.facts.length,3);
  assert.equal(future.facts.length,2);
  assert.equal(unsafe.facts.length,2);
  pass('All seven imported candidate facts start unapproved');

  s=await post({action:'generate',id:'q1'});
  assert.equal(s.drafts.find(d=>d.questionId==='q1').claims.length,2);
  s=await post({action:'generate',id:'q3'});
  assert.equal(s.drafts.find(d=>d.questionId==='q3').claims.length,0);
  assert.ok(s.drafts.find(d=>d.questionId==='q3').gaps.length>0);
  pass('Unapproved evidence remains excluded; missing goals produce a gap');

  for(const f of achieved.facts) s=await post({action:'fact',id:f.id,kind:'achieved',approved:true});
  for(const f of future.facts) s=await post({action:'fact',id:f.id,kind:'goal',approved:true});
  s=await post({action:'generate',id:'q1'});
  const claims=s.drafts.find(d=>d.questionId==='q1').claims;
  assert.ok(claims.some(c=>c.text.includes('74 parent workshops')));
  assert.ok(!claims.some(c=>c.text.includes('99%')||c.text.includes('10,000')));
  s=await post({action:'generate',id:'q2'});
  assert.ok(s.drafts.find(d=>d.questionId==='q2').claims.every(c=>c.text.includes('action plans')));
  s=await post({action:'generate',id:'q3'});
  assert.equal(s.drafts.find(d=>d.questionId==='q3').gaps.length,0);
  assert.ok(s.drafts.find(d=>d.questionId==='q3').claims.every(c=>c.text.includes('2027')));
  pass('Approved evidence is cited; pending unsafe claims excluded; future goal separated');

  s=await post({action:'csv',text:await file('01-valid-transactions.csv')});
  assert.match(s.message,/7 imported/);
  assert.equal(s.transactions.length,11);
  assert.ok(s.reviewErrors.g1.some(e=>e.toLowerCase().includes('unallocated')));
  s=await post({action:'csv',text:await file('01-valid-transactions.csv')});
  assert.match(s.message,/0 imported/);
  assert.match(s.message,/7 duplicates/);
  pass('CSV import: seven new transactions, idempotent duplicate re-import');

  s=await post({action:'csv',text:await file('02-invalid-and-duplicate-transactions.csv')});
  assert.match(s.message,/0 imported/);
  assert.match(s.message,/2 duplicates/);
  assert.equal((s.message.match(/Row \d+:/g)||[]).length,5);
  pass('CSV rejects five malformed/conflicting rows; skips two duplicates');

  await post({action:'allocate',transactionId:'X105',grantId:'g1',category:'Family coaching',cents:1},400);
  const plan=JSON.parse(await file('expected-results.json'));
  for(const row of plan.allocations) s=await post({action:'allocate',...row});
  await post({action:'allocate',transactionId:'X107',grantId:'g1',category:'Family coaching',cents:1},400);
  const g1=s.reports.find(r=>r.grantId==='g1');
  const g2=s.reports.find(r=>r.grantId==='g2');
  assert.deepEqual([g1.spent,g1.balance],[1972555,3027445]);
  assert.deepEqual([g2.spent,g2.balance],[302544,2197456]);
  assert.equal(s.reviewErrors.g1.length,0,JSON.stringify(s.reviewErrors.g1));
  assert.equal(s.reviewErrors.g2.length,0,JSON.stringify(s.reviewErrors.g2));
  pass('Allocation restrictions and expected g1/g2 financial totals');

  s=await post({action:'approve',grantId:'g1',reviewer:'Synthetic QA Reviewer'});
  s=await post({action:'approve',grantId:'g2',reviewer:'Synthetic QA Reviewer'});
  assert.equal(s.currentApprovals.length,2);
  const json=await (await request('/api/export?grant=g1')).json();
  assert.equal(json.approval.snapshot.report.spent,1972555);
  assert.match(json.approval.hash,/^[a-f0-9]{64}$/);
  const html=await (await request('/api/export?format=html&grant=g1')).text();
  assert.ok(html.includes('$19,725.55'));
  assert.ok(!html.includes('99%'));
  pass('Both grants can be approved; sealed JSON and readable HTML exports match');

  const first=s.drafts.find(d=>d.questionId==='q1');
  s=await post({action:'edit',id:first.id,claims:[{text:'Invented 99% success rate.',factIds:['f1']}]});
  assert.ok(!s.currentApprovals.some(a=>a.grantId==='g1'));
  assert.ok(s.currentApprovals.some(a=>a.grantId==='g2'));
  await request('/api/export?grant=g1',409);
  await request('/api/export?grant=g2',200);
  pass('Tampering revokes affected grant approval without revoking unrelated grant');

  if(process.env.GRANTPROOF_STRESS==='1') {
    s=await post({action:'csv',text:await file('04-stress-100-transactions.csv')});
    assert.match(s.message,/100 imported/);
    s=await post({action:'csv',text:await file('04-stress-100-transactions.csv')});
    assert.match(s.message,/100 duplicates/);
    s=await post({action:'generate',id:'q1'});
    assert.ok(s.reviewErrors.g1.some(error=>error.toLowerCase().includes('unallocated')));
    const blocked=await post({action:'approve',grantId:'g1',reviewer:'Synthetic QA Reviewer'},400);
    assert.match(blocked.error,/unallocated/i);
    pass('Additional 100-row stress import, duplicate retry and unallocated approval block');
  }
  console.log(`\nSUCCESS: ${passed} synthetic end-to-end checks passed.\nRun npm run reset in the app repo to restore the clean fictional demo.`);
}
main().catch(e=>{console.error('\nFAILED:',e.stack||e);process.exitCode=1;console.error('Run npm run reset after investigating, before your next test.');});
