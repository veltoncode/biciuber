import { supabase } from "../lib/supabaseClient";

/**
 * Cria uma nova solicitação de corrida no Supabase.
 *
 * @param {Object} payload
 * @param {string} payload.passenger_name
 * @param {string} payload.passenger_phone
 * @param {string} payload.pickup_description
 * @param {string} payload.destination_description
 * @param {number} payload.passenger_count
 * @param {boolean} payload.has_luggage
 * @param {string} [payload.notes]
 * @returns {Promise<Object>} Dados da corrida inserida (id, public_tracking_token, status, created_at, expires_at)
 */
export async function createRide(payload) {
  const rideData = {
    passenger_name: payload.passenger_name.trim(),
    passenger_phone: payload.passenger_phone.trim(),
    pickup_description: payload.pickup_description.trim(),
    destination_description: payload.destination_description.trim(),
    passenger_count: Number(payload.passenger_count),
    has_luggage: Boolean(payload.has_luggage),
    notes: payload.notes ? payload.notes.trim() : null,
    status: "REQUESTED",
  };

  const { data, error } = await supabase
    .from("rides")
    .insert([rideData])
    .select("id, public_tracking_token, status, created_at, expires_at")
    .single();

  if (error) {
    console.error("Erro técnico ao executar INSERT em public.rides:", error);
    throw error;
  }

  return data;
}

/**
 * Busca todas as corridas pendentes ativas (status = 'REQUESTED', expires_at > agora, sem motorista).
 *
 * @returns {Promise<Array<Object>>} Lista de corridas pendentes do Supabase
 */
export async function getPendingRides() {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("rides")
    .select(
      "id, passenger_name, pickup_description, destination_description, passenger_count, has_luggage, notes, created_at, expires_at"
    )
    .eq("status", "REQUESTED")
    .gt("expires_at", nowIso)
    .is("driver_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro técnico ao consultar corridas pendentes no Supabase:", error);
    throw error;
  }

  return data || [];
}

/**
 * Aceita uma corrida de forma atômica utilizando a RPC accept_ride no Supabase.
 *
 * @param {string} rideId UUID da corrida
 * @param {string} driverId UUID do motorista
 * @returns {Promise<Object>} Dados da corrida aceita
 */
export async function acceptRide(rideId, driverId) {
  const { data, error } = await supabase.rpc("accept_ride", {
    p_ride_id: rideId,
    p_driver_id: driverId,
  });

  if (error) {
    console.error("Erro técnico ao executar RPC accept_ride no Supabase:", error);
    if (error.message && error.message.includes("RIDE_NOT_AVAILABLE")) {
      const customErr = new Error("RIDE_NOT_AVAILABLE");
      customErr.code = "RIDE_NOT_AVAILABLE";
      throw customErr;
    }
    throw error;
  }

  // A função SQL de retorno de tabela pode vir como array de 1 item
  const accepted = Array.isArray(data) ? data[0] : data;
  if (!accepted) {
    const customErr = new Error("RIDE_NOT_AVAILABLE");
    customErr.code = "RIDE_NOT_AVAILABLE";
    throw customErr;
  }

  return accepted;
}

/**
 * Cancela uma corrida solicitada utilizando a RPC cancel_ride no Supabase.
 *
 * @param {string} rideId UUID da corrida
 * @param {string} publicTrackingToken UUID do token de acompanhamento do passageiro
 * @returns {Promise<Object>} Dados da corrida cancelada (id, status, cancelled_at, driver_id)
 */
export async function cancelRide(rideId, publicTrackingToken) {
  const { data, error } = await supabase.rpc("cancel_ride", {
    p_ride_id: rideId,
    p_public_tracking_token: publicTrackingToken,
  });

  if (error) {
    console.error("Erro técnico ao executar RPC cancel_ride no Supabase:", error);
    if (error.message && error.message.includes("RIDE_NOT_CANCELLABLE")) {
      const customErr = new Error("RIDE_NOT_CANCELLABLE");
      customErr.code = "RIDE_NOT_CANCELLABLE";
      throw customErr;
    }
    throw error;
  }

  const cancelled = Array.isArray(data) ? data[0] : data;
  if (!cancelled) {
    const customErr = new Error("RIDE_NOT_CANCELLABLE");
    customErr.code = "RIDE_NOT_CANCELLABLE";
    throw customErr;
  }

  return cancelled;
}

/**
 * Consulta uma corrida ativa do motorista no Supabase.
 *
 * @param {string} rideId UUID da corrida
 * @param {string} driverId UUID do motorista
 * @returns {Promise<Object|null>} Dados da corrida ativa ou null se não for válida/ativa
 */
export async function getDriverActiveRide(rideId, driverId) {
  if (!rideId || !driverId) return null;

  const { data, error } = await supabase
    .from("rides")
    .select(
      "id, passenger_name, passenger_phone, pickup_description, destination_description, passenger_count, has_luggage, notes, status, driver_id, created_at, accepted_at, driver_arrived_at, started_at, expires_at"
    )
    .eq("id", rideId)
    .eq("driver_id", driverId)
    .in("status", ["ACCEPTED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "IN_PROGRESS"])
    .maybeSingle();

  if (error) {
    console.error("Erro técnico ao consultar corrida ativa do motorista no Supabase:", error);
    throw error;
  }

  return data || null;
}


