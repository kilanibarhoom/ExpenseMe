import ar from '../ar.json';
import en from '../en.json';

function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      return keyPaths(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

describe('i18n resources', () => {
  it('en and ar have identical key sets', () => {
    expect(keyPaths(ar).sort()).toEqual(keyPaths(en).sort());
  });

  it('localizes currency names in arabic per spec', () => {
    expect(ar.currency.ILS).toBe('شيكل');
    expect(ar.currency.JOD).toBe('دينار أردني');
    expect(ar.currency.USD).toBe('دولار أمريكي');
  });
});
