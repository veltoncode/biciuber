import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "./lib/supabaseClient";
import {
  createRide,
  getPendingRides,
  acceptRide,
  cancelRide,
  getActiveRideForDriver,
  getDriverById,
  updateRideStatus,
} from "./services/rides.js";
import { subscribeToRide, subscribeToPendingRides, subscribeToDriverRide } from "./services/rideRealtime.js";
import BicitaxiIcon from "./components/BicitaxiIcon.jsx";
import WelcomeScreen from "./components/WelcomeScreen.jsx";
import AppAlertBanner from "./components/AppAlertBanner.jsx";
import PushSubscribeCard from "./components/PushSubscribeCard.jsx";
import { playAlertSound, vibrateAlert, unlockAudio, canPlaySound, toggleSoundPref } from "./services/appAlerts.js";

const C = {
  bg: "var(--background)",
  surface: "var(--surface)",
  surfaceAlt: "var(--surfaceElevated)",
  border: "var(--border)",
  text: "var(--textPrimary)",
  textMuted: "var(--textSecondary)",
  online: "var(--primary)",
};

function onlyDigits(s) {
  return s ? s.replace(/\D/g, "") : "";
}

function formatWhatsappUrl(phone, defaultMessage) {
  if (!phone) return "#";
  const digits = phone.replace(/\D/g, "");
  const fullPhone = (digits.length === 10 || digits.length === 11) ? `55${digits}` : digits;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(defaultMessage)}`;
}

function calcTimeAgo(dateString, t) {
  if (!dateString) return "";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("timeJustNow", { defaultValue: "agora mesmo" });
  return t("timeAgo", { time: `${mins} min`, defaultValue: `há ${mins} min` });
}

function Logo({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.24, background: "var(--surface)", border: "1.5px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <BicitaxiIcon size={size * 0.65} color="var(--primaryGlow)" />
    </div>
  );
}

function TopBar({ subtitle }) {
  return (
    <div style={{ padding: "22px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
      <Logo size={36} />
      <div>
        <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{subtitle}</p>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: -0.3 }}>BiciTaxi</h1>
      </div>
    </div>
  );
}

function RouteLine({ progress = 0.2 }) {
  return (
    <svg viewBox="0 0 320 70" style={{ width: "100%", height: 70 }}>
      <line x1="14" y1="35" x2="306" y2="35" stroke={C.border} strokeWidth="2" strokeDasharray="1 8" strokeLinecap="round" />
      <circle cx="14" y1="35" r="6" fill="#fff" />
      <circle cx="306" cy="35" r="6" fill="none" stroke="#fff" strokeWidth="2" />
      <g style={{ transform: `translate(${14 + progress * 292}px, 35px)`, transition: "transform 0.4s ease-out" }}>
        <circle r="9" fill={C.online} />
      </g>
    </svg>
  );
}

function Button({ children, onClick, disabled, variant = "primary", style = {}, className = "btn" }) {
  const baseClassName = className === "btn" ? "" : className;
  const combinedClass = variant === "primary" ? `btn btn-primary-gradient ${baseClassName}` : variant === "secondary" ? `btn btn-secondary ${baseClassName}` : variant === "cultural" ? `btn btn-cultural ${baseClassName}` : `btn ${baseClassName}`;
  
  const styles = {
    primary: {},
    secondary: {},
    cultural: {},
    decline: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
  };
  return (
    <button
      className={combinedClass}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        padding: "14px 18px",
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 15,
        width: "100%",
        minHeight: 52,
        position: "static",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...style
      }}
    >
      {children}
    </button>
  );
}

const inputStyle = {
  width: "100%",
  background: "rgba(0, 0, 0, 0.25)",
  border: `1px solid var(--border)`,
  padding: "16px 18px",
  fontSize: 15,
  color: "var(--textPrimary)",
  borderRadius: 14,
};

// ---------------- PASSENGER ----------------
function PassengerApp() {
  const { t } = useTranslation();
  const [stage, setStage] = useState("form"); // "form" | "requested"
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState("");
  const [dest, setDest] = useState("");
  const [count, setCount] = useState(1);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [notes, setNotes] = useState("");

  const [activeRide, setActiveRide] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelErrorMsg, setCancelErrorMsg] = useState("");
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState("");

  const [liveStatus, setLiveStatus] = useState("");
  const [driverInfo, setDriverInfo] = useState(null);

  const prevStatus = useRef(null);
  const [banner, setBanner] = useState({ visible: false, type: "info", message: "" });

  const showBanner = (type, message) => {
    setBanner({ visible: true, type, message });
  };

  // Restauração de Sessão (biciuber-active-ride)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("biciuber-active-ride");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          (parsed.status === "REQUESTED" || parsed.status === "ACCEPTED" || parsed.status === "DRIVER_ARRIVING" || parsed.status === "DRIVER_ARRIVED" || parsed.status === "IN_PROGRESS") &&
          parsed.expiresAt &&
          new Date(parsed.expiresAt) > new Date()
        ) {
          setActiveRide(parsed);
          setStage("requested");
        } else {
          localStorage.removeItem("biciuber-active-ride");
        }
      }
    } catch (e) {
      console.error("Erro ao ler localStorage biciuber-active-ride:", e);
      localStorage.removeItem("biciuber-active-ride");
    }
  }, []);

  // Supabase Realtime para a corrida ativa do Passageiro
  useEffect(() => {
    if (!activeRide || cancelling) return;

    const loadDriver = async (driverId) => {
      try {
        const d = await getDriverById(driverId);
        if (d) setDriverInfo(d);
      } catch (err) {
        console.error("Erro ao buscar motorista:", err);
      }
    };

    // Se já foi restaurada uma corrida aceita do localStorage sem driverInfo, busca logo.
    if (activeRide.driver_id && !driverInfo) {
      loadDriver(activeRide.driver_id);
    }

    const unsubscribe = subscribeToRide(activeRide.id, {
      onStatusChange: (status) => {
        if (status === "SUBSCRIBED") {
          setLiveStatus(t("liveConnectionActive", { defaultValue: "Conectado em tempo real" }));
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          setLiveStatus(t("reconnecting", { defaultValue: "Reconectando..." }));
        } else if (status === "CHANNEL_ERROR") {
          setLiveStatus(t("liveConnectionFailed", { defaultValue: "Falha na conexão" }));
        }
      },
      onUpdate: (newRide) => {
        // Atualiza a UI se o status for um dos ativos
        // Comparar status antigo
        if (prevStatus.current && prevStatus.current !== newRide.status) {
          if (newRide.status === "ACCEPTED") {
            playAlertSound("RIDE_ACCEPTED");
            vibrateAlert("NEW_RIDE");
            showBanner("success", t("alertRideAccepted", { defaultValue: "Um bicitaxista aceitou sua solicitação." }));
          } else if (newRide.status === "DRIVER_ARRIVING") {
            playAlertSound("DRIVER_ARRIVING");
            vibrateAlert("NEW_RIDE");
            showBanner("info", t("alertDriverArriving", { defaultValue: "O bicitaxista está a caminho." }));
          } else if (newRide.status === "DRIVER_ARRIVED") {
            playAlertSound("DRIVER_ARRIVED");
            vibrateAlert("DRIVER_ARRIVED");
            showBanner("success", t("alertDriverArrived", { defaultValue: "O bicitaxista chegou." }));
          } else if (newRide.status === "IN_PROGRESS") {
            playAlertSound("RIDE_STARTED");
            vibrateAlert("NEW_RIDE");
            showBanner("info", t("alertRideStarted", { defaultValue: "Corrida iniciada." }));
          }
        }
        
        prevStatus.current = newRide.status; // atualizar ref

        if (["ACCEPTED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "IN_PROGRESS"].includes(newRide.status)) {
          const updatedRide = { ...activeRide, ...newRide };
          setActiveRide(updatedRide);
          localStorage.setItem("biciuber-active-ride", JSON.stringify(updatedRide));
          
          if (newRide.driver_id && newRide.status === "ACCEPTED" && (!driverInfo || driverInfo.id !== newRide.driver_id)) {
            loadDriver(newRide.driver_id);
          }
        } 
        // Lida com cancelamentos ou conclusões
        else if (newRide.status === "CANCELLED") {
          playAlertSound("RIDE_CANCELLED");
          vibrateAlert("RIDE_CANCELLED");
          localStorage.removeItem("biciuber-active-ride");
          setActiveRide(null);
          setDriverInfo(null);
          setStage("form");
          setCancelErrorMsg(t("driverCancelled", { defaultValue: "O passageiro cancelou a corrida." })); // Will override text in UI
        }
        else if (newRide.status === "COMPLETED") {
          playAlertSound("RIDE_COMPLETED");
          vibrateAlert("NEW_RIDE");
          localStorage.removeItem("biciuber-active-ride");
          setActiveRide(null);
          setDriverInfo(null);
          setStage("completed");
        }
        else if (newRide.status === "EXPIRED") {
          localStorage.removeItem("biciuber-active-ride");
          setActiveRide(null);
          setDriverInfo(null);
          setStage("form");
          setCancelErrorMsg(t("rideExpired", { defaultValue: "Nenhum bicitaxista aceitou a solicitação a tempo." }));
        }
      },
      onError: (err) => {
        console.error("Erro Realtime:", err);
      }
    });

    return () => unsubscribe();
  }, [activeRide?.id, activeRide?.driver_id, cancelling, t]);


  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    unlockAudio();
    setErrorMsg("");
    setCancelSuccessMsg("");
    setCancelErrorMsg("");

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedPickup = pickup.trim();
    const trimmedDest = dest.trim();

    if (!trimmedName) {
      setErrorMsg(t("errorNameRequired", { defaultValue: "Informe seu nome." }));
      return;
    }
    if (!trimmedPhone) {
      setErrorMsg(t("errorPhoneRequired", { defaultValue: "Informe seu telefone." }));
      return;
    }
    if (!trimmedPickup) {
      setErrorMsg(t("errorPickupRequired", { defaultValue: "Informe o ponto de partida." }));
      return;
    }
    if (!trimmedDest) {
      setErrorMsg(t("errorDestinationRequired", { defaultValue: "Informe o destino." }));
      return;
    }
    const countNum = Number(count);
    if (isNaN(countNum) || countNum < 1 || countNum > 6) {
      setErrorMsg(t("errorPassengerCountRange", { defaultValue: "Escolha entre 1 e 6 passageiros." }));
      return;
    }

    setSubmitting(true);

    try {
      const ride = await createRide({
        passenger_name: trimmedName,
        passenger_phone: trimmedPhone,
        pickup_description: trimmedPickup,
        destination_description: trimmedDest,
        passenger_count: countNum,
        has_luggage: Boolean(hasLuggage),
        notes: notes ? notes.trim() : "",
      });

      const activeData = {
        id: ride.id,
        publicTrackingToken: ride.public_tracking_token,
        status: ride.status,
        createdAt: ride.created_at,
        expiresAt: ride.expires_at,
        passengerName: trimmedName,
        passengerPhone: trimmedPhone,
        pickupDescription: trimmedPickup,
        destinationDescription: trimmedDest,
        passengerCount: countNum,
        hasLuggage: Boolean(hasLuggage),
        notes: notes ? notes.trim() : "",
      };

      localStorage.setItem("biciuber-active-ride", JSON.stringify(activeData));
      setActiveRide(activeData);
      setStage("requested");
    } catch (err) {
      console.error("Erro técnico ao criar corrida:", err);
      setErrorMsg(t("errorCreateRideFailed", { defaultValue: "Não foi possível solicitar o bicitáxi. Tente novamente." }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRide = async () => {
    if (!activeRide || cancelling) return;

    const confirmMsg = t("confirmCancelRide", { defaultValue: "Deseja cancelar esta solicitação?" });
    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) return;

    setCancelling(true);
    setCancelErrorMsg("");

    try {
      await cancelRide(activeRide.id, activeRide.publicTrackingToken);

      localStorage.removeItem("biciuber-active-ride");
      setActiveRide(null);
      setStage("form");
      setCancelSuccessMsg(t("rideCancelledSuccess", { defaultValue: "Solicitação cancelada." }));
    } catch (err) {
      console.error("Erro ao cancelar solicitação de corrida pelo passageiro:", {
        rideId: activeRide.id,
        token: activeRide.publicTrackingToken,
        error: err
      });

      if (err.code === "RIDE_NOT_CANCELLABLE" || err.message?.includes("RIDE_NOT_CANCELLABLE")) {
        setCancelErrorMsg(t("errorRideNotCancellable", { defaultValue: "Esta solicitação não pode mais ser cancelada." }));
      } else {
        setCancelErrorMsg(t("errorCancelRideFailed", { defaultValue: "Não foi possível cancelar a solicitação. Tente novamente." }));
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <AppAlertBanner 
        type={banner.type} 
        message={banner.message} 
        visible={banner.visible} 
        onClose={() => setBanner({ ...banner, visible: false })} 
      />
      <TopBar subtitle="Passageiro" />
      {liveStatus && (
        <div style={{ background: C.surfaceAlt, padding: "4px 0", textAlign: "center", fontSize: 11, color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
          {liveStatus}
        </div>
      )}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        {stage === "form" && (
          <form onSubmit={handleFormSubmit} className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {cancelSuccessMsg && (
              <p style={{ color: C.online, fontSize: 13.5, margin: 0, fontWeight: 600, textAlign: "center" }}>
                {cancelSuccessMsg}
              </p>
            )}

            <p style={{ color: C.textMuted, fontSize: 13.5, margin: 0 }}>{t("whereToDesc", { defaultValue: "Onde você tá e pra onde vai?" })}</p>
            
            <div>
              <p style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>
                {t("passengerName", { defaultValue: "Seu nome" })} *
              </p>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria Santos"
                disabled={submitting}
              />
            </div>

            <div>
              <p style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>
                {t("passengerPhone", { defaultValue: "Seu telefone" })} *
              </p>
              <input
                style={inputStyle}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 91 98123-4567"
                inputMode="tel"
                disabled={submitting}
              />
            </div>

            <div>
              <p style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>
                {t("pickupLocation", { defaultValue: "Ponto de partida" })} *
              </p>
              <input
                style={inputStyle}
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="Ex: perto da igreja matriz"
                disabled={submitting}
              />
            </div>

            <div>
              <p style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>
                {t("destinationLocation", { defaultValue: "Destino" })} *
              </p>
              <input
                style={inputStyle}
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                placeholder="Ex: porto do mercado"
                disabled={submitting}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>
                  {t("passengerCount", { defaultValue: "Passageiros" })}
                </p>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  disabled={submitting}
                >
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num} style={{ background: C.surface, color: "#fff" }}>
                      {num} {num === 1 ? "pessoa" : "pessoas"}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 46,
                  padding: "0 14px",
                  borderRadius: 12,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  color: "#fff",
                  fontSize: 13.5,
                  cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={hasLuggage}
                    onChange={(e) => setHasLuggage(e.target.checked)}
                    disabled={submitting}
                    style={{ width: 16, height: 16, accentColor: "var(--secondary)" }}
                  />
                  <span>{t("hasLuggage", { defaultValue: "Bagagem?" })}</span>
                </label>
              </div>
            </div>

            <div>
              <p style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>
                {t("notesOptional", { defaultValue: "Observações (opcional)" })}
              </p>
              <input
                style={inputStyle}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Mala grande / próximo à ponte"
                disabled={submitting}
              />
            </div>

            {errorMsg && (
              <p style={{ color: "var(--error)", fontSize: 13, margin: "2px 0 0", fontWeight: 500 }}>
                {errorMsg}
              </p>
            )}

            <div style={{ marginTop: 8 }}>
              <Button onClick={handleFormSubmit} disabled={submitting}>
                {submitting
                  ? t("sendingRequest", { defaultValue: "Enviando solicitação..." })
                  : t("callRide", { defaultValue: "Chamar um bicitáxi" })}
              </Button>
            </div>
          </form>
        )}

        {stage === "requested" && activeRide && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="glass-card" style={{
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 14
            }}>
              {activeRide.status === "REQUESTED" ? (
                <>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: `3px solid ${C.border}`,
                    borderTopColor: C.online,
                    animation: "spin 0.8s linear infinite"
                  }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>
                      {t("lookingForBicitaxi", { defaultValue: "Procurando um bicitáxi..." })}
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted }}>
                      {t("rideCode", { defaultValue: "Código da corrida" })}: <strong style={{ color: "#fff", fontFamily: "monospace" }}>#{activeRide.id ? activeRide.id.slice(0, 6).toUpperCase() : ""}</strong>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "rgba(24, 201, 120, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.online
                  }}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>
                      {activeRide.status === "ACCEPTED" && t("statusDriverFound", { defaultValue: "Bicitáxi encontrado" })}
                      {activeRide.status === "DRIVER_ARRIVING" && t("statusDriverArriving", { defaultValue: "Bicitaxista a caminho" })}
                      {activeRide.status === "DRIVER_ARRIVED" && t("statusDriverArrived", { defaultValue: "Bicitaxista chegou" })}
                      {activeRide.status === "IN_PROGRESS" && t("statusInProgress", { defaultValue: "Corrida em andamento" })}
                    </h3>
                    {driverInfo && (
                      <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: 12, textAlign: "left" }}>
                        <p style={{ margin: 0, fontSize: 14, color: "#fff", fontWeight: 600 }}>{driverInfo.name}</p>
                        <p style={{ margin: "4px 0", fontSize: 13, color: C.textMuted }}>Placa: <strong style={{color:"#fff"}}>{driverInfo.plate || "N/A"}</strong></p>
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                           <a href={`tel:${driverInfo.phone}`} style={{ flex: 1, textDecoration: "none" }}>
                             <Button style={{ minHeight: 36, fontSize: 13, padding: "0 12px" }}>Ligar</Button>
                           </a>
                           <a href={`https://wa.me/55${driverInfo.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: "none" }}>
                             <Button style={{ minHeight: 36, fontSize: 13, padding: "0 12px", background: "#25D366", color: "#fff" }}>WhatsApp</Button>
                           </a>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <PushSubscribeCard 
              userType="PASSENGER" 
              rideId={activeRide.id} 
              publicTrackingToken={activeRide.publicTrackingToken} 
            />

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t("pickupLocation", { defaultValue: "Ponto de partida" })}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 14.5, fontWeight: 600, color: "#fff" }}>{activeRide.pickupDescription}</p>
              </div>

              <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
                <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t("destinationLocation", { defaultValue: "Destino" })}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 14.5, fontWeight: 600, color: "#fff" }}>{activeRide.destinationDescription}</p>
              </div>

              <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>
                  <span style={{ color: C.textMuted }}>{t("passengerCount", { defaultValue: "Passageiros" })}:</span> <strong>{activeRide.passengerCount}</strong>
                </span>
                <span>
                  <span style={{ color: C.textMuted }}>{t("hasLuggage", { defaultValue: "Bagagem" })}:</span> <strong>{activeRide.hasLuggage ? t("yes", { defaultValue: "Sim" }) : t("no", { defaultValue: "Não" })}</strong>
                </span>
              </div>

              {activeRide.expiresAt && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, textAlign: "center", fontSize: 12, color: C.textMuted }}>
                  {t("expiresAt", { defaultValue: "Expira às" })} {new Date(activeRide.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>

            {cancelErrorMsg && (
              <p style={{ color: "var(--error)", fontSize: 13, margin: 0, fontWeight: 500, textAlign: "center" }}>
                {cancelErrorMsg}
              </p>
            )}

            <div style={{ marginTop: 4, width: "100%", position: "static" }}>
              <Button
                onClick={handleCancelRide}
                disabled={cancelling}
                variant="decline"
                style={{
                  width: "100%",
                  minHeight: 52,
                  borderRadius: 12,
                  background: cancelling ? C.surfaceAlt : "transparent",
                  color: cancelling ? C.textMuted : "var(--error)",
                  border: `1px solid ${cancelling ? C.border : "var(--error)"}`,
                  fontWeight: 700,
                  fontSize: 15,
                  position: "static"
                }}
              >
                {cancelling
                  ? t("cancelling", { defaultValue: "Cancelando..." })
                  : t("cancelRide", { defaultValue: "Cancelar solicitação" })}
              </Button>
            </div>
          </div>
        )}

        {stage === "completed" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "20px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.online, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", marginBottom: 10 }}>
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 style={{ color: "#fff", fontSize: 24, margin: "0", textAlign: "center" }}>
              {t("statusCompleted", { defaultValue: "Corrida concluída" })}
            </h2>
            <div style={{ marginTop: 30, width: "100%" }}>
              <Button onClick={() => {
                setStage("form");
                setCancelSuccessMsg("");
                setCancelErrorMsg("");
              }} style={{ width: "100%", height: 54, fontSize: 16, borderRadius: 12 }}>
                {t("newRequest", { defaultValue: "Nova solicitação" })}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- DRIVER LOGIN ----------------
