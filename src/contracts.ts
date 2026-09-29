export type Domain = {
  id: string;
  name: string;
  market: string;
  category: string;
  price: number;
  listingUrl: string;
};
export type Evidence = {
  id: string;
  title: string;
  excerpt: string;
  kind: "service" | "market" | "marketing";
  capturedAt: string;
  provenance: "fictional-fixture";
  url: string;
};
export type Prospect = {
  id: string;
  name: string;
  market: string;
  category: string;
  website: string;
  summary: string;
  previousContact: boolean;
  evidence: Evidence[];
};
export type Assessment = {
  prospect: Prospect;
  disposition: "eligible" | "excluded" | "needs-review";
  reasons: string[];
  caveats: string[];
  evidenceIds: string[];
};
export type ResearchRequest = {
  domainId: string;
  scenario: "normal" | "empty" | "failure";
};
export type ResearchResult = {
  mode: "simulation";
  domainId: string;
  prospects: Prospect[];
  capturedAt: string;
};
export interface ResearchProvider {
  research(
    request: ResearchRequest,
    signal: AbortSignal,
  ): Promise<ResearchResult>;
}
export type ReviewPacket = {
  schemaVersion: 1;
  mode: "simulation";
  exportedAt: string;
  domain: Domain;
  candidates: {
    assessment: Assessment;
    draft: string;
    status: "draft-not-sent";
  }[];
};
