# Domain Buyer Assistant

A simulated buyer-research workspace for demonstrating a future human-reviewed domain sales workflow. Real domain examples; fictional businesses and research evidence. No crawling, model calls, messages, payments, or domain transfers.

## Intended scope

Public low-risk portfolio demonstration. Not an operating sales service. Browser state is temporary; export a review packet to retain work. Do not enter confidential customer information.

## Build brief

Choose a domain, run fixture research, inspect evidence and exclusions, shortlist candidates, prepare editable outreach drafts, and export the review packet. Include empty and provider-failure scenarios. Preserve reusable provider contracts and deterministic policy modules for a future authenticated backend.

## Acceptance criteria

- Simulation and fictional evidence are visible throughout the workflow.
- Unsupported, wrong-market, duplicate, and previously contacted candidates cannot silently enter the eligible shortlist.
- Drafts have no invented performance, traffic, SEO, or sales claims.
- Desktop, mobile, keyboard, and failure/retry paths work.
- No paid APIs or secrets; deterministic tests and same-case evaluations run in CI.
- GitHub Pages builds use the repository subpath; release follows review and merge.

## Design decisions

React + TypeScript + Vite; a calm ink-and-paper research workspace with one teal accent. Workflow first, evidence alongside decisions, and restrained panel/research-progress transitions. A fixture provider implements an asynchronous research interface; future providers replace data acquisition without rewriting review UI. No premature backend or outbound messaging integration.

Implementation and verification details will be added with the demo.
