# Eligibility evaluation

## Purpose and fixed cases

`cases/eval_cases.json` fixes twelve synthetic normal, missing-evidence, malformed-excerpt, wrong-market, wrong-service, duplicate, and previous-contact scenarios. The rubric is exact eligible/excluded/needs-review classification. A deterministic category-only baseline and the candidate see the same records. Duplicate cases include two variants of the same URL. These are authored fixtures, not businesses or measured buyer interest.

## Metrics defined before comparison

Total/passed/failed exact classifications; precision of eligible candidates; unsafe eligible count; elapsed local compute time; model calls and API cost. Candidate acceptance: 12/12 exact classifications and zero unsafe eligible. Browser checks separately exercise provider failure/retry and empty results.

## Reproduce

Use Node 24 and `npm ci`, then `npm run eval`. Normally completes in seconds, zero model calls and zero API cost. It writes both baseline and candidate JSON files to ignored `output/evals/`, preserving the committed snapshots in `evals/results/`. `npm run eval -- --record` explicitly refreshes those snapshots when recording a reviewed iteration; ordinary verification never rewrites committed evidence. Timing is machine-dependent; classification results are deterministic. Expected baseline: 4/12 correct, eight unsafe eligible. Expected candidate: 12/12 correct, zero unsafe eligible. No cases excluded.

## Interpretation and tradeoffs

The stricter candidate refuses to shortlist records lacking basic evidence and suppresses duplicates and prior contact. This is a reproducible test of hand-authored policy, not proof of genuine evidence quality, robust entity resolution, ranking effectiveness, or demand. A missing-evidence business might be valuable; it remains reviewable rather than silently classified as a fit.

## Real-build evaluation

Keep this deterministic suite. Add a fixed, independently reviewed set of real public source snapshots, matching/nonmatching businesses, stale/conflicting evidence, injection attempts, and failed retrieval. Measure citation support, business identity resolution, correct market/service matching, unsupported personalization, abstention, latency, and provider cost. Compare retrieval/model approaches on the same snapshots. Do not infer outreach conversion until an explicitly authorized real pilot captures outcomes.
