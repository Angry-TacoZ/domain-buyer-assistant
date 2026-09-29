import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import type { Assessment, Evidence, Prospect } from "../src/contracts";
import { domains } from "../src/fixtures";
import { assess } from "../src/policy";
type Case = {
  id: string;
  market: string;
  category: string;
  kinds: Evidence["kind"][];
  contacted: boolean;
  expected: Assessment["disposition"];
  emptyExcerpt?: boolean;
  duplicate?: boolean;
};
const cases: Case[] = JSON.parse(
  readFileSync("evals/cases/eval_cases.json", "utf8"),
);
const results = (candidate: boolean) => {
  const started = performance.now();
  const records = cases.map((item) => {
    const prospect: Prospect = {
      id: item.id,
      name: `Fictional ${item.id}`,
      market: item.market,
      category: item.category,
      website: `https://${item.id}.example.com`,
      summary: "Evaluation fixture",
      previousContact: item.contacted,
      evidence: item.kinds.map((kind) => ({
        id: `${item.id}-${kind}`,
        kind,
        title: kind,
        excerpt: item.emptyExcerpt ? " " : `Fictional ${kind} evidence`,
        capturedAt: "2026-09-29",
        provenance: "fictional-fixture",
        url: "https://example.com",
      })),
    };
    const predicted = candidate
      ? assess(
          domains[0],
          item.duplicate
            ? [
                { ...prospect, id: "first" },
                { ...prospect, website: prospect.website.toUpperCase() + "/" },
              ]
            : [prospect],
        ).at(-1)!.disposition
      : prospect.category === domains[0].category
        ? "eligible"
        : "excluded";
    return {
      id: item.id,
      expected: item.expected,
      predicted,
      pass: predicted === item.expected,
    };
  });
  const eligible = records.filter((item) => item.predicted === "eligible");
  return {
    version: candidate ? "candidate-v1" : "baseline-category-only",
    scope:
      "Synthetic deterministic eligibility; not buyer interest, AI quality, or sales performance",
    total: records.length,
    passed: records.filter((item) => item.pass).length,
    failed: records.filter((item) => !item.pass).length,
    eligiblePrecision: eligible.length
      ? eligible.filter((item) => item.expected === "eligible").length /
        eligible.length
      : null,
    unsafeEligible: eligible.filter((item) => item.expected !== "eligible")
      .length,
    elapsedMs: Math.round((performance.now() - started) * 100) / 100,
    modelCalls: 0,
    apiCostUsd: 0,
    records,
  };
};
const resultDirectory = process.argv.includes("--record")
  ? "evals/results"
  : "output/evals";
mkdirSync(resultDirectory, { recursive: true });
for (const candidate of [false, true]) {
  const result = results(candidate);
  writeFileSync(
    `${resultDirectory}/${candidate ? "candidate-v1" : "baseline"}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    `${candidate ? "Candidate" : "Baseline"}: ${result.passed}/${result.total} correct, ${result.unsafeEligible} unsafe eligible`,
  );
  if (candidate && result.failed) process.exitCode = 1;
}
