import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { requiredEvidence, releaseReadiness } from '../scripts/release-readiness.mjs';

function fixture() {
  const files = new Map();
  const pin = path => { files.set(path, 'fixture');return {path,sha256:createHash('sha256').update('fixture').digest('hex')}; };
  const candidate = {sourceRevision:'a'.repeat(40),productionOrigin:'https://release.example',deploymentId:'candidate',verifiedRollbackDeploymentId:'previous',blockers:[],
    lockfile:pin('package-lock.json'),model:pin('src/lib/search/model-manifest.json'),migrations:[pin('supabase/migrations/1.sql')],
    publicSmoke:{path:'docs/phase-7/public.json'},releaseEvidence:{}};
  files.set(candidate.publicSmoke.path,JSON.stringify({check:'release-public-smoke',origin:candidate.productionOrigin,passed:true,checks:Array.from({length:17},()=>({passed:true}))}));
  for (const kind of requiredEvidence) {
    const path = `docs/phase-7/${kind}.json`;candidate.releaseEvidence[kind]=path;
    files.set(path,JSON.stringify({check:kind,sourceRevision:candidate.sourceRevision,origin:candidate.productionOrigin,passed:true,observedAt:'2026-10-27T00:00:00Z',reference:'Synthetic test evidence',rollbackDeploymentId:'previous',restoredDeploymentId:'candidate'}));
  }
  return {candidate,files,run:()=>releaseReadiness(candidate,path=>files.get(path)??(()=>{throw Error('SENSITIVE_SENTINEL');})(),['supabase/migrations/1.sql'],Date.parse('2026-10-28T00:00:00Z'))};
}
test('consistent complete evidence is ready for operator lock without creating a release',()=>assert.equal(fixture().run().readyForLock,true));
test('green public smoke alone cannot close hosted gates',()=>{
  const f=fixture();f.candidate.releaseEvidence={};assert.equal(f.run().readyForLock,false);
  assert.equal(f.run().checks.filter(row=>!row.passed).length,requiredEvidence.length);
});
test('missing or changed pins and omitted migrations fail',()=>{
  for(const change of [f=>f.files.set('package-lock.json','changed'),f=>f.candidate.migrations=[],f=>f.candidate.model.path='../../etc/passwd']){
    const f=fixture();change(f);assert.equal(f.run().readyForLock,false);
  }
});
test('failed, mismatched-source, foreign-origin, future and absent hosted evidence fails',()=>{
  for(const change of [{passed:false},{sourceRevision:'b'.repeat(40)},{origin:'https://other.example'},{observedAt:'2999-01-01T00:00:00Z'},{reference:''}]){
    const f=fixture(),path=f.candidate.releaseEvidence['photo-claim-return'];f.files.set(path,JSON.stringify({...JSON.parse(f.files.get(path)),...change}));assert.equal(f.run().readyForLock,false);
  }
});
test('rollback must restore the pinned candidate; unresolved quality blockers remain blocking',()=>{
  for(const change of [f=>f.candidate.verifiedRollbackDeploymentId='candidate',f=>f.candidate.blockers=['quality failure'],f=>{const p=f.candidate.releaseEvidence['rollback-rehearsal'];f.files.set(p,JSON.stringify({...JSON.parse(f.files.get(p)),restoredDeploymentId:'different'}));}]){
    const f=fixture();change(f);assert.equal(f.run().readyForLock,false);
  }
});
test('aggregate public pass cannot hide a failing or missing check',()=>{
  for(const checks of [[],Array.from({length:17},(_,i)=>({passed:i!==3}))]){
    const f=fixture();f.files.set(f.candidate.publicSmoke.path,JSON.stringify({check:'release-public-smoke',origin:f.candidate.productionOrigin,passed:true,checks}));assert.equal(f.run().readyForLock,false);
  }
});
test('untrusted evidence paths and exceptions cannot expose secret diagnostic values',()=>{
  const f=fixture();f.candidate.releaseEvidence['authenticated-smoke']='../../etc/passwd';f.files.delete(f.candidate.publicSmoke.path);
  const output=JSON.stringify(f.run());assert.equal(f.run().readyForLock,false);assert.ok(!output.includes('SENSITIVE_SENTINEL'));assert.ok(!output.includes('etc/passwd'));
});
