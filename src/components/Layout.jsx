import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Building2,
  ChartPie,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Settings,
  Sun,
  Users,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

const nav = [
  { to: "/app", label: "Dashboard", icon: Home },
  { to: "/app/members", label: "Members", icon: Users },
  { to: "/app/meals", label: "Meals", icon: Utensils },
  { to: "/app/market", label: "Market", icon: Receipt },
  { to: "/app/deposits", label: "Deposits", icon: WalletCards },
  { to: "/app/expenses", label: "Expenses", icon: CreditCard },
  { to: "/app/reports", label: "Reports", icon: ChartPie },
  { to: "/app/notices", label: "Notices", icon: Bell },
  { to: "/app/tolet", label: "To-let", icon: Building2 },
  { to: "/app/activity", label: "Activity", icon: Activity },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function Sidebar({ open, setOpen }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/40 lg:hidden ${open ? "block" : "hidden"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 border-r border-slate-200 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-950 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-7 flex items-center justify-between">
          <NavLink to="/app" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">
              S
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">Smart Mess</p>
              <p className="text-xs text-slate-500">Meal and cost manager</p>
            </div>
          </NavLink>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("smm-theme") === "dark");
  const { currentUser, logout } = useAuth();
  const { activeMess, syncStatus, manualSync } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("smm-theme", dark ? "dark" : "light");
  }, [dark]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Sidebar open={open} setOpen={setOpen} />

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="btn-secondary px-3 lg:hidden" onClick={() => setOpen(true)}>
                <Menu className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-base font-bold md:text-xl">{activeMess?.name || "Smart Mess Manager"}</h1>
                <p className="text-xs text-slate-500">{activeMess?.month} · {activeMess?.address || "No address set"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn-secondary px-3" onClick={() => setDark((value) => !value)}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={manualSync}
                className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950 md:block"
                title="Click to sync now"
              >
                {syncStatus}
              </button>
              <NavLink to="/app/profile" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900 md:block">
                {currentUser?.name}
              </NavLink>
              <button className="btn-secondary px-3" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 pb-24 md:p-6">
          <Outlet />
        </div>

        <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          {nav.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] ${
                    isActive ? "text-emerald-600" : "text-slate-500"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
