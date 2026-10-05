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
  UserRound,
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
  { to: "/app/profile", label: "Profile", icon: UserRound },
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
        className={`fixed left-0 top-0 z-40 h-dvh w-[88vw] max-w-72 overflow-y-auto border-r border-slate-200 bg-white p-4 pb-8 transition-transform dark:border-slate-800 dark:bg-slate-950 lg:h-screen lg:w-72 lg:max-w-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-7 flex items-center justify-between">
          <NavLink to="/app" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">S</div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-900 dark:text-white">Smart Mess</p>
              <p className="truncate text-xs text-slate-500">Meal and cost manager</p>
            </div>
          </NavLink>
          <button className="shrink-0 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
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
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
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
  const { activeMess, syncStatus, manualSync, warningNotices } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("smm-theme", dark ? "dark" : "light");
  }, [dark]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const avatarLetter = currentUser?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Sidebar open={open} setOpen={setOpen} />

      <main className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-4">
          <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button className="btn-secondary h-10 w-10 shrink-0 px-0 lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold sm:text-base md:text-xl">{activeMess?.name || "Smart Mess Manager"}</h1>
                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  {activeMess?.month} · {activeMess?.address || "No address set"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <NavLink
                to="/app/notices"
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {warningNotices.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {warningNotices.length > 9 ? "9+" : warningNotices.length}
                  </span>
                )}
              </NavLink>
              <button
                className="btn-secondary h-10 w-10 shrink-0 px-0"
                onClick={() => setDark((value) => !value)}
                title={dark ? "Use light theme" : "Use dark theme"}
                aria-label={dark ? "Use light theme" : "Use dark theme"}
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={manualSync}
                className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950 md:block"
                title="Click to sync now"
              >
                {syncStatus}
              </button>
              <NavLink
                to="/app/profile"
                className="flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl px-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900 sm:px-2"
                title="Profile"
                aria-label="Profile"
              >
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {avatarLetter}
                  </span>
                )}
                <span className="hidden max-w-36 truncate xl:inline">{currentUser?.name}</span>
              </NavLink>
              <button className="btn-secondary h-10 w-10 shrink-0 px-0" onClick={handleLogout} title="Sign out" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto min-w-0 max-w-7xl p-3 pb-24 sm:p-4 md:p-6">
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
                  `flex min-w-0 flex-col items-center gap-1 rounded-xl py-2 text-[10px] sm:text-[11px] ${
                    isActive ? "text-emerald-600" : "text-slate-500"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-full truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
