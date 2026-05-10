import Head from 'next/head';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { CrmFactIntakeDraft, CrmFactSourceKind } from '../../lib/crm/crm-vnext-fact-intake';
import type { CrmFactStoreAppendResult } from '../../lib/crm/crm-vnext-fact-store';

type ApiState =
  | { status: 'idle'; draft: null; error: null }
  | { status: 'loading'; draft: CrmFactIntakeDraft | null; error: null }
  | { status: 'ready'; draft: CrmFactIntakeDraft; error: null }
  | { status: 'error'; draft: null; error: string };

type StoreState =
  | { status: 'idle'; result: null; error: null }
  | { status: 'loading'; result: CrmFactStoreAppendResult | null; error: null }
  | { status: 'ready'; result: CrmFactStoreAppendResult; error: null }
  | { status: 'error'; result: null; error: string };

const sourceOptions: Array<{ value: CrmFactSourceKind; label: string }> = [
  { value: 'alejandro_conversation', label: 'Alejandro conversation' },
  { value: 'telegram_human_report', label: 'Telegram human report' },
  { value: 'mailerlite_tag_snapshot', label: 'MailerLite tag snapshot' },
  { value: 'manual_import', label: 'Manual import' },
  { value: 'unknown', label: 'Unknown' },
];

const label = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const sampleText = [
  'CRM: Ana Gomez y Carlos Diaz son estudiantes de yoga en el programa mensual de mayo.',
  'CRM: Laura Perez asistio al retiro de Barichara.',
  'CRM: @mariana_luz esta interesada en mentoria 1:1.',
].join('\n');

