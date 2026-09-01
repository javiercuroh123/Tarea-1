/**
 * COMERCIO — espejo de la tabla `public.comercios`.
 * Catálogo compartido: Amazon, PayPal, Wise, Airbnb...
 */
export interface Comercio {
  id: string;
  nombre: string;
  categoria: string;
  /** Si es null, la interfaz dibuja la inicial sobre `color_marca`. */
  logo_url: string | null;
  color_marca: string;
  creado_en: string;
}
