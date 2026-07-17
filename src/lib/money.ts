export type Currency = 'ILS' | 'JOD' | 'USD';

export const CURRENCIES: Currency[] = ['ILS', 'JOD', 'USD'];

const SCALES: Record<Currency, number> = { ILS: 2, USD: 2, JOD: 3 };

export function minorScale(currency: Currency): number {
  return SCALES[currency];
}

/**
 * Parse user-entered major-unit amount into integer minor units.
 * Rounds half-up beyond the currency's scale. Throws on invalid or negative input.
 */
export function toMinor(major: string | number, currency: Currency): number {
  const value = typeof major === 'string' ? Number(major.trim()) : major;
  if (typeof major === 'string' && major.trim() === '') {
    throw new Error('Amount is empty');
  }
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid amount: ${major}`);
  }
  if (value < 0) {
    throw new Error(`Amount must not be negative: ${major}`);
  }
  const factor = 10 ** minorScale(currency);
  // EPSILON nudge so values like 1.005 (stored as 1.00499…) round half-up as users expect
  return Math.round(value * factor * (1 + Number.EPSILON));
}

/** Minor units back to major units — display/interop only, never stored. */
export function fromMinor(minor: number, currency: Currency): number {
  return minor / 10 ** minorScale(currency);
}

/** Localized currency string, e.g. ₪10.50 / JOD 12.345. */
export function formatMoney(minor: number, currency: Currency, locale: string): string {
  const digits = minorScale(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(fromMinor(minor, currency));
}

/**
 * Convert foreign minor units to ILS minor units (agorot).
 * `rateToIls`: 1 major unit of `currency` = rateToIls ILS.
 */
export function convertToIlsMinor(
  foreignMinor: number,
  currency: Currency,
  rateToIls: number,
): number {
  if (currency === 'ILS') return foreignMinor;
  const ilsFactor = 10 ** SCALES.ILS;
  return Math.round((foreignMinor * rateToIls * ilsFactor) / 10 ** minorScale(currency));
}

/** Major-unit exchange rate implied by a cross-currency transfer: major(to) / major(from). */
export function impliedRate(
  fromAmountMinor: number,
  fromCurrency: Currency,
  toAmountMinor: number,
  toCurrency: Currency,
): number {
  return fromMinor(toAmountMinor, toCurrency) / fromMinor(fromAmountMinor, fromCurrency);
}
