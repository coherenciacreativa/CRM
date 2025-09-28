# Extracción de Nombre y Ubicación (IG + DM)

- **Nombre (prioridad)**: `full_name` de Instagram (payload) → heurísticas de DM (“me llamo…”) → username IG normalizado → local-part del correo.
- **Ubicación por DM**: detecta frases como “estoy en… / la ciudad de …”, limpia conectores y aplica fuzzy matching (Levenshtein ≤ 0.3) contra un gazetteer base (Colombia + capitales LATAM).
- **Reglas**:
  - Se aplica `sanitizeName` y el filtro anti-placeholder antes de persistir/envíar a MailerLite.
  - Sólo enviamos `fields` presentes a MailerLite (no placeholders, no sobrescrituras vacías).
  - En Supabase se actualiza name/city/country sólo si no existían (vía patch seguro por email).

Estos criterios garantizan que el IG `full_name` prevalezca, DM aporten contexto y los triggers en MailerLite reciban ciudad/país limpios.
