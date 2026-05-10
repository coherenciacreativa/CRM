import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { CrmEvidenceApprovalWorkbenchReport } from '../../lib/crm/crm-vnext-evidence-approval-workbench';

type ApiPayload =
  | {
      ok: true;
      workbench: CrmEvidenceApprovalWorkbenchReport;
    }
  | { ok: false; error: string };

const SAMPLE_TEXT = [
  'CRM: Adriana Bernal es mi tía, ha asistido a retiros, es alumna de las clases de yoga hace más de 10 años, no tiene Instagram.',
  'Amalia de Bedud es estudiante mía también hace más de 10 años, ha asistido a múltiples retiros, está en las clases de yoga, ella sí tiene Instagram.',
  'Santiago Bernal es mi tío, también tiene Instagram, ha asistido a varios retiros, es alumno de las clases de yoga.',
  'Lina María Bernal es mi mamá, ha asistido a múltiples retiros, es asistente de mis clases de yoga, sí tiene Instagram también.',
  'Natalia Cárdenas de Bedut es hija de Amalia, ha asistido a algunos retiros, es estudiante de mis clases desde hace varios años, vive en Nueva York, tiene Instagram.',
  '@cadavid_eli se llama Eliana, asiste a mis clases de yoga desde hace dos meses, vive en Medellín, es muy activa en Instagram y asiste al Encuentro Feliz con alguna regularidad.',
  'Luis Enrique Lopera ha asistido a varios retiros, vive en El Rosal, Cundinamarca, es amigo, entra a mis clases de yoga y está en una etapa de prueba del producto de encuentros terapéuticos.',
].join(' ');

const SAMPLE_EVIDENCE = [
  {
    sourceId: 'contacts:adriana:1',
    sourceKind: 'contacts_app_export',
    snippet: 'Name: Adriana Bernal Vélez Email: adrianabv86@hotmail.com Email: adriana.bernal@epm.com.co Context: yoga student and retreats',
  },
  {
    sourceId: 'gmail:amalia:1',
    sourceKind: 'gmail_export',
    snippet: 'From: Amalia De Bedout <amaliadbg@hotmail.com> Subject: Yoga y retiros',
  },
  {
    sourceId: 'contacts:santiago:1',
    sourceKind: 'contacts_app_export',
    snippet: 'Name: Santiago Bernal Email: santiagobernal676@gmail.com Email: sbernal@proteccion.com.co Context: yoga and retreats',
  },
  {
    sourceId: 'contacts:lina:1',
    sourceKind: 'contacts_app_export',
    snippet: 'Name: Lina María Bernal Vélez Email: bernallinamaria@hotmail.com Email: bernallinamaria@gmail.com Email: bernallinamaria592@gmail.com Email: lina.bernal@icbf.gov.co Context: yoga and retreats',
  },
  {
    sourceId: 'contacts:natalia:1',
    sourceKind: 'contacts_app_export',
    snippet: 'Name: Natalia Cardenas De Bedout Email: natis1000@hotmail.com Email: ncardenadb@gmail.com City: New York Context: daughter of Amalia, yoga and retreats',
  },
  {
    sourceId: 'gmail:luis:1',
    sourceKind: 'gmail_export',
    snippet: 'From: Luis Enrique Lopera <luis.e.lopera@gmail.com> Subject: encuentros terapeuticos, yoga y retiros',
  },
];

const numberFmt = new Intl.NumberFormat('es-CO');

const labelAction = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const decisionLabel = (value: string): string => {
  switch (value) {
    case 'confirm_email_for_subject':
      return 'Confirmar email';
    case 'keep_email_unassigned_family_or_companion':
      return 'Mantener sin asignar';
    case 'create_related_person_candidate':
      return 'Crear relacionado';
    case 'ask_for_more_evidence':
      return 'Buscar más evidencia';
    case 'ignore_candidate':
      return 'Ignorar candidato';
    default:
      return labelAction(value);
  }
};

