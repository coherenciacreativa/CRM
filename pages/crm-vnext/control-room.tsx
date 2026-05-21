import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import {
  buildCrmVNextControlRoom,
  type CrmVNextControlRoom,
} from '../../lib/crm/crm-vnext-control-room';

type ControlRoomPageProps =
  | {
      enabled: true;
      report: CrmVNextControlRoom;
    }
  | {
      enabled: false;
      error: string;
    };

const numberFmt = new Intl.NumberFormat('es-CO');

const labelText = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const isLocalHost = (host: string | undefined): boolean => {
  if (!host) return false;
  return (
    host === 'localhost'
    || host.startsWith('localhost:')
    || host === '127.0.0.1'
    || host.startsWith('127.0.0.1:')
    || host === '[::1]'
    || host.startsWith('[::1]:')
  );
};

export const getServerSideProps: GetServerSideProps<ControlRoomPageProps> = async (context) => {
  const localRequest = isLocalHost(context.req.headers.host);
  const enabledInProduction = process.env.CRM_VNEXT_DASHBOARD_ENABLED === '1';

  if (!localRequest && !enabledInProduction) {
    return {
      props: {
        enabled: false,
        error: 'CRM vNext control room is disabled outside localhost unless CRM_VNEXT_DASHBOARD_ENABLED=1.',
      },
    };
  }

  try {
    return {
      props: {
        enabled: true,
        report: await buildCrmVNextControlRoom(),
      },
    };
  } catch (error) {
    console.error('crm-vnext control-room page load error', error);
    return {
      props: {
        enabled: false,
        error: 'Unable to load local CRM vNext control room.',
      },
    };
  }
};

function StatusDot({ status }: { status: 'ok' | 'watch' | 'blocked' }) {
  return <span className={`dot ${status}`} aria-hidden="true" />;
}

