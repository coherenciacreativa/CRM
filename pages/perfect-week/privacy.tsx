import type { CSSProperties } from 'react';

export default function PerfectWeekPrivacyPage() {
  return (
    <main style={styles.main}>
      <article style={styles.card}>
        <h1 style={styles.title}>Política de privacidad — Perfect Week</h1>
        <p style={styles.meta}>Última actualización: 03 de marzo de 2026</p>

        <p>
          En esta página recopilamos únicamente la información necesaria para gestionar tu interés en Perfect Week:
          nombre, correo electrónico y, si decides compartirlo, número de WhatsApp.
        </p>

        <h2 style={styles.heading}>1. Responsable del tratamiento</h2>
        <p>
          Responsable: <strong>Alejandro Gómez</strong>. Usamos estos datos para enviarte información del programa,
          acceso a recursos y comunicaciones relacionadas con tu registro.
        </p>

        <h2 style={styles.heading}>2. Finalidad</h2>
        <ul>
          <li>Gestionar tu registro de interés en Perfect Week.</li>
          <li>Enviar mensajes de onboarding y comunicaciones del lanzamiento.</li>
          <li>Dar seguimiento por email y (opcionalmente) WhatsApp.</li>
        </ul>

        <h2 style={styles.heading}>3. Plataforma de envío</h2>
        <p>
          Tus datos se almacenan y procesan en <strong>MailerLite</strong> para automatizaciones de comunicación. No se
          venden a terceros.
        </p>

        <h2 style={styles.heading}>4. Conservación de datos</h2>
        <p>
          Conservamos la información mientras exista una base legítima para la comunicación o hasta que solicites la
          eliminación.
        </p>

        <h2 style={styles.heading}>5. Tus derechos</h2>
        <p>
          Puedes solicitar acceso, actualización o eliminación de tus datos respondiendo a cualquier correo recibido
          desde Perfect Week.
        </p>

        <h2 style={styles.heading}>6. Contacto</h2>
        <p>Si tienes dudas sobre esta política, responde al correo de bienvenida y te ayudamos.</p>

        <p>
          <a href="/perfect-week" style={styles.link}>
            ← Volver a Perfect Week
          </a>
        </p>
      </article>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: '100vh',
    padding: '24px',
    background: '#f8fafc',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  },
  card: {
    maxWidth: '760px',
    margin: '0 auto',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '28px',
    lineHeight: 1.6,
    color: '#0f172a',
  },
  title: {
    marginTop: 0,
    marginBottom: '4px',
    fontSize: '30px',
  },
  meta: {
    marginTop: 0,
    color: '#64748b',
    fontSize: '14px',
  },
  heading: {
    marginTop: '22px',
    marginBottom: '6px',
    fontSize: '20px',
  },
  link: {
    color: '#4338ca',
    textDecoration: 'underline',
    fontWeight: 600,
  },
};
