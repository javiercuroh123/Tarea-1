/**
 * SCRIPT: generar-sql-completo.mjs
 * -----------------------------------------------------------------------------
 * Une las tres migraciones y la semilla en un único archivo:
 *
 *      backend/supabase/instalacion_completa.sql
 *
 * Así puedes copiar y pegar UN solo bloque en el editor SQL de Supabase
 * en lugar de abrir cuatro archivos.
 *
 * Uso:  node scripts/generar-sql-completo.mjs   (desde la carpeta backend/)
 *       npm run sql
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Ruta de la carpeta backend/ (este archivo vive en backend/scripts/).
const carpetaBackend = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Archivos a concatenar, EN ORDEN DE EJECUCIÓN. */
const ARCHIVOS = [
  'supabase/migraciones/001_esquema_inicial.sql',
  'supabase/migraciones/002_vistas_y_funciones.sql',
  'supabase/migraciones/003_politicas_rls.sql',
  'supabase/semillas/001_datos_demo.sql',
];

const DESTINO = 'supabase/instalacion_completa.sql';

async function principal() {
  const partes = [
    '-- ############################################################################',
    '-- INSTALACIÓN COMPLETA DE LA BASE DE DATOS DE PAYLINE',
    '-- Archivo GENERADO automáticamente por scripts/generar-sql-completo.mjs',
    '-- No lo edites a mano: modifica los archivos originales y vuelve a generarlo.',
    `-- Generado el ${new Date().toISOString()}`,
    '-- ############################################################################',
    '',
  ];

  for (const relativo of ARCHIVOS) {
    const contenido = await readFile(join(carpetaBackend, relativo), 'utf8');

    partes.push(
      '',
      '-- ////////////////////////////////////////////////////////////////////////',
      `-- INICIO DE: ${relativo}`,
      '-- ////////////////////////////////////////////////////////////////////////',
      '',
      contenido,
      '',
      `-- FIN DE: ${relativo}`,
      '',
    );
  }

  const rutaDestino = join(carpetaBackend, DESTINO);
  await writeFile(rutaDestino, partes.join('\n'), 'utf8');

  console.log(`\x1b[32mGenerado:\x1b[0m ${DESTINO}`);
  console.log(`Archivos unidos: ${ARCHIVOS.length}`);
}

principal().catch((error) => {
  console.error('\x1b[31mError al generar el SQL:\x1b[0m', error.message);
  process.exit(1);
});
