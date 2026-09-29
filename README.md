# Austin's domain portfolio

Static publication of James's supplied 29 September 2026 HTML snapshot: 94 domains with original asking prices and appraisal figures. Availability, appraisal provenance, and current valuations are unverified. No APIs, accounts, storage, or sales service are connected.

The buyer-research application stays unmerged in draft PR #2. This publication is independent.

## Reproduce

Use Node.js 24 and Python 3. Run `npm.cmd ci --prefix portfolio`, then from `portfolio` run `npx.cmd playwright install --only-shell chromium`. From the repository root run `python scripts/verify_project.py --project .`. Serve the resulting `dist` directory with a local static server.

Verification covers dataset integrity, desktop/mobile browsers, filters, sorting, empty results, keyboard focus, original download equality, automated WCAG checks, browser errors, dependency audit, and source/build secret scanning. Screenshots and results are saved to ignored `output/portfolio` and uploaded by CI.

## Source and behavior

The unchanged original is `portfolio/source/austin_domain_portfolio_interactive.html`.
SHA-256: `761305269f1767b74230ab2cf2ddd07eae7590329d45bb7b90a7bb4ffc8d274a`.

The build adds a standalone shell, missing theme variables, disclosures, and an original download. Generated-only fixes provide native keyboard selection, retained focus, cleared filtered-out details, and an accurate 1–2x filter label. The dataset remains unchanged; summary totals always describe the full portfolio.

## Release and recovery

Pages publishes `dist` only after successful verification of a push to main, checking out that exact verified commit. Expected URL: https://angry-tacoz.github.io/domain-buyer-assistant/. Roll back by reverting the release commit through a reviewed PR; no persistent user data needs recovery.

Future integration of PR #2 must combine overlapping verification and Pages configuration and deliberately choose routes for both artifacts.

## Scope and readiness

Public low-risk static snapshot; local verification passed on 29 September 2026. Hosted CI and live release remain pending. This does not verify appraisal accuracy or production buyer research.

| Area | Status |
| --- | --- |
| Correctness | pass: integrity and browser checks |
| Security/privacy | pass: audit, secret scan, no external calls |
| Data integrity | pass: source hash and unchanged download |
| Reliability | pass: static content and empty/filter paths |
| Observability | pass: CI logs and verification artifacts |
| Delivery | not verified: hosted CI and release pending |
| Performance | pass: bounded 94-record dataset |
| Accessibility | pass: keyboard/mobile and automated WCAG; assistive-technology review not verified |
| External services/cost | not applicable |
| Documentation/recovery | pass: setup, provenance, rollback |
