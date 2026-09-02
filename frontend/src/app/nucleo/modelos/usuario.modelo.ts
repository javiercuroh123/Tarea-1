import { CodigoMoneda } from './comunes.modelo';

export interface Usuario {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: string;
  avatar_url: string | null;
  color_avatar: string;
  moneda_base: CodigoMoneda;
  creado_en: string;
  actualizado_en: string;
}

export interface ResumenUsuarioCrudo {
  total_ingresos: string;
  total_egresos: string;
  saldo: string;
  num_completadas: number;
  num_pendientes: number;
  num_fallidas: number;
}

export interface ResumenUsuario {
  totalIngresos: number;
  totalEgresos: number;
  saldo: number;
  numCompletadas: number;
  numPendientes: number;
  numFallidas: number;
}
