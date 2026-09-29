# From demo to real research

## Preserve these modules

`src/contracts.ts` defines domain, prospect, evidence, research request/result, assessment, and version-1 review packet. `src/policy.ts` holds eligibility, template drafting, and export policy independent of React. `src/provider.ts` supplies async fixture research with cancellation. The UI has idle/loading/ready/error states, review/exclusion states, shortlisting, editing, and export.

The provider's current result and evidence types deliberately allow simulation only. Live mode must be added explicitly, with validated source provenance and matching UI disclosures. Do not change a fixture label to imply live research. Assessment caveats, pricing freshness, and export mode also need to reflect real provenance in that change.

## Live research boundary

Use an authenticated server endpoint implementing the research contract behind an adapter; the browser never talks directly to a paid model or search provider. Domain inputs must come from confirmed owner inventory. Validate runtime input/output shapes, URL protocols, response sizes, and enum/length bounds. Treat pages and generated text as untrusted; prevent prompt injection and arbitrary fetching into private/loopback networks. Enforce timeouts, cancellation, bounded concurrency/retries, quotas, and spending caps server-side.

Search retrieves candidate businesses. Server-side retrieval captures public source URLs, excerpts, observation time, and evidence provenance. Structured verification checks business identity, actual service area, and service offering. A model may propose fit reasons or draft language, but unsupported conclusions remain held for review. The current presence-of-evidence policy is a fixture baseline; it does not verify truth or contradiction in arbitrary retrieved text.

## Shared review and contact history

Persist domain inventory, research runs, source snapshots, candidate identity, assessments, shortlist decisions, drafts, and contact history behind per-user/team authorization. Duplicate detection requires durable business identity, not just URL normalization. Recheck authoritative contact history and domain availability before allowing outreach. User edits are unverified text, never an approval or evidence assertion. Add denied-access tests, migrations, export/delete rules, retention, and tested backup/restore.

## Separate outreach release

The demo exports draft packets; it never sends. A later messaging integration needs owner authorization, contact/source policies, recipient review, deduplication, suppression/opt-out handling, send idempotency, delivery/failure records, and jurisdiction-appropriate review. Do not confuse a draft with a sent message or a reply with a completed sale.

## Operating deployment

GitHub Pages is the demonstration host, not the operating commercial service. Choose the live app host and backend with James after Austin approves the idea. Keep provider credentials in server secret storage, add safe diagnostics and cost controls, and trace releases to reviewed commits. Rollback requires a previous reviewed release plus compatibility with stored research data. Measure real citation/fit quality and cost before accepting live automation.

## What the demo does not validate

No real buyers, contact discovery, browsing, model calls, prospect scoring, demand, traffic, conversion, negotiated prices, or sales. Synthetic fixtures demonstrate the interaction contract and deterministic safeguards. The reusable workflow reduces UI rework; the research backend and operating safeguards remain substantive work.
