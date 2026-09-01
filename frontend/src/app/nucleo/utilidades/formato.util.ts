import { CodigoMoneda, SIMBOLOS_MONEDA } from '../modelos';

/**
 * UTILIDADES DE FORMATO
 * -----------------------------------------------------------------------------
 * Funciones puras (misma entrada -> misma salida, sin efectos secundarios) para
 * dar formato a importes, fechas e iniciales.
 *
 * Al ser puras se pueden probar con tests sin montar ningún componente.
 */

/** Configuración regional usada en toda la aplicación. */
export const LOCALE = 'es-ES';

/**
 * Formatea un importe con separadores de miles y dos decimales.
 *
 * @param monto     Importe SIEMPRE positivo (tal y como se guarda en la BD).
 * @param moneda    Código ISO de la moneda.
 * @param negativo  Si es true antepone el signo menos.
 *
 * @example formatearMonto(1500, 'USD')        -> '$1,500.00'  (estilo del diseño)
 * @example formatearMonto(150, 'USD', true)   -> '-$150.00'
 */
export function formatearMonto(monto: number, moneda: CodigoMoneda, negativo = false): string {
  const simbolo = SIMBOLOS_MONEDA[moneda] ?? '';

  // Usamos el formato anglosajón (1,500.00) porque es el que muestra el diseño
  // de referencia. Para un formato español bastaría con cambiar a 'es-ES'.
  const numero = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(monto));

  return `${negativo ? '-' : ''}${simbolo}${numero}`;
}

/**
 * Formatea un importe de forma compacta para los ejes del gráfico.
 * @example formatearCompacto(2340) -> '2.3K'
 */
export function formatearCompacto(monto: number): string {
  if (Math.abs(monto) >= 1000) {
    return `${(monto / 1000).toFixed(1).replace('.0', '')}K`;
  }
  return String(Math.round(monto));
}

/**
 * Formatea la fecha de una transacción tal y como aparece en la tabla:
 * «9 sept 2025, 16:30».
 */
export function formatearFechaHora(fechaIso: string): string {
  const fecha = new Date(fechaIso);

  const parteFecha = new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(fecha);

  const parteHora = new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(fecha);

  return `${parteFecha}, ${parteHora}`;
}

/**
 * Devuelve las iniciales de un nombre para pintarlas en el avatar.
 * @example iniciales('William Grace') -> 'WG'
 */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)          // separa por cualquier cantidad de espacios
    .slice(0, 2)           // como máximo dos palabras
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');
}

/**
 * Decide si el texto sobre un color de fondo debe ser blanco o negro,
 * calculando la luminancia percibida del color.
 *
 * Es una regla de ACCESIBILIDAD: garantiza contraste suficiente en los avatares
 * de comercios, cuyo color viene de la base de datos y no controlamos.
 *
 * @param colorHex Color en formato #rrggbb
 */
export function colorTextoSobre(colorHex: string): '#ffffff' | '#14151a' {
  const hex = colorHex.replace('#', '');

  // Admite el formato corto (#abc).
  const normalizado =
    hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex;

  const r = parseInt(normalizado.slice(0, 2), 16);
  const g = parseInt(normalizado.slice(2, 4), 16);
  const b = parseInt(normalizado.slice(4, 6), 16);

  // Fórmula de luminancia percibida (el ojo humano ve mejor el verde).
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminancia > 0.6 ? '#14151a' : '#ffffff';
}

/**
 * Convierte a número un valor `numeric` de PostgreSQL, que PostgREST envía
 * como cadena de texto para no perder precisión.
 */
export function aNumero(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) {
    return 0;
  }
  const numero = typeof valor === 'number' ? valor : Number.parseFloat(valor);
  return Number.isFinite(numero) ? numero : 0;
}
