import { CodigoMoneda } from './comunes.modelo';

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
