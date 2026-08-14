import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getAvailableDrivers } from "../../services/drivers";
const C = {
  bg: "var(--background)",
  textMuted: "var(--text-muted)",
  surface: "var(--surface)",
  border: "var(--border)",
  online: "var(--online)",
  primary: "var(--primary)"
};

export function AvailableDrivers({ onBack, pickup, destination, count, hasLuggage, t }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(false);
      const list = await getAvailableDrivers();
      setDrivers(list || []);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();

    let timeoutId;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fetchDrivers(), 400);
    };

    const driversSub = supabase
      .channel("public:drivers-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, debouncedFetch)
      .subscribe();

    const ridesSub = supabase
      .channel("public:rides-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, debouncedFetch)
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(driversSub);
      supabase.removeChannel(ridesSub);
    };
  }, []);

  const buildWhatsAppMessage = () => {
    let msg = "Olá! Encontrei você pelo BiciUber.";
    
    if (pickup && destination) {
      msg += ` Estou em ${pickup} e quero ir para ${destination}.`;
    } else if (pickup) {
      msg += ` Estou em ${pickup}.`;
    }
    
    msg += " Você está disponível para uma corrida?";

    if (count > 0) {
      msg += ` Somos ${count} passageiro(s).`;
    }
    if (hasLuggage) {
      msg += " Estou com bagagem.";
    }

    return encodeURIComponent(msg);
  };

  const handleWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const finalPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const url = `https://wa.me/${finalPhone}?text=${buildWhatsAppMessage()}`;
    window.open(url, "_blank");
  };

  const handleCall = (phone) => {
    const cleanPhone = phone.replace(/\D/g, "");
    window.location.href = `tel:${cleanPhone}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: "#fff", fontWeight: 700 }}>{t("availableDriversTitle", { defaultValue: "Bicitaxistas disponíveis" })}</h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>
            {t("availableDriversSubtitle", { defaultValue: "Escolha um bicitaxista e fale diretamente com ele." })}
          </p>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "var(--secondary)", margin: 0, textAlign: "left" }}>
        {t("whatsappMessageLanguageNote", { defaultValue: "A mensagem será enviada em português ao bicitaxista." })}
      </p>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: `3px solid ${C.border}`,
            borderTopColor: C.online,
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 12px"
          }} />
          <p style={{ color: C.textMuted, fontSize: 14 }}>{t("loadingAvailableDrivers", { defaultValue: "Buscando bicitaxistas disponíveis..." })}</p>
        </div>
      )}

      {!loading && error && (
        <div className="glass-card" style={{ padding: 20, textAlign: "center" }}>
          <p style={{ color: "var(--error)", margin: "0 0 16px" }}>{t("errorLoadingDrivers", { defaultValue: "Não foi possível carregar os bicitaxistas disponíveis." })}</p>
          <button className="btn btn-primary-gradient" onClick={fetchDrivers}>{t("tryAgain", { defaultValue: "Tentar novamente" })}</button>
        </div>
      )}

      {!loading && !error && drivers.length === 0 && (
        <div className="glass-card" style={{ padding: 30, textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
          <svg width="48" height="48" fill="none" stroke={C.textMuted} strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: "0 auto" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p style={{ color: "#fff", fontSize: 15, margin: 0 }}>
            {t("noDriversAvailable", { defaultValue: "Nenhum bicitaxista está disponível no momento." })}
          </p>
          <button className="btn btn-primary-gradient" onClick={onBack} style={{ marginTop: 8 }}>
            {t("backToRequestRide", { defaultValue: "Voltar e solicitar um bicitáxi" })}
          </button>
        </div>
      )}

      {!loading && !error && drivers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {drivers.map(driver => (
            <div key={driver.id} className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#fff", fontWeight: 600 }}>{driver.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.online }}></div>
                    <span style={{ fontSize: 12, color: C.online }}>{t("availableNow", { defaultValue: "Disponível agora" })}</span>
                  </div>
                  {driver.plate && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted }}>
                      Placa: <strong style={{ color: "#fff" }}>{driver.plate}</strong>
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  className="btn btn-primary-gradient"
                  onClick={() => handleCall(driver.phone)}
                  style={{ flex: 1, minHeight: 40, fontSize: 13, background: C.surface, border: `1px solid ${C.border}` }}
                >
                  {t("call", { defaultValue: "Ligar" })}
                </button>
                <button 
                  className="btn btn-primary-gradient"
                  onClick={() => handleWhatsApp(driver.phone)}
                  style={{ flex: 1, minHeight: 40, fontSize: 13, background: "#25D366", color: "#fff", border: "none" }}
                >
                  {t("whatsapp", { defaultValue: "WhatsApp" })}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
