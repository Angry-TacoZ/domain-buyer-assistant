import { describe, expect, it } from "vitest";
import { assess, makeDraft, makePacket } from "./policy";
import { domains, fixtureProspects } from "./fixtures";
import { fixtureProvider } from "./provider";
describe("review safety", () => {
  it("retains exclusion reasons and evidence without treating missing evidence as qualified", () => {
    const result = assess(domains[0], fixtureProspects(domains[0]));
    expect(result.map((item) => item.disposition)).toEqual([
      "eligible",
      "eligible",
      "excluded",
      "excluded",
      "excluded",
      "needs-review",
    ]);
    expect(result[2].reasons).toContain(
      "Previously contacted — do not repeat outreach",
    );
    expect(result[4].reasons).toContain("Duplicate business record");
    expect(result[0].evidenceIds).toHaveLength(3);
  });
  it("blocks excluded drafts and packets and labels exported state", () => {
    const result = assess(domains[0], fixtureProspects(domains[0]));
    expect(() => makeDraft(domains[0], result[2])).toThrow();
    expect(() =>
      makePacket(domains[0], [
        { assessment: result[2], draft: "", status: "draft-not-sent" },
      ]),
    ).toThrow();
    const draft = makeDraft(domains[0], result[0]);
    const packet = makePacket(domains[0], [
      { assessment: result[0], draft, status: "draft-not-sent" },
    ]);
    expect(packet.mode).toBe("simulation");
    expect(packet.schemaVersion).toBe(1);
    expect(draft).toContain(
      "no guarantee of traffic, search rankings, or leads",
    );
    expect(draft).toContain("final terms would need confirmation");
  });
  it("rejects an unknown domain and an already aborted run", async () => {
    await expect(
      fixtureProvider.research(
        { domainId: "unknown", scenario: "normal" },
        new AbortController().signal,
      ),
    ).rejects.toThrow("Choose");
    const cancelled = new AbortController();
    cancelled.abort();
    await expect(
      fixtureProvider.research(
        { domainId: domains[0].id, scenario: "normal" },
        cancelled.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
