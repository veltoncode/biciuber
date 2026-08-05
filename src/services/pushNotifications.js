import { supabase } from "../lib/supabaseClient.js";

// Converte a chave pública VAPID base64 para Uint8Array (exigência da Push API)
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Verifica se o navegador suporta Web Push e Service Workers
export function isPushSupported() {
  const isSupported = "serviceWorker" in navigator && "PushManager" in window;
  
  // No iOS < 16.4 ou se o app não estiver adicionado à tela de início (standalone),
  // o PushManager não existe. Então isso já cobre o bloqueio de Safari antigo.
  return isSupported;
}

// Detecta se é um dispositivo iOS para orientar o usuário a instalar a PWA (Adicionar à Tela de Início)
export function isIOS() {
  return (
    [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}

// Verifica se está rodando como PWA (standalone)
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// Obtém a permissão atual (default, granted, denied)
export function getNotificationPermission() {
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

// Pede permissão explicitamente ao usuário (deve ser atrelado a um clique)
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "denied";
  return await Notification.requestPermission();
}

// Inscreve o navegador no serviço Web Push gerando a assinatura
export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    return existingSubscription;
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("VITE_VAPID_PUBLIC_KEY is not defined in environment variables.");
  }

  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey,
  });

  return subscription;
}

// Desinscreve o navegador
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    // Tenta desativar no Supabase primeiro
    await supabase.rpc("disable_push_subscription", {
      p_endpoint: subscription.endpoint,
    });
    
    await subscription.unsubscribe();
  }
}

// Auxiliar para extrair chaves da assinatura em Base64
function extractKeys(subscription) {
  const p256dh = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");

  return {
    p256dh: p256dh ? btoa(String.fromCharCode.apply(null, new Uint8Array(p256dh))) : "",
    auth: auth ? btoa(String.fromCharCode.apply(null, new Uint8Array(auth))) : "",
  };
}

// Registra a assinatura do motorista no banco via RPC segura
export async function registerDriverPushSubscription(driverId, language = "pt-BR") {
  try {
    const subscription = await subscribeToPush();
    const { p256dh, auth } = extractKeys(subscription);

    const { error } = await supabase.rpc("upsert_push_subscription", {
      p_endpoint: subscription.endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_type: "DRIVER",
      p_driver_id: driverId,
      p_passenger_ride_id: null,
      p_public_tracking_token: null,
      p_user_agent: navigator.userAgent,
      p_language: language,
    });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Erro ao registrar push para driver:", err);
    throw err;
  }
}

// Registra a assinatura do passageiro no banco via RPC segura
export async function registerPassengerPushSubscription(rideId, publicTrackingToken, language = "pt-BR") {
  try {
    const subscription = await subscribeToPush();
    const { p256dh, auth } = extractKeys(subscription);

    const { error } = await supabase.rpc("upsert_push_subscription", {
      p_endpoint: subscription.endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_type: "PASSENGER",
      p_driver_id: null,
      p_passenger_ride_id: rideId,
      p_public_tracking_token: publicTrackingToken,
      p_user_agent: navigator.userAgent,
      p_language: language,
    });

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Erro ao registrar push para passageiro:", err);
    throw err;
  }
}
