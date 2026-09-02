import {
  aNumero,
  colorTextoSobre,
  formatearCompacto,
  formatearMonto,
  iniciales,
} from './formato.util';

describe('formatearMonto', () => {
  it('añade el símbolo de la moneda y dos decimales', () => {
    expect(formatearMonto(1500, 'USD')).toBe('$1,500.00');
  });

  it('antepone el signo menos cuando se le indica', () => {
    expect(formatearMonto(150, 'USD', true)).toBe('-$150.00');
  });

  it('usa el símbolo del euro', () => {
    expect(formatearMonto(275, 'EUR')).toBe('€275.00');
  });

  it('nunca muestra un negativo doble', () => {
    expect(formatearMonto(-150, 'USD', true)).toBe('-$150.00');
  });
});

describe('formatearCompacto', () => {
  it('abrevia los miles', () => {
    expect(formatearCompacto(2340)).toBe('2.3K');
  });

  it('quita el decimal cuando es cero', () => {
    expect(formatearCompacto(2000)).toBe('2K');
  });

  it('deja los importes pequeños tal cual', () => {
    expect(formatearCompacto(320)).toBe('320');
  });
});

describe('iniciales', () => {
  it('toma la primera letra de las dos primeras palabras', () => {
    expect(iniciales('William Grace')).toBe('WG');
  });

  it('funciona con un solo nombre', () => {
    expect(iniciales('Amazon')).toBe('A');
  });

  it('ignora los espacios sobrantes', () => {
    expect(iniciales('  Adobe   Photoshop  ')).toBe('AP');
  });
});

describe('colorTextoSobre', () => {
  it('devuelve texto oscuro sobre fondos claros', () => {
    expect(colorTextoSobre('#9FE870')).toBe('#14151a');
  });

  it('devuelve texto blanco sobre fondos oscuros', () => {
    expect(colorTextoSobre('#1E3A8A')).toBe('#ffffff');
  });

  it('admite el formato corto de tres dígitos', () => {
    expect(colorTextoSobre('#000')).toBe('#ffffff');
  });
});

describe('aNumero', () => {
  it('convierte los numeric que PostgREST envía como texto', () => {
    expect(aNumero('3456.00')).toBe(3456);
  });

  it('devuelve 0 ante valores nulos o inválidos', () => {
    expect(aNumero(null)).toBe(0);
    expect(aNumero(undefined)).toBe(0);
    expect(aNumero('no es un número')).toBe(0);
  });
});
