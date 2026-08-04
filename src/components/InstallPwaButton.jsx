import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function InstallIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3V15M12 15L7.5 10.5M12 15L16.5 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M5 15V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPwaButton() {
  const { t } = useTranslation();

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    function handleInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function handleInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
      setInstalling(false);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleInstallPrompt
    );
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleInstallPrompt
      );
      window.removeEventListener(
        "appinstalled",
        handleInstalled
      );
    };
  }, []);

  async function installApplication() {
    if (isIos() && !deferredPrompt) {
      setShowIosHelp(true);
      return;
    }

    if (!deferredPrompt) return;

    setInstalling(true);

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch (error) {
      console.error("Erro ao instalar a PWA:", error);
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }

  if (installed) {
    return null;
  }

  if (!deferredPrompt && !isIos()) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="install-pwa-button"
        onClick={installApplication}
        disabled={installing}
      >
        <InstallIcon />

        <span>
          {installing
            ? t("installing", {
                defaultValue: "Abrindo instalação...",
              })
            : t("installApp", {
                defaultValue: "Instalar no celular",
              })}
        </span>
      </button>

      {showIosHelp && (
        <div
          className="install-dialog-backdrop"
          onClick={() => setShowIosHelp(false)}
          role="presentation"
        >
          <div
            className="install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="install-dialog-title">
              {t("installIosTitle", {
                defaultValue: "Adicionar à tela inicial",
              })}
            </h2>

            <p>
              {t("installIosText", {
                defaultValue:
                  "Toque em Compartilhar e depois em Adicionar à Tela de Início.",
              })}
            </p>

            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
            >
              {t("close", {
                defaultValue: "Fechar",
              })}
            </button>
          </div>
        </div>
      )}
    </>
  );
}