export default function CrmVNextFactIntakePage() {
  const [text, setText] = useState(sampleText);
  const [sourceKind, setSourceKind] = useState<CrmFactSourceKind>('telegram_human_report');
  const [reporter, setReporter] = useState('Juana');
  const [channel, setChannel] = useState('telegram');
  const [approvedBy, setApprovedBy] = useState('Alejandro');
  const [state, setState] = useState<ApiState>({ status: 'idle', draft: null, error: null });
  const [storeState, setStoreState] = useState<StoreState>({ status: 'idle', result: null, error: null });

  const facts = state.draft?.facts ?? [];
  const reviewFacts = useMemo(() => facts.filter((fact) => fact.requiresHumanReview), [facts]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState((current) => ({ status: 'loading', draft: current.draft, error: null }));
    try {
      const response = await fetch('/api/crm-vnext/fact-intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, sourceKind, reporter, channel }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `request_failed_${response.status}`);
      }
      setState({ status: 'ready', draft: payload.draft, error: null });
      setStoreState({ status: 'idle', result: null, error: null });
    } catch (error) {
      setState({ status: 'error', draft: null, error: error instanceof Error ? error.message : 'unknown_error' });
    }
  };

  const storeDraft = async () => {
    if (!state.draft) return;
    setStoreState((current) => ({ status: 'loading', result: current.result, error: null }));
    try {
      const response = await fetch('/api/crm-vnext/fact-store', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          draft: state.draft,
          commit: true,
          approvedBy,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `request_failed_${response.status}`);
      }
      setStoreState({ status: 'ready', result: payload.result, error: null });
    } catch (error) {
      setStoreState({ status: 'error', result: null, error: error instanceof Error ? error.message : 'unknown_error' });
    }
  };

  return (
    <main className="page">
      <Head>
        <title>Fact Intake Lab - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <Link className="backLink secondary" href="/crm-vnext/fact-store">Open fact store</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Fact Intake Lab</h1>
        </div>
        <div className="mode">
          <span>Dry-run</span>
          <small>No record mutation</small>
        </div>
      </header>

      <section className="workspace">
        <form className="composer" onSubmit={submit}>
          <div className="fieldGrid">
            <label>
              <span>Source</span>
              <select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as CrmFactSourceKind)}>
                {sourceOptions.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Reporter</span>
              <input value={reporter} onChange={(event) => setReporter(event.target.value)} />
            </label>
            <label>
              <span>Channel</span>
              <input value={channel} onChange={(event) => setChannel(event.target.value)} />
            </label>
          </div>
          <label className="textareaLabel">
            <span>Signal text</span>
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={9} />
          </label>
          <button type="submit" disabled={state.status === 'loading'}>
            {state.status === 'loading' ? 'Parsing...' : 'Parse facts'}
          </button>
        </form>

        <aside className="summary">
          <div>
            <span>Facts</span>
            <strong>{state.draft?.summary.facts ?? 0}</strong>
          </div>
          <div>
            <span>People</span>
            <strong>{state.draft?.summary.people ?? 0}</strong>
          </div>
          <div>
            <span>Review</span>
            <strong>{reviewFacts.length}</strong>
          </div>
          <div>
            <span>Mode</span>
            <strong>Read-only</strong>
          </div>
        </aside>
      </section>

      {state.status === 'error' ? <p className="error">{state.error}</p> : null}
      {storeState.status === 'error' ? <p className="error">{storeState.error}</p> : null}

      {state.draft ? (
        <section className="resultGrid">
          <article className="panel">
            <div className="panelHeader">
              <h2>Facts</h2>
              <span>{state.draft.generatedAt}</span>
            </div>
            <div className="facts">
              {state.draft.facts.map((fact) => (
                <div className="fact" key={fact.factId}>
                  <div>
                    <strong>{fact.person.rawName || fact.person.personIdHint || fact.person.instagramHandle || fact.factId}</strong>
                    <span>{label(fact.type)}</span>
                  </div>
                  <p>{fact.evidenceText}</p>
                  <div className="chips">
                    <b>{label(fact.confidence)}</b>
                    <b>{fact.requiresHumanReview ? 'Review' : 'No review'}</b>
                    {fact.subject.program ? <b>{label(fact.subject.program)}</b> : null}
                    {fact.subject.role ? <b>{label(fact.subject.role)}</b> : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panelHeader">
              <h2>Store</h2>
              <span>Local only</span>
            </div>
            <div className="storeBox">
              <label>
                <span>Approved by</span>
                <input value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} />
              </label>
              <button type="button" onClick={storeDraft} disabled={storeState.status === 'loading' || !approvedBy.trim()}>
                {storeState.status === 'loading' ? 'Storing...' : 'Store approved facts'}
              </button>
              {storeState.result ? (
                <div className="storeResult">
                  <strong>{storeState.result.added.length} stored</strong>
                  <p>{storeState.result.duplicatesSkipped.length} duplicates skipped. Cards were not mutated.</p>
                </div>
              ) : (
                <p className="empty">Stores facts in the local ledger. Person cards stay unchanged.</p>
              )}
            </div>

            <div className="panelHeader compact">
              <h2>Ambiguities</h2>
              <span>{state.draft.ambiguities.length}</span>
            </div>
            {state.draft.ambiguities.length ? (
              <div className="facts">
                {state.draft.ambiguities.map((item, index) => (
                  <div className="ambiguity" key={`${item.code}-${index}`}>
                    <strong>{label(item.code)}</strong>
                    <p>{item.detail}</p>
                    <small>{item.line}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">No ambiguities in this dry-run.</p>
            )}
          </article>
        </section>
      ) : null}

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
  .workspace,
  .resultGrid,
  .error {
    max-width: 1220px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    margin-bottom: 24px;
  }

  .backLink {
    display: inline-block;
    margin-bottom: 14px;
    color: #253f2b;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
  }

  .backLink.secondary {
    margin-left: 14px;
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

  h2 {
    font-size: 18px;
  }

  .mode {
    display: grid;
    justify-items: end;
    gap: 6px;
    color: #586157;
  }

  .mode span {
    border: 1px solid #d4bd79;
    border-radius: 999px;
    background: #fff7da;
    padding: 6px 10px;
    color: #6d521a;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 16px;
    align-items: start;
  }

  .composer,
  .summary,
  .panel {
    border: 1px solid #dde0d6;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.84);
  }

  .composer {
    display: grid;
    gap: 16px;
    padding: 18px;
  }

  .fieldGrid {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1fr;
    gap: 12px;
  }

  label {
    display: grid;
    gap: 8px;
  }

  label span,
  .summary span,
  .panelHeader span {
    color: #627064;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  input,
  select,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cfd6cb;
    border-radius: 6px;
    background: #ffffff;
    color: #151915;
    font: inherit;
    padding: 11px 12px;
  }

  textarea {
    resize: vertical;
    line-height: 1.45;
  }

  button {
    width: fit-content;
    border: 0;
    border-radius: 6px;
    background: #253f2b;
    color: #ffffff;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
    padding: 11px 16px;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.68;
  }

  .summary {
    display: grid;
    gap: 0;
    overflow: hidden;
  }

  .summary div {
    display: grid;
    gap: 6px;
    padding: 16px;
    border-bottom: 1px solid #eceee7;
  }

  .summary div:last-child {
    border-bottom: 0;
  }

  .summary strong {
    font-size: 24px;
    line-height: 1;
  }

  .error {
    margin-top: 16px;
    border: 1px solid #d89d91;
    border-radius: 8px;
    background: #ffe9e4;
    color: #743426;
    padding: 14px 16px;
    font-weight: 700;
  }

  .resultGrid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
    gap: 16px;
    margin-top: 18px;
  }

  .panel {
    padding: 18px;
  }

  .panelHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }

  .facts {
    display: grid;
    gap: 12px;
  }

  .fact,
  .ambiguity {
    display: grid;
    gap: 8px;
    border-top: 1px solid #eceee7;
    padding-top: 12px;
  }

  .fact:first-child,
  .ambiguity:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .fact div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .fact div:first-child span {
    color: #586157;
    font-size: 13px;
    font-weight: 700;
  }

  .fact p,
  .ambiguity p,
  .ambiguity small,
  .empty {
    color: #586157;
    line-height: 1.45;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chips b {
    border: 1px solid #cad2c5;
    border-radius: 999px;
    background: #f7f8f4;
    color: #253f2b;
    padding: 4px 8px;
    font-size: 11px;
    text-transform: uppercase;
  }

  .storeBox {
    display: grid;
    gap: 12px;
    margin-bottom: 18px;
  }

  .storeBox button {
    width: 100%;
    justify-content: center;
  }

  .storeResult {
    display: grid;
    gap: 6px;
    border: 1px solid #99b39b;
    border-radius: 8px;
    background: #e9f1e4;
    padding: 12px;
  }

  .storeResult p {
    color: #586157;
  }

  .panelHeader.compact {
    margin-top: 8px;
  }

  .ambiguity strong {
    color: #743426;
  }

  @media (max-width: 860px) {
    .page {
      padding: 20px;
    }

    .hero,
    .workspace,
    .resultGrid {
      grid-template-columns: 1fr;
    }

    .hero {
      align-items: flex-start;
      flex-direction: column;
    }

    .mode {
      justify-items: start;
    }

    .fieldGrid {
      grid-template-columns: 1fr;
    }
  }
`;
