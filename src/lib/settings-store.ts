import { eq } from 'drizzle-orm';
import { I18nManager } from 'react-native';
import { create } from 'zustand';

import { localDb as db } from '@/db/local';
import { settings } from '@/db/local-schema';
import { enqueueChange } from '@/features/sync/outbox';
import { initI18n, type AppLocale } from '@/i18n';

type ThemePref = 'system' | 'light' | 'dark';

interface SettingsState {
  hydrated: boolean;
  locale: AppLocale;
  theme: ThemePref;
  defaultAccountId: string | null;
  fxRefreshHours: number;
  lastFxSyncAt: Date | null;
  hydrate: () => Promise<void>;
  /** Persists locale; returns true when an app reload is needed to flip RTL. */
  setLocale: (locale: AppLocale) => Promise<boolean>;
  setTheme: (theme: ThemePref) => Promise<void>;
  setDefaultAccountId: (id: string) => Promise<void>;
  setFxRefreshHours: (hours: number) => Promise<void>;
  setLastFxSyncAt: (at: Date) => Promise<void>;
}

const SINGLETON = eq(settings.id, 'singleton');

export const useSettings = create<SettingsState>((set) => ({
  hydrated: false,
  locale: 'en',
  theme: 'system',
  defaultAccountId: null,
  fxRefreshHours: 12,
  lastFxSyncAt: null,

  hydrate: async () => {
    const [row] = await db.select().from(settings).where(SINGLETON);
    const locale = (row?.locale ?? 'en') as AppLocale;
    initI18n(locale);
    I18nManager.allowRTL(locale === 'ar');
    set({
      hydrated: true,
      locale,
      theme: row?.theme ?? 'system',
      defaultAccountId: row?.defaultAccountId ?? null,
      fxRefreshHours: row?.fxRefreshHours ?? 12,
      lastFxSyncAt: row?.lastFxSyncAt ?? null,
    });
  },

  setLocale: async (locale) => {
    await db.update(settings).set({ locale }).where(SINGLETON);
    await enqueueChange('settings', 'singleton', 'update');
    initI18n(locale);
    const wantRTL = locale === 'ar';
    const needsReload = I18nManager.isRTL !== wantRTL;
    I18nManager.allowRTL(wantRTL);
    I18nManager.forceRTL(wantRTL);
    set({ locale });
    return needsReload;
  },

  setTheme: async (theme) => {
    await db.update(settings).set({ theme }).where(SINGLETON);
    await enqueueChange('settings', 'singleton', 'update');
    set({ theme });
  },

  setDefaultAccountId: async (defaultAccountId) => {
    await db.update(settings).set({ defaultAccountId }).where(SINGLETON);
    await enqueueChange('settings', 'singleton', 'update');
    set({ defaultAccountId });
  },

  setFxRefreshHours: async (fxRefreshHours) => {
    await db.update(settings).set({ fxRefreshHours }).where(SINGLETON);
    await enqueueChange('settings', 'singleton', 'update');
    set({ fxRefreshHours });
  },

  setLastFxSyncAt: async (lastFxSyncAt) => {
    await db.update(settings).set({ lastFxSyncAt }).where(SINGLETON);
    await enqueueChange('settings', 'singleton', 'update');
    set({ lastFxSyncAt });
  },
}));
