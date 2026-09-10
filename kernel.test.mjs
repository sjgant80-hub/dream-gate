import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreProbes, dreamGate, gateNight } from './kernel.mjs';

// a fake memory answerer built from a fact table
const answerer = (facts) => (s, p) => { const hit = facts.find((f) => f.s === s && f.p === p); return hit ? hit.o : null; };
const PROBES = [{ s: 'witness', p: 'isa', o: 'gate' }, { s: 'seam', p: 'isa', o: 'metric' }, { s: 'dodeca', p: 'has', o: 'chambers' }];
const CANARY = [{ s: 'konomi', p: 'related', o: 'gate' }, { s: 'sididy', p: 'isa', o: 'agent' }];

test('scoreProbes: counts correct answers, case-insensitive, lists misses', () => {
  const a = answerer([{ s: 'witness', p: 'isa', o: 'GATE' }, { s: 'seam', p: 'isa', o: 'metric' }]);
  const r = scoreProbes(a, PROBES);
  assert.equal(r.correct, 2);          // witness (case-normalised) + seam; dodeca missed
  assert.equal(r.total, 3);
  assert.deepEqual(r.missed, ['dodeca has']);
});

test('scoreProbes: a null/blank answer is not correct; total on garbage', () => {
  assert.equal(scoreProbes(answerer([]), PROBES).correct, 0);
  assert.equal(scoreProbes('x', PROBES).ok, false);
  assert.equal(scoreProbes(answerer([]), []).ok, false);
  assert.equal(scoreProbes(answerer([]), [{ s: 'a', p: 'b' }]).ok, false);   // probe missing o
  assert.equal(scoreProbes(answerer([]), [{ s: 1, p: 'b', o: 'c' }]).ok, false);
});

test('scoreProbes: a throwing answerer counts as wrong, never crashes', () => {
  const boom = () => { throw new Error('bad'); };
  assert.equal(scoreProbes(boom, PROBES).correct, 0);
});

// ── the gate
test('dreamGate ADOPTS a night that improves recall and keeps the canary', () => {
  const r = dreamGate({ recallBefore: 2, recallAfter: 5, canaryBefore: 2, canaryAfter: 2, minGain: 1 });
  assert.equal(r.adopt, true);
  assert.equal(r.verdict, 'ADOPT');
  assert.equal(r.reasons.length, 0);
});

test('dreamGate REVERTS a night that breaks a known-true answer, even if recall rose', () => {
  const r = dreamGate({ recallBefore: 2, recallAfter: 9, canaryBefore: 3, canaryAfter: 2, minGain: 1 });
  assert.equal(r.adopt, false);        // recall soared, but a canary fell → false memory → REVERT
  assert.equal(r.safe, false);
  assert.ok(r.reasons.some((x) => x.includes('known-true')));
});

test('dreamGate REVERTS a no-op night (no real improvement)', () => {
  const r = dreamGate({ recallBefore: 5, recallAfter: 5, canaryBefore: 5, canaryAfter: 5, minGain: 1 });
  assert.equal(r.adopt, false);
  assert.ok(r.reasons.some((x) => x.includes('did not improve')));
});

test('dreamGate boundaries are inclusive (kills >= → > both ways)', () => {
  // recallAfter exactly recallBefore + minGain → improved (>=)
  assert.equal(dreamGate({ recallBefore: 4, recallAfter: 6, canaryBefore: 3, canaryAfter: 3, minGain: 2 }).adopt, true);
  assert.equal(dreamGate({ recallBefore: 4, recallAfter: 5, canaryBefore: 3, canaryAfter: 3, minGain: 2 }).adopt, false);
  // canaryAfter exactly canaryBefore → safe (>=); one below → unsafe
  assert.equal(dreamGate({ recallBefore: 1, recallAfter: 9, canaryBefore: 3, canaryAfter: 3, minGain: 1 }).safe, true);
  assert.equal(dreamGate({ recallBefore: 1, recallAfter: 9, canaryBefore: 3, canaryAfter: 2, minGain: 1 }).safe, false);
  // minGain 0 with equal recall still counts as improved (>= holds) — but a real gate uses minGain >= 1
  assert.equal(dreamGate({ recallBefore: 5, recallAfter: 5, canaryBefore: 5, canaryAfter: 5, minGain: 0 }).adopt, true);
});

test('dreamGate: total on garbage, counts non-negative integers', () => {
  assert.equal(dreamGate(null).ok, false);
  assert.equal(dreamGate({ recallBefore: 1.5, recallAfter: 2, canaryBefore: 1, canaryAfter: 1, minGain: 1 }).ok, false);
  assert.equal(dreamGate({ recallBefore: -1, recallAfter: 2, canaryBefore: 1, canaryAfter: 1, minGain: 1 }).ok, false);
  assert.equal(dreamGate({ recallBefore: 1, recallAfter: 2, canaryBefore: 1, canaryAfter: 1, minGain: -1 }).ok, false);
  assert.equal(dreamGate({ recallBefore: 0, recallAfter: 0, canaryBefore: 0, canaryAfter: 0, minGain: 0 }).ok, true);  // zeros valid (kills < 0 → <= 0)
});

// ── the whole night decision, end to end
test('gateNight ADOPTS: consolidation answers MORE probes and keeps the canary', () => {
  const before = answerer([{ s: 'konomi', p: 'related', o: 'gate' }, { s: 'sididy', p: 'isa', o: 'agent' }]);  // canary only
  // the night generalised: now it also answers the probes, canary intact
  const after = answerer([{ s: 'konomi', p: 'related', o: 'gate' }, { s: 'sididy', p: 'isa', o: 'agent' },
    { s: 'witness', p: 'isa', o: 'gate' }, { s: 'seam', p: 'isa', o: 'metric' }, { s: 'dodeca', p: 'has', o: 'chambers' }]);
  const r = gateNight(before, after, PROBES, CANARY, 1);
  assert.equal(r.ok, true);
  assert.equal(r.adopt, true);
  assert.equal(r.recallBefore, 0);
  assert.equal(r.recallAfter, 3);
  assert.equal(r.canaryBefore, 2);
  assert.equal(r.canaryAfter, 2);
});

test('gateNight REVERTS: a false memory broke a canary answer', () => {
  const before = answerer([{ s: 'konomi', p: 'related', o: 'gate' }, { s: 'sididy', p: 'isa', o: 'agent' }]);
  // the night learned probes BUT a bad merge flipped sididy isa → tool (canary now wrong)
  const after = answerer([{ s: 'konomi', p: 'related', o: 'gate' }, { s: 'sididy', p: 'isa', o: 'tool' },
    { s: 'witness', p: 'isa', o: 'gate' }, { s: 'seam', p: 'isa', o: 'metric' }, { s: 'dodeca', p: 'has', o: 'chambers' }]);
  const r = gateNight(before, after, PROBES, CANARY, 1);
  assert.equal(r.adopt, false);
  assert.equal(r.verdict, 'REVERT');
  assert.equal(r.canaryAfter, 1);      // sididy-isa broke
  assert.ok(r.reasons.some((x) => x.includes('known-true')));
});

test('gateNight: total on garbage', () => {
  assert.equal(gateNight('x', answerer([]), PROBES, CANARY, 1).ok, false);
  assert.equal(gateNight(answerer([]), answerer([]), PROBES, CANARY, 1.5).ok, false);
  assert.equal(gateNight(answerer([]), answerer([]), [], CANARY, 1).ok, false);
  assert.equal(gateNight(answerer([]), answerer([]), PROBES, CANARY, 0).ok, true);   // minGain 0 valid (kills < 0 → <= 0)
});
