import React, { useState } from "react";
import BicitaxiIcon from "./BicitaxiIcon.jsx";
import InstallPwaButton from "./InstallPwaButton.jsx";

const translations = {
  pt: {
    badge: "PROJETO OPEN SOURCE",
    badgeSub: "Comunitário • Sem Taxas",
    title: "A mobilidade urbana local repensada.",
    titleHighlight: "Veneza Marajoara",
    subtitle: "Sem taxas ocultas. Chame um condutor em tempo real pelas pontes e passarelas de Afuá.",
    btnCall: "Pedir um Bicitáxi",
    btnDriver: "Quero ser Condutor",
    installApp: "Instalar no Celular",
    statEcological: "100% Ecológico",
    statEcologicalDesc: "Zero emissão de CO2 em passarelas",
    statFees: "Sem Comissões",
    statFeesDesc: "Renda 100% para o condutor local",
    statDirect: "WhatsApp & Realtime",
    statDirectDesc: "Contato direto e sem atrito",
    howItWorksTag: "SIMPLICIDADE TOTAL",
    howItWorks: "Como Funciona",
    step1Title: "1. Escolha seu Trajeto",
    step1Desc: "Abra o app no navegador, defina seu ponto de partida e destino ou veja a lista de bicitaxistas disponíveis em tempo real.",
    step2Title: "2. Chame em Segundos",
    step2Desc: "Dispare a chamada para os condutores pela rede ou converse diretamente no WhatsApp do profissional com apenas um clique.",
    step3Title: "3. Embarque Ecológico",
    step3Desc: "O bicitaxista vai até você pelas passarelas de madeira de Afuá. Viagem limpa, segura e com pagamento direto ao condutor.",
    step4Title: "4. Pague Direto ao Condutor",
    step4Desc: "Sem intermediários. Combine o valor e pague diretamente ao bicitaxista no final da corrida, fortalecendo a economia local da cidade.",
    faqTag: "TIRE SUAS DÚVIDAS",
    faqTitle: "Perguntas Frequentes",
    faqs: [
      {
        q: "O que é o projeto BiciTaxi?",
        a: "O BiciTaxi nasceu como um projeto de TCC de Engenharia de Software, focado em resolver a mobilidade urbana local. É uma plataforma 100% Open-Source (licença AGPL), criada para que outros desenvolvedores possam contribuir, melhorar o código e deixar um legado tecnológico e sustentável para a nossa comunidade."
      },
      {
        q: "Como faço para pedir um bicitáxi?",
        a: "Basta clicar no botão verde 'Pedir um Bicitáxi' na página inicial. A partir daí, você terá duas opções:\n\n1. Solicitar agora: O sistema envia um chamado instantâneo para todos os bicitaxistas disponíveis no momento. O primeiro que aceitar fará a sua corrida.\n\n2. Escolher um bicitaxista: O aplicativo mostra uma lista em tempo real de quem está livre. Assim, você pode escolher o seu condutor favorito e chamá-lo diretamente, eliminando a confusão dos grupos de WhatsApp onde nunca se sabe quem está realmente trabalhando."
      },
      {
        q: "O BiciTaxi cobra alguma comissão ou taxa?",
        a: "Zero taxas! O BiciTaxi é uma iniciativa de código aberto (Open Source) e comunitária desenvolvida para valorizar a mobilidade de Afuá. 100% do valor da corrida fica com o bicitaxista."
      },
      {
        q: "Preciso baixar aplicativo na Play Store ou App Store?",
        a: "Não. Para facilitar o acesso rápido, o BiciTaxi funciona diretamente no navegador de qualquer celular. Assim que a plataforma for validada e testada exaustivamente pela comunidade nas ruas, planejamos lançar as versões nativas nas lojas de aplicativos."
      },
      {
        q: "Como os bicitaxistas começam a atender?",
        a: "Na Área do Condutor, o profissional realiza o cadastro informando telefone, nome e placa. Após a aprovação do administrador, ele recebe um PIN exclusivo de acesso."
      },
      {
        q: "Visitantes e turistas com números estrangeiros podem usar?",
        a: "Sim! Nosso sistema possui suporte completo ao padrão internacional E.164 com seletor de DDI, permitindo chamadas com números do Brasil (+55), Guiana Francesa (+594), França (+33), EUA (+1) e muitos outros."
      }
    ],
    footerSubtitle: "Mobilidade ecológica comunitária para as passarelas da Ilha de Marajó, Pará.",
    terms: "Termos de Uso",
    privacy: "Privacidade",
    driverArea: "Área do Condutor",
    adminArea: "Administrador",
    devCredit: "Projeto Open Source • Desenvolvido por Herivelto Sarges",
    termsTitle: "Termos de Uso",
    privacyTitle: "Política de Privacidade",
    modalClose: "Entendi",
    brandTag: "Afuá",
    brandSubtitle: "Capital das Bicicletas",
    openApp: "Abrir App"
  },
  en: {
    badge: "OPEN SOURCE PROJECT",
    badgeSub: "Community • Zero Fees",
    title: "Local urban mobility rethought.",
    titleHighlight: "Marajó Venice",
    subtitle: "No hidden fees. Request a driver in real-time across the bridges and wooden walkways of Afuá.",
    btnCall: "Call a BiciTaxi",
    btnDriver: "Become a Driver",
    installApp: "Install on Phone",
    statEcological: "100% Eco-Friendly",
    statEcologicalDesc: "Zero CO2 emissions on walkways",
    statFees: "No Commissions",
    statFeesDesc: "100% income goes directly to driver",
    statDirect: "WhatsApp & Real-Time",
    statDirectDesc: "Direct contact with zero friction",
    howItWorksTag: "TOTAL SIMPLICITY",
    howItWorks: "How it Works",
    step1Title: "1. Choose Your Route",
    step1Desc: "Open the app in your browser, set your pickup and destination or browse currently available drivers.",
    step2Title: "2. Request in Seconds",
    step2Desc: "Send a real-time ride request through the system or chat directly on WhatsApp with the driver in one tap.",
    step3Title: "3. Eco-Friendly Ride",
    step3Desc: "The driver picks you up on the scenic wooden walkways of Afuá. Safe, clean, and direct payment to the driver.",
    step4Title: "4. Pay the Driver Directly",
    step4Desc: "No middlemen. Agree on the price and pay the driver directly at the end of the trip, supporting the local economy.",
    faqTag: "GOT QUESTIONS?",
    faqTitle: "Frequently Asked Questions",
    faqs: [
      {
        q: "What is the BiciTaxi project?",
        a: "BiciTaxi was born as a Software Engineering graduation thesis project focused on solving local urban mobility. It is a 100% Open-Source platform (AGPL license), created so other developers can contribute, improve the code, and leave a sustainable technological legacy for our community."
      },
      {
        q: "How do I request a BiciTaxi?",
        a: "Simply click the green 'Call a BiciTaxi' button on the homepage. From there, you will have two options:\n\n1. Request now: The system sends an instant ride request to all currently available drivers. The first driver to accept will take your trip.\n\n2. Choose a driver: The app displays a real-time list of who is currently available. This lets you pick your favorite driver and contact them directly, eliminating the confusion of WhatsApp groups where you never know who is actually working."
      },
      {
        q: "Does BiciTaxi charge any commission or fees?",
        a: "Zero fees! BiciTaxi is an open source community initiative built for the city of Afuá. 100% of the ride price goes directly to the driver."
      },
      {
        q: "Do I need to download an app from Play Store or App Store?",
        a: "No. For quick and easy access, BiciTaxi works directly in any mobile browser. Once the platform is thoroughly tested and validated by the community on the streets, we plan to release native versions in app stores."
      },
      {
        q: "How do drivers register and accept rides?",
        a: "In the 'Driver Area', drivers register with their phone, name, and license plate. Once approved by the administrator, they get a dedicated PIN."
      },
      {
        q: "Can international tourists and visitors use foreign numbers?",
        a: "Yes! Our system has full support for international E.164 phone formats with country dial codes (Brazil +55, French Guiana +594, France +33, US +1, etc.)."
      }
    ],
    footerSubtitle: "Ecological community mobility for the walkways of Marajó Island, Pará.",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    driverArea: "Driver Area",
    adminArea: "Administrator",
    devCredit: "Open Source Project • Developed by Herivelto Sarges",
    termsTitle: "Terms of Use",
    privacyTitle: "Privacy Policy",
    modalClose: "Got it",
    brandTag: "Afuá",
    brandSubtitle: "Bicycle Capital",
    openApp: "Open App"
  },
  fr: {
    badge: "PROJET OPEN SOURCE",
    badgeSub: "Communautaire • Zéro Frais",
    title: "La mobilité urbaine locale repensée.",
    titleHighlight: "Venise du Marajó",
    subtitle: "Sans frais cachés. Appelez un chauffeur en temps réel sur les ponts et passerelles d'Afuá.",
    btnCall: "Commander un BiciTaxi",
    btnDriver: "Devenir Chauffeur",
    installApp: "Installer sur le Téléphone",
    statEcological: "100% Écologique",
    statEcologicalDesc: "Zéro émission de CO2 sur passerelles",
    statFees: "Sans Commissions",
    statFeesDesc: "100% des revenus pour le chauffeur",
    statDirect: "WhatsApp & Temps Réel",
    statDirectDesc: "Contact direct et sans friction",
    howItWorksTag: "SIMPLICITÉ TOTALE",
    howItWorks: "Comment ça marche",
    step1Title: "1. Choisissez Votre Trajet",
    step1Desc: "Ouvrez l'application, indiquez votre départ et destination ou consultez la liste des chauffeurs disponibles.",
    step2Title: "2. Appelez en Quelques Secondes",
    step2Desc: "Lancez la demande en temps réel ou discutez directement par WhatsApp avec le chauffeur en un clic.",
    step3Title: "3. Trajet Écologique",
    step3Desc: "Le chauffeur vient vous chercher sur les passerelles en bois d'Afuá. Voyage propre et paiement direct.",
    step4Title: "4. Payez Directement au Chauffeur",
    step4Desc: "Sans intermédiaires. Convenez du tarif et payez directement le chauffeur à la fin de la course, renforçant l'économie locale.",
    faqTag: "DES QUESTIONS ?",
    faqTitle: "Foire Aux Questions",
    faqs: [
      {
        q: "Qu'est-ce que le projet BiciTaxi ?",
        a: "BiciTaxi est né comme projet de fin d'études en Génie Logiciel dédié à la mobilité urbaine locale. C'est une plateforme 100% Open-Source (licence AGPL), créée pour que d'autres développeurs puissent contribuer, améliorer le code et laisser un héritage technologique et durable pour notre communauté."
      },
      {
        q: "Comment commander un bicitaxi ?",
        a: "Cliquez simplement sur le bouton vert 'Commander un BiciTaxi' sur la page d'accueil. À partir de là, vous aurez deux options :\n\n1. Demander maintenant : Le système envoie un appel instantané à tous les chauffeurs disponibles en ce moment. Le premier à accepter effectuera votre course.\n\n2. Choisir un chauffeur : L'application affiche une liste en temps réel des chauffeurs libres. Vous pouvez ainsi choisir votre chauffeur favori et l'appeler directement, éliminant la confusion des groupes WhatsApp où l'on ne sait jamais qui travaille réellement."
      },
      {
        q: "BiciTaxi prélève-t-il des commissions ou des frais ?",
        a: "Zéro frais ! BiciTaxi est une initiative communautaire open source pour Afuá. 100% du montant de la course revient au chauffeur."
      },
      {
        q: "Dois-je télécharger une application sur le Play Store ou l'App Store ?",
        a: "Non. Pour un accès rapide, BiciTaxi fonctionne directement dans le navigateur de n'importe quel smartphone. Dès que la plateforme sera largement testée et validée par la communauté dans les rues, nous prévoyons de lancer des versions natives sur les magasins d'applications."
      },
      {
        q: "Comment les chauffeurs s'inscrivent-ils ?",
        a: "Dans l'Espace Conducteur, le chauffeur renseigne son numéro, son nom et sa plaque. Après validation de l'administrateur, il reçoit son code PIN."
      },
      {
        q: "Les touristes avec un numéro étranger peuvent-ils l'utiliser ?",
        a: "Oui ! Le système prend en charge les numéros internationaux (format E.164) avec sélecteur d'indicatif (Brésil +55, Guyane française +594, France +33, etc.)."
      }
    ],
    footerSubtitle: "Mobilité écologique communautaire pour les passerelles de l'île de Marajó, Pará.",
    terms: "Conditions d'Utilisation",
    privacy: "Politique de Confidentialité",
    driverArea: "Espace Conducteur",
    adminArea: "Administrateur",
    devCredit: "Projet Open Source • Développé par Herivelto Sarges",
    termsTitle: "Conditions d'Utilisation",
    privacyTitle: "Politique de Confidentialité",
    modalClose: "Compris",
    brandTag: "Afuá",
    brandSubtitle: "Capitale du Vélo",
    openApp: "Ouvrir l'App"
  }
};

