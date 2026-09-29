import type { Domain, Evidence, Prospect } from "./contracts";
export const domains: Domain[] = [
  {
    id: "des-moines-plumbing",
    name: "DesMoines.plumbing",
    market: "Des Moines",
    category: "plumbing",
    price: 4999,
    listingUrl:
      "https://location.domains/locations/iowa/des-moines/desmoines-plumbing/",
  },
  {
    id: "branson-vacations",
    name: "Branson.vacations",
    market: "Branson",
    category: "vacations",
    price: 4999,
    listingUrl:
      "https://location.domains/locations/missouri/branson/branson-vacations/",
  },
];
const evidence = (
  id: string,
  kind: Evidence["kind"],
  excerpt: string,
): Evidence => ({
  id,
  kind,
  excerpt,
  title:
    kind === "service"
      ? "Services overview"
      : kind === "market"
        ? "Service area"
        : "Marketing context",
  capturedAt: "2026-09-29",
  provenance: "fictional-fixture",
  url: `https://example.com/fixture/${id}`,
});
export function fixtureProspects(domain: Domain): Prospect[] {
  const plumbing = domain.category === "plumbing";
  const names = plumbing
    ? [
        "Cedar & Stone Plumbing",
        "Metroline Drain Services",
        "Prairie Home Plumbing",
        "Northbank Mechanical",
        "Cedar & Stone Plumbing",
        "Hawthorn Plumbing",
      ]
    : [
        "Juniper Lake Stays",
        "Ozark Weekend Co.",
        "Trailhead Vacations",
        "Northbank Retreats",
        "Juniper Lake Stays",
        "Hawthorn Travel",
      ];
  return names.map((name, index) => ({
    id: `${domain.id}-${index}`,
    name,
    market: index === 3 ? "Other market" : domain.market,
    category: domain.category,
    website: `https://${index === 4 ? 0 : index}-${domain.id}.example.com`,
    previousContact: index === 2,
    summary: [
      plumbing
        ? "Residential repairs, water heaters, and emergency service."
        : "Locally managed vacation stays and weekend packages.",
      plumbing
        ? "A focused drain and sewer team serving the metro."
        : "A regional operator with a focused weekend offering.",
      "Strong geographic fit; already contacted in this scenario.",
      "The business serves a different geographic market.",
      "A second directory entry for the same business.",
      "Service fit is visible; geographic evidence is missing.",
    ][index],
    evidence:
      index === 5
        ? [
            evidence(
              `${domain.id}-${index}-service`,
              "service",
              `Offers ${domain.category} services.`,
            ),
          ]
        : [
            evidence(
              `${domain.id}-${index}-service`,
              "service",
              `Offers ${domain.category} services for local customers.`,
            ),
            evidence(
              `${domain.id}-${index}-market`,
              "market",
              `Serves ${index === 3 ? "a different market" : domain.market} and surrounding communities.`,
            ),
            ...(index === 0
              ? [
                  evidence(
                    `${domain.id}-${index}-marketing`,
                    "marketing",
                    "Uses service vehicles and local print advertising in this fictional example.",
                  ),
                ]
              : []),
          ],
  }));
}
