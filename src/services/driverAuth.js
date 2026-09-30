/**
 * Gerenciador de Autenticação Persistente do Motorista (PWA)
 * Armazena com segurança o session_token e os metadados do motorista no localStorage.
 */

export const DRIVER_SESSION_KEY = "biciuber-driver-session";
export const DRIVER_TOKEN_KEY = "biciuber_driver_token";
export const DRIVER_ID_KEY = "biciuber_driver_id";
export const DRIVER_DATA_KEY = "biciuber_driver_data";

/**
 * Obtém os dados da sessão do motorista salvos no localStorage.
 * Retorna o objeto validado ou null se não houver sessão ativa válida.
 *
 * @returns {{ id: string, driver_id: string, name: string, plate: string, sessionToken: string, session_token: string } | null}
 */
export function getStoredDriverSession() {
  try {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem(DRIVER_TOKEN_KEY);
    const rawData = localStorage.getItem(DRIVER_DATA_KEY);
    const legacyRaw = localStorage.getItem(DRIVER_SESSION_KEY);

    if (token) {
      let parsed = null;
      if (rawData) {
        try {
          parsed = JSON.parse(rawData);
        } catch (_) {}
      }
      if (!parsed && legacyRaw) {
        try {
          parsed = JSON.parse(legacyRaw);
        } catch (_) {}
      }

      const driverId = localStorage.getItem(DRIVER_ID_KEY) || parsed?.id || parsed?.driver_id;
      return {
        id: driverId,
        driver_id: driverId,
        name: parsed?.name || "",
        plate: parsed?.plate || "",
        sessionToken: token,
        session_token: token
      };
    }

    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      const legToken = parsed?.sessionToken || parsed?.session_token;
      if (parsed && parsed.id && legToken) {
        return {
          id: parsed.id,
          driver_id: parsed.id,
          name: parsed.name || "",
          plate: parsed.plate || "",
          sessionToken: legToken,
          session_token: legToken
        };
      }
    }

    return null;
  } catch (err) {
    console.error("Erro ao recuperar sessão persistida do motorista:", err);
    return null;
  }
}

/**
 * Persiste a sessão do motorista no localStorage após o login com sucesso.
 * Salva rigorosamente as chaves especificadas:
 * - biciuber_driver_token
 * - biciuber_driver_id
 * - biciuber_driver_data
 *
 * @param {Object} driverData - Dados retornados pelo driver_login
 * @returns {Object} Dados padronizados da sessão
 */
export function saveDriverSession(driverData) {
  try {
    if (typeof window === "undefined" || !driverData) return null;

    const token = driverData.session_token || driverData.sessionToken;
    const driverId = driverData.driver_id || driverData.id;

    if (token) {
      localStorage.setItem(DRIVER_TOKEN_KEY, token);
    }
    if (driverId) {
      localStorage.setItem(DRIVER_ID_KEY, driverId);
    }
    localStorage.setItem(DRIVER_DATA_KEY, JSON.stringify(driverData));

    const session = {
      id: driverId,
      driver_id: driverId,
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
    if (typeof window === "undefined") return;
    localStorage.removeItem(DRIVER_TOKEN_KEY);
    localStorage.removeItem(DRIVER_ID_KEY);
    localStorage.removeItem(DRIVER_DATA_KEY);
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
