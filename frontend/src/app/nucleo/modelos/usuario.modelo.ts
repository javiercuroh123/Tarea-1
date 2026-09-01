import { CodigoMoneda } from './comunes.modelo';

/**
 * USUARIO — espejo de la tabla `public.usuarios`.
 *
 * Los nombres de las propiedades coinciden EXACTAMENTE con los de las columnas
 * porque Supabase devuelve el JSON tal cual. Si cambia el SQL, hay que cambiar
 * también esta interfaz.
 */
export interface Usuario {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: string;
  /** Puede ser null: en ese caso la interfaz pinta las iniciales. */
  avatar_url: string | null;
  color_avatar: string;
  moneda_base: CodigoMoneda;
  creado_en: string;
  actualizado_en: string;
}

/**
 * RESUMEN DEL USUARIO — resultado de la función RPC `fn_resumen_usuario`.
 *
 * Ojo: PostgREST devuelve los `numeric` como **cadena de texto** para no perder
 * precisión. Por eso los convertimos en el servicio antes de usarlos.
 */
export interface ResumenUsuarioCrudo {
  total_ingresos: string;
  total_egresos: string;
  saldo: string;
  num_completadas: number;
  num_pendientes: number;
  num_fallidas: number;
}

/** El mismo resumen ya convertido a números, que es lo que usa la interfaz. */
export interface ResumenUsuario {
  totalIngresos: number;
  totalEgresos: number;
  saldo: number;
  numCompletadas: number;
  numPendientes: number;
  numFallidas: number;
}
