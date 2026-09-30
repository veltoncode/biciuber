/**
 * Gerenciador de Autenticação Persistente do Motorista (PWA)
 * Armazena com segurança o session_token e os metadados do motorista no localStorage.
 */

export const DRIVER_SESSION_KEY = "biciuber-driver-session";

/**
 * Obtém os dados da sessão do motorista salvos no localStorage.
 * Retorna o objeto validado ou null se não houver sessão ativa válida.
 *
 * @returns {{ id: string, name: string, plate: string, sessionToken: string, session_token: string } | null}
 */
export function getStoredDriverSession() {
  try {
    const raw = localStorage.getItem(DRIVER_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const token = parsed?.sessionToken || parsed?.session_token;

    if (parsed && parsed.id && token) {
      return {
        id: parsed.id,
        name: parsed.name || "",
        plate: parsed.plate || "",
        sessionToken: token,
        session_token: token
      };
    }

    // Se estiver em formato legado ou inconsistente, limpa para evitar falhas
    clearDriverSession();
    return null;
  } catch (err) {
    console.error("Erro ao recuperar sessão persistida do motorista:", err);
    clearDriverSession();
    return null;
  }
}

/**
 * Persiste a sessão do motorista no localStorage após o login com sucesso.
 *
 * @param {Object} driverData - Dados retornados pelo driver_login
 * @returns {Object} Dados padronizados da sessão
 */
export function saveDriverSession(driverData) {
  try {
    const token = driverData.sessionToken || driverData.session_token;
    const session = {
      id: driverData.id || driverData.driver_id,
      name: driverData.name || "",
      plate: driverData.plate || "",
      sessionToken: token,
      session_token: token
    };

    localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(session));
    return session;
  } catch (err) {
    console.error("Erro ao salvar sessão do motorista no localStorage:", err);
    return null;
  }
}

/**
 * Remove os dados de sessão do motorista e corridas ativas associadas do localStorage.
 */
export function clearDriverSession() {
  try {
    localStorage.removeItem(DRIVER_SESSION_KEY);
    localStorage.removeItem("biciuber-driver-active-ride");
  } catch (err) {
    console.error("Erro ao limpar sessão do motorista:", err);
  }
}

/**
 * Verifica rapidamente se há uma sessão persistente ativa no dispositivo.
 *
 * @returns {boolean}
 */
export function isDriverAuthenticated() {
  return !!getStoredDriverSession();
}
