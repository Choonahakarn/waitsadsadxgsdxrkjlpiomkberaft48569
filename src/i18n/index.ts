import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import th from './locales/th.json';
import en from './locales/en.json';

// Get saved language or default to Thai
const savedLanguage = localStorage.getItem('language') || 'th';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      th: { translation: th },
      en: { translation: en },
    },
    lng: savedLanguage,
    fallbackLng: 'th',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
