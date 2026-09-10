// dream-gate — proof-of-play for MEMORY growth. The gate on the dreamer's overnight work.
//
// sididy grows the konomi way: its neural weights are frozen, but its dodeca (fall-remember)
// accretes memory and the dreamer reorganises it overnight into typed connections — measurably
// better recall, no retraining. This gate makes that growth SAFE: a night's consolidation is
// ADOPTED only if it measurably improves recall AND breaks no known-true answer (a safety
// canary). Otherwise the night is REVERTED and the dodeca keeps yesterday's shape. The mind
// grows one witnessed night at a time — never on a step that invents a false memory.
//
// Recall and canary are COUNTS-CORRECT (higher is better) — the opposite polarity to a loss.
// Pure and total; guards one-per-line.

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

// Score an answerer against a probe set. answer(s, p) returns the recalled object or null; a probe
// {s, p, o} is CORRECT when the answer equals its expected o (case-normalised). answer is passed
// in (the soul's ask/recall), so this stays pure and testable.
export function scoreProbes(answer, probes) {
  if (typeof answer !== 'function') return { ok: false, why: 'answer must be a function (s, p) => object|null' };
  if (!Array.isArray(probes)) return { ok: false, why: 'probes must be an array of { s, p, o }' };
  if (probes.length === 0) return { ok: false, why: 'probes must be non-empty — a gate with no probe proves nothing' };
  let correct = 0;
  const missed = [];
  for (const pr of probes) {
    if (!isObj(pr)) return { ok: false, why: 'each probe is { s, p, o }' };
    if (typeof pr.s !== 'string') return { ok: false, why: 'probe.s must be a string' };
    if (typeof pr.p !== 'string') return { ok: false, why: 'probe.p must be a string' };
    if (typeof pr.o !== 'string') return { ok: false, why: 'probe.o must be a string' };
    let got;
    try { got = answer(pr.s, pr.p); } catch { got = null; }
    const norm = (x) => (typeof x === 'string' ? x.trim().toLowerCase() : null);
    if (norm(got) !== null && norm(got) === norm(pr.o)) correct += 1;
    else missed.push(pr.s + ' ' + pr.p);
  }
  return { ok: true, correct, total: probes.length, missed };
}

/**
 * dreamGate({ recallBefore, recallAfter, canaryBefore, canaryAfter, minGain }) — adopt the night?
 * All four are correct-counts (higher = better).
 *   IMPROVED — recall rose by at least minGain: recallAfter >= recallBefore + minGain.
 *   SAFE     — no known-true answer was lost: canaryAfter >= canaryBefore.
 * ADOPT iff improved AND safe. Otherwise REVERT, naming why. A night that learns nothing new
 * (no improvement) is reverted too — the dodeca does not churn for a no-op.
 */
export function dreamGate(m) {
  if (!isObj(m)) return { ok: false, why: 'reads { recallBefore, recallAfter, canaryBefore, canaryAfter, minGain }' };
  for (const k of ['recallBefore', 'recallAfter', 'canaryBefore', 'canaryAfter', 'minGain']) {
    if (!Number.isInteger(m[k])) return { ok: false, why: k + ' must be an integer count' };
  }
  if (m.recallBefore < 0) return { ok: false, why: 'recallBefore cannot be negative' };
  if (m.recallAfter < 0) return { ok: false, why: 'recallAfter cannot be negative' };
  if (m.canaryBefore < 0) return { ok: false, why: 'canaryBefore cannot be negative' };
  if (m.canaryAfter < 0) return { ok: false, why: 'canaryAfter cannot be negative' };
  if (m.minGain < 0) return { ok: false, why: 'minGain must be non-negative' };
  const improved = m.recallAfter >= m.recallBefore + m.minGain;
  const safe = m.canaryAfter >= m.canaryBefore;
  const reasons = [];
  if (!improved) reasons.push('recall did not improve enough (' + m.recallBefore + ' -> ' + m.recallAfter + ', needed at least +' + m.minGain + ')');
  if (!safe) reasons.push('the night broke a known-true answer — safety canary fell (' + m.canaryBefore + ' -> ' + m.canaryAfter + ')');
  const adopt = improved && safe;
  return { ok: true, adopt, verdict: adopt ? 'ADOPT' : 'REVERT', improved, safe, reasons };
}

/**
 * gateNight — the whole decision, given an answerer BEFORE consolidation and one AFTER, a recall
 * probe set, and a canary set of known-true facts. Returns the verdict + the counts so the caller
 * (the soul's sleep flow) keeps the candidate on ADOPT or restores the snapshot on REVERT.
 */
export function gateNight(answerBefore, answerAfter, probes, canary, minGain) {
  if (typeof answerBefore !== 'function') return { ok: false, why: 'answerBefore must be a function' };
  if (typeof answerAfter !== 'function') return { ok: false, why: 'answerAfter must be a function' };
  if (!Number.isInteger(minGain)) return { ok: false, why: 'minGain must be an integer count' };
  if (minGain < 0) return { ok: false, why: 'minGain must be non-negative' };
  const rb = scoreProbes(answerBefore, probes);
  if (!rb.ok) return { ok: false, why: 'recall before: ' + rb.why };
  const ra = scoreProbes(answerAfter, probes);
  if (!ra.ok) return { ok: false, why: 'recall after: ' + ra.why };
  const cb = scoreProbes(answerBefore, canary);
  if (!cb.ok) return { ok: false, why: 'canary before: ' + cb.why };
  const ca = scoreProbes(answerAfter, canary);
  if (!ca.ok) return { ok: false, why: 'canary after: ' + ca.why };
  const g = dreamGate({ recallBefore: rb.correct, recallAfter: ra.correct, canaryBefore: cb.correct, canaryAfter: ca.correct, minGain });
  if (!g.ok) return { ok: false, why: g.why };
  return {
    ok: true, adopt: g.adopt, verdict: g.verdict,
    recallBefore: rb.correct, recallAfter: ra.correct, canaryBefore: cb.correct, canaryAfter: ca.correct,
    recallTotal: probes.length, canaryTotal: canary.length, reasons: g.reasons,
  };
}
