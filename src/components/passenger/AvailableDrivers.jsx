import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

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

      const { data, error } = await supabase
        .from('drivers')
        .select('id, name, phone, vehicle_type, is_available')
        .eq('status', 'approved')
        .eq('is_available', true)
        .order('name');

      if (error) {
        console.error("Erro ao buscar condutores disponíveis:", error);
        setError(true);
        return;
      }

      // Garante que motoristas com is_available = false não apareçam na lista
      const availableList = (data || []).filter(d => d.is_available === true);
      setDrivers(availableList);
    } catch (err) {
      console.error("Erro inesperado ao buscar motoristas:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();

    // Atualiza automaticamente quando a tela ganha foco
    const handleFocus = () => {
      fetchDrivers();
    };
    window.addEventListener("focus", handleFocus);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchDrivers();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    let timeoutId;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fetchDrivers(), 400);
    };

    const driversSub = supabase
      .channel("available-drivers-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, debouncedFetch)
      .subscribe();

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(timeoutId);
      supabase.removeChannel(driversSub);
    };
  }, []);

  const handleOpenWhatsApp = (driverPhone, driverName) => {
    if (!driverPhone) return;

    // Remove qualquer caractere que não seja número
    let cleanPhone = driverPhone.replace(/\D/g, '');
    
    // Se não tiver o DDI do Brasil (55), adiciona
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }

    const mensagem = encodeURIComponent(`Olá ${driverName}! Vi o seu perfil disponível no BiciTaxi e gostaria de solicitar uma corrida.`);
    const url = `https://wa.me/${cleanPhone}?text=${mensagem}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, margin: 0, color: "#fff", fontWeight: 700 }}>
            {t("availableDriversTitle", { defaultValue: "Bicitaxistas disponíveis" })}
          </h2>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>
            {t("availableDriversSubtitle", { defaultValue: "Escolha um bicitaxista e fale diretamente com ele." })}
          </p>
        </div>
        <button
          className="btn"
          onClick={fetchDrivers}
          disabled={loading}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 600,
            padding: "8px 12px",
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            flexShrink: 0
          }}
          title={t("refreshList", { defaultValue: "Atualizar lista" })}
        >
          <svg 
            width="14" 
            height="14" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24"
            style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{loading ? t("refreshing", { defaultValue: "Atualizando..." }) : t("refreshList", { defaultValue: "Atualizar lista" })}</span>
        </button>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#fff", fontWeight: 600 }}>{driver.name}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.online }}></div>
                    <span style={{ fontSize: 12, color: C.online }}>{t("availableNow", { defaultValue: "Disponível agora" })}</span>
                  </div>
                  {driver.vehicle_type && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textMuted }}>
                      {driver.vehicle_type}
                    </p>
                  )}
                </div>
              </div>
              <button 
                className="btn"
                onClick={() => handleOpenWhatsApp(driver.phone, driver.name)}
                style={{ 
                  width: "100%", 
                  minHeight: 44, 
                  fontSize: 14, 
                  fontWeight: 600,
                  background: "#22c55e", 
                  color: "#ffffff", 
                  border: "none",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(34, 197, 94, 0.25)"
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.158.57 4.186 1.564 5.942l-1.664 6.074 6.257-1.641c1.701.927 3.655 1.455 5.733 1.455 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12zm0 22c-1.897 0-3.666-.549-5.161-1.492l-.37-.234-3.702.971.988-3.608-.256-.407c-1.042-1.657-1.609-3.593-1.609-5.63 0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
              </svg>
              <span>{t("chatOnWhatsApp", { defaultValue: "Conversar no WhatsApp" })}</span>
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);
}
