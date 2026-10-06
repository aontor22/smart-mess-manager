const READ_KEY_PREFIX = "smm-read-pinned";
const MAX_READ_TOKENS = 250;

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

export async function playNotificationSound() {
  const ready = await prepareNotificationSound();
  if (!ready) return false;

  const context = getAudioContext();
  const start = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.075, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48);
  gain.connect(context.destination);

  const notes = [
    { frequency: 880, offset: 0, duration: 0.16 },
    { frequency: 1174.66, offset: 0.17, duration: 0.22 },
  ];

  notes.forEach(({ frequency, offset, duration }) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start + offset);
    oscillator.connect(gain);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration);
  });

  return true;
}
