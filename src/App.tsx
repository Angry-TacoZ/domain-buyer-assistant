import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Compass,
  FileText,
  Globe2,
  Layers3,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { Assessment, ResearchRequest } from "./contracts";
import { domains } from "./fixtures";
import { assess, makeDraft, makePacket } from "./policy";
import { fixtureProvider } from "./provider";

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
type View = "eligible" | "review" | "shortlist";
export default function App() {
  const [domainId, setDomainId] = useState(domains[0].id);
  const domain = domains.find((item) => item.id === domainId)!;
  const [scenario, setScenario] =
    useState<ResearchRequest["scenario"]>("normal");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [results, setResults] = useState<Assessment[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>("eligible");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [detailTab, setDetailTab] = useState<"evidence" | "draft">("evidence");
  const [about, setAbout] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const aboutDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (about) aboutDialog.current?.showModal();
    else aboutDialog.current?.close();
  }, [about]);
  const eligible = results.filter((item) => item.disposition === "eligible");
  const review = results.filter((item) => item.disposition !== "eligible");
  const visible = results.filter(
    (item) =>
      (view === "shortlist"
        ? shortlist.includes(item.prospect.id)
        : view === "review"
          ? item.disposition !== "eligible"
          : item.disposition === "eligible") &&
      item.prospect.name.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = results.find((item) => item.prospect.id === selectedId);
  function clearResearch() {
    controller.current?.abort();
    setResults([]);
    setShortlist([]);
    setDrafts({});
    setSelectedId(undefined);
    setStatus("idle");
    setNotice("");
    setError("");
    setView("eligible");
    setQuery("");
    setDetailTab("evidence");
  }
  async function research() {
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setStatus("loading");
    setError("");
    setNotice("");
    setResults([]);
    setShortlist([]);
    setDrafts({});
    setSelectedId(undefined);
    setView("eligible");
    setDetailTab("evidence");
    setQuery("");
    try {
      const response = await fixtureProvider.research(
        { domainId, scenario },
        next.signal,
      );
      if (next.signal.aborted) return;
      const assessments = assess(domain, response.prospects);
      setResults(assessments);
      setStatus("ready");
      setSelectedId(
        assessments.find((item) => item.disposition === "eligible")?.prospect
          .id,
      );
    } catch (cause) {
      if (next.signal.aborted) return;
      setStatus("error");
      setError(
        cause instanceof Error
          ? cause.message
          : "Research could not be completed. Please retry.",
      );
    }
  }
  function toggleShortlist(item: Assessment) {
    if (item.disposition !== "eligible") return;
    const removing = shortlist.includes(item.prospect.id);
    setShortlist((previous) =>
      removing
        ? previous.filter((id) => id !== item.prospect.id)
        : [...previous, item.prospect.id],
    );
    setNotice(
      `${item.prospect.name} ${removing ? "removed from" : "added to"} your shortlist.`,
    );
  }
  function exportPacket() {
    const candidates = results
      .filter((item) => shortlist.includes(item.prospect.id))
      .map((assessment) => ({
        assessment,
        draft: drafts[assessment.prospect.id] ?? makeDraft(domain, assessment),
        status: "draft-not-sent" as const,
      }));
    const blob = new Blob(
      [JSON.stringify(makePacket(domain, candidates), null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${domain.id}-review-packet.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Review packet exported with example evidence and unsent drafts.",
    );
  }
  async function copyDraft() {
    if (!selected || selected.disposition !== "eligible") return;
    try {
      await navigator.clipboard.writeText(
        drafts[selected.prospect.id] ?? makeDraft(domain, selected),
      );
      setNotice("Draft copied. Review it before any real outreach.");
    } catch {
      setNotice(
        "Clipboard is unavailable. Select the draft text and copy it manually.",
      );
    }
  }
  return (
    <>
      <a className="skip" href="#workspace">
        Skip to research workspace
      </a>
      <header className="topbar">
        <a className="brand" href="./" aria-label="Local Domain research home">
          <span className="brand-symbol">
            <Compass size={23} />
          </span>
          <span>
            LOCAL DOMAIN
            <span className="brand-caption">RESEARCH WORKSPACE</span>
          </span>
        </a>
        <div className="top-actions">
          <span className="mode">
            <span />
            Simulated demo
          </span>
          <button
            className="icon-button"
            onClick={() => setAbout(true)}
            aria-label="About this demo"
          >
            <CircleHelp size={20} />
          </button>
        </div>
      </header>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="section-label">WORKSPACE</div>
          <div className="nav-active">
            <Search size={17} />
            Buyer research<span>01</span>
          </div>
          <div className="sidebar-note">
            <Layers3 size={20} />
            <h3>From domain to shortlist.</h3>
            <p>
              Find a plausible fit. Review the evidence. Prepare the
              conversation.
            </p>
          </div>
          <div className="sidebar-bottom">
            <span className="section-label">DEMO BOUNDARY</span>
            <p>
              Fictional businesses.
              <br />
              No live research or messages.
            </p>
            <button className="text-button" onClick={() => setAbout(true)}>
              How this becomes a real app <ArrowRight size={14} />
            </button>
          </div>
        </aside>
        <main id="workspace">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} /> Buyer research
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">LOCAL DOMAIN / RESEARCH</div>
              <h1>Domain buyer research</h1>
              <p>
                Match a local domain to a business, then review the evidence
                behind the fit.
              </p>
            </div>
            <button
              className="secondary export"
              onClick={exportPacket}
              disabled={!shortlist.length}
            >
              <ArrowDownToLine size={16} />
              Export shortlist
              {shortlist.length > 0 && (
                <span className="count">{shortlist.length}</span>
              )}
            </button>
          </div>
          <section className="domain-section" aria-labelledby="domain-heading">
            <div className="domain-top">
              <div>
                <span className="step-number">01</span>
                <h2 id="domain-heading">Choose the opportunity</h2>
              </div>
              <span className="subtle">Real domain · example price</span>
            </div>
            <div className="domain-controls">
              <div className="domain-select">
                <label htmlFor="domain">Domain</label>
                <select
                  id="domain"
                  value={domainId}
                  disabled={status === "loading"}
                  onChange={(event) => {
                    clearResearch();
                    setDomainId(event.target.value);
                  }}
                >
                  {domains.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="domain-fact">
                <span>Market / service</span>
                <strong>
                  {domain.market}
                  <small>{domain.category}</small>
                </strong>
              </div>
              <div className="domain-fact">
                <span>Listed purchase</span>
                <strong>
                  {money(domain.price)}
                  <small>Confirm current terms</small>
                </strong>
              </div>
              <button
                className="primary"
                disabled={status === "loading"}
                onClick={research}
              >
                {status === "loading" ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <Sparkles size={17} />
                )}{" "}
                {status === "loading"
                  ? "Loading example"
                  : "Run example research"}
                {status !== "loading" && <ArrowRight size={16} />}
              </button>
            </div>
            <div className="domain-footer">
              <a href={domain.listingUrl} target="_blank" rel="noreferrer">
                View owner’s listing ↗
              </a>
              <div>
                <label htmlFor="scenario">Example scenario</label>
                <select
                  id="scenario"
                  value={scenario}
                  disabled={status === "loading"}
                  onChange={(event) => {
                    clearResearch();
                    setScenario(
                      event.target.value as ResearchRequest["scenario"],
                    );
                  }}
                >
                  <option value="normal">Standard research</option>
                  <option value="empty">No matches</option>
                  <option value="failure">Provider unavailable</option>
                </select>
              </div>
            </div>
          </section>
          <div className="research-heading">
            <div>
              <span className="step-number">02</span>
              <h2>Review potential buyers</h2>
            </div>
            <span className="subtle">
              {status === "ready"
                ? "Fixture date · 29 Sep 2026"
                : "Evidence before outreach"}
            </span>
          </div>
          <section
            className="research-workspace"
            aria-label="Buyer research results"
          >
            <div className="list-panel">
              <div className="view-tabs" aria-label="Result views">
                {(
                  [
                    {
                      id: "eligible",
                      label: "Potential fit",
                      count: eligible.length,
                    },
                    { id: "review", label: "Held back", count: review.length },
                    {
                      id: "shortlist",
                      label: "Shortlist",
                      count: shortlist.length,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    aria-pressed={view === tab.id}
                    className={view === tab.id ? "active" : ""}
                    onClick={() => {
                      setView(tab.id);
                      setSelectedId(undefined);
                      setDetailTab("evidence");
                    }}
                  >
                    {tab.label}
                    <span>{tab.count}</span>
                  </button>
                ))}
              </div>
              <label className="search-field">
                <Search size={16} />
                <input
                  aria-label="Filter businesses"
                  placeholder="Filter businesses…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  disabled={status !== "ready"}
                />
              </label>
              {status === "idle" && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Globe2 size={28} />
                  </div>
                  <h3>Start with a domain.</h3>
                  <p>
                    Run the example to explore buyer fit, source evidence, and
                    outreach preparation.
                  </p>
                  <span>6 fictional records · 1 review workflow</span>
                </div>
              )}
              {status === "loading" && (
                <div className="empty-state" role="status">
                  <LoaderCircle size={28} className="spin" />
                  <h3>Loading the research example</h3>
                  <p>
                    Using fictional fixtures. No websites or AI services are
                    being contacted.
                  </p>
                </div>
              )}
              {status === "error" && (
                <div className="empty-state" role="alert">
                  <CircleHelp size={28} />
                  <h3>Research is unavailable</h3>
                  <p>{error}</p>
                  <button
                    className="secondary"
                    onClick={() => {
                      setScenario("normal");
                      setStatus("idle");
                      setError("");
                    }}
                  >
                    Switch to standard example
                  </button>
                </div>
              )}
              {status === "ready" && !visible.length && (
                <div className="empty-state">
                  <Search size={28} />
                  <h3>
                    {query
                      ? "No businesses match this filter"
                      : view === "shortlist"
                        ? "Your shortlist is empty"
                        : "No matches in this view"}
                  </h3>
                  <p>
                    {view === "shortlist"
                      ? "Review a potential fit and add it to your shortlist."
                      : "Try another view, clear the filter, or run the standard example."}
                  </p>
                  {query && (
                    <button className="secondary" onClick={() => setQuery("")}>
                      Clear filter
                    </button>
                  )}
                </div>
              )}
              {status === "ready" &&
                visible.map((item) => (
                  <button
                    className={`prospect-row ${selectedId === item.prospect.id ? "selected" : ""}`}
                    key={item.prospect.id}
                    onClick={() => {
                      setSelectedId(item.prospect.id);
                      setDetailTab("evidence");
                    }}
                    aria-pressed={selectedId === item.prospect.id}
                  >
                    <div className="monogram">
                      {item.prospect.name
                        .split(" ")
                        .filter((word) => word !== "&")
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")}
                    </div>
                    <div className="prospect-info">
                      <div className="prospect-name">
                        {item.prospect.name}
                        {shortlist.includes(item.prospect.id) && (
                          <Check size={14} aria-label="Shortlisted" />
                        )}
                      </div>
                      <span>
                        {item.prospect.market} · {item.prospect.category}
                      </span>
                      <p>{item.prospect.summary}</p>
                      <div className={`fit-tag ${item.disposition}`}>
                        <span />
                        {item.disposition === "eligible"
                          ? "Potential fit"
                          : item.disposition === "needs-review"
                            ? "Needs evidence"
                            : "Excluded"}
                        <span className="evidence-count">
                          {item.prospect.evidence.length} example sources
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))}
              <div className="list-footnote">
                <ShieldCheck size={15} />
                <span>Fit is a research hypothesis, not buying intent.</span>
              </div>
            </div>
            <aside className="inspector" aria-label="Selected buyer details">
              {!selected ? (
                <div className="inspector-placeholder">
                  <FileText size={26} />
                  <h3>The evidence belongs here.</h3>
                  <p>
                    Select a business to inspect its fit, missing information,
                    and next step.
                  </p>
                  <div className="mini-workflow">
                    <span>Review evidence</span>
                    <ArrowRight size={13} />
                    <span>Shortlist</span>
                    <ArrowRight size={13} />
                    <span>Draft</span>
                  </div>
                </div>
              ) : (
                <div className="inspector-content" key={selected.prospect.id}>
                  <div className="inspector-eyebrow">FICTIONAL BUSINESS</div>
                  <h2>{selected.prospect.name}</h2>
                  <span className="inspector-location">
                    {selected.prospect.market} / {selected.prospect.category}
                  </span>
                  <div className="detail-tabs">
                    <button
                      className={detailTab === "evidence" ? "active" : ""}
                      onClick={() => setDetailTab("evidence")}
                    >
                      Evidence & fit
                    </button>
                    <button
                      disabled={
                        selected.disposition !== "eligible" ||
                        !shortlist.includes(selected.prospect.id)
                      }
                      className={detailTab === "draft" ? "active" : ""}
                      onClick={() => setDetailTab("draft")}
                    >
                      Outreach draft
                    </button>
                  </div>
                  {detailTab === "evidence" ? (
                    <>
                      <div className="fit-verdict">
                        <ShieldCheck size={18} />
                        <div>
                          <strong>
                            {selected.disposition === "eligible"
                              ? "Worth a closer look"
                              : selected.disposition === "needs-review"
                                ? "More evidence needed"
                                : "Hold back from outreach"}
                          </strong>
                          {selected.reasons.map((reason) => (
                            <p key={reason}>{reason}</p>
                          ))}
                        </div>
                      </div>
                      <div className="section-label evidence-label">
                        SUPPORTING EXAMPLE EVIDENCE
                      </div>
                      {selected.prospect.evidence.map((source) => (
                        <div className="evidence-item" key={source.id}>
                          <div>
                            <strong>{source.title}</strong>
                            <span>EXAMPLE</span>
                          </div>
                          <p>{source.excerpt}</p>
                          <small>Fictional fixture · {source.capturedAt}</small>
                        </div>
                      ))}
                      <div className="caveats">
                        <span className="section-label">
                          WHAT WE DON’T KNOW
                        </span>
                        <p>
                          Buying interest, budget, decision-maker, and actual
                          marketing performance.
                        </p>
                      </div>
                      <div className="next-step">
                        <span className="section-label">POSSIBLE USE</span>
                        <p>
                          A memorable campaign address that redirects to an
                          existing website. No rebrand required.
                        </p>
                      </div>
                      <button
                        className={
                          shortlist.includes(selected.prospect.id)
                            ? "secondary full"
                            : "primary full"
                        }
                        disabled={selected.disposition !== "eligible"}
                        onClick={() => toggleShortlist(selected)}
                      >
                        {shortlist.includes(selected.prospect.id) ? (
                          <CheckCheck size={16} />
                        ) : (
                          <Check size={16} />
                        )}{" "}
                        {selected.disposition !== "eligible"
                          ? "Not eligible for shortlist"
                          : shortlist.includes(selected.prospect.id)
                            ? "Remove from shortlist"
                            : "Add to shortlist"}
                      </button>
                      {shortlist.includes(selected.prospect.id) && (
                        <button
                          className="text-button draft-action"
                          onClick={() => setDetailTab("draft")}
                        >
                          Prepare outreach draft <ArrowRight size={14} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="draft-panel">
                      <div className="draft-warning">
                        Template draft · not sent
                      </div>
                      <label htmlFor="draft">
                        Review and edit before outreach
                      </label>
                      <textarea
                        id="draft"
                        maxLength={6000}
                        value={
                          drafts[selected.prospect.id] ??
                          makeDraft(domain, selected)
                        }
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [selected.prospect.id]: event.target.value,
                          }))
                        }
                      />
                      <button className="secondary full" onClick={copyDraft}>
                        <Clipboard size={16} />
                        Copy draft
                      </button>
                      <p>
                        Example personalization uses fictional evidence. No
                        email address is collected and no message is sent.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </section>
          <div className="notice" role="status" aria-live="polite">
            {notice}
          </div>
          <footer className="workspace-footer">
            <span>SIMULATION / NO LIVE OUTREACH</span>
            <span>Session-only changes. Export to keep your shortlist.</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={aboutDialog}
        aria-labelledby="demo-dialog-title"
        onCancel={() => setAbout(false)}
        onClose={() => setAbout(false)}
      >
        <div className="dialog-heading">
          <h2 id="demo-dialog-title">Demo today. A path to a real app.</h2>
          <button
            className="icon-button"
            aria-label="Close demo information"
            onClick={() => setAbout(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          This demo runs fixture research and deterministic eligibility rules.
          Every business, source excerpt, and previous-contact flag is
          fictional. Domain prices are illustrative snapshots, not current
          offers.
        </p>
        <h3>Working in this demo</h3>
        <p>
          Domain selection, evidence review, duplicate/contact suppression,
          shortlisting, editable template drafts, JSON export, and failure
          recovery.
        </p>
        <h3>Required for live operation</h3>
        <p>
          A protected research backend, verified source retrieval, server-side
          policy checks, contact history, shared storage, access controls,
          provider limits, and evaluated AI output. Sending messages remains a
          separate, explicitly approved step.
        </p>
        <h3>Built to carry forward</h3>
        <p>
          The research provider contract, evidence records, assessment states,
          and versioned review packet are reusable. A real provider can replace
          the fixtures without replacing this review workflow.
        </p>
        <button className="primary" onClick={() => setAbout(false)}>
          Back to workspace <ArrowRight size={15} />
        </button>
      </dialog>
    </>
  );
}
