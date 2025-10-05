import { useEffect, useMemo, useState } from 'react';

type ContactSummary = {
  id: string;
  name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  instagram_username?: string | null;
  updated_at?: string | null;
};

type ContactDetails = {
  ok: boolean;
  contact?: Record<string, unknown>;
  interactions?: Array<Record<string, unknown>>;
  mailerlite?: Record<string, unknown> | null;
  error?: string;
};

const formatDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const buildDisplayName = (contact: ContactSummary) => {
  if (contact.name) return contact.name;
  const pieces = [contact.first_name, contact.last_name].filter(Boolean);
  if (pieces.length) return pieces.join(' ');
  return contact.email ?? 'Sin nombre';
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ContactSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<ContactDetails | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!debounced || debounced.length < 2) {
      setResults([]);
      setSelectedId(null);
      setDetails(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/search-contact?q=${encodeURIComponent(debounced)}`);
        const data = await response.json();
        if (!cancelled) {
          if (data?.ok) {
            setResults(data.matches ?? []);
          } else {
            setError('No pudimos buscar. Intenta de nuevo.');
            setResults([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Error de conexión.');
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    if (!selectedId) {
      setDetails(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setDetailLoading(true);
        const response = await fetch(`/api/contact-details?id=${encodeURIComponent(selectedId)}`);
        const data: ContactDetails = await response.json();
        if (!cancelled) {
          setDetails(data);
        }
      } catch (err) {
        if (!cancelled) {
          setDetails({ ok: false, error: 'detail_failed' });
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedContact = useMemo(
    () => results.find((item) => item.id === selectedId) ?? null,
    [results, selectedId],
  );

  return (
    <div className="container">
      <header>
        <h1>CRM Lookup</h1>
        <p>Busca por nombre o correo y consulta los detalles rápidamente.</p>
      </header>

      <section className="search-box">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Escribe nombre o correo…"
          autoFocus
        />
        {loading ? <span className="hint">Buscando…</span> : <span className="hint">{results.length} resultados</span>}
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="results">
        {results.map((contact) => (
          <button
            key={contact.id}
            className={`result ${selectedId === contact.id ? 'active' : ''}`}
            onClick={() => setSelectedId(contact.id)}
          >
            <span className="name">{buildDisplayName(contact)}</span>
            <span className="meta">
              {contact.email ? contact.email : 'Sin email'}
              {contact.city || contact.country ? ` • ${[contact.city, contact.country].filter(Boolean).join(', ')}` : ''}
            </span>
          </button>
        ))}
        {!loading && debounced && !results.length ? <p className="empty">No encontramos coincidencias.</p> : null}
      </section>

      <section className="details">
        {detailLoading ? <p className="loading">Cargando detalles…</p> : null}
        {!detailLoading && details?.ok && details.contact ? (
          <div className="detail-card">
            <h2>
              {buildDisplayName(
                selectedContact ?? {
                  id: String(((details.contact as { id?: string })?.id ?? selectedId ?? '')),
                  name: (details.contact as { name?: string | null })?.name ?? null,
                  first_name: (details.contact as { first_name?: string | null })?.first_name ?? null,
                  last_name: (details.contact as { last_name?: string | null })?.last_name ?? null,
                  email: (details.contact as { email?: string | null })?.email ?? null,
                  phone: (details.contact as { phone?: string | null })?.phone ?? null,
                  city: (details.contact as { city?: string | null })?.city ?? null,
                  country: (details.contact as { country?: string | null })?.country ?? null,
                  instagram_username: (details.contact as { instagram_username?: string | null })?.instagram_username ?? null,
                  updated_at: (details.contact as { updated_at?: string | null })?.updated_at ?? null,
                },
              )}
            </h2>
            <div className="grid">
              {Object.entries(details.contact as Record<string, unknown>)
                .filter(([key]) =>
                  ['email', 'phone', 'city', 'country', 'instagram_username', 'ig_user_id', 'created_at', 'updated_at', 'lead_status', 'notes'].includes(key),
                )
                .map(([key, value]) => (
                  <div key={key} className="field">
                    <span className="label">{key.replace(/_/g, ' ')}</span>
                    <span className="value">{key.endsWith('_at') ? formatDate(value) : String(value ?? '—')}</span>
                  </div>
                ))}
            </div>

            <div className="subsection">
              <h3>Interacciones recientes</h3>
              {details.interactions && details.interactions.length ? (
                <ul>
                  {details.interactions.map((interaction, index) => {
                    const content = (interaction as Record<string, unknown>).content;
                    const extractedEmail = (interaction as Record<string, unknown>).extracted_email;
                    return (
                      <li key={index}>
                        <strong>{formatDate((interaction as Record<string, unknown>).occurred_at)}</strong>
                        <div>{content ? String(content) : '—'}</div>
                        {extractedEmail ? (
                          <div className="tag">Email detectado: {String(extractedEmail)}</div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted">Sin interacciones registradas.</p>
              )}
            </div>

            <div className="subsection">
              <h3>MailerLite</h3>
              {details.mailerlite && !(details.mailerlite as { error?: boolean }).error ? (
                <div className="grid">
                  <div className="field">
                    <span className="label">Estado</span>
                    <span className="value">{String((details.mailerlite as Record<string, unknown>)?.status ?? '—')}</span>
                  </div>
                  <div className="field">
                    <span className="label">Actualizado</span>
                    <span className="value">{formatDate((details.mailerlite as Record<string, unknown>)?.updated_at)}</span>
                  </div>
                  <div className="field">
                    <span className="label">Grupos</span>
                    <span className="value">
                      {Array.isArray((details.mailerlite as Record<string, unknown>)?.groups) &&
                      (details.mailerlite as { groups?: Array<{ name?: string }> }).groups
                        ? (details.mailerlite as { groups?: Array<{ name?: string }> }).groups!.length
                          ? (details.mailerlite as { groups?: Array<{ name?: string }> }).groups!
                              .map((group) => group?.name)
                              .filter(Boolean)
                              .join(', ')
                          : 'Sin grupos'
                        : 'Sin grupos'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="muted">No encontramos información en MailerLite.</p>
              )}
            </div>
          </div>
        ) : null}

        {!detailLoading && details && !details.ok ? (
          <p className="error">No pudimos cargar los detalles.</p>
        ) : null}
      </section>

      <style jsx>{`
        .container {
          max-width: 960px;
          margin: 0 auto;
          padding: 1.5rem 1rem 4rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        h1 {
          margin: 0;
          font-size: 2rem;
        }
        .search-box {
          position: sticky;
          top: 0;
          background: #fff;
          padding: 0.5rem 0 1rem;
          z-index: 10;
        }
        input[type='search'] {
          width: 100%;
          padding: 0.9rem 1rem;
          border-radius: 12px;
          border: 1px solid #d0d5dd;
          font-size: 1rem;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        }
        input[type='search']:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
        }
        .hint {
          display: inline-block;
          margin-top: 0.35rem;
          font-size: 0.85rem;
          color: #475467;
        }
        .error {
          color: #b42318;
          margin-top: 0.5rem;
        }
        .results {
          display: grid;
          gap: 0.5rem;
          margin: 1rem 0 2rem;
        }
        .result {
          text-align: left;
          border: 1px solid #e4e7ec;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          background: #fff;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }
        .result:hover {
          border-color: #2563eb;
        }
        .result.active {
          border-color: #2563eb;
          background: #eff4ff;
        }
        .result .name {
          font-weight: 600;
          color: #111827;
        }
        .result .meta {
          font-size: 0.9rem;
          color: #475467;
        }
        .empty {
          color: #475467;
        }
        .details {
          margin-bottom: 4rem;
        }
        .detail-card {
          border: 1px solid #e4e7ec;
          border-radius: 16px;
          padding: 1.5rem;
          background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
          box-shadow: 0 8px 16px rgba(15, 23, 42, 0.1);
        }
        .detail-card h2 {
          margin-top: 0;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .field {
          background: #fff;
          border-radius: 12px;
          padding: 0.75rem 0.9rem;
          box-shadow: inset 0 0 0 1px #e4e7ec;
        }
        .label {
          display: block;
          text-transform: uppercase;
          font-size: 0.7rem;
          color: #475467;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }
        .value {
          font-size: 0.95rem;
          color: #1d2939;
        }
        .subsection {
          margin-bottom: 1.75rem;
        }
        .subsection h3 {
          margin-bottom: 0.75rem;
          font-size: 1.05rem;
        }
        ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.75rem;
        }
        li {
          background: #fff;
          border-radius: 12px;
          padding: 0.75rem 0.9rem;
          box-shadow: inset 0 0 0 1px #e4e7ec;
        }
        .tag {
          margin-top: 0.25rem;
          font-size: 0.8rem;
          color: #2563eb;
        }
        .muted {
          color: #475467;
        }
        .loading {
          color: #2563eb;
        }
        @media (max-width: 640px) {
          .container {
            padding: 1rem 0.75rem 3rem;
          }
          header h1 {
            font-size: 1.6rem;
          }
          .detail-card {
            padding: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
}
