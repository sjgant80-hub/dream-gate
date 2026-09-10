# dream-gate

**▶ Live: https://sjgant80-hub.github.io/dream-gate/**

The gate on how a memory **grows**. An AI whose neural weights are frozen can still grow — its
memory accretes and, overnight, a dreamer reorganises it into better-connected knowledge: more
recall, no retraining. dream-gate makes that growth **safe**.

A night's consolidation is **ADOPTED** only if:

1. **it improved recall** — the reorganised memory answers at least `minGain` more probe questions than before, **and**
2. **it broke nothing known-true** — a *safety canary* of facts known to be true still answers correctly.

Otherwise the night is **REVERTED** and the memory keeps yesterday's shape. The mind grows one
witnessed night at a time — **never on a step that invents a false memory.** A night that soars on
recall but flips one known fact to a falsehood is reverted; that is the whole point.

Recall and canary are **counts-correct** (higher is better) — the opposite polarity to a loss.

## The gate (`kernel.mjs`)

- `scoreProbes(answer, probes)` — run an answerer `(s, p) => o | null` against a probe set of
  `{ s, p, o }`; returns `{ correct, total, missed }`, case-normalised, a throwing answerer counted wrong.
- `dreamGate({ recallBefore, recallAfter, canaryBefore, canaryAfter, minGain })` — `ADOPT` iff
  `recallAfter >= recallBefore + minGain` **and** `canaryAfter >= canaryBefore`; else `REVERT`, naming why.
- `gateNight(answerBefore, answerAfter, probes, canary, minGain)` — the whole decision end to end:
  scores recall and canary before/after, returns the verdict plus every count.

Pure and total: the kernel never throws on garbage input; it returns `{ ok: false, why }`.

## Proof of play

- **Mutation-gated CLEAN 24/24** — `node tools/witness.mjs mutate kernel.mjs --timeout 30000 --cap 200 --test node --test kernel.test.mjs`
- **The live page IS the gated kernel** — `make-page.mjs` injects `kernel.mjs` verbatim between markers in `index.html`; CI regenerates and `git diff --exit-code`s, so the page can never drift from the code the gate proved.
- Run the tests: `node --test kernel.test.mjs`

## Wired live

This is not a demonstration of a gate that lives somewhere else — it is the exact decision wired into
a running agent's nightly consolidation. The soul snapshots its memory, lets the dreamer reorganise a
candidate, scores a recall set and a safety canary before and after, calls `dreamGate`, and **restores
the snapshot on REVERT.** On a no-op night (nothing learned) the verdict is `REVERT` and the memory is
untouched — the dodeca does not churn for a no-op.

Pairs with [fall-remember](https://github.com/sjgant80-hub/fall-remember) (the dodeca — the memory that
grows) and [self-audit](https://github.com/sjgant80-hub/self-audit) (the pre-ship gate on the agent's own work).

MIT.
