import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/translation.json";
import hi from "@/locales/hi/translation.json";
import te from "@/locales/te/translation.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      te: { translation: te },
    },
    fallbackLng: import.meta.env.VITE_DEFAULT_LANGUAGE || "en",
    supportedLngs: ["en", "hi", "te"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "ai_avatar_language",
    },
  });

export default i18n;
