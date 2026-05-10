import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { CrmActivationRunReport } from '../../lib/crm/crm-vnext-activation-run';

type ApiPayload =
  | { ok: true; activation: CrmActivationRunReport }
  | { ok: false; error: string };

const SAMPLE_TEXT = [
  'CRM: @ana_yoga es estudiante de yoga.',
  'CRM: carlos@example.com asistio a Mi Encuentro Feliz.',
].join('\n');

const numberFmt = new Intl.NumberFormat('es-CO');

export default function CrmVNextActivationRunPage() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [reporter, setReporter] = useState('Alejandro');
  const [channel, setChannel] = useState('codex');
  const [sourceKind, setSourceKind] = useState('alejandro_conversation');
  const [result, setResult] = useState<CrmActivationRunReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/crm-vnext/activation-run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceKind,
          reporter,
          channel,
          commit: false,
        }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok === false ? payload.error : 'activation_failed');
      }
      setResult(payload.activation);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'activation_failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <Head>
        <title>Activation Run - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Activation Run</h1>
        </div>
        <div className="mode">
          <span>Dry-run only</span>
          <small>No card mutation, no outbound, no credentials.</small>
        </div>
      </header>

      <section className="workspace">
        <article className="panel">
          <div className="panelHeader">
            <h2>Fact Batch</h2>
            <span>preview pipeline</span>
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
          <button type="button" onClick={runPreview} disabled={loading || !text.trim()}>
            {loading ? 'Running...' : 'Run Preview'}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="panel">
          <div className="panelHeader">
            <h2>Result</h2>
            <span>{result?.mode ?? 'idle'}</span>
          </div>
          {result ? (
            <>
              <div className="summary">
                <div>
                  <span>Facts</span>
                  <strong>{numberFmt.format(result.summary.factsParsed)}</strong>
                </div>
                <div>
                  <span>Added</span>
                  <strong>{numberFmt.format(result.summary.factsAdded)}</strong>
                </div>
                <div>
                  <span>Ready</span>
                  <strong>{numberFmt.format(result.summary.readyForPreview)}</strong>
                </div>
                <div>
                  <span>Diffs</span>
                  <strong>{numberFmt.format(result.summary.cardsWithDiffs)}</strong>
                </div>
              </div>
              <div className="nextSteps">
                {result.nextSteps.map((step) => <p key={step}>{step}</p>)}
              </div>
            </>
          ) : (
            <p className="empty">Paste a small real batch and run a preview to see the full pipeline.</p>
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
    gap: 6px;
  }

  .mode span {
    font-weight: 800;
  }

  .mode small {
    color: #687269;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
    gap: 16px;
  }

  .panel {
    border: 1px solid #d8d3c7;
    border-radius: 8px;
    background: #fffdf8;
    box-shadow: 0 16px 40px rgba(34, 45, 35, 0.08);
    padding: 18px;
  }

  .panelHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }

  .panelHeader span,
  label,
  .summary span {
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
    gap: 6px;
    margin-bottom: 12px;
  }

  .fields,
  .summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  input,
  select,
  textarea {
    border: 1px solid #cfc9bc;
    border-radius: 8px;
    background: #fbfaf5;
    color: #151915;
    font: inherit;
    padding: 10px 12px;
    text-transform: none;
  }

  textarea {
    min-height: 220px;
    resize: vertical;
  }

  button {
    border: 0;
    border-radius: 8px;
    background: #253f2b;
    color: #fffdf8;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
    padding: 11px 14px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .summary {
    margin-bottom: 14px;
  }

  .summary div {
    border: 1px solid #e3ded2;
    border-radius: 8px;
    background: #fbfaf5;
    display: grid;
    gap: 6px;
    padding: 14px;
  }

  .summary strong {
    font-size: 28px;
    line-height: 1;
  }

  .nextSteps,
  .empty,
  .error {
    color: #535d54;
    display: grid;
    gap: 8px;
    line-height: 1.45;
  }

  .error {
    color: #7b3027;
    margin-top: 10px;
  }

  @media (max-width: 880px) {
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
    }
  }
`;
