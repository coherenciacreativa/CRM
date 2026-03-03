import { useState, type CSSProperties, type FormEvent } from 'react';

type FormState = {
  name: string;
  email: string;
  whatsapp: string;
  acceptedPrivacy: boolean;
  company: string; // honeypot
};

type SubmitState = {
  loading: boolean;
  ok: boolean;
  message: string;
};

const initialForm: FormState = {
  name: '',
  email: '',
  whatsapp: '',
  acceptedPrivacy: false,
  company: '',
};

const initialSubmit: SubmitState = {
  loading: false,
  ok: false,
  message: '',
};

const JUANA_WHATSAPP_URL =
  'https://wa.me/5491158172581?text=Hola%20Juana%2C%20acabo%20de%20registrarme%20en%20Perfect%20Week%20y%20quiero%20saber%20el%20siguiente%20paso.';

export default function PerfectWeekPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submit, setSubmit] = useState<SubmitState>(initialSubmit);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmit({ loading: true, ok: false, message: '' });

    try {
      const response = await fetch('/api/perfect-week/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !data.ok) {
        setSubmit({
          loading: false,
          ok: false,
          message: data?.message || 'No pudimos procesar tu registro. Intenta de nuevo.',
        });
        return;
      }

      setSubmit({
        loading: false,
        ok: true,
        message: data?.message || '¡Listo! Ya estás dentro de Perfect Week.',
      });
      setForm(initialForm);
    } catch {
      setSubmit({
        loading: false,
        ok: false,
        message: 'Tuvimos un problema técnico. Intenta de nuevo en unos minutos.',
      });
    }
  };

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <div style={styles.brandRow}>
          <p style={styles.kicker}>Coherencia Creativa · Perfect Week</p>
          <a href="https://coherenciacreativa.com" target="_blank" rel="noreferrer" style={styles.brandLink}>
            coherenciacreativa.com
          </a>
        </div>

        <h1 style={styles.title}>Diseña una semana con claridad, foco y bienestar real.</h1>
        <p style={styles.description}>
          Únete a Perfect Week y recibe una guía práctica para organizar tu energía, tus prioridades y tu agenda sin perder tu
          centro.
        </p>

        <p style={styles.microTrust}>
          Enfoque humano + método práctico + acompañamiento real para sostener resultados.
        </p>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Nombre
            <input
              style={styles.input}
              type="text"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              minLength={2}
              maxLength={120}
            />
          </label>

          <label style={styles.label}>
            Correo electrónico
            <input
              style={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>

          <label style={styles.label}>
            WhatsApp (opcional)
            <input
              style={styles.input}
              type="tel"
              name="whatsapp"
              autoComplete="tel"
              value={form.whatsapp}
              onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
              placeholder="+57 300 123 4567"
            />
          </label>

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.acceptedPrivacy}
              onChange={(event) => setForm((prev) => ({ ...prev, acceptedPrivacy: event.target.checked }))}
              required
            />
            <span>
              Acepto la{' '}
              <a href="/perfect-week/privacy" target="_blank" rel="noreferrer" style={styles.link}>
                política de privacidad
              </a>
              .
            </span>
          </label>

          <input
            type="text"
            name="company"
            value={form.company}
            onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={styles.honeypot}
          />

          <button type="submit" style={styles.button} disabled={submit.loading}>
            {submit.loading ? 'Enviando...' : 'Quiero unirme a Perfect Week'}
          </button>
        </form>

        {submit.message ? (
          submit.ok ? (
            <div style={styles.successBox}>
              <p style={styles.successTitle}>{submit.message}</p>
              <p style={styles.successCopy}>
                Revisa tu correo en los próximos <strong>3–5 minutos</strong>. Si no aparece, revisa Promociones/Spam.
              </p>
              <p style={styles.successCopy}>Te llegará el recurso inicial y luego la secuencia de onboarding.</p>
              <a href={JUANA_WHATSAPP_URL} target="_blank" rel="noreferrer" style={styles.successCta}>
                Hablar con Juana por WhatsApp
              </a>
            </div>
          ) : (
            <p style={{ ...styles.feedback, color: '#b91c1c' }}>{submit.message}</p>
          )
        ) : null}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: '24px',
    background: 'linear-gradient(180deg, #f6f3ec 0%, #eef3f2 100%)',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '620px',
    background: '#fff',
    borderRadius: '18px',
    border: '1px solid #d8e0de',
    boxShadow: '0 14px 36px rgba(15, 35, 31, 0.10)',
    padding: '30px',
  },
  brandRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  kicker: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#1f5b4f',
  },
  brandLink: {
    fontSize: '12px',
    color: '#3f6f66',
    textDecoration: 'none',
  },
  title: {
    margin: '10px 0 10px',
    fontSize: '34px',
    lineHeight: 1.15,
    color: '#10241f',
  },
  description: {
    margin: '0 0 8px',
    color: '#294741',
    lineHeight: 1.55,
    fontSize: '16px',
  },
  microTrust: {
    margin: '0 0 22px',
    color: '#4c6962',
    fontSize: '13px',
  },
  form: {
    display: 'grid',
    gap: '14px',
  },
  label: {
    display: 'grid',
    gap: '6px',
    fontSize: '14px',
    color: '#1e293b',
  },
  input: {
    border: '1px solid #bdd0cb',
    borderRadius: '10px',
    padding: '11px 12px',
    fontSize: '15px',
    background: '#fbfdfc',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '13px',
    color: '#35554f',
    marginTop: '4px',
  },
  link: {
    color: '#245d52',
    textDecoration: 'underline',
  },
  honeypot: {
    position: 'absolute',
    left: '-99999px',
    opacity: 0,
    pointerEvents: 'none',
  },
  button: {
    marginTop: '6px',
    border: 0,
    borderRadius: '10px',
    background: '#134e43',
    color: '#fff',
    padding: '12px 14px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  feedback: {
    marginTop: '14px',
    fontSize: '14px',
    lineHeight: 1.4,
  },
  successBox: {
    marginTop: '16px',
    borderRadius: '12px',
    border: '1px solid #b8d6cc',
    background: '#f3faf7',
    padding: '14px 14px 12px',
  },
  successTitle: {
    margin: '0 0 8px',
    color: '#0f513f',
    fontSize: '14px',
    fontWeight: 700,
  },
  successCopy: {
    margin: '0 0 6px',
    color: '#245247',
    fontSize: '13px',
    lineHeight: 1.4,
  },
  successCta: {
    marginTop: '8px',
    display: 'inline-block',
    color: '#0f513f',
    background: '#d9efe7',
    border: '1px solid #9ecbbd',
    padding: '8px 10px',
    borderRadius: '9px',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
