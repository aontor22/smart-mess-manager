import { AlertTriangle, BarChart3, Receipt, Users, Utensils, WalletCards } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { useData } from "../context/DataContext";
import { money } from "../utils/calculations";

export default function Dashboard() {
  const { activeMess, members, monthly, activityLogs, currentMember, warningNotices } = useData();
  const currency = activeMess?.currency || "BDT";

  const chartData = monthly.memberRows.map((row) => ({
    name: row.name.split(" ")[0],
    meals: row.meals,
    payable: Number(row.payable.toFixed(0)),
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your current month summary, member balance, and recent activity."
      />

      {(currentMember?.mealStatus === "suspended" || warningNotices.length > 0) && (
        <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 ${currentMember?.mealStatus === "suspended" ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"}`}>
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">{currentMember?.mealStatus === "suspended" ? "Your meal access is suspended" : "Payment warning"}</p>
            <p className="mt-1 text-sm">
              {warningNotices[0]?.message || "Please check your current balance and contact the manager."}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Members" value={members.filter((m) => m.status === "active").length} helper="Active members" icon={Users} />
        <StatCard title="Total meals" value={monthly.totalMeals.toFixed(1)} helper={monthly.month} icon={Utensils} />
        <StatCard title="Bazar cost" value={money(monthly.totalMarketCost, currency)} helper="Meal cost only" icon={Receipt} />
        <StatCard title="Deposits" value={money(monthly.totalDeposits, currency)} helper="This month" icon={WalletCards} />
        <StatCard title="Meal rate" value={money(monthly.mealRate, currency)} helper="Per meal" icon={BarChart3} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <h3 className="mb-4 text-lg font-bold">Member meal and payable overview</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="meals" />
                <Bar dataKey="payable" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold">Quick insights</h3>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-sm text-slate-500">Highest meal taker</p>
              <p className="font-bold">{monthly.highestMealTaker?.name || "N/A"} · {monthly.highestMealTaker?.meals || 0} meals</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-sm text-slate-500">Highest depositor</p>
              <p className="font-bold">{monthly.highestDepositor?.name || "N/A"} · {money(monthly.highestDepositor?.deposit || 0, currency)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-sm text-slate-500">Due members</p>
              <p className="font-bold">{monthly.dueMembers.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">
        <div className="card min-w-0 overflow-hidden">
          <h3 className="mb-4 text-lg font-bold">Final settlement preview</h3>

          {/* Mobile: compact two-row settlement list so the full section stays readable without pushing activity too far down. */}
          <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 sm:hidden">
            {monthly.memberRows.map((row) => (
              <div
                key={row.memberId}
                className="min-w-0 border-b border-slate-100 px-3 py-3 last:border-b-0 dark:border-slate-800"
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 break-words text-[13px] font-bold leading-5 text-slate-900 dark:text-white">{row.name}</p>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
                      row.balance >= 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                        : "bg-red-50 text-red-700 dark:bg-red-950/70 dark:text-red-300"
                    }`}
                  >
                    {money(row.balance, currency)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 divide-x divide-slate-100 text-[11px] dark:divide-slate-800">
                  <div className="min-w-0 pr-2">
                    <p className="text-slate-500">Meals</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{row.meals}</p>
                  </div>
                  <div className="min-w-0 px-2">
                    <p className="text-slate-500">Payable</p>
                    <p className="mt-0.5 break-words text-xs font-semibold leading-4 text-slate-800 dark:text-slate-100">{money(row.payable, currency)}</p>
                  </div>
                  <div className="min-w-0 pl-2">
                    <p className="text-slate-500">Deposit</p>
                    <p className="mt-0.5 break-words text-xs font-semibold leading-4 text-slate-800 dark:text-slate-100">{money(row.deposit, currency)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tablet/desktop: keep the familiar full settlement table. */}
          <div className="hidden max-w-full overflow-x-auto sm:block">
            <table className="w-full min-w-[650px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Meals</th>
                  <th className="px-4 py-3">Payable</th>
                  <th className="px-4 py-3">Deposit</th>
                  <th className="px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {monthly.memberRows.map((row) => (
                  <tr key={row.memberId}>
                    <td className="table-cell font-semibold">{row.name}</td>
                    <td className="table-cell">{row.meals}</td>
                    <td className="table-cell">{money(row.payable, currency)}</td>
                    <td className="table-cell">{money(row.deposit, currency)}</td>
                    <td className={`table-cell font-bold ${row.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {money(row.balance, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card min-w-0 overflow-hidden">
          <h3 className="mb-4 text-lg font-bold">Recent activity</h3>
          <div className="min-w-0 space-y-3">
            {activityLogs.slice(0, 6).map((item) => (
              <div key={item.id} className="min-w-0 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                <p className="break-words text-sm font-medium">{item.action}</p>
                <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                  {new Date(item.createdAt).toLocaleString()} by {item.actorName}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
