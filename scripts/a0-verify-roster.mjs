#!/usr/bin/env node
// Read-only Stage A0 roster verifier. No network, secrets, writes or migrations.
// Usage: node scripts/a0-verify-roster.mjs /private/path/activepieces-agent-export.json
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/a0-verify-roster.mjs /path/to/roster.json');
  process.exit(2);
}
let payload;
try {
  payload = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error('Cannot read/parse roster JSON:', err.message);
  process.exit(2);
}
const input = Array.isArray(payload) ? payload
  : Array.isArray(payload?.records) ? payload.records
  : Array.isArray(payload?.structuredContent?.records) ? payload.structuredContent.records
  : null;
if (!input) {
  console.error('Expected array, {records: [...]}, or {structuredContent:{records: [...]}}');
  process.exit(2);
}
const rows = input.map(v => v?.cells ?? v);
const get = (r, keys) => keys.map(k => r?.[k]).find(x => typeof x === 'string' && x.trim())?.trim() ?? '';
const normalized = rows.map((r, i) => ({
  id: get(r, ['Agent ID', 'agentId', 'id']),
  name: get(r, ['Name', 'name']),
  role: get(r, ['Role', 'role']),
  department: get(r, ['Department', 'department']),
  chiefId: get(r, ['Chief ID', 'chiefId']),
  specialty: get(r, ['Specialty', 'specialty']),
  i: i + 1
}));
const errors = [], warnings = [];
const chiefs = normalized.filter(x => x.role === 'Chief');
const specs = normalized.filter(x => x.role === 'Specialist');
const chiefById = new Map(chiefs.map(x => [x.id, x]));
const idSeen = new Set(), nameSeen = new Set();
for (const row of normalized) {
  if (!row.id || !row.name || !row.role || !row.department || (row.role === 'Specialist' && !row.chiefId))
    errors.push('Missing required identity field at record ' + row.i);
  if (idSeen.has(row.id)) errors.push('Duplicate canonical ID ' + row.id);
  idSeen.add(row.id);
  if (nameSeen.has(row.name.toLowerCase())) warnings.push('Duplicate display name: ' + row.name);
  nameSeen.add(row.name.toLowerCase());
  if (!['Chief', 'Specialist'].includes(row.role)) errors.push('Unexpected role at record ' + row.i);
  if (row.role === 'Chief' && row.chiefId) warnings.push('Chief has chiefId: ' + row.id);
  if (row.role === 'Specialist') {
    const chief = chiefById.get(row.chiefId);
    if (!chief) errors.push('Orphan specialist: ' + row.id);
    else if (chief.department !== row.department) errors.push('Cross-department chief link: ' + row.id);
  }
}
const departments = new Set(normalized.map(x => x.department).filter(Boolean));
for (const department of departments) {
  if (chiefs.filter(c => c.department === department).length !== 1)
    errors.push('Expected exactly one chief in department: ' + department);
}
if (normalized.length !== 185) errors.push('Expected 185 canonical records, found ' + normalized.length);
if (chiefs.length !== 25) errors.push('Expected 25 chiefs, found ' + chiefs.length);
if (specs.length !== 160) errors.push('Expected 160 specialists, found ' + specs.length);
if (departments.size !== 25) errors.push('Expected 25 departments, found ' + departments.size);
console.log(JSON.stringify({
  stage: 'A0', source: 'user-supplied local export (not a live sync)',
  totals: { records: normalized.length, chiefs: chiefs.length,
    specialists: specs.length, departments: departments.size },
  structuralPass: errors.length === 0,
  ownerSignoff: 'PENDING', identityFreeze: 'NOT PERFORMED',
  errors, warnings,
  manualReviewRequired: 'Display names vs specialties, provenance and source-of-truth conflicts'
}, null, 2));
process.exit(errors.length ? 1 : 0);
