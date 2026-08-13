import { supabase } from "../lib/supabaseClient";

/**
 * Serviço de localização em tempo real (GPS Etapa 2).
 * Privacidade: As coordenadas são enviadas por Broadcast e NÃO são salvas no banco de dados.
 * O rastreio só existe enquanto a corrida está ativa e o canal está aberto.
 */

/**
 * Cria a referência para o canal de broadcast de localização de uma corrida.
 * @param {string} rideId 
 * @returns {object} O canal do Supabase Realtime
 */
export function createRideLocationChannel(rideId) {
  if (!rideId) return null;
  return supabase.channel(`ride-location:${rideId}`, {
    config: {
      broadcast: { ack: false } // ack false melhora a performance para streams de dados
    }
  });
}

/**
 * Motorista: envia sua localização via Broadcast.
 */
export async function broadcastDriverLocation(channel, location) {
  if (!channel) return;
  
  // Validação básica
  if (location.latitude < -90 || location.latitude > 90) return;
  if (location.longitude < -180 || location.longitude > 180) return;

  await channel.send({
    type: "broadcast",
    event: "driver-location",
    payload: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp || Date.now()
    }
  });
}

/**
 * Passageiro: assina o canal para escutar a localização do motorista.
 * @returns {function} Cleanup function
 */
export function subscribeToDriverLocation(rideId, onLocation, onError) {
  if (!rideId) return () => {};

  const channel = createRideLocationChannel(rideId);

  channel
    .on(
      "broadcast",
      { event: "driver-location" },
      (payload) => {
        const loc = payload.payload;
        if (loc && loc.latitude >= -90 && loc.latitude <= 90 && loc.longitude >= -180 && loc.longitude <= 180) {
          onLocation(loc);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (onError) onError(err || new Error(status));
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Remove o canal quando a corrida terminar ou o motorista sair.
 */
export function removeRideLocationChannel(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
