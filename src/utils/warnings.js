import { makeId, today } from "./storage";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const dayDiff = (startDate, endDate = today()) => {
  if (!startDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end - start) / MS_PER_DAY));
};

const warningText = ({ memberName, balance, currency, days, offDays }) =>
  `${memberName}, your current balance is ${Math.abs(balance).toFixed(2)} ${currency} due. ` +
  `It has remained negative for ${days} day${days === 1 ? "" : "s"}. Please add money. ` +
  `If the due continues for ${offDays} days, meal access may be suspended automatically.`;

const suspensionText = ({ memberName, balance, currency }) =>
  `${memberName}, your meal access has been suspended because your balance is ${Math.abs(balance).toFixed(2)} ${currency} due. ` +
  "Please add money and contact the manager. Meal access will be restored automatically after the balance is cleared.";

export function applyWarningAutomation(store, messId, monthly) {
  if (!store || !messId || !monthly) return { changed: false, store };

  const mess = store.messes.find((item) => item.id === messId);
  if (!mess) return { changed: false, store };

  const settings = mess.warningSettings || {};
  if (settings.enabled === false) return { changed: false, store };

  const warningAfterDays = Math.max(0, Number(settings.warningAfterDays ?? 4));
  const mealOffAfterDays = Math.max(warningAfterDays, Number(settings.mealOffAfterDays ?? 7));
  const minimumDue = Math.max(0, Number(settings.minimumDue ?? 1));
  const autoSuspendMeals = settings.autoSuspendMeals !== false;
  const currency = mess.currency || "BDT";
  const nowIso = new Date().toISOString();
  const todayKey = today();
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
    const days = dayDiff(dueSince, todayKey);
    let nextMember = member;

    if (!member.dueSince) {
      changed = true;
      nextMember = { ...nextMember, dueSince };
    }

    if (days >= warningAfterDays && !member.paymentWarningSentAt) {
      changed = true;
      nextMember = { ...nextMember, paymentWarningSentAt: nowIso };
      generatedNotices.push({
        id: makeId(),
        messId,
        senderName: "Smart Mess Manager",
        message: warningText({
          memberName: member.name,
          balance,
          currency,
          days,
          offDays: mealOffAfterDays,
        }),
        pinned: true,
        type: "payment_warning",
        targetUserId: member.userId || null,
        targetMemberId: member.id,
        autoKey: `payment-warning:${mess.month}:${member.id}`,
        createdAt: nowIso,
      });
    }

    if (
      autoSuspendMeals &&
      days >= mealOffAfterDays &&
      member.mealStatus !== "suspended"
    ) {
      changed = true;
      nextMember = {
        ...nextMember,
        mealStatus: "suspended",
        autoMealSuspended: true,
        mealSuspendedAt: nowIso,
      };
      generatedNotices.push({
        id: makeId(),
        messId,
        senderName: "Smart Mess Manager",
        message: suspensionText({ memberName: member.name, balance, currency }),
        pinned: true,
        type: "meal_suspended",
        targetUserId: member.userId || null,
        targetMemberId: member.id,
        autoKey: `meal-suspended:${mess.month}:${member.id}`,
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
      members,
      notices: [...(store.notices || []), ...uniqueGenerated],
    },
  };
}
