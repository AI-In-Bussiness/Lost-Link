import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const requiredEvidence = ['production-configuration', 'authenticated-smoke', 'photo-claim-return', 'confirmation-delivery', 'rollback-rehearsal', 'relevance-acceptance', 'independent-acceptance'];
const repository = fileURLToPath(new URL('../', import.meta.url));
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const hash = data => createHash('sha256').update(data).digest('hex');
const evidencePath = value => typeof value === 'string' && /^docs\/phase-7\/[a-z0-9][a-z0-9-]*\.json$/.test(value);

/** Checks consistency of recorded evidence; it cannot attest to operator honesty or provider state. */
export function releaseReadiness(candidate, read, migrations, now = Date.now()) {
  const checks = [];
  function check(name, verify) {
    try { checks.push({ name, passed: verify() === true }); }
    catch { checks.push({ name, passed: false }); } // Do not echo files, secrets or upstream errors.
  }
  check('source revision recorded', () => sha(candidate.sourceRevision));
  check('production origin recorded', () => {
    const url = new URL(candidate.productionOrigin);
    return url.protocol === 'https:' && url.origin === candidate.productionOrigin && !url.username && !url.password;
  });
  for (const [name, path] of [['lockfile', 'package-lock.json'], ['model', 'src/lib/search/model-manifest.json']]) {
    check(`${name} pin matches`, () => candidate[name]?.path === path && hash(read(path)) === candidate[name].sha256);
  }
  check('complete ordered migration pins match', () => {
    const pins = candidate.migrations;
    return Array.isArray(pins) && pins.length === migrations.length && migrations.length > 0 &&
      migrations.every((path, i) => pins[i]?.path === path && hash(read(path)) === pins[i].sha256);
  });
  check('public smoke passed for production origin', () => {
    if (!evidencePath(candidate.publicSmoke?.path)) return false;
    const report = JSON.parse(read(candidate.publicSmoke.path));
    return report.check === 'release-public-smoke' && report.origin === candidate.productionOrigin && report.passed === true &&
      Array.isArray(report.checks) && report.checks.length === 17 && report.checks.every(row => row.passed === true);
  });
  check('immutable candidate and rollback deployments recorded', () =>
    typeof candidate.deploymentId === 'string' && candidate.deploymentId.length > 0 &&
    typeof candidate.verifiedRollbackDeploymentId === 'string' && candidate.verifiedRollbackDeploymentId.length > 0 &&
    candidate.deploymentId !== candidate.verifiedRollbackDeploymentId);
  check('no unresolved release blockers', () => Array.isArray(candidate.blockers) && candidate.blockers.length === 0);
  for (const kind of requiredEvidence) {
    check(kind, () => {
      const path = candidate.releaseEvidence?.[kind];
      if (!evidencePath(path)) return false;
      const report = JSON.parse(read(path));
      const timestamp = Date.parse(report.observedAt);
      if (report.check !== kind || report.passed !== true || !sha(report.sourceRevision) || report.sourceRevision !== candidate.sourceRevision ||
          report.origin !== candidate.productionOrigin || !Number.isFinite(timestamp) || timestamp > now ||
          typeof report.reference !== 'string' || !report.reference.trim()) return false;
      if (kind === 'rollback-rehearsal') return report.rollbackDeploymentId === candidate.verifiedRollbackDeploymentId && report.restoredDeploymentId === candidate.deploymentId;
      return true;
    });
  }
  return { check: 'release-readiness', sourceRevision: sha(candidate.sourceRevision) ? candidate.sourceRevision : null,
    readyForLock: checks.every(row => row.passed), checks,
    scope: 'Recorded evidence consistency only; does not create tags, deploy, roll back, or independently certify hosted results.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const candidate = JSON.parse(readFileSync(resolve(repository, 'docs/phase-7/release-candidate.json'), 'utf8'));
    const migrations = readdirSync(resolve(repository, 'supabase/migrations')).filter(name => name.endsWith('.sql')).sort().map(name => `supabase/migrations/${name}`);
    const report = releaseReadiness(candidate, path => readFileSync(resolve(repository, path)), migrations);
    console.log(JSON.stringify(report, null, 2));
    if (!report.readyForLock) process.exitCode = 1;
  } catch {
    console.error('Release readiness could not read the candidate or repository pins.');
    process.exitCode = 1;
  }
}
