export function getMemberAlertState(member) {
  if (!member) {
    return { warning: "none", meal: "inactive" };
  }

  const mealIsOff = member.mealStatus === "suspended";
  const isFinalWarning = mealIsOff || Boolean(member.mealSuspendedAt) || Boolean(member.autoMealSuspended);
  const hasPaymentWarning = !isFinalWarning && Boolean(member.paymentWarningSentAt);

  return {
    warning: isFinalWarning ? "final" : hasPaymentWarning ? "warning" : "none",
    meal: member.status !== "active" ? "inactive" : mealIsOff ? "off" : "active",
  };
}
