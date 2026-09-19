/**
 * Sistema de Áudio e Feedback Sonoro para Pop Shake
 * Suporta arquivos locais em /sounds/ com fallback sintético ultra-rápido via Web Audio API.
 * Trata restrições de autoplay dos navegadores exigindo a primeira interação do usuário.
 */

let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx();
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === "suspended") {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Desbloqueia o áudio na primeira interação do usuário (clique, toque ou tecla)
 */
export function initAudioUnlock() {
  if (typeof window === "undefined" || isAudioUnlocked) return;

  const unlock = () => {
    isAudioUnlocked = true;
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener("click", unlock);
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("click", unlock, { once: true, passive: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true, passive: true });
}

function notifySoundPlayed() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("popshake_sound_played"));
  }
}

/**
 * 1. Chime / Ding sutil para atualizações de status do cliente (Pedidos / Rastreio)
 */
export function playDingSound() {
  if (typeof window === "undefined") return;
  notifySoundPlayed();

  // Tenta tocar o arquivo de áudio local
  try {
    const audio = new Audio("/sounds/ding.wav");
    audio.volume = 0.6;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Se o arquivo ou autoplay falhar, recorre à síntese Web Audio API imediata
        playSynthDing();
      });
    }
  } catch {
    playSynthDing();
  }
}

/**
 * 2. Sino de Cozinha / Balcão para novos pedidos no Painel Operacional (/admin/pedidos)
 */
export function playKitchenBellSound() {
  if (typeof window === "undefined") return;
  notifySoundPlayed();

  // Tenta tocar o arquivo de áudio local
  try {
    const audio = new Audio("/sounds/kitchen-bell.wav");
    audio.volume = 0.75;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback para sino sintético
        playSynthKitchenBell();
      });
    }
  } catch {
    playSynthKitchenBell();
  }
}

/**
 * Mantém compatibilidade com chamadas existentes
 */
export function playNewOrderChime() {
  playKitchenBellSound();
}

/**
 * Síntese Web Audio API nativa: Dois tons harmônicos agradáveis (D5 + A5 + Harmônico)
 */
function playSynthDing() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Nota 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Nota 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (err) {
    console.warn("Falha na síntese do som ding:", err);
  }
}

/**
 * Síntese Web Audio API nativa: Batida dupla de sino metálico de restaurante
 */
function playSynthKitchenBell() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    const playStrike = (time: number, freq: number, volume: number) => {
      // Fundamental
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.6);

      // Harmônico brilhante
      const oscH = ctx.createOscillator();
      const gainH = ctx.createGain();
      oscH.type = "triangle";
      oscH.frequency.setValueAtTime(freq * 2.05, time);
      gainH.gain.setValueAtTime(volume * 0.4, time);
      gainH.gain.exponentialRampToValueAtTime(0.0001, time + 0.3);
      oscH.connect(gainH);
      gainH.connect(ctx.destination);
      oscH.start(time);
      oscH.stop(time + 0.3);
    };

    // Primeira batida
    playStrike(now, 1200, 0.25);
    // Segunda batida logo em seguida
    playStrike(now + 0.18, 1500, 0.3);
  } catch (err) {
    console.warn("Falha na síntese do sino de cozinha:", err);
  }
}
