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
    if (error.message && error.message.includes("DRIVER_ALREADY_HAS_ACTIVE_RIDE")) {
      const customErr = new Error("DRIVER_ALREADY_HAS_ACTIVE_RIDE");
      customErr.code = "DRIVER_ALREADY_HAS_ACTIVE_RIDE";
      throw customErr;
    }
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
 * Consulta a corrida ativa mais recente pertencente ao motorista no Supabase.
 *
 * @param {string} driverId UUID do motorista
 * @returns {Promise<Object|null>} Dados da corrida ativa ou null se não for encontrada
 */
export async function getActiveRideForDriver(driverId) {
  if (!driverId) return null;

  const { data, error } = await supabase
    .from("rides")
    .select(
      "id, passenger_name, passenger_phone, pickup_description, destination_description, passenger_count, has_luggage, notes, status, driver_id, created_at, accepted_at, driver_arrived_at, started_at, completed_at, cancelled_at"
    )
    .eq("driver_id", driverId)
    .in("status", ["ACCEPTED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "IN_PROGRESS"])
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro técnico ao consultar corrida ativa do motorista no Supabase:", error);
    throw error;
  }

  return data || null;
}

/**
 * Consulta os dados públicos e seguros de um motorista específico.
 *
 * @param {string} driverId UUID do motorista
 * @returns {Promise<Object|null>} Dados do motorista
 */
export async function getDriverById(driverId) {
  if (!driverId) return null;

  const { data, error } = await supabase
    .from("drivers")
    .select("id, name, phone, plate, is_available")
    .eq("id", driverId)
    .maybeSingle();

  if (error) {
    console.error("Erro técnico ao consultar motorista por ID no Supabase:", error);
    throw error;
  }

  return data || null;
}

/**
 * Atualiza o status da corrida (Passos do motorista).
 *
 * @param {string} rideId UUID da corrida
 * @param {string} driverId UUID do motorista
 * @param {string} newStatus Novo status (DRIVER_ARRIVING, DRIVER_ARRIVED, IN_PROGRESS, COMPLETED)
 * @returns {Promise<Object>} Dados atualizados da corrida
 */
export async function updateRideStatus(rideId, driverId, newStatus) {
  const { data, error } = await supabase.rpc("update_driver_ride_status", {
    p_ride_id: rideId,
    p_driver_id: driverId,
    p_new_status: newStatus,
  });

  if (error) {
    console.error("Erro técnico ao executar RPC update_driver_ride_status no Supabase:", error);
    if (error.message && error.message.includes("INVALID_RIDE_STATUS_TRANSITION")) {
      const customErr = new Error("INVALID_RIDE_STATUS_TRANSITION");
      customErr.code = "INVALID_RIDE_STATUS_TRANSITION";
      throw customErr;
    }
    if (error.message && error.message.includes("RIDE_NOT_FOUND_OR_FORBIDDEN")) {
      const customErr = new Error("RIDE_NOT_FOUND_OR_FORBIDDEN");
      customErr.code = "RIDE_NOT_FOUND_OR_FORBIDDEN";
      throw customErr;
    }
    throw error;
  }

  const updated = Array.isArray(data) ? data[0] : data;
  if (!updated) {
    const customErr = new Error("UPDATE_FAILED");
    customErr.code = "UPDATE_FAILED";
    throw customErr;
  }

  return updated;
}

/**
 * Assina mudanças em tempo real para uma corrida específica (Passageiro).
 * @param {string} rideId 
 * @param {Function} onChange 
 * @param {Function} onError 
 * @returns {Function} Função de cleanup
 */
export function subscribeToRide(rideId, onChange, onError) {
  if (!rideId) return () => {};

  const channel = supabase.channel(`ride_${rideId}`);

  channel
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rides",
        filter: `id=eq.${rideId}`,
      },
      (payload) => {
        if (payload.errors) {
          if (onError) onError(payload.errors);
          return;
        }
        if (onChange) onChange(payload.new);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED' && onError) {
        onError(null);
      }
      if (err && onError) {
        console.error("Erro na assinatura realtime da corrida:", err);
        onError(err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Assina mudanças em corridas pendentes para a lista do motorista.
 * @param {Function} onInsert
 * @param {Function} onUpdate
 * @param {Function} onDelete
 * @param {Function} onError 
 * @returns {Function} Função de cleanup
 */
export function subscribeToPendingRides(onInsert, onUpdate, onDelete, onError) {
  const channel = supabase.channel('pending_rides_list');

  channel
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "rides",
      },
      (payload) => {
        if (onInsert) onInsert(payload.new);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rides",
      },
      (payload) => {
        if (onUpdate) onUpdate(payload.new);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "rides",
      },
      (payload) => {
        if (onDelete) onDelete(payload.old);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED' && onError) {
        onError(null);
      }
      if (err && onError) {
        console.error("Erro na assinatura realtime da lista pendente:", err);
        onError(err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Assina mudanças na corrida ativa pertencente a um motorista.
 * @param {string} driverId 
 * @param {Function} onChange
 * @param {Function} onError 
 * @returns {Function} Função de cleanup
 */
export function subscribeToDriverRide(driverId, onChange, onError) {
  if (!driverId) return () => {};

  const channel = supabase.channel(`driver_ride_${driverId}`);

  channel
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "rides",
        filter: `driver_id=eq.${driverId}`,
      },
      (payload) => {
        if (onChange) onChange(payload.new);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED' && onError) {
        onError(null);
      }
      if (err && onError) {
        console.error("Erro na assinatura realtime da corrida ativa do motorista:", err);
        onError(err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Assina exclusão do próprio driver (invalidação de sessão zumbi).
 * @param {string} driverId 
 * @param {Function} onDeleted 
 * @returns {Function} Função de cleanup
 */
export function subscribeToDriverStatus(driverId, onDeleted) {
  if (!driverId) return () => {};

  const channel = supabase.channel(`driver_status_${driverId}`);

  channel
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "drivers",
        filter: `id=eq.${driverId}`,
      },
      () => {
        if (onDeleted) onDeleted();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
