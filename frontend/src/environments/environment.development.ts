/**
 * ENTORNO DE DESARROLLO
 * -----------------------------------------------------------------------------
 * Este archivo REEMPLAZA a `environment.ts` cuando se ejecuta `ng serve`
 * (configuración `development` de angular.json).
 *
 * Mantiene las mismas claves porque el proyecto de Supabase es el mismo;
 * si algún día hubiera un proyecto de pruebas independiente, se cambiarían
 * aquí sin tocar el código de la aplicación.
 */
export const environment = {
  /** En desarrollo mostramos trazas y no optimizamos. */
  produccion: false,

  supabaseUrl: 'https://oxehjzkhikhvuedyooih.supabase.co',

  supabaseClaveAnonima:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZWhqemtoaWtodnVlZHlvb2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyOTYwNzIsImV4cCI6MjEwMzg3MjA3Mn0.PC2NqEc4Zcpa0fcQyI5jW6ePnThJtPBlxJj_S8AzCEk',

  usuarioDemoId: '11111111-1111-4111-8111-111111111111',

  filasPorPagina: 8,

  diasGraficoVolumen: 7,
};
