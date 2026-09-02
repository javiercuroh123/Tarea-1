import { CodigoMoneda, SIMBOLOS_MONEDA } from '../modelos';

export const LOCALE = 'es-ES';

export function formatearMonto(monto: number, moneda: CodigoMoneda, negativo = false): string {
  const simbolo = SIMBOLOS_MONEDA[moneda] ?? '';

  const numero = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(monto));

  return `${negativo ? '-' : ''}${simbolo}${numero}`;
}

export function formatearCompacto(monto: number): string {
  if (Math.abs(monto) >= 1000) {
    return `${(monto / 1000).toFixed(1).replace('.0', '')}K`;
  }
  return String(Math.round(monto));
}

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

export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');
}

export function colorTextoSobre(colorHex: string): '#ffffff' | '#14151a' {
  const hex = colorHex.replace('#', '');

  const normalizado =
    hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex;

  const r = parseInt(normalizado.slice(0, 2), 16);
  const g = parseInt(normalizado.slice(2, 4), 16);
  const b = parseInt(normalizado.slice(4, 6), 16);

  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminancia > 0.6 ? '#14151a' : '#ffffff';
}

export function aNumero(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined) {
    return 0;
  }
  const numero = typeof valor === 'number' ? valor : Number.parseFloat(valor);
  return Number.isFinite(numero) ? numero : 0;
}
