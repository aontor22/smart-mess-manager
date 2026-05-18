import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";
import { money } from "../utils/calculations";
import { downloadCSV, downloadReportPDF } from "../utils/export";

export default function Reports() {
  const { activeMess, monthly } = useData();
  const currency = activeMess?.currency || "BDT";

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

  return (
    <div>
      <PageHeader
        title="Monthly report"
        description="View, print, export, and download the final monthly settlement."
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => window.print()}>Print</button>
            <button className="btn-secondary" onClick={() => downloadCSV("monthly-report.csv", csvRows)}>Export CSV</button>
            <button className="btn-primary" onClick={() => downloadReportPDF({ title: activeMess.name, subtitle: `Monthly report for ${monthly.month}`, rows: monthly.memberRows, currency })}>Download PDF</button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="card"><p className="text-sm text-slate-500">Total meals</p><h3 className="mt-2 text-2xl font-bold">{monthly.totalMeals}</h3></div>
        <div className="card"><p className="text-sm text-slate-500">Meal rate</p><h3 className="mt-2 text-2xl font-bold">{money(monthly.mealRate, currency)}</h3></div>
        <div className="card"><p className="text-sm text-slate-500">Market cost</p><h3 className="mt-2 text-2xl font-bold">{money(monthly.totalMarketCost, currency)}</h3></div>
        <div className="card"><p className="text-sm text-slate-500">Shared extra per member</p><h3 className="mt-2 text-2xl font-bold">{money(monthly.sharedPerMember, currency)}</h3></div>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Meals</th>
              <th className="px-4 py-3">Meal cost</th>
              <th className="px-4 py-3">Shared extra</th>
              <th className="px-4 py-3">Assigned extra</th>
              <th className="px-4 py-3">Payable</th>
              <th className="px-4 py-3">Deposit</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {monthly.memberRows.map((row) => (
              <tr key={row.memberId}>
                <td className="table-cell font-semibold">{row.name}</td>
                <td className="table-cell">{row.meals}</td>
                <td className="table-cell">{money(row.mealCost, currency)}</td>
                <td className="table-cell">{money(row.sharedExtra, currency)}</td>
                <td className="table-cell">{money(row.assignedExtra, currency)}</td>
                <td className="table-cell font-bold">{money(row.payable, currency)}</td>
                <td className="table-cell">{money(row.deposit, currency)}</td>
                <td className={`table-cell font-bold ${row.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{money(row.balance, currency)}</td>
                <td className="table-cell">{row.statusText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt-5">
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