const priorityLabel = (value: string): string => {
  if (value === 'high') return 'Alta';
  if (value === 'medium') return 'Media';
  return 'Baja';
};

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export default function CrmVNextEvidenceApprovalWorkbenchPage() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [reporter, setReporter] = useState('Alejandro');
  const [channel, setChannel] = useState('codex');
  const [evidenceJson, setEvidenceJson] = useState(JSON.stringify(SAMPLE_EVIDENCE, null, 2));
  const [result, setResult] = useState<CrmEvidenceApprovalWorkbenchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const decisionScript = useMemo(() => {
    if (!result?.queueItems.length) return '';
    return result.queueItems
      .map((item) => item.recommendedDecisionCli)
      .join(' ');
  }, [result]);

  const runWorkbench = async () => {
    setLoading(true);
    setError(null);
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
      const response = await fetch('/api/crm-vnext/evidence-approval-workbench', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceKind: 'alejandro_conversation',
          reporter,
          channel,
          evidenceSources,
        }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok === false ? payload.error : 'evidence_approval_workbench_failed');
      }
      setResult(payload.workbench);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'evidence_approval_workbench_failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runWorkbench();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="page">
      <Head>
        <title>Evidence Approval Workbench - CRM vNext</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="hero">
        <div>
          <Link className="backLink" href="/crm-vnext">Back to dashboard</Link>
          <p className="eyebrow">CRM vNext</p>
          <h1>Evidence Approval Workbench</h1>
        </div>
        <div className="mode">
          <span>Read-only</span>
          <small>0 card writes · 0 outbound · 0 live connector mutations</small>
        </div>
      </header>

      {result ? (
        <section className="metrics" aria-label="Workbench summary">
          <Metric label="Preguntas" value={numberFmt.format(result.summary.queueItems)} detail="evidencia pendiente" />
          <Metric label="Prioridad alta" value={numberFmt.format(result.summary.highPriority)} detail="requieren decisión" />
          <Metric label="Listos" value={numberFmt.format(result.summary.readyForHumanApproval)} detail="aprobación posterior" />
          <Metric label="Operaciones" value={numberFmt.format(result.summary.operationsExecuted)} detail="ejecutadas" />
        </section>
      ) : null}

      <section className="workspace">
        <article className="panel inputPanel">
          <div className="panelHeader">
            <h2>Batch</h2>
            <span>{loading ? 'Running' : 'Ready'}</span>
          </div>
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
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={10} />
          </label>
          <label>
            Evidence JSON
            <textarea value={evidenceJson} onChange={(event) => setEvidenceJson(event.target.value)} rows={10} />
          </label>
          <button type="button" onClick={runWorkbench} disabled={loading || !text.trim()}>
            {loading ? 'Running...' : 'Run Workbench'}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="panel queuePanel">
          <div className="panelHeader">
            <h2>Decision Queue</h2>
            <span>{result ? `${result.queueItems.length} open` : 'idle'}</span>
          </div>

          {result?.readyApprovalItems.length ? (
            <section className="readyStrip">
              {result.readyApprovalItems.map((item) => (
                <div key={item.approvalItemId}>
                  <span>Ready</span>
                  <strong>{item.subjectLabel}</strong>
                  <small>{labelAction(item.recommendedAction)}</small>
                </div>
              ))}
            </section>
          ) : null}

          {result?.queueItems.length ? (
            <div className="queueList">
              {result.queueItems.map((item) => (
                <section className="queueItem" key={item.queueItemId}>
                  <div className="queueTop">
                    <div>
                      <span className={`priority ${item.priority}`}>{priorityLabel(item.priority)}</span>
                      <h3>{item.subject.label}</h3>
                      <small>{item.targetPersonId || item.subject.rawName || item.subject.instagramHandle || 'no target'}</small>
                    </div>
                    <div className="decision">
                      <span>{decisionLabel(item.recommendedOptionId)}</span>
                      <b>{item.candidateEmail}</b>
                    </div>
                  </div>
                  <div className="evidenceMeta">
                    <span>{numberFmt.format(item.evidence.evidenceCount)} evidence hits</span>
                    <span>{Object.keys(item.evidence.sourceKinds).join(', ') || 'source pending'}</span>
                    <span>{item.evidence.reviewReasons.map(labelAction).join(', ')}</span>
                  </div>
                  {item.evidence.snippets.length ? (
                    <div className="snippets">
                      {item.evidence.snippets.slice(0, 2).map((snippet) => (
                        <p key={snippet}>{snippet}</p>
                      ))}
                    </div>
                  ) : null}
                  <code>{item.recommendedDecisionCli}</code>
                </section>
              ))}
            </div>
          ) : result ? (
            <p className="empty">No unresolved evidence decisions in this batch.</p>
          ) : (
            <p className="empty">Running the current batch.</p>
          )}

          {decisionScript ? (
            <section className="scriptBox">
              <div className="panelHeader">
                <h2>Decision Fragments</h2>
                <span>{result?.queueItems.length ?? 0}</span>
              </div>
              <pre>{decisionScript}</pre>
            </section>
          ) : null}
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
  .metrics,
  .workspace {
    max-width: 1240px;
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
  h3,
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
    line-height: 1.2;
  }

  h3 {
    margin-top: 8px;
    font-size: 18px;
    line-height: 1.2;
  }

  .mode {
    display: grid;
    justify-items: end;
    max-width: 360px;
    gap: 6px;
    text-align: right;
  }

  .mode span,
  button,
  .panelHeader span,
  .priority,
  .decision span,
  .readyStrip span {
    border: 1px solid #253f2b;
    border-radius: 999px;
    color: #253f2b;
    font-size: 12px;
    font-weight: 800;
    padding: 7px 10px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .mode small,
  .queueTop small,
  .metric small,
  .readyStrip small {
    color: #6c705f;
    font-size: 13px;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .metric {
    border: 1px solid #d8d0bd;
    border-radius: 8px;
    background: #fffaf0;
    padding: 18px;
  }

  .metric span {
    display: block;
    color: #6c705f;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .metric strong {
    display: block;
    margin: 8px 0 5px;
    font-size: 30px;
    letter-spacing: 0;
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(320px, 0.9fr) minmax(480px, 1.25fr);
    gap: 18px;
    align-items: start;
  }

  .panel {
    border: 1px solid #d8d0bd;
    border-radius: 8px;
    background: #fffaf0;
    padding: 18px;
  }

  .panelHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  label {
    display: grid;
    gap: 7px;
    margin-bottom: 12px;
    color: #3f4639;
    font-size: 13px;
    font-weight: 800;
  }

  input,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cfc6b2;
    border-radius: 6px;
    background: #fffcf5;
    color: #151915;
    font: inherit;
    line-height: 1.45;
    padding: 11px 12px;
  }

  textarea {
    resize: vertical;
  }

  button {
    width: 100%;
    cursor: pointer;
    background: #253f2b;
    color: #fffaf0;
    border-color: #253f2b;
    border-radius: 6px;
    font-size: 13px;
    padding: 12px 14px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .error {
    margin-top: 12px;
    color: #9b2f2f;
    font-weight: 800;
  }

  .readyStrip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .readyStrip div {
    border: 1px solid #b9cfbd;
    border-radius: 8px;
    background: #eef7ed;
    padding: 12px;
  }

  .readyStrip strong {
    display: block;
    margin: 8px 0 3px;
  }

  .queueList {
    display: grid;
    gap: 12px;
  }

  .queueItem {
    border: 1px solid #d8d0bd;
    border-radius: 8px;
    background: #fffcf5;
    padding: 14px;
  }

  .queueTop {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
  }

  .priority.high {
    border-color: #8b3d2f;
    color: #8b3d2f;
  }

  .priority.medium {
    border-color: #7a6f33;
    color: #7a6f33;
  }

  .decision {
    display: grid;
    justify-items: end;
    gap: 8px;
    min-width: min(280px, 45%);
    text-align: right;
  }

  .decision b {
    overflow-wrap: anywhere;
  }

  .evidenceMeta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 14px 0 10px;
  }

  .evidenceMeta span {
    border-radius: 999px;
    background: #eee4d2;
    color: #41483b;
    font-size: 12px;
    font-weight: 700;
    padding: 6px 9px;
  }

  .snippets {
    display: grid;
    gap: 8px;
    margin-bottom: 10px;
  }

  .snippets p {
    border-left: 3px solid #749a78;
    background: #f6f0e4;
    color: #343a31;
    font-size: 13px;
    line-height: 1.45;
    padding: 8px 10px;
  }

  code,
  pre {
    display: block;
    overflow-x: auto;
    border-radius: 6px;
    background: #18231b;
    color: #f8f4e8;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 12px;
    line-height: 1.5;
    padding: 10px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .scriptBox {
    margin-top: 16px;
    border-top: 1px solid #d8d0bd;
    padding-top: 16px;
  }

  .empty {
    color: #6c705f;
    line-height: 1.5;
  }

  @media (max-width: 920px) {
    .page {
      padding: 20px;
    }

    .hero,
    .workspace {
      display: grid;
    }

    .mode {
      justify-items: start;
      text-align: left;
    }

    .metrics,
    .workspace,
    .fields {
      grid-template-columns: 1fr;
    }

    .queueTop,
    .decision {
      display: grid;
      justify-items: start;
      text-align: left;
      min-width: 0;
    }
  }
`;
