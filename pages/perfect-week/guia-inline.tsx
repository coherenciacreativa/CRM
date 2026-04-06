import { useState, type CSSProperties, type FormEvent } from 'react';

type FormState = {
  name: string;
  email: string;
  whatsapp: string;
  acceptedPrivacy: boolean;
  company: string;
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
  'https://wa.me/5491158172581?text=Hola%20Juana%2C%20vengo%20de%20la%20gu%C3%ADa%20Perfect%20Week%20de%20Coherencia%20Creativa%20y%20quiero%20agendar%20una%20consulta.';

export default function PerfectWeekGuidePage() {
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
      <section style={styles.container}>
        <p style={styles.kicker}>Coherencia Creativa · Guía práctica</p>
        <h1 style={styles.title}>Tu Perfect Week</h1>
        <p style={styles.lead}>
          Una forma simple de recuperar foco, reducir fatiga de decisiones y hacer que lo importante sí pase, sin convertir tu
          vida en una agenda rígida.
        </p>

        <div style={styles.heroCard}>
          <h2 style={styles.h2}>Implementación en 60 minutos</h2>
          <p style={styles.body}>
            Perfect Week no es perfección: es un prototipo semanal para bajar fricción mental y sostener resultados con energía
            real.
          </p>
        </div>

        <h2 style={styles.h2}>Método en 7 pasos</h2>
        <ol style={styles.list}>
          <li>Define 1–3 resultados semanales (tu norte).</li>
          <li>Bloquea primero lo fijo: trabajo, clases, citas, traslados.</li>
          <li>Diseña 2–4 anclas diarias (foco, movimiento, cierre).</li>
          <li>Asigna tema por día para reducir cambio de contexto.</li>
          <li>Ordena tareas por energía (difícil en horas altas).</li>
          <li>Crea buffers y plan B para imprevistos.</li>
          <li>Cierra con Daily Reset + Weekly Review.</li>
        </ol>

        <h2 style={styles.h2}>Reglas que ahorran energía</h2>
        <ul style={styles.list}>
          <li>Primera ancla antes de mensajes.</li>
          <li>Correo/DM en 1–2 ventanas definidas.</li>
          <li>Si cae un bloque, se reubica (sin culpa).</li>
          <li>Cierre diario obligatorio de 10 minutos.</li>
        </ul>

        <div style={styles.ctaCard}>
          <h2 style={{ ...styles.h2, color: '#f4fcfb', marginTop: 0 }}>¿Quieres profundizar y recibir extras por email?</h2>
          <p style={{ ...styles.body, color: '#dff7f3' }}>
            Déjanos tu correo y te enviamos recursos de implementación, checklist semanal y seguimiento gradual.
          </p>
          <a href="#profundizar" style={styles.ctaButton}>
            Sí, quiero profundizar
          </a>
          <a href={JUANA_WHATSAPP_URL} target="_blank" rel="noreferrer" style={styles.ctaLink}>
            Prefiero agendar por WhatsApp
          </a>
        </div>

        <section id="profundizar" style={styles.captureBox}>
          <h2 style={styles.h2}>Profundizar por email</h2>
          <p style={styles.body}>Completa este formulario y recibirás la secuencia de implementación automáticamente.</p>

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
              {submit.loading ? 'Enviando...' : 'Quiero recibir los extras'}
            </button>
          </form>

          {submit.message ? (
            submit.ok ? (
              <div style={styles.successBox}>
                <p style={styles.successTitle}>{submit.message}</p>
                <p style={styles.successCopy}>
                  Revisa tu correo en los próximos <strong>3–5 minutos</strong>. Si no aparece, revisa Promociones/Spam.
                </p>
              </div>
            ) : (
              <p style={{ ...styles.feedback, color: '#b91c1c' }}>{submit.message}</p>
            )
          ) : null}
        </section>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f6f3ec 0%, #eef3f2 100%)',
    padding: '24px 16px 40px',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    color: '#10241f',
  },
  container: {
    maxWidth: '860px',
    margin: '0 auto',
    background: '#fff',
    border: '1px solid #d8e0de',
    borderRadius: '18px',
    boxShadow: '0 14px 36px rgba(15, 35, 31, 0.10)',
    padding: '28px',
  },
  kicker: {
    margin: 0,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 700,
    color: '#1f5b4f',
  },
  title: {
    margin: '8px 0 10px',
    fontSize: '42px',
    lineHeight: 1.05,
    fontFamily: 'Georgia, serif',
    color: '#193833',
  },
  lead: {
    margin: '0 0 16px',
    fontSize: '18px',
    color: '#2b4a44',
    lineHeight: 1.6,
    fontFamily: 'Georgia, serif',
  },
  h2: {
    margin: '20px 0 10px',
    fontSize: '26px',
    lineHeight: 1.2,
    color: '#193833',
    fontFamily: 'Georgia, serif',
  },
  body: {
    margin: 0,
    color: '#294741',
    lineHeight: 1.7,
    fontSize: '16px',
  },
  heroCard: {
    background: 'linear-gradient(130deg, #f5fbfa 0%, #edf7f5 55%, #f6f1e8 100%)',
    border: '1px solid #d8e0de',
    borderRadius: '14px',
    padding: '18px',
  },
  list: {
    margin: '0 0 10px 20px',
    padding: 0,
    color: '#24443e',
    lineHeight: 1.7,
    fontSize: '16px',
  },
  ctaCard: {
    marginTop: '18px',
    background: 'linear-gradient(150deg,#07333F 0%,#124856 45%,#2B9AA2 100%)',
    borderRadius: '14px',
    padding: '18px',
    display: 'grid',
    gap: '10px',
  },
  ctaButton: {
    display: 'inline-block',
    width: 'fit-content',
    borderRadius: '8px',
    background: '#e9f6f2',
    color: '#134e43',
    textDecoration: 'none',
    fontWeight: 700,
    padding: '11px 14px',
    fontSize: '14px',
  },
  ctaLink: {
    color: '#d6f8f3',
    textDecoration: 'underline',
    fontSize: '14px',
    width: 'fit-content',
  },
  captureBox: {
    marginTop: '22px',
    border: '1px solid #cfe0dc',
    background: '#fbfdfc',
    borderRadius: '14px',
    padding: '16px',
  },
  form: {
    marginTop: '12px',
    display: 'grid',
    gap: '12px',
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
    background: '#fff',
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
    marginTop: '12px',
    fontSize: '14px',
    lineHeight: 1.4,
  },
  successBox: {
    marginTop: '12px',
    borderRadius: '12px',
    border: '1px solid #b8d6cc',
    background: '#f3faf7',
    padding: '12px',
  },
  successTitle: {
    margin: '0 0 6px',
    color: '#0f513f',
    fontSize: '14px',
    fontWeight: 700,
  },
  successCopy: {
    margin: 0,
    color: '#245247',
    fontSize: '13px',
    lineHeight: 1.4,
  },
};
