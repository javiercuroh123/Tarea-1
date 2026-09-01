import { CodigoMoneda, EstadoTransaccion } from './comunes.modelo';

/**
 * TRANSFERENCIA — espejo de la tabla `public.transferencias`.
 * Guarda la tasa aplicada en el momento del envío (dato histórico).
 */
export interface Transferencia {
  id: string;
  usuario_id: string;
  contacto_id: string;
  monto_origen: number;
  moneda_origen: CodigoMoneda;
  monto_destino: number;
  moneda_destino: CodigoMoneda;
  tasa_aplicada: number;
  estado: EstadoTransaccion;
  nota: string | null;
  creado_en: string;
}

/**
 * Parámetros de la función RPC `fn_registrar_transferencia`.
 * Los nombres DEBEN coincidir con los de la función SQL (`p_...`).
 */
export interface ParametrosNuevaTransferencia {
  p_usuario_id: string;
  p_contacto_id: string;
  p_monto: number;
  p_moneda_origen: CodigoMoneda;
  p_moneda_destino: CodigoMoneda;
  p_nota: string | null;
}

/**
 * TASA DE CAMBIO — espejo de la tabla `public.tasas_cambio`.
 */
export interface TasaCambio {
  id: string;
  moneda_origen: CodigoMoneda;
  moneda_destino: CodigoMoneda;
  tasa: number;
  actualizado_en: string;
}