export default function LandingPage({ onNavigate }) {
  const [lang, setLang] = useState("pt");
  const [activeFaq, setActiveFaq] = useState(null);
  const [termsModal, setTermsModal] = useState(null);

  const t = translations[lang] || translations.pt;

  const toggleFaq = (index) => {
    setActiveFaq(prev => (prev === index ? null : index));
  };

  return (
    <div
      style={{
        minHeight: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--background, #071A14)",
        color: "var(--textPrimary, #F4EBDD)",
        fontFamily: "'Inter', -apple-system, sans-serif",
        WebkitOverflowScrolling: "touch"
      }}
    >
      <style>{`
        @keyframes pulseRadar {
          0%, 100% {
            box-shadow: 0 0 30px rgba(0, 229, 153, 0.4);
            border-color: rgba(16, 185, 129, 0.5);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 52px rgba(0, 229, 153, 0.75);
            border-color: rgba(57, 242, 157, 1);
            transform: scale(1.03);
          }
        }

        @keyframes pulseRadarWave {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.18);
            opacity: 0.25;
          }
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }
      `}</style>

      {/* 1. HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(7, 26, 20, 0.9)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border, rgba(24, 201, 120, 0.15))",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div
          onClick={() => onNavigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            userSelect: "none"
          }}
        >
          <BicitaxiIcon size={34} decorative />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px", color: "#fff" }}>
                BiciTaxi
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: "rgba(24, 201, 120, 0.18)",
                  color: "var(--primary, #18C978)",
                  padding: "1px 6px",
                  borderRadius: 6
                }}
              >
                {t.brandTag}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 10.5, color: "var(--textSecondary, rgba(244, 235, 221, 0.6))" }}>
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Seletor de Idiomas (PT, EN, FR) sem bibliotecas externas */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 3,
              gap: 2
            }}
            aria-label="Language selector"
          >
            {["pt", "en", "fr"].map((item) => {
              const isActive = lang === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLang(item)}
                  style={{
                    background: isActive ? "var(--primary, #18C978)" : "transparent",
                    color: isActive ? "#000" : "var(--textSecondary, rgba(244, 235, 221, 0.75))",
                    fontWeight: 700,
                    fontSize: 11.5,
                    padding: "4px 8px",
                    borderRadius: 7,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    border: "none",
                    outline: "none"
                  }}
                  title={item.toUpperCase()}
                >
                  {item.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* 2. HERO SECTION */}
        <section
          style={{
            padding: "44px 20px 40px",
            maxWidth: 1000,
            margin: "0 auto",
            width: "100%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          {/* TAREFA 1: O ÍCONE PULSANTE (HERO SECTION) */}
          <div style={{ position: "relative", marginBottom: 28, display: "flex", justifyContent: "center" }}>
            {/* Ondas de radar se expandindo atrás */}
            <div
              style={{
                position: "absolute",
                inset: -10,
                borderRadius: 30,
                border: "1px solid rgba(0, 229, 153, 0.3)",
                animation: "pulseRadarWave 3s ease-out infinite",
                pointerEvents: "none"
              }}
            />
            {/* Container com Tailwind classes e inline fallback de pulso/neon */}
            <div
              className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-black border border-emerald-500/50 shadow-[0_0_30px_rgba(0,229,153,0.4)] animate-[pulse_3s_ease-in-out_infinite] flex items-center justify-center"
              style={{
                width: "clamp(128px, 18vw, 160px)",
                height: "clamp(128px, 18vw, 160px)",
                borderRadius: 24,
                background: "#000000",
                border: "1px solid rgba(16, 185, 129, 0.5)",
                boxShadow: "0 0 35px rgba(0, 229, 153, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulseRadar 3s ease-in-out infinite",
                overflow: "hidden"
              }}
            >
              <img
                src="/icons/bicitaxi-afua-transparent.png"
                alt="BiciTaxi Quadriciclo Afuá"
                style={{
                  width: "80%",
                  height: "80%",
                  objectFit: "contain",
                  display: "block",
                  filter: "brightness(1.15) drop-shadow(0 4px 12px rgba(0, 229, 153, 0.35))",
                  userSelect: "none"
                }}
              />
            </div>
          </div>

          {/* Selo Open Source */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(24, 201, 120, 0.1)",
              border: "1px solid rgba(24, 201, 120, 0.3)",
              borderRadius: 9999,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--primaryGlow, #39F29D)",
              boxShadow: "0 0 16px rgba(57, 242, 157, 0.15)",
              marginBottom: 18
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#39F29D",
                boxShadow: "0 0 8px #39F29D"
              }}
            />
            <span>{t.badge} • {t.badgeSub}</span>
          </div>

          {/* Título de Impacto */}
          <h1
            style={{
              fontSize: "clamp(28px, 5.2vw, 48px)",
              fontWeight: 800,
              lineHeight: 1.15,
              margin: "0 0 16px",
              letterSpacing: "-0.8px",
              color: "#ffffff"
            }}
          >
            {t.title} <br />
            <span
              style={{
                background: "linear-gradient(135deg, #18C978 0%, #39F29D 50%, #F4C542 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              {t.titleHighlight}
            </span>
          </h1>

          {/* Subtítulo */}
          <p
            style={{
              fontSize: "clamp(15px, 2.5vw, 18px)",
              color: "var(--textSecondary, rgba(244, 235, 221, 0.75))",
              maxWidth: 620,
              lineHeight: 1.6,
              margin: "0 0 32px"
            }}
          >
            {t.subtitle}
          </p>

          {/* Dois Botões Principais */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              justifyContent: "center",
              width: "100%",
              maxWidth: 480,
              marginBottom: 28
            }}
          >
            <a
              href="/app"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/app");
              }}
              className="btn btn-primary-gradient"
              style={{
                flex: "1 1 200px",
                padding: "16px 28px",
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 700,
                textDecoration: "none",
                textAlign: "center",
                boxShadow: "0 6px 22px rgba(24, 201, 120, 0.3)"
              }}
            >
              <BicitaxiIcon size={24} decorative />
              <span>{t.btnCall}</span>
            </a>

            <a
              href="/motorista"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("/motorista");
              }}
              className="btn btn-secondary"
              style={{
                flex: "1 1 180px",
                padding: "16px 24px",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="7" r="4" />
                <path d="M5 21v-2.5A5.5 5.5 0 0 1 10.5 13h3A5.5 5.5 0 0 1 19 18.5V21" />
              </svg>
              <span>{t.btnDriver}</span>
            </a>
          </div>

          {/* PWA Install Button */}
          <div style={{ marginBottom: 36 }}>
            <InstallPwaButton />
          </div>

          {/* Destaques Rápidos */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              width: "100%",
              maxWidth: 780
            }}
          >
            <div className="glass-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🌱</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{t.statEcological}</div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--textSecondary)" }}>{t.statEcologicalDesc}</p>
            </div>

            <div className="glass-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🤝</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{t.statFees}</div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--textSecondary)" }}>{t.statFeesDesc}</p>
            </div>

            <div className="glass-card" style={{ padding: "16px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{t.statDirect}</div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--textSecondary)" }}>{t.statDirectDesc}</p>
            </div>
          </div>
        </section>

        {/* 3. SEÇÃO COMO FUNCIONA */}
        <section
          style={{
            padding: "48px 20px",
            background: "rgba(16, 37, 29, 0.4)",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)"
          }}
        >
          <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                color: "var(--primary, #18C978)",
                marginBottom: 6,
                display: "block"
              }}
            >
              {t.howItWorksTag}
            </span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, margin: "0 0 36px", color: "#fff" }}>
              {t.howItWorks}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
                textAlign: "left"
              }}
            >
              {/* Passo 1 */}
              <div
                className="glass-card"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  position: "relative"
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(24, 201, 120, 0.15)",
                    border: "1px solid var(--border)",
                    color: "var(--primary, #18C978)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 800
                  }}
                >
                  1
                </div>
                <h3 style={{ margin: 0, fontSize: 17, color: "#fff", fontWeight: 700 }}>
                  {t.step1Title}
                </h3>
                <p style={{ margin: 0, fontSize: 13.5, color: "var(--textSecondary)", lineHeight: 1.55 }}>
                  {t.step1Desc}
                </p>
              </div>

              {/* Passo 2 */}
              <div
                className="glass-card"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  position: "relative"
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(244, 197, 66, 0.15)",
                    border: "1px solid rgba(244, 197, 66, 0.3)",
                    color: "var(--secondary, #F4C542)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 800
                  }}
                >
                  2
                </div>
                <h3 style={{ margin: 0, fontSize: 17, color: "#fff", fontWeight: 700 }}>
                  {t.step2Title}
                </h3>
                <p style={{ margin: 0, fontSize: 13.5, color: "var(--textSecondary)", lineHeight: 1.55 }}>
                  {t.step2Desc}
                </p>
              </div>

              {/* Passo 3 */}
              <div
                className="glass-card"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  position: "relative"
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(198, 83, 50, 0.18)",
                    border: "1px solid rgba(198, 83, 50, 0.35)",
                    color: "var(--accent, #E98645)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 800
                  }}
                >
                  3
                </div>
                <h3 style={{ margin: 0, fontSize: 17, color: "#fff", fontWeight: 700 }}>
                  {t.step3Title}
                </h3>
                <p style={{ margin: 0, fontSize: 13.5, color: "var(--textSecondary)", lineHeight: 1.55 }}>
                  {t.step3Desc}
                </p>
              </div>

              {/* Passo 4 */}
              <div
                className="glass-card"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  position: "relative"
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(24, 201, 120, 0.15)",
                    border: "1px solid var(--border)",
                    color: "var(--primary, #18C978)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    fontWeight: 800
                  }}
                >
                  4
                </div>
                <h3 style={{ margin: 0, fontSize: 17, color: "#fff", fontWeight: 700 }}>
                  {t.step4Title}
                </h3>
                <p style={{ margin: 0, fontSize: 13.5, color: "var(--textSecondary)", lineHeight: 1.55 }}>
                  {t.step4Desc}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. SEÇÃO DE FAQ */}
        <section style={{ padding: "52px 20px", maxWidth: 800, margin: "0 auto", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1.2px",
                color: "var(--primary, #18C978)",
                marginBottom: 6,
                display: "block"
              }}
            >
              {t.faqTag}
            </span>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, margin: 0, color: "#fff" }}>
              {t.faqTitle}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {t.faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="glass-card"
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    border: isOpen ? "1px solid var(--primary, #18C978)" : "1px solid var(--border)",
                    transition: "border-color 0.2s"
                  }}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    style={{
                      width: "100%",
                      padding: "18px 20px",
                      background: "transparent",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 600,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      textAlign: "left",
                      gap: 12,
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    <span>{faq.q}</span>
                    <span
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        color: "var(--primary, #18C978)",
                        fontSize: 16
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: "0 20px 18px",
                        fontSize: 14,
                        color: "var(--textSecondary, rgba(244, 235, 221, 0.75))",
                        lineHeight: 1.6,
                        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                        paddingTop: 12,
                        whiteSpace: "pre-line"
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* 5. FOOTER */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          background: "rgba(7, 26, 20, 0.95)",
          padding: "36px 20px 24px",
          textAlign: "center"
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
            <BicitaxiIcon size={26} decorative />
            <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>BiciTaxi Afuá</span>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: "var(--textSecondary)", maxWidth: 500, alignSelf: "center" }}>
            {t.footerSubtitle}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "12px 24px",
              fontSize: 13
            }}
          >
            <button
              onClick={() => setTermsModal("terms")}
              style={{
                background: "transparent",
                color: "var(--textSecondary)",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
                border: "none"
              }}
            >
              {t.terms}
            </button>

            <button
              onClick={() => setTermsModal("privacy")}
              style={{
                background: "transparent",
                color: "var(--textSecondary)",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
                border: "none"
              }}
            >
              {t.privacy}
            </button>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              paddingTop: 16,
              fontSize: 12,
              color: "rgba(244, 235, 221, 0.5)"
            }}
          >
            {t.devCredit}
          </div>
        </div>
      </footer>

      {/* MODAL DE TERMOS / PRIVACIDADE */}
      {termsModal && (
        <div
          onClick={() => setTermsModal(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card"
            style={{
              maxWidth: 540,
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: 24,
              borderRadius: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#fff", fontWeight: 700 }}>
                {termsModal === "terms" ? t.termsTitle : t.privacyTitle}
              </h3>
              <button
                onClick={() => setTermsModal(null)}
                style={{
                  background: "transparent",
                  color: "var(--textSecondary)",
                  fontSize: 20,
                  cursor: "pointer",
                  padding: 4,
                  border: "none"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 13.5, color: "var(--textSecondary)", lineHeight: 1.6 }}>
              {termsModal === "terms" ? (
                <>
                  <p><strong>1. Natureza do Serviço:</strong> O BiciTaxi é uma plataforma de código aberto e comunitária desenvolvida com o objetivo de facilitar a comunicação direta entre passageiros e bicitaxistas da cidade de Afuá - PA.</p>
                  <p><strong>2. Ausência de Intermediação Financeira:</strong> A plataforma não processa pagamentos nem cobra comissões sobre os valores negociados entre passageiro e condutor. Toda transação financeira é realizada diretamente entre as partes.</p>
                  <p><strong>3. Responsabilidade do Transporte:</strong> Os condutores atuam de forma autônoma e independente. O serviço preza pelo respeito às normas locais de trânsito em passarelas e convivência em Afuá.</p>
                </>
              ) : (
                <>
                  <p><strong>1. Coleta Mínima de Dados:</strong> O BiciTaxi coleta exclusivamente o número de telefone informado para viabilizar a comunicação e localização durante o pedido de corrida.</p>
                  <p><strong>2. Uso do Telefone:</strong> O telefone do passageiro é compartilhado apenas com o condutor que aceitar a corrida ou utilizado para iniciar o contato via WhatsApp.</p>
                  <p><strong>3. Não Comercialização:</strong> Nenhum dado pessoal é vendido, alugado ou repassado a terceiros para fins de marketing ou publicidade.</p>
                </>
              )}
            </div>

            <button
              className="btn btn-primary-gradient"
              onClick={() => setTermsModal(null)}
              style={{ padding: "10px 16px", borderRadius: 10, fontWeight: 700 }}
            >
              {t.modalClose}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
