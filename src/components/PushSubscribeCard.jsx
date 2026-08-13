import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  isPushSupported, 
  getNotificationPermission, 
  requestNotificationPermission, 
  registerDriverPushSubscription, 
  registerPassengerPushSubscription,
  getCurrentPushSubscription,
  isIOS,
  isStandalone
} from "../services/pushNotifications";

const C = {
  bg: "var(--background)",
  surface: "var(--surface)",
  surfaceAlt: "var(--surfaceElevated)",
  text: "var(--textPrimary)",
  textMuted: "var(--textSecondary)",
  online: "var(--primary)",
  border: "var(--border)"
};

export default function PushSubscribeCard({ userType, driverId, rideId, publicTrackingToken }) {
  const { t, i18n } = useTranslation();
  
  // "checking" | "unsupported" | "permission-default" | "permission-denied" | "subscription-missing" | "subscription-active" | "error"
  const [status, setStatus] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      if (!isPushSupported()) {
        setStatus("unsupported");
        return;
      }

      const permission = getNotificationPermission();

      if (permission === "denied") {
        setStatus("permission-denied");
        return;
      }

      if (permission === "default") {
        setStatus("permission-default");
        return;
      }

      if (permission === "granted") {
        const sub = await getCurrentPushSubscription();
        if (sub) {
          setStatus("subscription-active");
        } else {
          setStatus("subscription-missing");
        }
      }
    } catch (err) {
      console.error("Push check error:", err);
      setStatus("error");
    }
  };

  const handleSubscribe = async () => {
    if (isIOS() && !isStandalone()) {
      alert(t("iosInstallPwaPrompt", { defaultValue: "Para receber notificações no iPhone, instale o BiciTaxi na Tela de Início (Compartilhar -> Adicionar à Tela de Início)." }));
      return;
    }

    setLoading(true);
    setErrorMsg("");
    
    try {
      // Pede permissão (se não foi concedida)
      let perm = getNotificationPermission();
      if (perm !== "granted") {
        perm = await requestNotificationPermission();
        if (perm === "denied") {
          setStatus("permission-denied");
          setLoading(false);
          return;
        }
      }
      
      // Registra a inscrição no backend
      if (userType === "DRIVER") {
        await registerDriverPushSubscription(driverId, i18n.language);
      } else if (userType === "PASSENGER") {
        await registerPassengerPushSubscription(rideId, publicTrackingToken, i18n.language);
      }

      setStatus("subscription-active");

    } catch (err) {
      console.error(err);
      setErrorMsg(t("errorPushSubscribe", { defaultValue: "Erro ao ativar notificações." }));
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (status === "checking" || status === "unsupported" || status === "subscription-active") {
    return null;
  }

  const title = userType === "DRIVER" 
    ? t("driverPushTitle", { defaultValue: "Receber novas corridas" }) 
    : t("passengerPushTitle", { defaultValue: "Receber atualizações da corrida" });
    
  const desc = userType === "DRIVER"
    ? t("driverPushDesc", { defaultValue: "Ative as notificações para ser avisado mesmo quando o BiciTaxi estiver fechado." })
    : t("passengerPushDesc", { defaultValue: "Ative as notificações para ser avisado sobre o bicitaxista mesmo com o app fechado." });

  let buttonLabel = t("enableNotifications", { defaultValue: "Ativar notificações" });
  if (status === "subscription-missing") {
    buttonLabel = t("reactivateNotifications", { defaultValue: "Reativar notificações" });
  }

  return (
    <div className="fade-in" style={{ background: C.surface, border: `1px solid ${C.online}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ background: "rgba(242, 201, 76, 0.1)", padding: 8, borderRadius: 50 }}>
          <svg width="20" height="20" fill="none" stroke={C.online} strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "#fff" }}>{title}</h4>
          
          {status === "permission-denied" ? (
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--error)" }}>
              {t("pushDeniedMsg", { defaultValue: "As notificações estão bloqueadas. Por favor, libere nas configurações do seu navegador para usar o app." })}
            </p>
          ) : (
            <p style={{ margin: "0 0 12px", fontSize: 12, color: C.textMuted }}>{desc}</p>
          )}
          
          {errorMsg && <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--error)" }}>{errorMsg}</p>}
          
          {status !== "permission-denied" && (
            <button 
              className="btn" 
              onClick={handleSubscribe} 
              disabled={loading}
              style={{ padding: "8px 16px", borderRadius: 8, background: C.online, color: "#000", fontWeight: 700, fontSize: 13, border: "none" }}
            >
              {loading ? t("loading", { defaultValue: "Aguarde..." }) : buttonLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
