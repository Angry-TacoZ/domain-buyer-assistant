import type { ResearchProvider } from "./contracts";
import { domains, fixtureProspects } from "./fixtures";
export const fixtureProvider: ResearchProvider = {
  async research(request, signal) {
    const domain = domains.find((item) => item.id === request.domainId);
    if (!domain) throw new Error("Choose an available domain.");
    await new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Cancelled", "AbortError"));
        return;
      }
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Cancelled", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, 700);
      signal.addEventListener("abort", abort, { once: true });
    });
    if (request.scenario === "failure")
      throw new Error(
        "The simulated research provider is unavailable. Switch to the standard example and retry.",
      );
    return {
      mode: "simulation",
      domainId: domain.id,
      prospects: request.scenario === "empty" ? [] : fixtureProspects(domain),
      capturedAt: "2026-09-29",
    };
  },
};
