import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const languages = [
  {
    code: "pt-BR",
    short: "PT",
    label: "Português",
  },
  {
    code: "en",
    short: "EN",
    label: "English",
  },
  {
    code: "fr",
    short: "FR",
    label: "Français",
  },
];

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase();

  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("en")) return "en";

  return "pt-BR";
}

function GlobeIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M3.5 12H20.5M12 3C14.4 5.5 15.6 8.5 15.6 12C15.6 15.5 14.4 18.5 12 21C9.6 18.5 8.4 15.5 8.4 12C8.4 8.5 9.6 5.5 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const currentCode = normalizeLanguage(i18n.resolvedLanguage);
  const currentLanguage =
    languages.find((item) => item.code === currentCode) ??
    languages[0];

  useEffect(() => {
    function closeWhenClickingOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function closeWithEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      closeWhenClickingOutside
    );
    document.addEventListener("keydown", closeWithEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeWhenClickingOutside
      );
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  async function selectLanguage(code) {
    await i18n.changeLanguage(code);
    localStorage.setItem("biciuber-language", code);
    document.documentElement.lang = code;
    setOpen(false);
  }

  return (
    <div className="language-selector" ref={containerRef}>
      <button
        type="button"
        className="language-selector__trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("chooseLanguage", {
          defaultValue: "Escolher idioma",
        })}
      >
        <GlobeIcon />

        <span>{currentLanguage.short}</span>

        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 10L12 15L17 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="language-selector__menu"
          role="menu"
          aria-label={t("chooseLanguage", {
            defaultValue: "Escolher idioma",
          })}
        >
          {languages.map((language) => {
            const selected = language.code === currentCode;

            return (
              <button
                type="button"
                key={language.code}
                className="language-selector__option"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => selectLanguage(language.code)}
              >
                <span>{language.label}</span>
                {selected && <strong aria-hidden="true">✓</strong>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}