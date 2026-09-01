/**
 * ENTORNO DE PRODUCCIÓN
 * -----------------------------------------------------------------------------
 * Angular sustituye este archivo por `environment.development.ts` cuando se
 * compila en modo desarrollo (ver `fileReplacements` en angular.json).
 *
 * Los componentes y servicios NUNCA deben escribir la URL o la clave a mano:
 * siempre las leen de aquí. Así solo hay un sitio que tocar si cambian.
 *
 * Sobre la clave `anon`: es PÚBLICA por diseño en Supabase (viaja al navegador
 * en cualquier aplicación). La protección real de los datos la aporta RLS,
 * definido en `backend/supabase/migraciones/003_politicas_rls.sql`.
 */
export const environment = {
  /** Indica a Angular que estamos en el build optimizado. */
  produccion: true,

  /** URL del proyecto de Supabase. */
  supabaseUrl: 'https://oxehjzkhikhvuedyooih.supabase.co',

  /** Clave pública (anónima) del proyecto. */
  supabaseClaveAnonima:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZWhqemtoaWtodnVlZHlvb2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyOTYwNzIsImV4cCI6MjEwMzg3MjA3Mn0.PC2NqEc4Zcpa0fcQyI5jW6ePnThJtPBlxJj_S8AzCEk',

  /**
   * Usuario que se muestra en el panel.
   * Coincide con el UUID fijado en `backend/supabase/semillas/001_datos_demo.sql`.
   * Cuando se añada Supabase Auth, este valor se sustituirá por `auth.uid()`.
   */
  usuarioDemoId: '11111111-1111-4111-8111-111111111111',

  /** Número de filas por página en la tabla del historial. */
  filasPorPagina: 8,

  /** Días que abarca el gráfico de volumen de pagos. */
  diasGraficoVolumen: 7,
};
