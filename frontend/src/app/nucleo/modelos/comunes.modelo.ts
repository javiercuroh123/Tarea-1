export type EstadoTransaccion = 'completada' | 'pendiente' | 'fallida';

export type TipoTransaccion = 'ingreso' | 'egreso';

export type CodigoMoneda = 'EUR' | 'USD' | 'GBP' | 'PEN';

export interface ResultadoPaginado<T> {
  elementos: T[];
  total: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

export type EstadoCarga = 'inactivo' | 'cargando' | 'listo' | 'error';

export const SIMBOLOS_MONEDA: Record<CodigoMoneda, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  PEN: 'S/',
};

export const ETIQUETAS_ESTADO: Record<EstadoTransaccion, string> = {
  completada: 'Completada',
  pendiente: 'Pendiente',
  fallida: 'Fallida',
};
