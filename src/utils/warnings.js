const MS_PER_DAY = 24 * 60 * 60 * 1000;

const makeNoticeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const asInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const asMoney = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateKeyToUtc = (dateKey) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return Number.NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = Date.UTC(year, month - 1, day);
  const check = new Date(value);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return Number.NaN;
  }
  return value;
};

/**
 * Returns the human-facing due day number.
 * The date the balance first becomes due is Day 1, the following date is Day 2, etc.
 */
export const dueDayNumber = (startDate, endDate = localDateKey()) => {
  const start = dateKeyToUtc(startDate);
  const end = dateKeyToUtc(endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

export const normalizeWarningSettings = (settings = {}) => {
  const warningAfterDays = Math.max(1, asInteger(settings.warningAfterDays, 4));
  const requestedMealOff = Math.max(1, asInteger(settings.mealOffAfterDays, 7));
  const mealOffAfterDays = Math.max(warningAfterDays + 1, requestedMealOff);

  return {
    enabled: settings.enabled !== false,
    warningAfterDays,
    mealOffAfterDays,
    minimumDue: Math.max(0, asMoney(settings.minimumDue, 1)),
    autoSuspendMeals: settings.autoSuspendMeals !== false,
  };
};

const warningText = ({ memberName, balance, currency, dueDay, offDay }) =>
  `${memberName}, your current balance is ${Math.abs(balance).toFixed(2)} ${currency} due. ` +
  `Today is day ${dueDay} of the outstanding balance. Please add money. ` +
  `If the due continues until day ${offDay}, meal access may be suspended automatically.`;

const suspensionText = ({ memberName, balance, currency, dueDay }) =>
  `${memberName}, your meal access has been suspended on due day ${dueDay} because your balance is ` +
  `${Math.abs(balance).toFixed(2)} ${currency} due. Please add money and contact the manager. ` +
  "Meal access will be restored automatically after the balance is cleared.";

/**
 * Applies the payment-warning policy to the current monthly settlement.
 *
 * Optional clock values make the function deterministic in tests while production
 * continues to use the user's local calendar date (not UTC) for due-day counting.
 */
export function applyWarningAutomation(store, messId, monthly, clock = {}) {
  if (!store || !messId || !monthly) return { changed: false, store };

  const mess = store.messes.find((item) => item.id === messId);
  if (!mess) return { changed: false, store };

  const settings = normalizeWarningSettings(mess.warningSettings || {});

  if (!settings.enabled) {
    let changed = false;
    const members = store.members.map((member) => {
      if (member.messId !== messId || member.status !== "active") return member;
      const hasAutomationState =
        member.dueSince ||
        member.paymentWarningSentAt ||
        member.mealSuspendedAt ||
        member.autoMealSuspended;
      if (!hasAutomationState) return member;
      changed = true;
      return {
        ...member,
        dueSince: null,
        paymentWarningSentAt: null,
        mealSuspendedAt: null,
        mealStatus: member.autoMealSuspended ? "active" : member.mealStatus || "active",
        autoMealSuspended: false,
      };
    });

    if (!changed) return { changed: false, store };
    return {
      changed: true,
      store: {
        ...store,
        messes: store.messes.map((item) =>
          item.id === messId ? { ...item, warningSettings: settings } : item
        ),
        members,
      },
    };
  }

  const {
    warningAfterDays,
    mealOffAfterDays,
    minimumDue,
    autoSuspendMeals,
  } = settings;
  const currency = mess.currency || "BDT";
  const nowIso = clock.nowIso || new Date().toISOString();
  const todayKey = clock.todayKey || localDateKey();
  const rowByMember = new Map(monthly.memberRows.map((row) => [row.memberId, row]));
  let changed = false;
  const generatedNotices = [];

  const members = store.members.map((member) => {
    if (member.messId !== messId || member.status !== "active") return member;

    const row = rowByMember.get(member.id);
    const balance = Number(row?.balance || 0);
    const isDue = balance < 0 && Math.abs(balance) >= minimumDue;

    if (!isDue) {
      const hadAutomationState =
        member.dueSince ||
        member.paymentWarningSentAt ||
        member.mealSuspendedAt ||
        member.autoMealSuspended;

      if (!hadAutomationState) return member;

      changed = true;
      return {
        ...member,
        dueSince: null,
        paymentWarningSentAt: null,
        mealSuspendedAt: null,
        mealStatus: member.autoMealSuspended ? "active" : member.mealStatus || "active",
        autoMealSuspended: false,
      };
    }

    const dueSince = member.dueSince || todayKey;
    const dueDay = dueDayNumber(dueSince, todayKey) || 1;
    let nextMember = member;

    if (!member.dueSince) {
      changed = true;
      nextMember = { ...nextMember, dueSince };
    }

    // If the manager disables auto suspension or moves the meal-off day into the
    // future, only a previous *automatic* suspension is reversed. Manual meal-off
    // decisions (autoMealSuspended === false) are never touched here.
    const shouldBeAutoSuspended = autoSuspendMeals && dueDay >= mealOffAfterDays;
    if (member.autoMealSuspended && !shouldBeAutoSuspended) {
      changed = true;
      nextMember = {
        ...nextMember,
        mealStatus: "active",
        autoMealSuspended: false,
        mealSuspendedAt: null,
      };
    }

    // If the app was not opened during the first-warning day and the member has
    // already reached the final meal-off stage, send only the final notice rather
    // than firing two alert sounds/notices together.
    const reachedMealOff = autoSuspendMeals && dueDay >= mealOffAfterDays;

    if (
      !reachedMealOff &&
      dueDay >= warningAfterDays &&
      !nextMember.paymentWarningSentAt
    ) {
      changed = true;
      nextMember = { ...nextMember, paymentWarningSentAt: nowIso };
      generatedNotices.push({
        id: makeNoticeId(),
        messId,
        senderName: "Smart Mess Manager",
        message: warningText({
          memberName: member.name,
          balance,
          currency,
          dueDay,
          offDay: mealOffAfterDays,
        }),
        pinned: true,
        type: "payment_warning",
        targetUserId: member.userId || null,
        targetMemberId: member.id,
        autoKey: `payment-warning:${mess.month}:${member.id}:${dueSince}`,
        createdAt: nowIso,
      });
    }

    if (reachedMealOff && nextMember.mealStatus !== "suspended") {
      changed = true;
      nextMember = {
        ...nextMember,
        // Mark the warning stage as reached as well so status indicators cannot
        // regress when the app first wakes up on/after the meal-off day.
        paymentWarningSentAt: nextMember.paymentWarningSentAt || nowIso,
        mealStatus: "suspended",
        autoMealSuspended: true,
        mealSuspendedAt: nowIso,
      };
      generatedNotices.push({
        id: makeNoticeId(),
        messId,
        senderName: "Smart Mess Manager",
        message: suspensionText({ memberName: member.name, balance, currency, dueDay }),
        pinned: true,
        type: "meal_suspended",
        targetUserId: member.userId || null,
        targetMemberId: member.id,
        autoKey: `meal-suspended:${mess.month}:${member.id}:${dueSince}`,
        createdAt: nowIso,
      });
    }

    return nextMember;
  });

  const existingKeys = new Set((store.notices || []).map((notice) => notice.autoKey).filter(Boolean));
  const uniqueGenerated = generatedNotices.filter((notice) => !existingKeys.has(notice.autoKey));

  if (!changed && uniqueGenerated.length === 0) return { changed: false, store };

  return {
    changed: true,
    store: {
      ...store,
      messes: store.messes.map((item) =>
        item.id === messId ? { ...item, warningSettings: settings } : item
      ),
      members,
      notices: [...(store.notices || []), ...uniqueGenerated],
    },
  };
}
