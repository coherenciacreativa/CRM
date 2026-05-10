import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { CrmMultiServiceCardProposalReport } from '../../lib/crm/crm-vnext-multi-service-card-proposal';

type ApiPayload =
  | { ok: true; proposal: CrmMultiServiceCardProposalReport }
  | { ok: false; error: string };

const SAMPLE_TEXT = [
  'CRM: Juan Jose Trujillo es estudiante de las clases de yoga, ha asistido a multiples retiros, es paciente de psicologia, es amigo y aliado consultor de Coherencia Creativa.',
  'CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco anos.',
].join('\n');

const numberFmt = new Intl.NumberFormat('es-CO');

const labelAction = (value: string): string =>
  value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

export default function CrmVNextMultiServiceCardProposalPage() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [reporter, setReporter] = useState('Alejandro');
  const [channel, setChannel] = useState('codex');
  const [sourceKind, setSourceKind] = useState('alejandro_conversation');
  const [result, setResult] = useState<CrmMultiServiceCardProposalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/crm-vnext/multi-service-card-proposal', {
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
        throw new Error(payload.ok === false ? payload.error : 'multi_service_card_proposal_failed');
      }
      setResult(payload.proposal);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'multi_service_card_proposal_failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <Head>
        <title>Multi-Service Card Proposal - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Multi-Service Card Proposal</h1>
        </div>
        <div className="mode">
          <span>Proposal only</span>
          <small>Preserves yoga, retreats, therapy, products, and relationship context together.</small>
        </div>
      </header>

      <section className="workspace">
        <article className="panel">
          <div className="panelHeader">
            <h2>Reported Facts</h2>
            <span>proposal builder</span>
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
            {loading ? 'Building...' : 'Build Proposal'}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="panel">
          <div className="panelHeader">
            <h2>Proposal</h2>
            <span>{result?.mode ?? 'idle'}</span>
          </div>
          {result ? (
            <>
              <div className="summary">
                <div>
                  <span>Cards</span>
                  <strong>{numberFmt.format(result.summary.proposals)}</strong>
                </div>
                <div>
                  <span>Services</span>
                  <strong>{numberFmt.format(result.summary.serviceRelationships)}</strong>
                </div>
                <div>
                  <span>Multi</span>
                  <strong>{numberFmt.format(result.summary.multiServiceProposals)}</strong>
                </div>
                <div>
                  <span>Restricted</span>
                  <strong>{numberFmt.format(result.summary.restrictedServiceRelationships)}</strong>
                </div>
              </div>
              <div className="proposals">
                {result.proposals.map((proposal) => (
                  <section className="proposal" key={proposal.proposalId}>
                    <div className="proposalHeader">
                      <div>
                        <strong>
                          {proposal.target.displayName
                            || proposal.personHint.rawName
                            || proposal.personHint.instagramHandle
                            || proposal.proposalId}
                        </strong>
                        <small>{proposal.target.personId || proposal.target.reason}</small>
                      </div>
                      <span>{labelAction(proposal.target.type)}</span>
                    </div>
                    <div className="serviceList">
                      {proposal.serviceRelationships.map((service) => (
                        <div className={`service ${service.privacy}`} key={service.relationshipId}>
                          <b>{service.label}</b>
                          <span>{service.role}</span>
                          <small>{service.status}</small>
                        </div>
                      ))}
                    </div>
                    {proposal.relationshipContexts.length ? (
                      <p className="context">
                        Context: {proposal.relationshipContexts.map((context) => labelAction(context.code)).join(', ')}
                      </p>
                    ) : null}
                    {proposal.privacyWarnings.length ? (
                      <p className="warning">{proposal.privacyWarnings[0]}</p>
                    ) : null}
                    <div className="ops">
                      {proposal.proposedOperations.slice(0, 5).map((operation) => (
                        <span key={operation.operationId}>{labelAction(operation.type)}</span>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <p className="empty">Paste reported facts to see card targets, service relationships, privacy flags, and proposed operations.</p>
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
    max-width: 420px;
    gap: 6px;
    text-align: right;
  }

  .mode span,
  button,
  .proposalHeader strong,
  .service b {
    font-weight: 800;
  }

  .mode small,
  .empty,
  .proposalHeader small,
  .service small,
  .context {
    color: #687269;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(380px, 1fr);
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
  .proposalHeader,
  .service {
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
  .proposalHeader span,
  .service span,
  .ops span {
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

  .error,
  .warning {
    color: #9c3d2f;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .summary div,
  .proposal {
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

  .proposals {
    display: grid;
    gap: 12px;
  }

  .proposal {
    display: grid;
    gap: 12px;
    padding: 14px;
  }

  .proposalHeader > div {
    display: grid;
    gap: 4px;
  }

  .serviceList,
  .ops {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .service,
  .ops span {
    border: 1px solid #e5dfd1;
    border-radius: 8px;
    background: #faf8f2;
    padding: 8px 10px;
  }

  .service {
    min-width: 160px;
  }

  .service.restricted {
    border-color: #d59a7c;
    background: #fff3eb;
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
