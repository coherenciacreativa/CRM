import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { CrmDeepLocalStitchingReport } from '../../lib/crm/crm-vnext-deep-local-stitching';

type ApiPayload =
  | { ok: true; stitching: CrmDeepLocalStitchingReport }
  | { ok: false; error: string };

const SAMPLE_TEXT = [
  'CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco anos.',
].join('\n');

const numberFmt = new Intl.NumberFormat('es-CO');

const labelAction = (value: string): string =>
  value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

export default function CrmVNextDeepLocalStitchingPage() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [reporter, setReporter] = useState('Alejandro');
  const [channel, setChannel] = useState('codex');
  const [sourceKind, setSourceKind] = useState('alejandro_conversation');
  const [includeExpandedSources, setIncludeExpandedSources] = useState(true);
  const [evidenceJson, setEvidenceJson] = useState('');
  const [result, setResult] = useState<CrmDeepLocalStitchingReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let evidenceSources: unknown[] = [];
      if (evidenceJson.trim()) {
        const parsed = JSON.parse(evidenceJson);
        evidenceSources = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.evidenceSources)
            ? parsed.evidenceSources
            : [];
      }
      const response = await fetch('/api/crm-vnext/deep-local-stitching', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceKind,
          reporter,
          channel,
          includeExpandedSources,
          evidenceSources,
        }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok === false ? payload.error : 'deep_local_stitching_failed');
      }
      setResult(payload.stitching);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'deep_local_stitching_failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <Head>
        <title>Deep Local Stitching - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Deep Local Stitching</h1>
        </div>
        <div className="mode">
          <span>Read-only evidence search</span>
          <small>Memory, CSVs, retreat tables, contact exports, and supplied evidence packets.</small>
        </div>
      </header>

      <section className="workspace">
        <article className="panel">
          <div className="panelHeader">
            <h2>Search Clues</h2>
            <span>{includeExpandedSources ? 'expanded local' : 'memory only'}</span>
          </div>
          <label>
            Source
            <select value={sourceKind} onChange={(event) => setSourceKind(event.target.value)}>
              <option value="alejandro_conversation">Alejandro conversation</option>
              <option value="telegram_human_report">Telegram human report</option>
              <option value="mailerlite_tag_snapshot">MailerLite tag snapshot</option>
              <option value="instagram_signal">Instagram signal</option>
              <option value="manual_import">Manual import</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <div className="fields">
            <label>
              Reporter
              <input value={reporter} onChange={(event) => setReporter(event.target.value)} />
            </label>
            <label>
              Channel
              <input value={channel} onChange={(event) => setChannel(event.target.value)} />
            </label>
          </div>
          <label>
            Text
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={12} />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={includeExpandedSources}
              onChange={(event) => setIncludeExpandedSources(event.target.checked)}
            />
            <span>Expanded local sources</span>
          </label>
          <label>
            Connected Evidence JSON
            <textarea
              value={evidenceJson}
              onChange={(event) => setEvidenceJson(event.target.value)}
              rows={6}
              placeholder={'[{"sourceKind":"gmail_export","sourceId":"gmail:thread:...","subject":"...","snippet":"..."}]'}
            />
          </label>
          <button type="button" onClick={runPreview} disabled={loading || !text.trim()}>
            {loading ? 'Searching...' : 'Search Evidence'}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="panel">
          <div className="panelHeader">
            <h2>Evidence</h2>
            <span>{result?.mode ?? 'idle'}</span>
          </div>
          {result ? (
            <>
              <div className="summary">
                <div>
                  <span>Clues</span>
                  <strong>{numberFmt.format(result.summary.clues)}</strong>
                </div>
                <div>
                  <span>Hits</span>
                  <strong>{numberFmt.format(result.summary.hits)}</strong>
                </div>
                <div>
                  <span>Deferred</span>
                  <strong>{numberFmt.format(result.summary.newCardCreationsDeferred)}</strong>
                </div>
                <div>
                  <span>Sources</span>
                  <strong>{numberFmt.format(result.summary.sourcesWithHits)}</strong>
                </div>
                <div>
                  <span>Files</span>
                  <strong>{numberFmt.format(result.sourceCoverage.localSources.filesScanned)}</strong>
                </div>
                <div>
                  <span>Packets</span>
                  <strong>{numberFmt.format(result.sourceCoverage.localSources.connectedEvidenceSources)}</strong>
                </div>
              </div>
              <div className="clues">
                {result.clues.map((clue) => (
                  <section className="clue" key={clue.clueId}>
                    <div className="clueHeader">
                      <div>
                        <strong>{clue.person.rawName || clue.person.instagramHandle || clue.clueId}</strong>
                        <small>{labelAction(clue.recommendation.action)}</small>
                      </div>
                      <span>{clue.hits.length} hits</span>
                    </div>
                    <p>{clue.recommendation.reason}</p>
                    {clue.hits.slice(0, 5).map((hit) => (
                      <div className="hit" key={hit.hitId}>
                        <div>
                          <b>{hit.sourceKind}</b>
                          <small>{hit.sourceId}{hit.lineNumber ? `:${hit.lineNumber}` : ''}</small>
                        </div>
                        <span>{hit.score} / {hit.confidence}</span>
                        <p>{hit.snippet}</p>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            </>
          ) : (
            <p className="empty">Run a local evidence search to see whether card creation should be deferred for deeper review.</p>
          )}
        </article>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  :global(body) {
    margin: 0;
    background: #f5f3ee;
    color: #151915;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .page {
    min-height: 100vh;
    padding: 32px;
  }

  .hero,
  .workspace {
    max-width: 1220px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .backLink {
    color: #253f2b;
    font-weight: 800;
    text-decoration: none;
  }

  .backLink:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }

  .eyebrow {
    margin: 0 0 6px;
    color: #5d6f61;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    font-size: clamp(30px, 4vw, 48px);
    line-height: 1;
    letter-spacing: 0;
  }

  .mode {
    display: grid;
    justify-items: end;
    max-width: 380px;
    gap: 6px;
    text-align: right;
  }

  .mode span,
  button,
  .clueHeader strong,
  .hit b {
    font-weight: 800;
  }

  .mode small,
  .empty,
  .clue p,
  .hit small {
    color: #687269;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(400px, 1fr);
    gap: 16px;
  }

  .panel {
    border: 1px solid #d8d3c7;
    border-radius: 8px;
    background: #fffdf8;
    box-shadow: 0 16px 40px rgba(34, 45, 35, 0.08);
    padding: 18px;
  }

  .panelHeader,
  .clueHeader,
  .hit > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .panelHeader {
    margin-bottom: 14px;
  }

  .panelHeader span,
  label,
  .summary span,
  .clueHeader span,
  .hit span {
    color: #687269;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  h2 {
    font-size: 19px;
    letter-spacing: 0;
  }

  label {
    display: grid;
    gap: 7px;
    margin-bottom: 12px;
  }

  textarea,
  input,
  select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #d8d3c7;
    border-radius: 8px;
    background: #fff;
    color: #151915;
    font: inherit;
    padding: 11px 12px;
  }

  textarea {
    resize: vertical;
    line-height: 1.45;
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toggle input {
    width: 18px;
    height: 18px;
    margin: 0;
  }

  .toggle span {
    color: #273a2b;
    font-size: 13px;
    font-weight: 800;
    text-transform: none;
  }

  button {
    width: 100%;
    border: 0;
    border-radius: 8px;
    background: #253f2b;
    color: #fffdf8;
    cursor: pointer;
    padding: 12px 16px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .error {
    color: #9c3d2f;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .summary div,
  .clue,
  .hit {
    border: 1px solid #e5dfd1;
    border-radius: 8px;
    background: #fff;
  }

  .summary div {
    display: grid;
    gap: 4px;
    padding: 12px;
  }

  .summary strong {
    font-size: 24px;
  }

  .clues {
    display: grid;
    gap: 12px;
  }

  .clue {
    display: grid;
    gap: 12px;
    padding: 14px;
  }

  .clueHeader > div,
  .hit {
    display: grid;
    gap: 5px;
  }

  .hit {
    background: #faf8f2;
    padding: 10px;
  }

  @media (max-width: 900px) {
    .page {
      padding: 20px;
    }

    .hero,
    .workspace,
    .fields,
    .summary {
      grid-template-columns: 1fr;
    }

    .hero {
      display: grid;
      align-items: start;
    }

    .mode {
      justify-items: start;
      text-align: left;
    }
  }
`;
