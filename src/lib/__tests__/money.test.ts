import {
  CURRENCIES,
  convertMinor,
  convertToIlsMinor,
  formatMoney,
  fromMinor,
  impliedRate,
  minorScale,
  toMinor,
} from '../money';

describe('minorScale', () => {
  it('uses 2 decimals for ILS and USD, 3 for JOD', () => {
    expect(minorScale('ILS')).toBe(2);
    expect(minorScale('USD')).toBe(2);
    expect(minorScale('JOD')).toBe(3);
  });

  it('exposes exactly the three supported currencies', () => {
    expect(CURRENCIES).toEqual(['ILS', 'JOD', 'USD']);
  });
});

describe('toMinor', () => {
  it('parses per-currency decimal input into minor units', () => {
    expect(toMinor('12.345', 'JOD')).toBe(12345);
    expect(toMinor('10.50', 'ILS')).toBe(1050);
    expect(toMinor('7', 'USD')).toBe(700);
    expect(toMinor(3.25, 'USD')).toBe(325);
  });

  it('rounds half-up beyond the currency scale', () => {
    expect(toMinor('1.005', 'USD')).toBe(101);
    expect(toMinor('1.0004', 'JOD')).toBe(1000);
  });

  it('rejects negative, NaN and empty input', () => {
    expect(() => toMinor('-1', 'ILS')).toThrow();
    expect(() => toMinor('abc', 'ILS')).toThrow();
    expect(() => toMinor('', 'ILS')).toThrow();
    expect(() => toMinor(Number.NaN, 'ILS')).toThrow();
  });
});

describe('fromMinor', () => {
  it('converts minor units back to major units', () => {
    expect(fromMinor(1050, 'ILS')).toBe(10.5);
    expect(fromMinor(12345, 'JOD')).toBe(12.345);
  });
});

describe('convertToIlsMinor', () => {
  it('converts JOD fils to ILS agorot across scales', () => {
    // 100 JOD (100000 fils) at 5.2 ILS/JOD = 520 ILS = 52000 agorot
    expect(convertToIlsMinor(100000, 'JOD', 5.2)).toBe(52000);
  });

  it('converts USD cents to ILS agorot', () => {
    // 25 USD at 3.6 ILS/USD = 90 ILS = 9000 agorot
    expect(convertToIlsMinor(2500, 'USD', 3.6)).toBe(9000);
  });

  it('is the identity for ILS regardless of rate', () => {
    expect(convertToIlsMinor(1234, 'ILS', 99)).toBe(1234);
  });

  it('rounds to the nearest agora', () => {
    // 1 cent at 3.567 = 0.03567 ILS = 3.567 agorot -> 4
    expect(convertToIlsMinor(1, 'USD', 3.567)).toBe(4);
  });
});

describe('impliedRate', () => {
  it('computes major-unit rate across differing scales', () => {
    // 10 JOD (10000 fils) -> 51 ILS (5100 agorot): rate 5.1
    expect(impliedRate(10000, 'JOD', 5100, 'ILS')).toBeCloseTo(5.1, 10);
    // 100 USD -> 360 ILS: 3.6
    expect(impliedRate(10000, 'USD', 36000, 'ILS')).toBeCloseTo(3.6, 10);
  });
});

describe('convertMinor', () => {
  const rates = { USD: 3.6, JOD: 5.2 };

  it('converts USD to ILS via the rate table', () => {
    expect(convertMinor(2500, 'USD', 'ILS', rates)).toBe(9000);
  });

  it('converts ILS to JOD across scales', () => {
    // 520 ILS -> 100 JOD (100000 fils)
    expect(convertMinor(52000, 'ILS', 'JOD', rates)).toBe(100000);
  });

  it('converts USD to JOD through ILS', () => {
    // 52 USD = 187.2 ILS = 36 JOD = 36000 fils
    expect(convertMinor(5200, 'USD', 'JOD', rates)).toBe(36000);
  });

  it('is the identity for same currency', () => {
    expect(convertMinor(1234, 'USD', 'USD', rates)).toBe(1234);
  });
});

describe('formatMoney', () => {
  it('formats with currency symbol/code and correct fraction digits', () => {
    const en = formatMoney(1050, 'ILS', 'en');
    expect(en).toMatch(/10\.50/);
    const jod = formatMoney(12345, 'JOD', 'en');
    expect(jod).toMatch(/12\.345/);
  });

  it('does not throw for arabic locale', () => {
    expect(() => formatMoney(1050, 'ILS', 'ar')).not.toThrow();
  });
});
