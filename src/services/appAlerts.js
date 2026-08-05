// src/services/appAlerts.js

let audioCtx = null;

// Função para iniciar e salvar o contexto de áudio
// Necessário para as políticas de autoplay do Safari/Chrome. 
// Deve ser chamada a partir de uma interação do usuário (onClick/onTouch).
export function unlockAudio() {
  if (audioCtx) return; // Já desbloqueado
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    // Tocar som mudo breve para forçar a liberação no iOS/Safari
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0; // mudo
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn("API de Áudio não suportada ou bloqueada", e);
  }
}

export function canPlaySound() {
  const pref = localStorage.getItem("bicitaxi-sound-enabled");
  return pref === null || pref === "true"; // Padrão é true
}

export function toggleSoundPref() {
  const current = canPlaySound();
  localStorage.setItem("bicitaxi-sound-enabled", current ? "false" : "true");
  return !current;
}

// Cria pequenos beeps sintetizados para cada tipo de evento
export function playAlertSound(type) {
  if (!canPlaySound()) return;
  if (!audioCtx) unlockAudio();
  if (!audioCtx) return;

  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(e => console.warn("Falha ao resumir áudio", e));
  }

  try {
    const now = audioCtx.currentTime;
    
    const playTone = (freq, startTime, duration, type = "sine") => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      // Envelope básico de Attack-Decay para som agradável
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    switch (type) {
      case "NEW_RIDE":
        // Dois beeps curtos
        playTone(600, now, 0.1);
        playTone(800, now + 0.15, 0.1);
        break;
      case "RIDE_ACCEPTED":
        // Ascendente
        playTone(400, now, 0.1);
        playTone(600, now + 0.1, 0.2);
        break;
      case "DRIVER_ARRIVING":
        // Beep simples
        playTone(550, now, 0.2);
        break;
      case "DRIVER_ARRIVED":
        // Tom perceptível
        playTone(700, now, 0.15, "triangle");
        playTone(900, now + 0.2, 0.3, "triangle");
        break;
      case "RIDE_STARTED":
        // Beep curto e limpo
        playTone(500, now, 0.15);
        break;
      case "RIDE_COMPLETED":
        // Descendente, sucesso
        playTone(800, now, 0.1);
        playTone(600, now + 0.1, 0.1);
        playTone(400, now + 0.2, 0.3);
        break;
      case "RIDE_CANCELLED":
        // Acorde dissonante rápido
        playTone(300, now, 0.3, "sawtooth");
        playTone(320, now, 0.3, "sawtooth");
        break;
      default:
        playTone(440, now, 0.1);
        break;
    }
  } catch (e) {
    console.warn("Erro ao tentar tocar som de alerta", e);
  }
}

// Vibração
export function vibrateAlert(type) {
  if (!navigator.vibrate) return;
  if (!canPlaySound()) return; // Vincular vibração à preferência geral (opcional)

  try {
    switch (type) {
      case "NEW_RIDE":
        navigator.vibrate([200, 100, 200]);
        break;
      case "DRIVER_ARRIVED":
        navigator.vibrate([250, 100, 250]);
        break;
      case "RIDE_CANCELLED":
        navigator.vibrate(400);
        break;
      default:
        navigator.vibrate(150);
        break;
    }
  } catch (e) {
    console.warn("Vibração não suportada ou falhou", e);
  }
}
