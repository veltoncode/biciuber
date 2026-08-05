import React from "react";
import { useTranslation } from "react-i18next";
import BicitaxiIcon from "./BicitaxiIcon.jsx";
import LanguageSelector from "./LanguageSelector.jsx";
import InstallPwaButton from "./InstallPwaButton.jsx";
import "./welcome.css";

function DriverIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21v-2.5A5.5 5.5 0 0 1 10.5 13h3A5.5 5.5 0 0 1 19 18.5V21" />
    </svg>
  );
}

export default function WelcomeScreen({
  onSelectPassenger,
  onSelectDriver,
}) {
  const { t } = useTranslation();

  return (
    <main className="welcome">
      <div className="welcome__ambient" aria-hidden="true" />

      <header className="welcome__header">
        <LanguageSelector />
      </header>

      <section className="welcome__content">
        <div className="welcome__brand">
          <span className="welcome__ring welcome__ring--one" />
          <span className="welcome__ring welcome__ring--two" />
          <span className="welcome__ring welcome__ring--three" />

          <div className="welcome__icon-frame">
            <BicitaxiIcon
              size={120}
              color="#ffffff"
              title={t("bicitaxiIcon", {
                defaultValue: "Bicitáxi de Afuá",
              })}
            />
          </div>
        </div>

        <div className="welcome__copy">
          <h1 className="welcome__title">
            {t("appName", { defaultValue: "BiciTaxi" })}
          </h1>

          <p className="welcome__tagline">
            {t("tagline", {
              defaultValue: "O bicitáxi de Afuá, a um toque",
            })}
          </p>

          <p className="welcome__description">
            {t("description", {
              defaultValue:
                "Uma forma simples de encontrar transporte para moradores e visitantes.",
            })}
          </p>
        </div>

        <div className="welcome__actions">
          <button
            type="button"
            className="welcome__primary-button"
            onClick={onSelectPassenger}
          >
            <BicitaxiIcon
              size={42}
              color="currentColor"
              decorative
            />

            <span>
              {t("callRide", {
                defaultValue: "Chamar um bicitáxi",
              })}
            </span>
          </button>

          <InstallPwaButton />

          <button
            type="button"
            className="welcome__driver-link"
            onClick={onSelectDriver}
          >
            <DriverIcon />

            <span>
              {t("driverAccess", {
                defaultValue: "Sou bicitaxista",
              })}
            </span>
          </button>
        </div>
      </section>

      <footer className="welcome__footer">
        <span className="welcome__footer-label">
          {t("developedBy", {
            defaultValue: "Projeto desenvolvido por",
          })}
        </span>

        <div className="welcome__author">
          <span aria-hidden="true" />
          <strong>Herivelto Sarges</strong>
          <span aria-hidden="true" />
        </div>
      </footer>
    </main>
  );
}