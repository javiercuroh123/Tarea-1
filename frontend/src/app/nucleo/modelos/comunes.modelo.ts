/**
 * TIPOS COMUNES
 * -----------------------------------------------------------------------------
 * Tipos que se comparten entre varios modelos. Tenerlos en un archivo aparte
 * evita importaciones circulares entre modelos.
 */

/** Estados posibles de una transacción o transferencia (enum `estado_transaccion` en SQL). */
export type EstadoTransaccion = 'completada' | 'pendiente' | 'fallida';

/** Dirección del dinero (enum `tipo_transaccion` en SQL). */
export type TipoTransaccion = 'ingreso' | 'egreso';

/** Códigos de moneda admitidos por la aplicación (ISO 4217). */
export type CodigoMoneda = 'EUR' | 'USD' | 'GBP' | 'PEN';

/**
 * Resultado paginado genérico.
 * `T` es el tipo de cada elemento (Transaccion, Contacto...).
 */
export interface ResultadoPaginado<T> {
  /** Elementos de la página actual. */
  elementos: T[];
  /** Total de elementos que cumplen el filtro (no solo los de esta página). */
  total: number;
  /** Página actual, empezando en 1. */
  pagina: number;
  /** Elementos por página. */
  tamanoPagina: number;
  /** Número total de páginas. */
  totalPaginas: number;
}

/**
 * Estado de una petición asíncrona.
 * Los componentes lo usan para decidir si pintan el esqueleto de carga,
 * el error o los datos.
 */
export type EstadoCarga = 'inactivo' | 'cargando' | 'listo' | 'error';

/** Símbolo que corresponde a cada moneda, para pintarlo en la interfaz. */
export const SIMBOLOS_MONEDA: Record<CodigoMoneda, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  PEN: 'S/',
};

/** Etiqueta legible (en español) de cada estado, para mostrar en pantalla. */
export const ETIQUETAS_ESTADO: Record<EstadoTransaccion, string> = {
  completada: 'Completada',
  pendiente: 'Pendiente',
  fallida: 'Fallida',
};
