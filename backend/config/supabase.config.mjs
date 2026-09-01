/**
 * CONFIGURACIÓN DE CONEXIÓN A SUPABASE (lado backend / scripts)
 * -----------------------------------------------------------------------------
 * Los scripts de esta carpeta usan estos valores para hablar con la API REST
 * de Supabase.
 *
 * Nota sobre seguridad:
 *  - La clave `anon` es PÚBLICA por diseño: viaja al navegador en cualquier app
 *    de Supabase. Quien protege los datos es RLS (ver 003_politicas_rls.sql),
 *    no el secreto de la clave.
 *  - La clave `service_role` SÍ es secreta y NUNCA debe aparecer en el código
 *    ni en el frontend. Si la necesitas para tareas administrativas, pásala
 *    por variable de entorno.
 */

export const configuracionSupabase = {
  /** URL del proyecto de Supabase. */
  url: process.env['SUPABASE_URL'] ?? 'https://oxehjzkhikhvuedyooih.supabase.co',

  /** Clave pública (anónima) usada por el frontend y por estos scripts. */
  claveAnonima:
    process.env['SUPABASE_ANON_KEY'] ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZWhqemtoaWtodnVlZHlvb2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyOTYwNzIsImV4cCI6MjEwMzg3MjA3Mn0.PC2NqEc4Zcpa0fcQyI5jW6ePnThJtPBlxJj_S8AzCEk',

  /** Identificador del usuario de demostración creado por la semilla. */
  usuarioDemoId: '11111111-1111-4111-8111-111111111111',
};
