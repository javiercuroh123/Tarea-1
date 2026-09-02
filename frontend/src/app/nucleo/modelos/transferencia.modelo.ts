import { CodigoMoneda, EstadoTransaccion } from './comunes.modelo';

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

export interface ParametrosNuevaTransferencia {
  p_usuario_id: string;
  p_contacto_id: string;
  p_monto: number;
  p_moneda_origen: CodigoMoneda;
  p_moneda_destino: CodigoMoneda;
  p_nota: string | null;
}

export interface TasaCambio {
  id: string;
  moneda_origen: CodigoMoneda;
  moneda_destino: CodigoMoneda;
  tasa: number;
  actualizado_en: string;
}
