import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('the CI TypeScript entry point executes and emits all fallback cases', () => {
  const stdout = execFileSync(process.execPath, ['--import', 'tsx', 'tools/phase4/evaluate.ts', 'fallback'], { encoding: 'utf8' });
  const report = JSON.parse(stdout);
  assert.equal(report.mode, 'fallback');
  assert.equal(report.caseCount, 28);
  assert.equal(report.rows.length, 28);
  assert.equal(report.proposedGatePassed, null);
  for (const row of report.rows) assert.deepEqual(row.results, row.baseline);
});
