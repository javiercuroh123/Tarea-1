/**
 * NOTIFICACIÓN — espejo de la tabla `public.notificaciones`.
 * Alimenta la campana del encabezado.
 */
export interface Notificacion {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string | null;
  leida: boolean;
  creado_en: string;
}

/**
 * AVISO EMERGENTE (toast) — objeto que vive SOLO en el navegador.
 * No existe en la base de datos: es la confirmación breve que aparece en la
 * esquina cuando una acción termina bien o mal.
 */
export interface Aviso {
  /** Identificador interno para poder cerrarlo. */
  id: number;
  /** Determina el color e icono del aviso. */
  tipo: 'exito' | 'error' | 'info';
  /** Texto que se muestra. */
  texto: string;
}
