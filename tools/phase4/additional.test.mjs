import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoped } from './evaluation.ts';
const set=JSON.parse(readFileSync(new URL('./additional-cases.json',import.meta.url),'utf8'));
test('additional no-match queries have matching-object counterparts in another scope',()=>{
  assert.equal(set.cases.length,27);
  assert.equal(set.cases.filter(c=>c.relevant.length).length,19);
  for(const c of set.cases)for(const id of c.relevant)assert.ok(scoped(set.items,c).some(item=>item.id===id),c.id);
  for(const c of set.cases.filter(c=>c.id.startsWith('present-'))){
    const absent=set.cases.find(other=>other.query===c.query && !other.relevant.length);
    assert.ok(absent,c.id);assert.notEqual(absent.school,c.school);
  }
});
