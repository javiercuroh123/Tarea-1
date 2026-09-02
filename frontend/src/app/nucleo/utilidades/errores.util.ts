import { environment } from '../../../environments/environment';

/**
 * UTILIDADES DE ERRORES
 * -----------------------------------------------------------------------------
 * Centraliza cómo convertimos un error técnico (de Supabase, de red o de
 * JavaScript) en un mensaje que una persona pueda entender.
 */

/** Mensajes conocidos de PostgREST traducidos al castellano. */
const TRADUCCIONES: ReadonlyArray<{ patron: RegExp; mensaje: string }> = [
  {
    patron: /schema cache|does not exist|Could not find the table/i,
    mensaje:
      'La tabla no existe todavía. Ejecuta los archivos SQL de la carpeta backend/ en el editor SQL de Supabase.',
  },
  {
    patron: /row-level security|violates row-level security policy/i,
    mensaje: 'La política de seguridad (RLS) ha bloqueado la operación.',
  },
  {
    patron: /duplicate key value/i,
    mensaje: 'Ya existe un registro con esos datos.',
  },
  {
    patron: /violates foreign key constraint/i,
    mensaje: 'El registro está relacionado con otros datos y no se puede guardar así.',
  },
  {
    patron: /violates check constraint/i,
    mensaje: 'Alguno de los valores introducidos no es válido.',
  },
  {
    patron: /Failed to fetch|NetworkError|ERR_INTERNET/i,
    mensaje: 'No hay conexión con el servidor. Comprueba tu red.',
  },
  {
    patron: /Invalid API key/i,
    mensaje: 'La clave de Supabase no es válida. Revisa environment.ts.',
  },
  {
    patron: /Email not confirmed/i,
    mensaje: 'Este correo no ha sido confirmado aún en Supabase.',
  },
  {
    patron: /Invalid login credentials/i,
    mensaje: 'Correo o contraseña incorrectos.',
  },
  {
    patron: /User already registered/i,
    mensaje: 'Ya existe una cuenta registrada con este correo.',
  },
];

/**
 * Convierte cualquier error en un texto apto para mostrar al usuario.
 *
 * @param error       Error capturado (puede ser de cualquier forma).
 * @param porDefecto  Mensaje a usar si no reconocemos el error.
 */
export function mensajeDeError(error: unknown, porDefecto = 'Ha ocurrido un error inesperado.'): string {
  // Extraemos el texto del error sea cual sea su forma.
  const texto =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';

  if (!texto) {
    return porDefecto;
  }

  // Buscamos una traducción conocida.
  const traduccion = TRADUCCIONES.find((t) => t.patron.test(texto));
  if (traduccion) {
    return traduccion.mensaje;
  }

  // En desarrollo devolvemos el mensaje original: ayuda a depurar.
  return environment.produccion ? porDefecto : texto;
}

/**
 * Registra el error en la consola solo en desarrollo, para no ensuciar la
 * consola del usuario final en producción.
 */
export function registrarError(contexto: string, error: unknown): void {
  if (!environment.produccion) {
    console.error(`[${contexto}]`, error);
  }
}
