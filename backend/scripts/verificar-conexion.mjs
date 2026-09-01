/**
 * SCRIPT: verificar-conexion.mjs
 * -----------------------------------------------------------------------------
 * Comprueba que la base de datos de Supabase está correctamente instalada:
 *   1. Que el proyecto responde.
 *   2. Que existen todas las tablas y la vista.
 *   3. Cuántas filas tiene cada una.
 *   4. Que las funciones RPC responden.
 *
 * Uso:  node scripts/verificar-conexion.mjs     (desde la carpeta backend/)
 *       npm run verificar
 *
 * No necesita dependencias: usa el `fetch` nativo de Node 18+.
 */

import { configuracionSupabase } from '../config/supabase.config.mjs';

const { url, claveAnonima, usuarioDemoId } = configuracionSupabase;

/** Cabeceras obligatorias en toda llamada a la API REST de Supabase. */
const cabeceras = {
  apikey: claveAnonima,
  Authorization: `Bearer ${claveAnonima}`,
  'Content-Type': 'application/json',
};

/** Tablas y vistas que deberían existir tras ejecutar las migraciones. */
const RECURSOS = [
  'usuarios',
  'contactos',
  'comercios',
  'transacciones',
  'tasas_cambio',
  'transferencias',
  'notificaciones',
  'vista_transacciones_detalle',
];

/** Colores ANSI para que el resultado se lea cómodo en la terminal. */
const verde = (t) => `\x1b[32m${t}\x1b[0m`;
const rojo = (t) => `\x1b[31m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

/**
 * Cuenta las filas de una tabla usando la cabecera Prefer: count=exact,
 * que hace que PostgREST devuelva el total en Content-Range.
 */
async function contarFilas(recurso) {
  const respuesta = await fetch(`${url}/rest/v1/${recurso}?select=id&limit=1`, {
    headers: { ...cabeceras, Prefer: 'count=exact' },
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => ({}));
    return { ok: false, mensaje: detalle.message ?? `HTTP ${respuesta.status}` };
  }

  // Content-Range llega con el formato "0-0/25"; el total va tras la barra.
  const rango = respuesta.headers.get('content-range') ?? '';
  const total = rango.split('/')[1] ?? '?';
  return { ok: true, total };
}

/** Llama a una función RPC y devuelve su resultado. */
async function llamarRpc(nombre, cuerpo) {
  const respuesta = await fetch(`${url}/rest/v1/rpc/${nombre}`, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify(cuerpo),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => ({}));
    return { ok: false, mensaje: detalle.message ?? `HTTP ${respuesta.status}` };
  }

  return { ok: true, datos: await respuesta.json() };
}

async function principal() {
  console.log('\n=========================================');
  console.log('  VERIFICACIÓN DE LA BASE DE DATOS');
  console.log('=========================================');
  console.log(gris(`Proyecto: ${url}\n`));

  let errores = 0;

  // --- 1. Tablas y vistas --------------------------------------------------
  console.log('Tablas y vistas');
  console.log(gris('-----------------------------------------'));

  for (const recurso of RECURSOS) {
    const resultado = await contarFilas(recurso);
    const etiqueta = recurso.padEnd(30, '.');

    if (resultado.ok) {
      console.log(`  ${verde('OK')}    ${etiqueta} ${resultado.total} fila(s)`);
    } else {
      errores++;
      console.log(`  ${rojo('FALLA')} ${etiqueta} ${rojo(resultado.mensaje)}`);
    }
  }

  // --- 2. Funciones RPC ----------------------------------------------------
  console.log('\nFunciones RPC');
  console.log(gris('-----------------------------------------'));

  const volumen = await llamarRpc('fn_volumen_pagos', {
    p_usuario: usuarioDemoId,
    p_dias: 7,
  });
  if (volumen.ok) {
    console.log(`  ${verde('OK')}    fn_volumen_pagos.............. ${volumen.datos.length} día(s)`);
  } else {
    errores++;
    console.log(`  ${rojo('FALLA')} fn_volumen_pagos.............. ${rojo(volumen.mensaje)}`);
  }

  const resumen = await llamarRpc('fn_resumen_usuario', { p_usuario: usuarioDemoId });
  if (resumen.ok) {
    const fila = resumen.datos[0] ?? {};
    console.log(`  ${verde('OK')}    fn_resumen_usuario............ saldo: ${fila.saldo ?? 0}`);
  } else {
    errores++;
    console.log(`  ${rojo('FALLA')} fn_resumen_usuario............ ${rojo(resumen.mensaje)}`);
  }

  // --- 3. Conclusión -------------------------------------------------------
  console.log('\n=========================================');
  if (errores === 0) {
    console.log(verde('  TODO CORRECTO: la base de datos está lista.'));
  } else {
    console.log(rojo(`  ${errores} comprobación(es) fallida(s).`));
    console.log(gris('  Revisa que hayas ejecutado, en orden:'));
    console.log(gris('    supabase/migraciones/001_esquema_inicial.sql'));
    console.log(gris('    supabase/migraciones/002_vistas_y_funciones.sql'));
    console.log(gris('    supabase/migraciones/003_politicas_rls.sql'));
    console.log(gris('    supabase/semillas/001_datos_demo.sql'));
  }
  console.log('=========================================\n');

  // Código de salida distinto de 0 para poder usarlo en integración continua.
  process.exit(errores === 0 ? 0 : 1);
}

principal().catch((error) => {
  console.error(rojo('\nError inesperado:'), error.message);
  process.exit(1);
});
