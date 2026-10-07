export const money = (value, currency = "BDT") => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
};

export const mealTotal = (meal) =>
  Number(meal.breakfast || 0) + Number(meal.lunch || 0) + Number(meal.dinner || 0);

export const filterByMonth = (rows, dateField, month) =>
  rows.filter((row) => String(row[dateField] || "").startsWith(month));

export function calculateMonthly({ mess, members, meals, marketCosts, deposits, expenses }) {
  const month = mess?.month || new Date().toISOString().slice(0, 7);
  const monthMeals = filterByMonth(meals, "mealDate", month);
  const monthMarket = filterByMonth(marketCosts, "costDate", month);
  const monthDeposits = filterByMonth(deposits, "depositDate", month);
  const monthExpenses = filterByMonth(expenses, "expenseDate", month);

  // Historical reports must retain members who had transactions in that month
  // even if they are inactive/archived today. Current active members remain part
  // of the settlement exactly as before.
  const monthMemberIds = new Set([
    ...monthMeals.map((row) => row.memberId),
    ...monthDeposits.map((row) => row.memberId),
    ...monthExpenses.map((row) => row.assignedMemberId).filter(Boolean),
  ]);
  const activeMembers = members.filter(
    (member) => member.status === "active" || monthMemberIds.has(member.id)
  );

  const totalMeals = monthMeals.reduce((sum, meal) => sum + mealTotal(meal), 0);
  const totalMarketCost = monthMarket.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalDeposits = monthDeposits.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalExpenses = monthExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const mealRate = totalMeals ? totalMarketCost / totalMeals : 0;

  const sharedExpenses = monthExpenses.filter((e) => e.splitType === "shared");
  const assignedExpenses = monthExpenses.filter((e) => e.splitType === "assigned");
  const sharedTotal = sharedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const sharedPerMember = activeMembers.length ? sharedTotal / activeMembers.length : 0;

  const memberRows = activeMembers.map((member) => {
    const memberMeals = monthMeals.filter((meal) => meal.memberId === member.id);
    const memberMealTotal = memberMeals.reduce((sum, meal) => sum + mealTotal(meal), 0);
    const memberMealCost = memberMealTotal * mealRate;
    const memberDeposits = monthDeposits
      .filter((deposit) => deposit.memberId === member.id)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const memberAssignedExpenses = assignedExpenses
      .filter((expense) => expense.assignedMemberId === member.id)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const totalPayable = memberMealCost + sharedPerMember + memberAssignedExpenses;
    const balance = memberDeposits - totalPayable;

    return {
      memberId: member.id,
      name: member.name,
      roomNo: member.roomNo,
      meals: memberMealTotal,
      mealCost: memberMealCost,
      sharedExtra: sharedPerMember,
      assignedExtra: memberAssignedExpenses,
      deposit: memberDeposits,
      payable: totalPayable,
      balance,
      statusText: balance >= 0 ? "Will get back" : "Need to pay",
    };
  });

  const highestMealTaker = [...memberRows].sort((a, b) => b.meals - a.meals)[0] || null;
  const highestDepositor = [...memberRows].sort((a, b) => b.deposit - a.deposit)[0] || null;
  const dueMembers = memberRows.filter((row) => row.balance < 0);

  return {
    month,
    activeMembers,
    totalMeals,
    totalMarketCost,
    totalDeposits,
    totalExpenses,
    mealRate,
    sharedTotal,
    sharedPerMember,
    memberRows,
    highestMealTaker,
    highestDepositor,
    dueMembers,
  };
}
