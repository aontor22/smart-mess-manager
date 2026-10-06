import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";
import { money } from "../utils/calculations";
import { downloadCSV, downloadReportPDF } from "../utils/export";

const compactMoney = (value, currency) => money(value, currency);

export default function Reports() {
  const { activeMess, monthly } = useData();
  const currency = activeMess?.currency || "BDT";
  const reportTitle = activeMess?.name || "Smart Mess";

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
    ["Total extra expenses", compactMoney(monthly.totalExpenses, currency), "Active members", monthly.activeMembers.length],
  ];

  return (
    <div>
      <div data-print-hide="true">
        <PageHeader
          title="Monthly report"
          description="View, print, export, and download the final monthly settlement."
          action={
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => window.print()}>Print</button>
              <button className="btn-secondary" onClick={() => downloadCSV("monthly-report.csv", csvRows)}>Export CSV</button>
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
            <strong>{monthly.month}</strong>
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
                  <td colSpan="11" className="report-empty">No active member settlement is available for this month.</td>
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
