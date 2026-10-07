import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";
import { calculateMonthly, money } from "../utils/calculations";
import { downloadCSV, downloadReportPDF } from "../utils/export";
import { collectAvailableMonths } from "../utils/profile";

const compactMoney = (value, currency) => money(value, currency);
const formatMonth = (month) => {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return month || "";
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

export default function Reports() {
  const { activeMess, members, meals, marketCosts, deposits, expenses } = useData();
  const currency = activeMess?.currency || "BDT";
  const reportTitle = activeMess?.name || "Smart Mess";
  const availableMonths = useMemo(
    () => collectAvailableMonths({ activeMess, meals, deposits, marketCosts, expenses }),
    [activeMess, meals, deposits, marketCosts, expenses]
  );
  const [selectedMonth, setSelectedMonth] = useState(activeMess?.month || availableMonths[0] || "");

  useEffect(() => {
    if (!selectedMonth || !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(activeMess?.month || availableMonths[0] || "");
    }
  }, [activeMess?.month, availableMonths, selectedMonth]);

  const monthly = useMemo(
    () => activeMess
      ? calculateMonthly({
          mess: { ...activeMess, month: selectedMonth || activeMess.month },
          members,
          meals,
          marketCosts,
          deposits,
          expenses,
        })
      : {
          month: selectedMonth,
          activeMembers: [],
          totalMeals: 0,
          totalMarketCost: 0,
          totalDeposits: 0,
          totalExpenses: 0,
          mealRate: 0,
          sharedTotal: 0,
          sharedPerMember: 0,
          memberRows: [],
        },
    [activeMess, selectedMonth, members, meals, marketCosts, deposits, expenses]
  );

  const csvRows = monthly.memberRows.map((row) => ({
    Member: row.name,
    Room: row.roomNo,
    Meals: row.meals,
    MealCost: row.mealCost.toFixed(2),
    SharedExtra: row.sharedExtra.toFixed(2),
    AssignedExtra: row.assignedExtra.toFixed(2),
    Payable: row.payable.toFixed(2),
    Deposit: row.deposit.toFixed(2),
    Balance: row.balance.toFixed(2),
    Status: row.statusText,
  }));

  const summaryRows = [
    ["Total meals", monthly.totalMeals, "Meal rate", compactMoney(monthly.mealRate, currency)],
    ["Market cost", compactMoney(monthly.totalMarketCost, currency), "Total deposits", compactMoney(monthly.totalDeposits, currency)],
    ["Shared expenses", compactMoney(monthly.sharedTotal, currency), "Shared extra/member", compactMoney(monthly.sharedPerMember, currency)],
    ["Total extra expenses", compactMoney(monthly.totalExpenses, currency), "Settlement members", monthly.activeMembers.length],
  ];

  return (
    <div>
      <div data-print-hide="true">
        <PageHeader
          title="Monthly report"
          description="View previous months, print, export, and download the final monthly settlement."
          action={
            <div className="flex w-full flex-wrap items-end justify-end gap-2 sm:w-auto">
              <div className="min-w-[180px] flex-1 sm:flex-none">
                <label className="label" htmlFor="report-month">Report month</label>
                <select id="report-month" className="input" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                  {availableMonths.map((month) => <option key={month} value={month}>{formatMonth(month)}</option>)}
                </select>
              </div>
              <button className="btn-secondary" onClick={() => window.print()}>Print</button>
              <button className="btn-secondary" onClick={() => downloadCSV(`monthly-report-${monthly.month}.csv`, csvRows)}>Export CSV</button>
              <button
                className="btn-primary"
                onClick={() =>
                  downloadReportPDF({
                    title: reportTitle,
                    subtitle: `Monthly report for ${monthly.month}`,
                    rows: monthly.memberRows,
                    currency,
                  })
                }
              >
                Download PDF
              </button>
            </div>
          }
        />
      </div>

      <section id="monthly-report-print" className="report-sheet">
        <div className="report-print-heading">
          <div>
            <p className="report-print-kicker">SMART MESS MANAGER</p>
            <h1>{reportTitle}</h1>
            <p>{activeMess?.address || "Mess monthly settlement"}</p>
          </div>
          <div className="report-print-period">
            <span>Monthly report</span>
            <strong>{formatMonth(monthly.month)}</strong>
          </div>
        </div>

        <div className="report-summary-wrap">
          <table className="report-summary-table" aria-label="Monthly report summary">
            <tbody>
              {summaryRows.map((row, index) => (
                <tr key={index}>
                  <th>{row[0]}</th>
                  <td>{row[1]}</td>
                  <th>{row[2]}</th>
                  <td>{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="report-table-wrap">
          <table className="report-settlement-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Member</th>
                <th>Room</th>
                <th>Meals</th>
                <th>Meal cost</th>
                <th>Shared extra</th>
                <th>Assigned extra</th>
                <th>Payable</th>
                <th>Deposit</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {monthly.memberRows.length === 0 ? (
                <tr>
                  <td colSpan="11" className="report-empty">No settlement data is available for this month.</td>
                </tr>
              ) : (
                monthly.memberRows.map((row, index) => (
                  <tr key={row.memberId}>
                    <td>{index + 1}</td>
                    <td className="report-member-name">{row.name}</td>
                    <td>{row.roomNo || "—"}</td>
                    <td>{row.meals}</td>
                    <td>{compactMoney(row.mealCost, currency)}</td>
                    <td>{compactMoney(row.sharedExtra, currency)}</td>
                    <td>{compactMoney(row.assignedExtra, currency)}</td>
                    <td className="report-payable">{compactMoney(row.payable, currency)}</td>
                    <td>{compactMoney(row.deposit, currency)}</td>
                    <td className={row.balance >= 0 ? "report-positive" : "report-negative"}>
                      {compactMoney(row.balance, currency)}
                    </td>
                    <td>
                      <span className={`report-status ${row.balance >= 0 ? "is-positive" : "is-negative"}`}>
                        {row.statusText}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="report-print-footer">
          <span>Balance = Deposit − (Meal cost + Shared extra + Assigned extra)</span>
          <span>Generated from Smart Mess Manager</span>
        </div>
      </section>

      <div className="card mt-5" data-print-hide="true">
        <h3 className="mb-3 text-lg font-bold">Calculation logic</h3>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>Total meal = sum of breakfast + lunch + dinner for all members.</p>
          <p>Meal rate = total market cost / total meal.</p>
          <p>Member meal cost = member total meal × meal rate.</p>
          <p>Total payable = meal cost + shared extra cost + assigned extra cost.</p>
          <p>Balance = deposit − total payable.</p>
        </div>
      </div>
    </div>
  );
}
