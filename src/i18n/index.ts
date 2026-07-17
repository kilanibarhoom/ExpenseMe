import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './ar.json';
import en from './en.json';

export type AppLocale = 'en' | 'ar';

export function initI18n(locale: AppLocale): void {
  if (i18n.isInitialized) {
    void i18n.changeLanguage(locale);
    return;
  }
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: locale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