function DriverLogin({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tryLogin = async () => {
    unlockAudio();
    setLoading(true);
    setError("");
    const digits = onlyDigits(phone);
    const { data, error: err } = await supabase
      .from("drivers")
      .select("*")
      .eq("phone", digits)
      .maybeSingle();
    setLoading(false);
    if (err) {
      setError("Erro ao conectar. Confira sua internet e tente de novo.");
      return;
    }
    if (data) {
      onLogin(data);
    } else {
      setError("Telefone não encontrado. Fale com o administrador pra ser cadastrado.");
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <TopBar subtitle="Bicitaxista" />
      <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ color: C.textMuted, fontSize: 13.5, margin: 0 }}>
          Entre com o telefone que foi cadastrado pelo administrador.
        </p>
        <input
          style={inputStyle}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ex: 91 98111-2222"
          inputMode="tel"
        />
        {error && <p style={{ color: "var(--error)", fontSize: 12.5, margin: 0 }}>{error}</p>}
        <Button onClick={tryLogin} disabled={!phone || loading}>{loading ? "Entrando..." : "Entrar"}</Button>
      </div>
    </div>
  );
}

// ---------------- DRIVER APP ----------------
function DriverApp({ driver, onLogout }) {
  const { t } = useTranslation();
  const [available, setAvailable] = useState(true);
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "empty" | "error"
  const [rides, setRides] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingRideId, setAcceptingRideId] = useState(null);
  const [activeDriverRide, setActiveDriverRide] = useState(null);
  const [checkingActiveRide, setCheckingActiveRide] = useState(true);
  const [liveStatus, setLiveStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Alertas
  const [soundEnabled, setSoundEnabled] = useState(canPlaySound());
  const [banner, setBanner] = useState({ visible: false, type: "info", message: "" });
  const [newRideIds, setNewRideIds] = useState([]);
  const pendingRideIds = useRef([]);
  const activeRideStatus = useRef(null);

  const showBanner = (type, message) => {
    setBanner({ visible: true, type, message });
  };

  const handleToggleSound = () => {
    const newVal = toggleSoundPref();
    setSoundEnabled(newVal);
  };

  const loadPendingRides = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setStatus("loading");
    }
    setErrorMsg("");

    try {
      const data = await getPendingRides();
      setRides(data);
      pendingRideIds.current = data.map(r => r.id);
      
      if (data.length === 0) {
        setStatus("empty");
      } else {
        setStatus("success");
      }
    } catch (err) {
      console.error("Erro técnico ao carregar corridas pendentes para o motorista:", err);
      setErrorMsg(t("errorLoadRequestsFailed", { defaultValue: "Não foi possível carregar as solicitações." }));
      setStatus("error");
    } finally {
      setRefreshing(false);
    }
  };

  // Restauração e Validação Segura da Corrida Ativa no Supabase (Zero LocalStorage)
  useEffect(() => {
    let isMounted = true;

    // Limpar obrigatoriamente qualquer resíduo antigo de localStorage
    localStorage.removeItem("biciuber-driver-active-ride");

    async function verifyDriverActiveRide() {
      if (!driver || !driver.id) {
        if (isMounted) {
          setActiveDriverRide(null);
          setCheckingActiveRide(false);
        }
        return;
      }

      setCheckingActiveRide(true);
      setErrorMsg("");

      try {
        const activeFromDb = await getActiveRideForDriver(driver.id);

        if (!isMounted) return;

        if (activeFromDb) {
          setActiveDriverRide(activeFromDb);
        } else {
          setActiveDriverRide(null);
          loadPendingRides();
        }
      } catch (err) {
        console.error("Erro técnico ao verificar corrida ativa no Supabase:", err);
        if (!isMounted) return;
        setActiveDriverRide(null);
        setErrorMsg(t("errorCheckActiveRideFailed", { defaultValue: "Não foi possível verificar sua corrida ativa." }));
        setStatus("error");
      } finally {
        if (isMounted) {
          setCheckingActiveRide(false);
        }
      }
    }

    verifyDriverActiveRide();

    return () => {
      isMounted = false;
    };
  }, [driver?.id, t]);

  // Realtime para Lista de Pendentes
  useEffect(() => {
    if (activeDriverRide || checkingActiveRide) return;

    const unsubscribe = subscribeToPendingRides({
      onStatusChange: (s) => {
        if (s === "SUBSCRIBED") setLiveStatus(t("liveConnectionActive", { defaultValue: "Conectado em tempo real" }));
        else if (s === "TIMED_OUT" || s === "CLOSED") setLiveStatus(t("reconnecting", { defaultValue: "Reconectando..." }));
        else if (s === "CHANNEL_ERROR") setLiveStatus(t("liveConnectionFailed", { defaultValue: "Falha na conexão" }));
      },
      onPendingCreated: (ride) => {
        setRides(prev => {
          if (prev.find(r => r.id === ride.id)) return prev;

          // Se for genuinamente nova
          if (!pendingRideIds.current.includes(ride.id)) {
            pendingRideIds.current.push(ride.id);
            playAlertSound("NEW_RIDE");
            vibrateAlert("NEW_RIDE");
            showBanner("info", t("alertNewRide", { defaultValue: "Nova solicitação de bicitáxi." }));
            
            // Adicionar destaque
            setNewRideIds(ids => [...ids, ride.id]);
            setTimeout(() => {
              setNewRideIds(ids => ids.filter(id => id !== ride.id));
            }, 6000);
          }

          const newList = [ride, ...prev].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
          setStatus(newList.length > 0 ? "success" : "empty");
          return newList;
        });
      },
      onPendingUpdated: (ride) => {
        setRides(prev => prev.map(r => r.id === ride.id ? ride : r));
      },
      onPendingRemoved: (ride) => {
        setRides(prev => {
          const newList = prev.filter(r => r.id !== ride.id);
          setStatus(newList.length > 0 ? "success" : "empty");
          return newList;
        });
      }
    });

    return () => unsubscribe();
  }, [activeDriverRide, checkingActiveRide, t]);

  // Realtime para Corrida Ativa do Motorista
  useEffect(() => {
    if (!driver || !driver.id) return;

    const unsubscribe = subscribeToDriverRide(driver.id, {
      onActiveRideUpdated: (ride) => {
        setActiveDriverRide(ride);
      },
      onActiveRideEnded: (ride) => {
        if (activeDriverRide && activeDriverRide.id === ride.id) {
          setActiveDriverRide(null);
          
          if (ride.status === "CANCELLED") {
             alert(t("driverCancelled", { defaultValue: "O passageiro cancelou a corrida." }));
          }
          
          loadPendingRides();
        }
      }
    });
    return () => unsubscribe();
  }, [driver?.id, activeDriverRide?.id, t]);

  // Auto-expiração visual a cada 30s
  useEffect(() => {
    if (activeDriverRide || checkingActiveRide) return;

    const interval = setInterval(() => {
      setRides(prev => {
        const now = new Date();
        const valid = prev.filter(r => new Date(r.expires_at) > now);
        if (valid.length !== prev.length) {
           setStatus(valid.length > 0 ? "success" : "empty");
        }
        return valid;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [activeDriverRide, checkingActiveRide]);

  const handleUpdateRideStatus = async (newStatus, confirmMessage) => {
    if (!activeDriverRide || !driver) return;
    
    if (confirmMessage) {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    }

    setUpdatingStatus(true);
    try {
      const updatedRide = await updateRideStatus(activeDriverRide.id, driver.id, newStatus);
      if (updatedRide.status === "COMPLETED") {
        setActiveDriverRide(null);
        alert(t("rideCompletedSuccess", { defaultValue: "Corrida concluída com sucesso." }));
        loadPendingRides(true);
      } else {
        setActiveDriverRide(updatedRide);
      }
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      if (err.code === "INVALID_RIDE_STATUS_TRANSITION" || err.message?.includes("INVALID_RIDE_STATUS_TRANSITION")) {
        alert(t("errorStatusChangeNotAllowed", { defaultValue: "Esta alteração de status não é permitida." }));
      } else {
        alert(t("errorUpdateRideFailed", { defaultValue: "Não foi possível atualizar a corrida." }));
      }
    } finally {
      setUpdatingStatus(false);
    }
  };


  const handleLogout = () => {
    localStorage.removeItem("biciuber-driver-active-ride");
    setActiveDriverRide(null);
    onLogout();
  };

  const handleAcceptRide = async (rideToAccept) => {
    if (!driver || !driver.id) {
      setErrorMsg(t("errorAcceptRideFailed", { defaultValue: "Não foi possível aceitar a corrida. Tente novamente." }));
      return;
    }

    setAcceptingRideId(rideToAccept.id);
    setErrorMsg("");

    try {
      const acceptedRide = await acceptRide(rideToAccept.id, driver.id);

      // Manter corrida aceita apenas no estado React (sem salvar em localStorage)
      setActiveDriverRide(acceptedRide);
      setRides((rs) => rs.filter((r) => r.id !== rideToAccept.id));
    } catch (err) {
      console.error("Erro ao aceitar corrida:", err);
      if (err.code === "RIDE_NOT_AVAILABLE" || err.message?.includes("RIDE_NOT_AVAILABLE")) {
        setErrorMsg(t("errorRideNotAvailable", { defaultValue: "Esta corrida já foi aceita por outro bicitaxista ou expirou." }));
        setRides((rs) => rs.filter((r) => r.id !== rideToAccept.id));
        loadPendingRides(true);
      } else {
        setErrorMsg(t("errorAcceptRideFailed", { defaultValue: "Não foi possível aceitar a corrida. Tente novamente." }));
      }
    } finally {
      setAcceptingRideId(null);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <AppAlertBanner 
        type={banner.type} 
        message={banner.message} 
        visible={banner.visible} 
        onClose={() => setBanner({ ...banner, visible: false })} 
      />
      <TopBar subtitle="Bicitaxista" />
      {liveStatus && (
        <div style={{ background: C.surfaceAlt, padding: "4px 0", textAlign: "center", fontSize: 11, color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>
          {liveStatus}
        </div>
      )}
      
      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{driver.name}</p>
          <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>{driver.plate || "Quadriciclo"}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button 
            className="btn" 
            onClick={handleToggleSound} 
            style={{ padding: "8px 12px", borderRadius: 999, background: C.surfaceAlt, color: soundEnabled ? C.online : C.textMuted, border: `1px solid ${C.border}`, fontSize: 12.5 }}
            aria-label={soundEnabled ? t("disableSound", { defaultValue: "Desativar som" }) : t("enableSound", { defaultValue: "Ativar som" })}
          >
            {soundEnabled ? (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.657 6.343a8 8 0 010 11.314M11 5L6 9H2v6h4l5 4V5z"></path></svg>
            ) : (
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h2.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd"></path><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>
            )}
          </button>
          <button className="btn" onClick={() => setAvailable((a) => !a)} style={{ padding: "8px 16px", borderRadius: 999, background: available ? C.online : C.surfaceAlt, color: available ? "#000" : C.textMuted, fontWeight: 700, fontSize: 12.5 }}>
            {available ? "Disponível" : "Indisponível"}
          </button>
        </div>
      </div>

      <div style={{ padding: "0 20px", marginTop: 14 }}>
        <PushSubscribeCard 
          userType="DRIVER" 
          driverId={driver.id} 
        />
      </div>

      <div style={{ padding: "10px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="btn" onClick={handleLogout} style={{ background: "transparent", color: C.textMuted, fontSize: 12, textDecoration: "underline", padding: 0 }}>
          sair
        </button>

        {!checkingActiveRide && !activeDriverRide && (
          <button
            className="btn"
            onClick={() => loadPendingRides(true)}
            disabled={refreshing || !!acceptingRideId}
            style={{
              background: C.surfaceAlt,
              color: "#FFFFFF",
              fontSize: 12,
              padding: "5px 12px",
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              cursor: refreshing ? "wait" : "pointer"
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }}>
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {refreshing ? t("refresh", { defaultValue: "Atualizando..." }) : t("refresh", { defaultValue: "Atualizar" })}
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {checkingActiveRide ? (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.online, animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: C.textMuted, fontSize: 13.5, margin: 0 }}>
              {t("checkingActiveRide", { defaultValue: "Verificando corrida ativa..." })}
            </p>
          </div>
        ) : activeDriverRide ? (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="glass-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#000", background: C.online, padding: "4px 10px", borderRadius: 999, fontWeight: 800 }}>
                  {activeDriverRide.status === "ACCEPTED" && t("statusDriverFound", { defaultValue: "Bicitáxi encontrado" })}
                  {activeDriverRide.status === "DRIVER_ARRIVING" && t("statusDriverArriving", { defaultValue: "A caminho" })}
                  {activeDriverRide.status === "DRIVER_ARRIVED" && t("statusDriverArrived", { defaultValue: "Chegou" })}
                  {activeDriverRide.status === "IN_PROGRESS" && t("statusInProgress", { defaultValue: "Em andamento" })}
                </span>
                <span style={{ fontSize: 11.5, color: C.textMuted, fontFamily: "monospace" }}>
                  #{activeDriverRide.id ? activeDriverRide.id.slice(0, 6).toUpperCase() : ""}
                </span>
              </div>

              <div>
                <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {t("passengerName", { defaultValue: "Passageiro" })}
                </p>
                <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: "#fff" }}>{activeDriverRide.passenger_name}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: C.textMuted }}>{activeDriverRide.passenger_phone}</p>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <a
                  href={`tel:${onlyDigits(activeDriverRide.passenger_phone)}`}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    borderRadius: 12,
                    background: "#fff",
                    color: "#000",
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {t("callPassenger", { defaultValue: "Ligar" })}
                </a>

                <a
                  href={formatWhatsappUrl(
                    activeDriverRide.passenger_phone,
                    t("whatsappDefaultMessage", { defaultValue: "Olá, sou o bicitaxista que aceitou sua solicitação no BiciTaxi." })
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    borderRadius: 12,
                    background: "#25D366",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 4.992l-1.417 5.176 5.297-1.389c1.458.796 3.099 1.215 4.774 1.216h.004c5.505 0 9.988-4.478 9.989-9.985 0-2.668-1.038-5.176-2.925-7.062a9.923 9.923 0 0 0-7.064-2.932z" />
                  </svg>
                  {t("whatsappPassenger", { defaultValue: "WhatsApp" })}
                </a>
              </div>

              <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textTransform: "uppercase" }}>{t("pickupLocation", { defaultValue: "Partida" })}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14.5, fontWeight: 600, color: "#fff", wordBreak: "break-word" }}>{activeDriverRide.pickup_description}</p>
                </div>

                <div>
                  <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textTransform: "uppercase" }}>{t("destinationLocation", { defaultValue: "Destino" })}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14.5, fontWeight: 600, color: "#fff", wordBreak: "break-word" }}>{activeDriverRide.destination_description}</p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.textMuted, borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
                  <span>{t("passengerCount", { defaultValue: "Passageiros" })}: <strong style={{ color: "#fff" }}>{activeDriverRide.passenger_count}</strong></span>
                  <span>{t("hasLuggage", { defaultValue: "Bagagem" })}: <strong style={{ color: "#fff" }}>{activeDriverRide.has_luggage ? t("yes", { defaultValue: "Sim" }) : t("no", { defaultValue: "Não" })}</strong></span>
                </div>

                {activeDriverRide.notes && (
                  <div style={{ fontSize: 12, color: "var(--secondary)", background: "rgba(244, 197, 66, 0.1)", padding: "8px 10px", borderRadius: 8, wordBreak: "break-word" }}>
                    <strong>Obs:</strong> {activeDriverRide.notes}
                  </div>
                )}

                <div style={{ marginTop: 10 }}>
                  {activeDriverRide.status === "ACCEPTED" && (
                    <button
                      className="btn"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateRideStatus("DRIVER_ARRIVING")}
                      style={{ width: "100%", padding: "14px", borderRadius: 12, background: C.online, color: "#000", fontWeight: 800, fontSize: 14 }}
                    >
                      {updatingStatus ? t("updating", { defaultValue: "Atualizando..." }) : t("actionOnMyWay", { defaultValue: "Estou a caminho" })}
                    </button>
                  )}

                  {activeDriverRide.status === "DRIVER_ARRIVING" && (
                    <button
                      className="btn"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateRideStatus("DRIVER_ARRIVED")}
                      style={{ width: "100%", padding: "14px", borderRadius: 12, background: C.online, color: "#000", fontWeight: 800, fontSize: 14 }}
                    >
                      {updatingStatus ? t("updating", { defaultValue: "Atualizando..." }) : t("actionArrived", { defaultValue: "Cheguei ao local" })}
                    </button>
                  )}

                  {activeDriverRide.status === "DRIVER_ARRIVED" && (
                    <button
                      className="btn"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateRideStatus("IN_PROGRESS", t("confirmStartRide", { defaultValue: "Confirmar início da corrida?" }))}
                      style={{ width: "100%", padding: "14px", borderRadius: 12, background: "#3b82f6", color: "#fff", fontWeight: 800, fontSize: 14 }}
                    >
                      {updatingStatus ? t("updating", { defaultValue: "Atualizando..." }) : t("actionStartRide", { defaultValue: "Iniciar corrida" })}
                    </button>
                  )}

                  {activeDriverRide.status === "IN_PROGRESS" && (
                    <button
                      className="btn"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateRideStatus("COMPLETED", t("confirmCompleteRide", { defaultValue: "Confirmar conclusão da corrida?" }))}
                      style={{ width: "100%", padding: "14px", borderRadius: 12, background: "#ef4444", color: "#fff", fontWeight: 800, fontSize: 14 }}
                    >
                      {updatingStatus ? t("updating", { defaultValue: "Atualizando..." }) : t("actionCompleteRide", { defaultValue: "Concluir corrida" })}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : !available ? (
          <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13.5, marginTop: 60 }}>
            Você está indisponível.<br />Toque em "Disponível" pra receber chamados.
          </p>
        ) : status === "loading" ? (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.online, animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: C.textMuted, fontSize: 13.5, margin: 0 }}>
              {t("loadingRequests", { defaultValue: "Buscando solicitações..." })}
            </p>
          </div>
        ) : status === "error" ? (
          <div className="fade-in" style={{ textAlign: "center", padding: "40px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <p style={{ color: "var(--error)", fontSize: 13.5, margin: 0 }}>
              {errorMsg || t("errorLoadRequestsFailed", { defaultValue: "Não foi possível carregar as solicitações." })}
            </p>
            <button
              className="btn"
              onClick={() => loadPendingRides(true)}
              style={{ padding: "8px 16px", borderRadius: 10, background: C.surfaceAlt, color: "#fff", fontSize: 13, border: `1px solid ${C.border}` }}
            >
              {t("refresh", { defaultValue: "Tentar novamente" })}
            </button>
          </div>
        ) : status === "empty" || rides.length === 0 ? (
          <div className="fade-in" style={{ textAlign: "center", padding: "60px 0" }}>
            {errorMsg && <p style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>}
            <p style={{ color: C.textMuted, fontSize: 13.5, margin: 0 }}>
              {t("noRequestsAvailable", { defaultValue: "Nenhuma solicitação disponível no momento." })}
            </p>
          </div>
        ) : (
          <>
            {errorMsg && (
              <p style={{ color: "var(--error)", fontSize: 13, margin: "0 0 6px", fontWeight: 500, textAlign: "center" }}>
                {errorMsg}
              </p>
            )}

            {rides.map((r) => {
              const isAcceptingThis = acceptingRideId === r.id;
              const isAnyAccepting = !!acceptingRideId;
              const isNew = newRideIds.includes(r.id);

              return (
                  <div
                    key={r.id}
                    className={`fade-in driver-ride-card glass-card ${isNew ? 'ride-highlight' : ''}`}
                    style={{
                      border: `1px solid ${isNew ? 'var(--primary)' : 'var(--border)'}`,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      height: "auto",
                      overflow: "visible",
                      minWidth: 0,
                      boxShadow: isNew ? '0 0 12px var(--primaryGlow)' : 'none',
                      transition: 'all 0.5s ease',
                    }}
                  >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11.5, color: "#fff", background: C.surfaceAlt, padding: "3px 8px", borderRadius: 8, fontFamily: "monospace", fontWeight: 700 }}>
                      #{r.id ? r.id.slice(0, 6).toUpperCase() : ""}
                    </span>
                    <span style={{ fontSize: 11.5, color: C.textMuted }}>
                      {calcTimeAgo(r.created_at, t)}
                    </span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {t("pickupLocation", { defaultValue: "Ponto de partida" })}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 14.5, fontWeight: 600, color: "#fff", wordBreak: "break-word", overflowWrap: "anywhere" }}>{r.pickup_description}</p>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {t("destinationLocation", { defaultValue: "Destino" })}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 14.5, fontWeight: 600, color: "#fff", wordBreak: "break-word", overflowWrap: "anywhere" }}>{r.destination_description}</p>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.textMuted, borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
                    <span>{t("passengerCount", { defaultValue: "Passageiros" })}: <strong style={{ color: "#fff" }}>{r.passenger_count}</strong></span>
                    <span>{t("hasLuggage", { defaultValue: "Bagagem" })}: <strong style={{ color: "#fff" }}>{r.has_luggage ? t("yes", { defaultValue: "Sim" }) : t("no", { defaultValue: "Não" })}</strong></span>
                  </div>

                  {r.notes && (
                    <div style={{ fontSize: 12, color: "var(--secondary)", background: "rgba(244, 197, 66, 0.1)", border: "1px solid rgba(244, 197, 66, 0.2)", padding: "8px 10px", borderRadius: 8, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                      <strong>Obs:</strong> {r.notes}
                    </div>
                  )}

                  <div style={{ fontSize: 11.5, color: C.textMuted, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                    {t("expiresAt", { defaultValue: "Expira às" })} {new Date(r.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  <div style={{ marginTop: 16, width: "100%", position: "static" }}>
                    <Button
                      onClick={() => handleAcceptRide(r)}
                      disabled={isAnyAccepting}
                      className="btn accept-ride-btn"
                      style={{
                        width: "100%",
                        minHeight: 52,
                        marginTop: 0,
                        position: "static"
                      }}
                    >
                      {isAcceptingThis
                        ? t("accepting", { defaultValue: "Aceitando..." })
                        : t("acceptRide", { defaultValue: "Aceitar corrida" })}
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- ADMIN ----------------
function AdminLogin({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    onLoggedIn();
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <TopBar subtitle="Administrador" />
      <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ color: C.textMuted, fontSize: 13.5, margin: 0 }}>
          Entre com sua conta de administrador pra cadastrar bicitaxistas.
        </p>
        <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" type="email" />
        <input style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" type="password" />
        {error && <p style={{ color: "var(--error)", fontSize: 12.5, margin: 0 }}>{error}</p>}
        <Button onClick={login} disabled={!email || !password || loading}>{loading ? "Entrando..." : "Entrar"}</Button>
      </div>
    </div>
  );
}

function AdminApp() {
  const [session, setSession] = useState(undefined); // undefined = carregando, null = deslogado
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchDrivers = async () => {
    const { data, error: err } = await supabase.from("drivers").select("*").order("created_at");
    if (!err) setDrivers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!session) return;
    fetchDrivers();
    const channel = supabase
      .channel("drivers-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, fetchDrivers)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  const addDriver = async () => {
    if (!name || !phone) return;
    setError("");
    const digits = onlyDigits(phone);
    const { error: err } = await supabase
      .from("drivers")
      .insert({ name, phone: digits, plate: plate || null });
    if (err) {
      setError(err.code === "23505" ? "Esse telefone já está cadastrado." : "Erro ao cadastrar. Tente de novo.");
      return;
    }
    setName(""); setPhone(""); setPlate("");
    fetchDrivers();
  };

  const removeDriver = async (id) => {
    if (!window.confirm("Tem certeza que deseja remover este bicitaxista?")) return;
    const { error: err } = await supabase.from("drivers").delete().eq("id", id);
    if (err) {
      alert("Erro ao remover: " + err.message);
    } else {
      fetchDrivers();
    }
  };

  if (session === undefined) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
        <TopBar subtitle="Administrador" />
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onLoggedIn={() => {}} />;
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <TopBar subtitle="Administrador" />
      <div style={{ padding: "10px 20px 0" }}>
        <button className="btn" onClick={() => supabase.auth.signOut()} style={{ background: "transparent", color: C.textMuted, fontSize: 12, textDecoration: "underline", padding: 0 }}>
          sair
        </button>
      </div>

      <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Cadastrar bicitaxista</p>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
          <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone (só números)" inputMode="tel" />
          <input style={inputStyle} value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="Identificação do quadriciclo (opcional)" />
          {error && <p style={{ color: "var(--error)", fontSize: 12.5, margin: 0 }}>{error}</p>}
          <Button onClick={addDriver} disabled={!name || !phone}>Cadastrar</Button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>
            Bicitaxistas cadastrados {loading ? "" : `(${drivers.length})`}
          </p>
          {loading && <p style={{ color: C.textMuted, fontSize: 13 }}>Carregando...</p>}
          {drivers.map((d) => (
            <div key={d.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13.5 }}>{d.name}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: C.textMuted }}>{d.phone} · {d.plate || "sem identificação"}</p>
              </div>
              <button className="btn" onClick={() => removeDriver(d.id)} style={{ background: "transparent", color: "var(--error)", fontSize: 12, padding: "4px 8px" }}>
                remover
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- ROOT ----------------
export default function App() {
  const [view, setView] = useState("welcome"); // welcome | passenger | driverLogin | driverApp | admin
  const [loggedDriver, setLoggedDriver] = useState(null);

  const tabs = [
    { k: "passenger", label: "Passageiro" },
    { k: "driverLogin", label: "Bicitaxista" },
    { k: "admin", label: "Admin" },
  ];

  const goTab = (k) => {
    if (k === "driverLogin" && loggedDriver) {
      setView("driverApp");
    } else {
      setView(k);
    }
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {view === "welcome" ? (
        <WelcomeScreen
          onSelectPassenger={() => setView("passenger")}
          onSelectDriver={() => setView("driverLogin")}
        />
      ) : (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 6, padding: 10, background: "#000", borderBottom: `1px solid ${C.border}` }}>
            <button
              className="btn"
              onClick={() => setView("welcome")}
              title="Início"
              aria-label="Voltar para a tela inicial"
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(255, 255, 255, 0.08)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 12.5,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>
            {tabs.map((t) => (
              <button
                key={t.k}
                className="btn"
                onClick={() => goTab(t.k)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 10,
                  background: (view === t.k || (t.k === "driverLogin" && view === "driverApp")) ? "#fff" : "transparent",
                  color: (view === t.k || (t.k === "driverLogin" && view === "driverApp")) ? "#000" : "#9A9A9A",
                  fontWeight: 700,
                  fontSize: 12.5,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {view === "passenger" && <PassengerApp />}
            {view === "driverLogin" && (
              <DriverLogin onLogin={(d) => { setLoggedDriver(d); setView("driverApp"); }} />
            )}
            {view === "driverApp" && loggedDriver && (
              <DriverApp driver={loggedDriver} onLogout={() => { localStorage.removeItem("biciuber-driver-active-ride"); setLoggedDriver(null); setView("driverLogin"); }} />
            )}
            {view === "admin" && <AdminApp />}
          </div>
        </div>
      )}
    </>
  );
}
