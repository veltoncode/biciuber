import { supabase } from "../lib/supabaseClient";

/**
 * Assina mudanças em tempo real para uma corrida específica (Passageiro).
 * @param {string} rideId 
 * @param {Object} handlers 
 * @returns {Function} Função de cleanup
 */
export function subscribeToRide(rideId, { onUpdate, onStatusChange, onError }) {
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
        
        const newRide = payload.new;
        if (onUpdate) onUpdate(newRide);
      }
    )
    .subscribe((status, err) => {
      if (onStatusChange) onStatusChange(status);
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
 * @param {Object} handlers 
 * @returns {Function} Função de cleanup
 */
export function subscribeToPendingRides({ onPendingCreated, onPendingUpdated, onPendingRemoved, onStatusChange, onError }) {
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
        const ride = payload.new;
        // Só considera corrida válida se for REQUESTED, sem motorista e não expirada
        if (
          ride.status === "REQUESTED" && 
          !ride.driver_id && 
          new Date(ride.expires_at) > new Date()
        ) {
          if (onPendingCreated) onPendingCreated(ride);
        }
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
        const ride = payload.new;
        
        // Verifica se ainda atende aos requisitos para ser listada
        const isStillValid = (
          ride.status === "REQUESTED" && 
          !ride.driver_id && 
          new Date(ride.expires_at) > new Date()
        );

        if (isStillValid) {
          if (onPendingUpdated) onPendingUpdated(ride);
        } else {
          // Passou a ter motorista ou status mudou (ACCEPTED, CANCELLED, etc) ou expirou
          if (onPendingRemoved) onPendingRemoved(ride);
        }
      }
    )
    .subscribe((status, err) => {
      if (onStatusChange) onStatusChange(status);
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
 * @param {Object} handlers 
 * @returns {Function} Função de cleanup
 */
export function subscribeToDriverRide(driverId, { onActiveRideUpdated, onActiveRideEnded, onStatusChange, onError }) {
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
        const ride = payload.new;
        const isActiveStatus = ["ACCEPTED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "IN_PROGRESS"].includes(ride.status);
        
        if (isActiveStatus) {
          if (onActiveRideUpdated) onActiveRideUpdated(ride);
        } else {
          // CANCELLED, COMPLETED, EXPIRED
          if (onActiveRideEnded) onActiveRideEnded(ride);
        }
      }
    )
    .subscribe((status, err) => {
      if (onStatusChange) onStatusChange(status);
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
 * @param {Object} handlers 
 * @returns {Function} Função de cleanup
 */
export function subscribeToDriverStatus(driverId, { onDeleted }) {
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
