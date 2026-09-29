import type { Assessment, Domain, Prospect, ReviewPacket } from "./contracts";
export function assess(domain: Domain, prospects: Prospect[]): Assessment[] {
  const seen = new Set<string>();
  return prospects.map((prospect) => {
    const identity = prospect.website.toLowerCase().replace(/\/$/, "");
    const duplicate = seen.has(identity);
    seen.add(identity);
    const reasons: string[] = [];
    if (duplicate) reasons.push("Duplicate business record");
    if (prospect.previousContact)
      reasons.push("Previously contacted — do not repeat outreach");
    if (prospect.market !== domain.market)
      reasons.push("Outside the target market");
    if (prospect.category !== domain.category)
      reasons.push("Service category does not match");
    const supported = ["service", "market"].every((kind) =>
      prospect.evidence.some(
        (item) => item.kind === kind && item.excerpt.trim().length > 0,
      ),
    );
    const disposition = reasons.length
      ? "excluded"
      : supported
        ? "eligible"
        : "needs-review";
    if (!reasons.length)
      reasons.push(
        supported
          ? "Service and location supported by example evidence"
          : "Location or service evidence is missing",
      );
    return {
      prospect,
      disposition,
      reasons,
      caveats: [
        "Fictional business and evidence; validate real sources before outreach.",
        "Buying interest, budget, and decision-maker are unknown.",
      ],
      evidenceIds: prospect.evidence.map((item) => item.id),
    };
  });
}
export function makeDraft(domain: Domain, assessment: Assessment): string {
  if (assessment.disposition !== "eligible")
    throw new Error("Review an eligible candidate before preparing a draft.");
  const use = assessment.prospect.evidence.some(
    (item) => item.kind === "marketing",
  )
    ? "your service vehicles and local advertising"
    : "a focused local campaign";
  return `Hi ${assessment.prospect.name} team,\n\nI’m reaching out about ${domain.name}, a domain listed for sale for businesses serving ${domain.market}. One possible use is a memorable address for ${use}, redirecting visitors to your existing website while keeping your current business name.\n\nThe listed purchase price is $${domain.price.toLocaleString("en-US")}; availability and final terms would need confirmation with the owner. Would you be interested in a brief look at how you could use it?\n\nThis is a proposal, with no guarantee of traffic, search rankings, or leads.\n\nBest,\n[Your name]`;
}
export function makePacket(
  domain: Domain,
  candidates: ReviewPacket["candidates"],
): ReviewPacket {
  if (candidates.some((item) => item.assessment.disposition !== "eligible"))
    throw new Error("Only eligible shortlisted candidates can be exported.");
  return {
    schemaVersion: 1,
    mode: "simulation",
    exportedAt: new Date().toISOString(),
    domain,
    candidates,
  };
}
