import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const carpetaBackend = join(dirname(fileURLToPath(import.meta.url)), '..');

const ARCHIVOS = [
  'supabase/migraciones/001_esquema_inicial.sql',
  'supabase/migraciones/002_vistas_y_funciones.sql',
  'supabase/migraciones/003_politicas_rls.sql',
  'supabase/semillas/001_datos_demo.sql',
];

const DESTINO = 'supabase/instalacion_completa.sql';

async function principal() {
  const partes = [];

  for (const relativo of ARCHIVOS) {
    const contenido = await readFile(join(carpetaBackend, relativo), 'utf8');

    partes.push('', contenido, '');
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
