import React, { useEffect, useState } from "react";

/**
 * Componente AppAlertBanner
 * 
 * @param {string} type - "info" | "success" | "warning" | "danger"
 * @param {string} message - Mensagem a ser exibida
 * @param {boolean} visible - Controle de visibilidade externa
 * @param {function} onClose - Callback chamado quando o usuário fecha ou por timeout
 */
export default function AppAlertBanner({ type = "info", message, visible, onClose }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timeout;
    if (visible) {
      setShow(true);
      // Auto-fechar em 5 segundos
      timeout = setTimeout(() => {
        handleClose();
      }, 5000);
    } else {
      setShow(false);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [visible]);

  const handleClose = () => {
    setShow(false);
    if (onClose) {
      setTimeout(onClose, 300); // Dar tempo para animação terminar
    }
  };

  if (!show && !visible) return null;

  // Definição de cores e ícones por tipo
  let bg = "var(--surfaceElevated)";
  let color = "var(--textPrimary)";
  let border = "var(--border)";
  let Icon = null;

  switch (type) {
    case "success":
      border = "var(--success)";
      color = "var(--success)";
      Icon = () => (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
      );
      break;
    case "warning":
      border = "var(--secondary)";
      color = "var(--secondary)";
      Icon = () => (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      );
      break;
    case "danger":
      border = "var(--error)";
      color = "var(--error)";
      Icon = () => (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>
      );
      break;
    default:
      border = "#3b82f6";
      color = "#3b82f6";
      Icon = () => (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      );
      break;
  }

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "env(safe-area-inset-top, 10px) 16px 10px",
        zIndex: 9999,
        pointerEvents: "none", // Permite clicar "através" do container geral
      }}
    >
      <div
        style={{
          background: bg,
          border: `1.5px solid ${border}`,
          borderRadius: 14,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
          pointerEvents: "auto", // Torna o banner em si clicável
          transform: show ? "translateY(0)" : "translateY(-150%)",
          opacity: show ? 1 : 0,
          transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ color, display: "flex", alignItems: "center" }}>
          {Icon && <Icon />}
        </div>
        <p style={{ margin: 0, flex: 1, fontSize: 13.5, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>
          {message}
        </p>
        <button
          onClick={handleClose}
          aria-label="Fechar alerta"
          style={{
            background: "transparent",
            border: "none",
            color: "#9A9A9A",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>
  );
}
