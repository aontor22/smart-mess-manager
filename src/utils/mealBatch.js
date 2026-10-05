export const mealFields = ["breakfast", "lunch", "dinner"];

export const localMealDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function validMealDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function parseMealCount(value) {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") {
    throw new Error("Enter a meal count in every field (use 0 for no meal).");
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(number * 2)) {
    throw new Error("Meal counts must be non-negative whole or half numbers, such as 0, 0.5, 1 or 1.5.");
  }
  return number;
}

export function dayMemberMeals(meals, messId, mealDate, memberId) {
  return meals.filter((row) => row.messId === messId && row.mealDate === mealDate && row.memberId === memberId);
}

// Include individual IDs and notes: a total alone cannot detect a concurrent edit.
export function mealFingerprint(rows) {
  return JSON.stringify(rows.map((row) => [row.id, ...mealFields.map((field) => Number(row[field] || 0)), row.note || ""])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

export function summarizeMealRows(rows) {
  return {
    ...Object.fromEntries(mealFields.map((field) => [field, rows.reduce((sum, row) => sum + Number(row[field] || 0), 0)])),
    note: [...new Set(rows.map((row) => row.note).filter(Boolean))].join(" | "),
  };
}

// Validate the entire batch before building a new array. One caller persistence
// means a single local save and cloud push, rather than a request per member.
export function buildMealBatch({ meals, members, messId, mealDate, entries, makeId }) {
  if (!messId || !validMealDate(mealDate)) throw new Error("Select a valid date and mess.");
  const seen = new Set();
  const changes = entries.map((entry) => {
    if (seen.has(entry.memberId)) throw new Error("A member occurs twice in this batch.");
    seen.add(entry.memberId);
    const member = members.find((item) => item.id === entry.memberId && item.messId === messId);
    if (!member) throw new Error("A selected member no longer belongs to this mess. Reopen the day.");
    if (member.status !== "active" || member.mealStatus === "suspended") {
      throw new Error(`${member.name}: meal access is unavailable. Restore access before saving.`);
    }
    const existing = dayMemberMeals(meals, messId, mealDate, member.id);
    if (entry.expected !== mealFingerprint(existing)) {
      throw new Error(`${member.name}'s meals changed while you were editing. Reopen this day and try again.`);
    }
    const counts = Object.fromEntries(mealFields.map((field) => [field, parseMealCount(entry[field])]));
    // Empty untouched people never acquire zero-value transaction records.
    if (!existing.length && mealFields.every((field) => counts[field] === 0) && !String(entry.note || "").trim()) return null;
    return {
      memberId: member.id,
      row: {
        ...(existing[0] || {}),
        id: existing[0]?.id || makeId(),
        messId,
        memberId: member.id,
        mealDate,
        ...counts,
        note: String(entry.note || "").trim(),
      },
    };
  }).filter(Boolean);
  const changedIds = new Set(changes.map((change) => change.memberId));
  return {
    changedCount: changes.length,
    meals: [
      ...meals.filter((row) => !(row.messId === messId && row.mealDate === mealDate && changedIds.has(row.memberId))),
      ...changes.map((change) => change.row),
    ],
  };
}
