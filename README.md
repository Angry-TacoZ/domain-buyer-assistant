# Austin's Domain Portfolio Analysis

## Product overview

An exploratory portfolio screening dashboard comparing current asking prices with one automated appraisal benchmark across 94 domains. It helps identify where deeper buyer-market research may be most useful.

NamesLink is one automated appraisal model and is not a definitive statement of market value. A large ask-to-appraisal gap is a prompt for further research, not proof that a domain is mispriced. The dashboard does not predict sale probability and is not a final valuation report. Planned evidence layers include buyer-pool size, current-domain quality, SEO/AEO opportunity, and comparable domain sales.

This is a public, static, low-risk prototype. It has no connected appraisal, research, or sales service, and no APIs, accounts, or storage.

## Technical provenance and verification

The unchanged source artifact is `portfolio/source/austin_domain_portfolio_interactive.html`, supplied for this project on 29 September 2026. SHA-256: `761305269f1767b74230ab2cf2ddd07eae7590329d45bb7b90a7bb4ffc8d274a`.

The build wraps the original fragment as a standalone page, supplies its theme, adds product disclosures and an original-file download, and applies keyboard/filter usability fixes. It does not alter domain records, prices, appraisal values, calculations, filters, sorting, or data integrity checks. Totals always describe the full portfolio.

Use Node.js 24 and Python 3. Run `npm.cmd ci --prefix portfolio`, then from `portfolio` run `npx.cmd playwright install --only-shell chromium`. From the repository root run `python scripts/verify_project.py --project .`. The verifier checks source integrity, browser behavior, original download equality, keyboard/touch use, mobile layout, automated WCAG, dependency audit, and source/build secret scanning. Screenshots and machine-readable results are saved in ignored `output/portfolio` and uploaded by CI.

Local verification passed on 29 September 2026. Hosted CI passes are recorded on PR #4. This verifies implementation behavior and source integrity, not appraisal accuracy, listing availability, sales likelihood, or buyer demand. Automated accessibility checks do not replace manual assistive-technology review.

## Release and recovery

GitHub Pages publishes `dist` only after successful verification of a push to `main`, checking out that exact verified commit. Expected URL: https://angry-tacoz.github.io/domain-buyer-assistant/. Roll back by reverting the release commit through a reviewed PR; no persistent user data needs recovery.

The simulated buyer-research application remains separate in draft PR #2. Future integration must combine overlapping verification and Pages workflows and choose routes for both artifacts.

## Scope readiness

| Area | Status |
| --- | --- |
| Correctness | pass: source integrity and browser checks |
| Security/privacy | pass: audit, source/build scan, no external calls |
| Data integrity | pass: source hash and unchanged source download |
| Reliability | pass: static content and tested filter/empty paths |
| Observability | pass: CI logs and verification artifacts |
| Delivery | pass: Ubuntu and Windows CI on PR #4; live deployment not verified |
| Performance | pass: bounded 94-record dataset |
| Accessibility | pass: keyboard/mobile and automated WCAG; assistive-technology review not verified |
| External services/cost | not applicable |
| Documentation/recovery | pass: setup, provenance, limitations, rollback |
