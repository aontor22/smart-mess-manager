const READ_KEY_PREFIX = "smm-read-pinned";
const ALERT_SOUND_KEY_PREFIX = "smm-sounded-auto-alert";
const MAX_READ_TOKENS = 250;
const MAX_SOUND_TOKENS = 250;

const AUTOMATIC_ALERT_TYPES = new Set(["payment_warning", "meal_suspended"]);

const safeStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const pinnedNoticeToken = (notice) => {
  if (!notice?.id || !notice?.pinned) return null;
  return `${notice.id}:${notice.pinnedAt || notice.createdAt || "pinned"}`;
};

export const getPinnedNoticeTokens = (notices = []) =>
  notices.map(pinnedNoticeToken).filter(Boolean);

export const pinnedNoticeReadKey = (userId, messId) =>
  `${READ_KEY_PREFIX}:${userId || "guest"}:${messId || "no-mess"}`;

export function getReadPinnedNoticeTokens(userId, messId) {
  const storage = safeStorage();
  if (!storage) return [];

  try {
    const value = JSON.parse(storage.getItem(pinnedNoticeReadKey(userId, messId)) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function getUnreadPinnedNoticeTokens(notices, userId, messId) {
  const read = new Set(getReadPinnedNoticeTokens(userId, messId));
  return getPinnedNoticeTokens(notices).filter((token) => !read.has(token));
}

export function markPinnedNoticesRead(notices, userId, messId) {
  const storage = safeStorage();
  if (!storage) return [];

  const existing = getReadPinnedNoticeTokens(userId, messId);
  const current = getPinnedNoticeTokens(notices);
  const merged = [...new Set([...existing, ...current])].slice(-MAX_READ_TOKENS);

  try {
    storage.setItem(pinnedNoticeReadKey(userId, messId), JSON.stringify(merged));
  } catch {
    // Reading a notice should never fail just because browser storage is unavailable.
  }

  return merged;
}

export const isAutomaticAlertNotice = (notice) =>
  Boolean(notice && AUTOMATIC_ALERT_TYPES.has(notice.type));

export const automaticAlertToken = (notice) => {
  if (!isAutomaticAlertNotice(notice)) return null;
  const identity = notice.autoKey || notice.id;
  if (!identity) return null;
  return `${notice.type}:${identity}:${notice.createdAt || "created"}`;
};

export const automaticAlertSoundKey = (userId, messId) =>
  `${ALERT_SOUND_KEY_PREFIX}:${userId || "guest"}:${messId || "no-mess"}`;

export function getSoundedAutomaticAlertTokens(userId, messId) {
  const storage = safeStorage();
  if (!storage) return [];

  try {
    const value = JSON.parse(storage.getItem(automaticAlertSoundKey(userId, messId)) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function getUnsoundedAutomaticAlerts(notices = [], userId, messId) {
  const sounded = new Set(getSoundedAutomaticAlertTokens(userId, messId));
  return notices.filter((notice) => {
    const token = automaticAlertToken(notice);
    return token && !sounded.has(token);
  });
}

export function markAutomaticAlertsSounded(notices = [], userId, messId) {
  const storage = safeStorage();
  if (!storage) return [];

  const existing = getSoundedAutomaticAlertTokens(userId, messId);
  const current = notices.map(automaticAlertToken).filter(Boolean);
  const merged = [...new Set([...existing, ...current])].slice(-MAX_SOUND_TOKENS);

  try {
    storage.setItem(automaticAlertSoundKey(userId, messId), JSON.stringify(merged));
  } catch {
    // Sound bookkeeping must never block the app.
  }

  return merged;
}

let audioContext = null;

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
};

export async function prepareNotificationSound() {
  const context = getAudioContext();
  if (!context) return false;

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return false;
    }
  }
  return context.state === "running";
}

async function playToneSequence(notes, volume = 0.065) {
  const ready = await prepareNotificationSound();
  if (!ready) return false;

  const context = getAudioContext();
  const start = context.currentTime + 0.01;

  notes.forEach(({ frequency, offset, duration, type = "sine", level = 1 }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = start + offset;
    const noteEnd = noteStart + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, noteStart);

    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * level), noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.02);
  });

  return true;
}

export async function playNotificationSound() {
  return playToneSequence([
    { frequency: 880, offset: 0, duration: 0.16 },
    { frequency: 1174.66, offset: 0.17, duration: 0.22 },
  ], 0.07);
}

export async function playPaymentWarningSound() {
  return playToneSequence([
    { frequency: 783.99, offset: 0, duration: 0.16, type: "triangle" },
    { frequency: 783.99, offset: 0.21, duration: 0.16, type: "triangle" },
    { frequency: 987.77, offset: 0.42, duration: 0.24, type: "triangle" },
  ], 0.075);
}

export async function playMealSuspendedSound() {
  return playToneSequence([
    { frequency: 659.25, offset: 0, duration: 0.18, type: "square", level: 0.85 },
    { frequency: 523.25, offset: 0.21, duration: 0.18, type: "square", level: 0.82 },
    { frequency: 392, offset: 0.42, duration: 0.28, type: "square", level: 0.8 },
    { frequency: 392, offset: 0.76, duration: 0.24, type: "square", level: 0.72 },
  ], 0.062);
}

export async function playAutomaticAlertSound(type) {
  if (type === "meal_suspended") return playMealSuspendedSound();
  return playPaymentWarningSound();
}
