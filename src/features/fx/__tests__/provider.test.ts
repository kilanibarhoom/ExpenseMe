import { openErApiProvider } from '../provider';

describe('openErApiProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('inverts ILS-base rates into ILS-per-unit quotes', async () => {
    // open.er-api.com/v6/latest/ILS: rates.USD = USD per 1 ILS
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        rates: { ILS: 1, USD: 0.2777, JOD: 0.1968 },
      }),
    } as Response);

    const rates = await openErApiProvider.fetchRatesToILS();
    expect(rates.USD).toBeCloseTo(1 / 0.2777, 6);
    expect(rates.JOD).toBeCloseTo(1 / 0.1968, 6);
  });

  it('throws when the endpoint reports failure', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'error' }),
    } as Response);
    await expect(openErApiProvider.fetchRatesToILS()).rejects.toThrow();
  });

  it('throws on HTTP errors', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 500 } as Response);
    await expect(openErApiProvider.fetchRatesToILS()).rejects.toThrow();
  });

  it('throws when a needed quote is missing or non-positive', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success', rates: { USD: 0.2777 } }),
    } as Response);
    await expect(openErApiProvider.fetchRatesToILS()).rejects.toThrow();
  });
});
