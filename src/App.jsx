import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabaseClient";

const C = {
  bg: "#000000",
  surface: "#111111",
  surfaceAlt: "#1C1C1C",
  border: "#2A2A2A",
  text: "#FFFFFF",
  textMuted: "#9A9A9A",
  online: "#3ECF6E",
};

function onlyDigits(s) {
  return s.replace(/\D/g, "");
}

function Logo({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.24, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color: "#000", fontWeight: 800, fontSize: size * 0.32, letterSpacing: -0.5 }}>B</span>
    </div>
  );
}

function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{ background: "#000", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <div style={{ animation: "splashIn 0.5s ease both" }}>
        <div style={{ width: 84, height: 84, borderRadius: 20, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#000", fontWeight: 800, fontSize: 30, letterSpacing: -1 }}>B</span>
        </div>
      </div>
      <div style={{ textAlign: "center", animation: "fadeInUp 0.5s ease 0.2s both" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>BiciUber</h1>
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: C.textMuted }}>o bicitáxi de Afuá, a um toque</p>
      </div>
      <p style={{ position: "absolute", bottom: 26, fontSize: 11, color: "#555" }}>criado por Herivelto Sarges</p>
    </div>
  );
}

function TopBar({ subtitle }) {
  return (
    <div style={{ padding: "22px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
      <Logo size={36} />
      <div>
        <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{subtitle}</p>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: -0.3 }}>BiciUber</h1>
      </div>
    </div>
  );
}

function RouteLine({ progress = 0.2 }) {
  return (
    <svg viewBox="0 0 320 70" style={{ width: "100%", height: 70 }}>
      <line x1="14" y1="35" x2="306" y2="35" stroke={C.border} strokeWidth="2" strokeDasharray="1 8" strokeLinecap="round" />
      <circle cx="14" cy="35" r="6" fill="#fff" />
      <circle cx="306" cy="35" r="6" fill="none" stroke="#fff" strokeWidth="2" />
      <g style={{ transform: `translate(${14 + progress * 292}px, 35px)`, transition: "transform 0.4s ease-out" }}>
        <circle r="9" fill={C.online} />
      </g>
    </svg>
  );
}

function Button({ children, onClick, disabled, variant = "primary" }) {
  const styles = {
    primary: { background: disabled ? C.surfaceAlt : "#fff", color: disabled ? C.textMuted : "#000" },
    secondary: { background: C.surfaceAlt, color: "#fff", border: `1px solid ${C.border}` },
    decline: { background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` },
  };
  return (
    <button className="btn" onClick={onClick} disabled={disabled} style={{ ...styles[variant], padding: "14px 18px", borderRadius: 12, fontWeight: 700, fontSize: 15, width: "100%" }}>
      {children}
    </button>
  );
}

const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  background: C.surface,
  border: `1px solid ${C.border}`,
  color: "#fff",
  fontSize: 14.5,
  outline: "none",
};

// ---------------- PASSENGER ----------------
function PassengerApp() {
  const [stage, setStage] = useState("form");
  const [pickup, setPickup] = useState("");
  const [dest, setDest] = useState("");
  const [progress, setProgress] = useState(0.08);
  const timerRef = useRef(null);

  const requestRide = () => {
    if (!pickup || !dest) return;
    setStage("searching");
    setTimeout(() => setStage("matched"), 1600);
  };

  useEffect(() => {
    if (stage === "onboard") {
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          const next = p + 0.06;
          if (next >= 1) {
            clearInterval(timerRef.current);
            setStage("done");
            return 1;
          }
          return next;
        });
      }, 300);
      return () => clearInterval(timerRef.current);
    }
  }, [stage]);

  const reset = () => {
    setStage("form");
    setPickup("");
    setDest("");
    setProgress(0.08);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <TopBar subtitle="Passageiro" />
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        {stage === "form" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: C.textMuted, fontSize: 13.5, margin: 0 }}>Onde você tá e pra onde vai?</p>
            <div>
              <p style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Partida</p>
              <input style={inputStyle} value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Ex: perto da igreja matriz" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Destino</p>
              <input style={inputStyle} value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Ex: porto do mercado" />
            </div>
            <div style={{ marginTop: 8 }}>
              <Button onClick={requestRide} disabled={!pickup || !dest}>Chamar bicitáxi</Button>
            </div>
          </div>
        )}

        {stage === "searching" && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "60px 0" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
            <p style={{ fontSize: 14.5, fontWeight: 600 }}>Procurando um bicitaxista...</p>
          </div>
        )}

        {(stage === "matched" || stage === "onboard" || stage === "done") && (
          <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#000" }}>ZR</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Zé Raimundo</p>
                <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>Quadriciclo nº 12 · ★ 4.9</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: stage === "done" ? C.online : "#fff", color: "#000" }}>
                {stage === "matched" && "A caminho"}
                {stage === "onboard" && "Em corrida"}
                {stage === "done" && "Chegou"}
              </span>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
              <RouteLine progress={stage === "matched" ? 0.05 : progress} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>
                <span>{pickup}</span>
                <span>{dest}</span>
              </div>
            </div>
            {stage === "matched" && <Button onClick={() => setStage("onboard")}>Simular embarque</Button>}
            {stage === "done" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ textAlign: "center", fontSize: 12.5, color: C.textMuted, margin: 0 }}>Corrida concluída · R$ 4,00</p>
                <Button variant="secondary" onClick={reset}>Pedir outra corrida</Button>
              </div>
            )}
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
        {error && <p style={{ color: "#ff6b6b", fontSize: 12.5, margin: 0 }}>{error}</p>}
        <Button onClick={tryLogin} disabled={!phone || loading}>{loading ? "Entrando..." : "Entrar"}</Button>
      </div>
    </div>
  );
}

// ---------------- DRIVER APP ----------------
const MOCK_REQUESTS = [
  { id: 1, from: "Rua da Praça, casa do seu Antônio", to: "Beira, próximo ao porto", eta: "3 min" },
  { id: 2, from: "Escola Municipal", to: "Feira do peixe", eta: "5 min" },
];

function DriverApp({ driver, onLogout }) {
  const [available, setAvailable] = useState(true);
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [active, setActive] = useState(null);

  const accept = (r) => { setActive(r); setRequests((rs) => rs.filter((x) => x.id !== r.id)); };
  const decline = (id) => setRequests((rs) => rs.filter((x) => x.id !== id));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bg }}>
      <TopBar subtitle="Bicitaxista" />
      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{driver.name}</p>
          <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>{driver.plate}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={() => setAvailable((a) => !a)} style={{ padding: "8px 16px", borderRadius: 999, background: available ? C.online : C.surfaceAlt, color: available ? "#000" : C.textMuted, fontWeight: 700, fontSize: 12.5 }}>
            {available ? "Disponível" : "Indisponível"}
          </button>
        </div>
      </div>
      <div style={{ padding: "10px 20px 0" }}>
        <button className="btn" onClick={onLogout} style={{ background: "transparent", color: C.textMuted, fontSize: 12, textDecoration: "underline", padding: 0 }}>
          sair
        </button>
      </div>

      <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {active ? (
          <div className="fade-in" style={{ background: C.surface, border: "1px solid #fff", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", color: C.textMuted }}>Corrida em andamento</p>
            <RouteLine progress={0.5} />
            <p style={{ margin: 0, fontSize: 13.5 }}><b>De:</b> {active.from}</p>
            <p style={{ margin: 0, fontSize: 13.5 }}><b>Para:</b> {active.to}</p>
            <Button onClick={() => setActive(null)}>Concluir corrida</Button>
          </div>
        ) : available ? (
          requests.length ? requests.map((r) => (
            <div key={r.id} className="fade-in" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 11, color: C.textMuted, background: C.surfaceAlt, padding: "3px 8px", borderRadius: 999, alignSelf: "flex-start" }}>chegada em {r.eta}</span>
              <p style={{ margin: 0, fontSize: 13.5 }}><b>De:</b> {r.from}</p>
              <p style={{ margin: 0, fontSize: 13.5 }}><b>Para:</b> {r.to}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}><Button variant="decline" onClick={() => decline(r.id)}>Recusar</Button></div>
                <div style={{ flex: 1 }}><Button onClick={() => accept(r)}>Aceitar</Button></div>
              </div>
            </div>
          )) : (
            <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13.5, marginTop: 60 }}>Nenhum chamado agora.<br />Assim que alguém pedir, aparece aqui.</p>
          )
        ) : (
          <p style={{ textAlign: "center", color: C.textMuted, fontSize: 13.5, marginTop: 60 }}>Você está indisponível.<br />Toque em "Disponível" pra receber chamados.</p>
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
        {error && <p style={{ color: "#ff6b6b", fontSize: 12.5, margin: 0 }}>{error}</p>}
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
    await supabase.from("drivers").delete().eq("id", id);
    fetchDrivers();
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
          {error && <p style={{ color: "#ff6b6b", fontSize: 12.5, margin: 0 }}>{error}</p>}
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
              <button className="btn" onClick={() => removeDriver(d.id)} style={{ background: "transparent", color: "#ff6b6b", fontSize: 12, padding: "4px 8px" }}>
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
  const [view, setView] = useState("passenger"); // passenger | driverLogin | driverApp | admin
  const [showSplash, setShowSplash] = useState(true);
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
      {showSplash ? (
        <SplashScreen onDone={() => setShowSplash(false)} />
      ) : (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 6, padding: 10, background: "#000", borderBottom: `1px solid ${C.border}` }}>
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
              <DriverApp driver={loggedDriver} onLogout={() => { setLoggedDriver(null); setView("driverLogin"); }} />
            )}
            {view === "admin" && <AdminApp />}
          </div>
        </div>
      )}
    </>
  );
}
