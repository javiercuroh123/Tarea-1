import { CodigoMoneda, EstadoTransaccion, TipoTransaccion } from './comunes.modelo';

/**
 * TRANSACCIÓN — espejo de la tabla `public.transacciones`.
 * Recuerda: `monto` es SIEMPRE positivo; el signo lo aporta `tipo`.
 */
export interface Transaccion {
  id: string;
  usuario_id: string;
  comercio_id: string | null;
  monto: number;
  moneda: CodigoMoneda;
  tipo: TipoTransaccion;
  estado: EstadoTransaccion;
  descripcion: string | null;
  fecha: string;
  creado_en: string;
}

/**
 * TRANSACCIÓN CON DETALLE — espejo de la vista `vista_transacciones_detalle`.
 *
 * Es lo que consume la tabla del historial: ya trae los datos del comercio,
 * así que el componente no necesita hacer ninguna consulta adicional.
 */
export interface TransaccionDetalle extends Transaccion {
  comercio_nombre: string;
  comercio_categoria: string;
  comercio_logo_url: string | null;
  comercio_color: string;
  /** Negativo en los egresos. Cómodo para gráficos y sumas. */
  monto_con_signo: number;
}

/**
 * FILTROS del historial. Todos son opcionales: lo que no se indica, no filtra.
 * El servicio los traduce a parámetros de consulta de PostgREST.
 */
export interface FiltrosTransaccion {
  /** Búsqueda por nombre de comercio o descripción. */
  busqueda?: string;
  /** Estados seleccionados en el panel de filtros. */
  estados?: EstadoTransaccion[];
  /** Tipo de movimiento (ingreso / egreso). */
  tipo?: TipoTransaccion | null;
  /** Fecha mínima en formato ISO (yyyy-mm-dd). */
  desde?: string | null;
  /** Fecha máxima en formato ISO (yyyy-mm-dd). */
  hasta?: string | null;
}

/** Columnas por las que se puede ordenar la tabla. */
export type CampoOrden = 'comercio_nombre' | 'fecha' | 'monto';

/** Dirección del orden. */
export type DireccionOrden = 'asc' | 'desc';

/** Estado de ordenación de la tabla del historial. */
export interface OrdenTabla {
  campo: CampoOrden;
  direccion: DireccionOrden;
}

/**
 * Datos necesarios para crear una transacción nueva desde el formulario.
 * Es un subconjunto de `Transaccion`: el resto de columnas las pone la BD.
 */
export interface NuevaTransaccion {
  usuario_id: string;
  comercio_id: string | null;
  monto: number;
  moneda: CodigoMoneda;
  tipo: TipoTransaccion;
  estado: EstadoTransaccion;
  descripcion: string | null;
  fecha: string;
}

/**
 * Punto del gráfico de volumen — resultado de la RPC `fn_volumen_pagos`.
 * `total` llega como cadena (numeric de PostgreSQL) y se convierte en el servicio.
 */
export interface PuntoVolumenCrudo {
  dia: string;
  total: string;
}

/** Punto del gráfico ya listo para pintar. */
export interface PuntoVolumen {
  /** Fecha del día (objeto Date para poder formatearla). */
  fecha: Date;
  /** Importe total de ese día. */
  total: number;
  /** Etiqueta corta del eje X, por ejemplo «lun». */
  etiquetaCorta: string;
  /** Etiqueta larga para el globo informativo, por ejemplo «lunes, 12 jun». */
  etiquetaLarga: string;
}
