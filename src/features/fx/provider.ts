/** Swappable FX source (spec §5). Implementations return ILS per 1 unit of quote. */
export interface FxProvider {
  id: string;
  fetchRatesToILS(): Promise<Record<'USD' | 'JOD', number>>;
}

const ENDPOINT = 'https://open.er-api.com/v6/latest/ILS';

/**
 * Default key-less provider. The endpoint quotes rates with ILS as base
 * (rates.USD = USD per 1 ILS), so we invert to get ILS per USD/JOD.
 */
export const openErApiProvider: FxProvider = {
  id: 'open.er-api.com',
  async fetchRatesToILS() {
    const response = await fetch(ENDPOINT);
    if (!response.ok) {
      throw new Error(`FX endpoint returned HTTP ${response.status}`);
    }
    const body = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (body.result !== 'success' || !body.rates) {
      throw new Error('FX endpoint reported failure');
    }
    const result = {} as Record<'USD' | 'JOD', number>;
    for (const quote of ['USD', 'JOD'] as const) {
      const perIls = body.rates[quote];
      if (typeof perIls !== 'number' || perIls <= 0) {
        throw new Error(`FX endpoint missing rate for ${quote}`);
      }
      result[quote] = 1 / perIls;
    }
    return result;
  },
};