export default function CrmVNextControlRoomPage(props: ControlRoomPageProps) {
  if (props.enabled === false) {
    return (
      <main className="page">
        <Head>
          <title>CRM vNext Control Room</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <section className="emptyState">
          <Link href="/crm-vnext">Back to dashboard</Link>
          <h1>CRM vNext Control Room</h1>
          <p>{props.error}</p>
        </section>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const { report } = props;

  return (
    <main className="page">
      <Head>
        <title>CRM vNext Control Room</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="topbar">
        <div>
          <Link href="/crm-vnext">CRM vNext</Link>
          <h1>Control Room</h1>
          <p>{report.summary.firstMove}</p>
        </div>
        <div className="state">
          <span>{labelText(report.state)}</span>
          <small>{report.generatedAt}</small>
        </div>
      </header>

      <section className="metrics" aria-label="Operating snapshot">
        {report.tiles.map((tile) => (
          <div className="metric" key={tile.id}>
            <div className="metricHead">
              <StatusDot status={tile.status} />
              <span>{tile.title}</span>
            </div>
            <strong>{typeof tile.value === 'number' ? numberFmt.format(tile.value) : tile.value}</strong>
            <small>{tile.detail}</small>
          </div>
        ))}
      </section>

      <section className="layout">
        <div className="mainColumn">
          <section className="band">
            <div className="sectionHead">
              <h2>Operator Plan</h2>
              <span>{labelText(report.operatorPlan.urgency)}</span>
            </div>
            {report.operatorPlan.tasks.length ? (
              <div className="taskList">
                {report.operatorPlan.tasks.slice(0, 6).map((task) => (
                  <article className="task" key={task.taskId}>
                    <div>
                      <h3>{task.title}</h3>
                      <p>{task.reason}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Lane</dt>
                        <dd>{labelText(task.lane)}</dd>
                      </div>
                      <div>
                        <dt>Priority</dt>
                        <dd>{labelText(task.priority)}</dd>
                      </div>
                      <div>
                        <dt>Approval</dt>
                        <dd>{task.approvalRequired ? 'Yes' : 'No'}</dd>
                      </div>
                    </dl>
                    {task.recommendedSurface.browserRoute ? (
                      <Link href={task.recommendedSurface.browserRoute}>Open surface</Link>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty">No operator task selected.</p>
            )}
          </section>

          <section className="band">
            <div className="sectionHead">
              <h2>Signal Router</h2>
              <span>{report.signalRouter.recommendation}</span>
            </div>
            {report.signalRouter.candidatePackets.length ? (
              <ul className="plainList">
                {report.signalRouter.candidatePackets.map((packet: any) => (
                  <li key={packet.fileName}>
                    <b>{packet.fileName}</b>
                    <span>{packet.packetKind}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No unprocessed signal packet in the current scan window.</p>
            )}
          </section>
        </div>

        <aside className="sideColumn">
          <section className="band">
            <h2>Coverage</h2>
            <dl className="summaryGrid">
              <div>
                <dt>Cards</dt>
                <dd>{numberFmt.format(report.summary.cards)}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{report.summary.emailCoveragePct}%</dd>
              </div>
              <div>
                <dt>Instagram</dt>
                <dd>{report.summary.instagramCoveragePct}%</dd>
              </div>
              <div>
                <dt>Omnichannel</dt>
                <dd>{numberFmt.format(report.summary.omnichannel)}</dd>
              </div>
            </dl>
          </section>

          <section className="band">
            <h2>Source Health</h2>
            <ul className="sourceList">
              {report.sourceHealth.slice(0, 9).map((source) => (
                <li key={source.id}>
                  <span>{source.title}</span>
                  <small>{labelText(source.freshness)} · {labelText(source.trust)}</small>
                </li>
              ))}
            </ul>
          </section>

          <section className="band">
            <h2>Discipline</h2>
            <p>{report.productDiscipline.currentRule}</p>
            <ul className="discipline">
              {report.productDiscipline.whatNotToBuildNext.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
.page {
  min-height: 100vh;
  background: #f7f8fb;
  color: #151821;
  padding: 28px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.topbar {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  max-width: 1280px;
  margin: 0 auto 24px;
}
a {
  color: #2457a6;
  text-decoration: none;
  font-weight: 700;
}
h1, h2, h3, p {
  margin: 0;
}
h1 {
  font-size: 32px;
  line-height: 1.1;
  margin-top: 8px;
}
h2 {
  font-size: 17px;
}
h3 {
  font-size: 15px;
}
.topbar p {
  margin-top: 10px;
  color: #596174;
  max-width: 820px;
}
.state {
  text-align: right;
  white-space: nowrap;
}
.state span {
  display: block;
  font-weight: 800;
}
.state small {
  color: #687085;
}
.metrics {
  max-width: 1280px;
  margin: 0 auto 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.metric, .band {
  background: #fff;
  border: 1px solid #dde3ee;
  border-radius: 8px;
}
.metric {
  padding: 16px;
  min-height: 128px;
}
.metricHead {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5b6475;
  font-size: 13px;
  font-weight: 700;
}
.metric strong {
  display: block;
  font-size: 30px;
  margin-top: 12px;
}
.metric small {
  display: block;
  color: #687085;
  margin-top: 8px;
  line-height: 1.35;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #18a058;
}
.dot.watch {
  background: #c98500;
}
.dot.blocked {
  background: #c93333;
}
.layout {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
}
.mainColumn, .sideColumn {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.band {
  padding: 18px;
}
.sectionHead {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 14px;
}
.sectionHead span {
  color: #596174;
  font-size: 13px;
  font-weight: 700;
}
.taskList {
  display: grid;
  gap: 10px;
}
.task {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px auto;
  gap: 16px;
  align-items: center;
  border-top: 1px solid #e7ebf2;
  padding-top: 12px;
}
.task p {
  color: #596174;
  margin-top: 5px;
  line-height: 1.4;
}
dl {
  margin: 0;
}
.task dl, .summaryGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.summaryGrid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
dt {
  color: #687085;
  font-size: 12px;
}
dd {
  margin: 2px 0 0;
  font-weight: 800;
}
.plainList, .sourceList, .discipline {
  list-style: none;
  padding: 0;
  margin: 0;
}
.plainList li, .sourceList li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #e7ebf2;
  padding: 10px 0;
}
.plainList span, .sourceList small {
  color: #687085;
}
.discipline {
  margin-top: 10px;
}
.discipline li {
  color: #596174;
  padding: 7px 0;
  border-top: 1px solid #e7ebf2;
  line-height: 1.35;
}
.empty {
  color: #687085;
}
.emptyState {
  max-width: 720px;
  margin: 120px auto;
  background: #fff;
  border: 1px solid #dde3ee;
  border-radius: 8px;
  padding: 28px;
}
@media (max-width: 980px) {
  .topbar, .layout {
    display: block;
  }
  .state {
    text-align: left;
    margin-top: 16px;
  }
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .sideColumn {
    margin-top: 16px;
  }
  .task {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 620px) {
  .page {
    padding: 18px;
  }
  .metrics {
    grid-template-columns: 1fr;
  }
}
`;
