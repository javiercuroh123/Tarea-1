import { CodigoMoneda, EstadoTransaccion, TipoTransaccion } from './comunes.modelo';

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

export interface TransaccionDetalle extends Transaccion {
  comercio_nombre: string;
  comercio_categoria: string;
  comercio_logo_url: string | null;
  comercio_color: string;
  monto_con_signo: number;
}

export interface FiltrosTransaccion {
  busqueda?: string;
  estados?: EstadoTransaccion[];
  tipo?: TipoTransaccion | null;
  desde?: string | null;
  hasta?: string | null;
}

export type CampoOrden = 'comercio_nombre' | 'fecha' | 'monto';

export type DireccionOrden = 'asc' | 'desc';

export interface OrdenTabla {
  campo: CampoOrden;
  direccion: DireccionOrden;
}

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

export interface PuntoVolumenCrudo {
  dia: string;
  total: string;
}

export interface PuntoVolumen {
  fecha: Date;
  total: number;
  etiquetaCorta: string;
  etiquetaLarga: string;
}
