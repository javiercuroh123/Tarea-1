import { CodigoMoneda } from './comunes.modelo';

/**
 * CONTACTO — espejo de la tabla `public.contactos`.
 * Son los destinatarios que aparecen como avatares en «Transferencia rápida».
 */
export interface Contacto {
  id: string;
  usuario_id: string;
  nombre: string;
  correo: string | null;
  avatar_url: string | null;
  color_avatar: string;
  moneda_preferida: CodigoMoneda;
  favorito: boolean;
  creado_en: string;
}
