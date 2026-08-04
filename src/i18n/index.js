import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ptBR from "./locales/pt-BR.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

export function normalizeLanguage(lng) {
  if (!lng) return "pt-BR";
  const clean = lng.toLowerCase();
  if (clean.startsWith("pt")) return "pt-BR";
  if (clean.startsWith("en")) return "en";
  if (clean.startsWith("fr")) return "fr";
  return "pt-BR";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "pt-BR": { translation: ptBR },
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: "pt-BR",
    supportedLngs: ["pt-BR", "en", "fr"],
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "biciuber-language",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Guarantee initial normalization & html lang attribute
const initialNorm = normalizeLanguage(i18n.language);
document.documentElement.lang = initialNorm;
if (i18n.language !== initialNorm) {
  i18n.changeLanguage(initialNorm);
}

// Keep html lang and localStorage synchronized on change
i18n.on("languageChanged", (lng) => {
  const norm = normalizeLanguage(lng);
  document.documentElement.lang = norm;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("biciuber-language", norm);
  }
  if (lng !== norm && i18n.language !== norm) {
    i18n.changeLanguage(norm);
  }
});

export default i18n;
