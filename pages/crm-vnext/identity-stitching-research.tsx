import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { CrmIdentityStitchingResearchReport } from '../../lib/crm/crm-vnext-identity-stitching-research';

type ApiPayload =
  | { ok: true; research: CrmIdentityStitchingResearchReport }
  | { ok: false; error: string };

const SAMPLE_TEXT = [
  'CRM: Juan Jose Trujillo es estudiante de las clases de yoga, ha asistido a multiples retiros, es paciente de psicologia, es amigo y aliado consultor de Coherencia Creativa.',
  'CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco anos.',
].join('\n');

const numberFmt = new Intl.NumberFormat('es-CO');

const labelAction = (value: string): string =>
  value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

export default function CrmVNextIdentityStitchingResearchPage() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [reporter, setReporter] = useState('Alejandro');
  const [channel, setChannel] = useState('codex');
  const [sourceKind, setSourceKind] = useState('alejandro_conversation');
  const [result, setResult] = useState<CrmIdentityStitchingResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/crm-vnext/identity-stitching-research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceKind,
          reporter,
          channel,
        }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok === false ? payload.error : 'identity_stitching_failed');
      }
      setResult(payload.research);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'identity_stitching_failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <Head>
        <title>Identity Stitching Research - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Identity Stitching Research</h1>
        </div>
        <div className="mode">
          <span>Read-only research</span>
          <small>Local cards + local Mailer bridge. No live APIs, no writes.</small>
        </div>
      </header>

      <section className="workspace">
        <article className="panel">
          <div className="panelHeader">
            <h2>Research Batch</h2>
            <span>candidate search</span>
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
            {loading ? 'Researching...' : 'Run Research'}
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
                  <span>Clues</span>
                  <strong>{numberFmt.format(result.summary.clues)}</strong>
                </div>
                <div>
                  <span>Candidates</span>
                  <strong>{numberFmt.format(result.summary.candidates)}</strong>
                </div>
                <div>
                  <span>Strong</span>
                  <strong>{numberFmt.format(result.summary.strongCandidates)}</strong>
                </div>
                <div>
                  <span>Create</span>
                  <strong>{numberFmt.format(result.summary.createCardRecommendations)}</strong>
                </div>
              </div>
              <div className="clues">
                {result.clues.map((clue) => (
                  <section className="clue" key={clue.clueId}>
                    <div className="clueHeader">
                      <strong>{clue.person.rawName || clue.person.instagramHandle || clue.person.email || clue.clueId}</strong>
                      <span>{labelAction(clue.recommendation.action)}</span>
                    </div>
                    <p>{clue.recommendation.reason}</p>
                    {clue.candidates.slice(0, 3).map((candidate) => (
                      <div className="candidate" key={`${candidate.source}:${candidate.sourceRecordId}`}>
                        <b>{candidate.displayName || candidate.personId || candidate.sourceRecordId}</b>
                        <span>{candidate.score} - {candidate.source}</span>
                        <small>{candidate.identities.email || candidate.identities.instagramHandle || 'no stable public id'}</small>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
            </>
          ) : (
            <p className="empty">Paste identity clues and run research to see local candidates and recommendations.</p>
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

  .mode span,
  button,
  .candidate b {
    font-weight: 800;
  }

  .mode small,
  .empty,
  .clue p,
  .candidate small {
    color: #687269;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 1fr);
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
  .candidate {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .panelHeader {
    margin-bottom: 14px;
  }

  .panelHeader span,
  label,
  .summary span,
  .clueHeader span,
  .candidate span {
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
    padding: 11px 14px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .summary {
    margin-bottom: 14px;
  }

  .summary div,
  .clue,
  .candidate {
    border: 1px solid #e3ded2;
    border-radius: 8px;
    background: #fbfaf5;
  }

  .summary div {
    display: grid;
    gap: 6px;
    padding: 14px;
  }

  .summary strong {
    font-size: 28px;
    line-height: 1;
  }

  .clues {
    display: grid;
    gap: 10px;
  }

  .clue {
    display: grid;
    gap: 10px;
    padding: 12px;
  }

  .candidate {
    padding: 10px;
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
    .summary,
    .candidate {
      grid-template-columns: 1fr;
    }

    .hero,
    .candidate {
      display: grid;
      align-items: start;
    }

    .mode {
      justify-items: start;
    }
  }
`;
