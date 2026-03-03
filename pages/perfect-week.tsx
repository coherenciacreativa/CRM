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
        message: data?.message || '¡Listo! Te enviamos los siguientes pasos por correo.',
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
        <p style={styles.kicker}>Perfect Week</p>
        <h1 style={styles.title}>Diseña tu semana perfecta, con enfoque y calma.</h1>
        <p style={styles.description}>
          Déjanos tus datos para enviarte acceso prioritario, recursos y próximos pasos del lanzamiento.
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
          <p style={{ ...styles.feedback, color: submit.ok ? '#065f46' : '#b91c1c' }}>{submit.message}</p>
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
    background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '560px',
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
    padding: '28px',
  },
  kicker: {
    margin: 0,
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#6366f1',
  },
  title: {
    margin: '8px 0 10px',
    fontSize: '30px',
    lineHeight: 1.15,
    color: '#0f172a',
  },
  description: {
    margin: '0 0 20px',
    color: '#334155',
    lineHeight: 1.5,
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
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '15px',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '13px',
    color: '#334155',
    marginTop: '4px',
  },
  link: {
    color: '#4338ca',
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
    background: '#4f46e5',
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
};
