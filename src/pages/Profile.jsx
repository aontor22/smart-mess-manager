import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  DoorOpen,
  Edit3,
  Home,
  Mail,
  Phone,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Utensils,
  WalletCards,
  XCircle,
} from "lucide-react";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { money } from "../utils/calculations";
import {
  collectAvailableMonths,
  getProfileMonthlySnapshot,
  getRecentProfileEntries,
  normalizeEditableProfile,
} from "../utils/profile";

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatMonth = (value) => {
  if (!value) return "Month";
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
};

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/70">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-900 dark:text-white">
          {value || "Not set"}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, helper, tone = "default" }) {
  const toneClass =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
      : tone === "negative"
        ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 break-words text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{value}</p>
          {helper && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>}
        </div>
      </div>
    </div>
  );
}

function SaveStatus({ label, status, error }) {
  if (status === "idle") return null;
  const success = status === "success";
  const pending = status === "saving";

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : pending
            ? "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : pending ? (
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <div className="min-w-0">
        <p className="font-semibold">{label}: {success ? "saved" : pending ? "saving" : "failed"}</p>
        {error && <p className="mt-0.5 break-words text-xs opacity-90">{error}</p>}
      </div>
    </div>
  );
}

function EmptyRecent({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {children}
    </div>
  );
}

export default function Profile() {
  const { currentUser, authMode, updateAccountProfile } = useAuth();
  const {
    activeMess,
    currentMember,
    members,
    meals,
    marketCosts,
    deposits,
    expenses,
    isManager,
    syncStatus,
    updateOwnMemberProfile,
  } = useData();

  const availableMonths = useMemo(
    () => collectAvailableMonths({ activeMess, meals, deposits, marketCosts, expenses }),
    [activeMess, meals, deposits, marketCosts, expenses]
  );
  const [selectedMonth, setSelectedMonth] = useState(activeMess?.month || availableMonths[0] || "");
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saveState, setSaveState] = useState({
    account: "idle",
    accountError: "",
    mess: "idle",
    messError: "",
  });

  useEffect(() => {
    if (!selectedMonth || !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(activeMess?.month || availableMonths[0] || "");
    }
  }, [activeMess?.month, availableMonths, selectedMonth]);

  useEffect(() => {
    if (!editOpen) {
      setForm({
        name: currentMember?.name || currentUser?.name || "",
        phone: currentMember?.phone ?? currentUser?.phone ?? "",
      });
    }
  }, [currentMember?.name, currentMember?.phone, currentUser?.name, currentUser?.phone, editOpen]);

  const snapshot = useMemo(
    () =>
      getProfileMonthlySnapshot({
        month: selectedMonth,
        activeMess,
        members,
        meals,
        marketCosts,
        deposits,
        expenses,
        memberId: currentMember?.id,
      }),
    [selectedMonth, activeMess, members, meals, marketCosts, deposits, expenses, currentMember?.id]
  );

  const recent = useMemo(
    () =>
      getRecentProfileEntries({
        month: selectedMonth,
        memberId: currentMember?.id,
        meals,
        deposits,
        limit: 6,
      }),
    [selectedMonth, currentMember?.id, meals, deposits]
  );

  const settlement = snapshot.memberRow;
  const currency = activeMess?.currency || "BDT";
  const balance = Number(settlement?.balance || 0);
  const role = isManager ? "Manager" : currentMember?.role || "Member";
  const displayName = currentMember?.name || currentUser?.name || "User";
  const displayPhone = currentMember?.phone ?? currentUser?.phone ?? "";
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || "U";
  const balanceTone = balance > 0 ? "positive" : balance < 0 ? "negative" : "default";
  const balanceHelper = balance > 0 ? "You will get back" : balance < 0 ? "You need to pay" : "Settled for this month";

  const openEditor = () => {
    setMessage("");
    setFormError("");
    setSaveState({ account: "idle", accountError: "", mess: "idle", messError: "" });
    setForm({ name: displayName, phone: displayPhone });
    setEditOpen(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage("");
    setFormError("");

    let clean;
    try {
      clean = normalizeEditableProfile(form);
    } catch (error) {
      setFormError(error?.message || "Please check your profile details.");
      return;
    }

    setBusy(true);
    setSaveState({ account: "saving", accountError: "", mess: "saving", messError: "" });

    const [accountResult, messResult] = await Promise.allSettled([
      updateAccountProfile(clean),
      updateOwnMemberProfile(clean),
    ]);

    const accountOk = accountResult.status === "fulfilled";
    const messOk = messResult.status === "fulfilled";
    const accountError = accountOk ? "" : accountResult.reason?.message || "Could not update account profile.";
    const messError = messOk ? "" : messResult.reason?.message || "Could not update mess profile.";

    setSaveState({
      account: accountOk ? "success" : "error",
      accountError,
      mess: messOk ? "success" : "error",
      messError,
    });
    setBusy(false);

    if (accountOk && messOk) {
      setMessage("Profile updated successfully. Name and phone are synced with your account and mess profile.");
      window.setTimeout(() => setEditOpen(false), 350);
    } else {
      setFormError("One part of the profile update did not finish. The successful part is kept; retry to complete the remaining part.");
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Profile"
        description="Your account, mess membership, monthly balance and personal activity."
        action={
          <button className="btn-primary gap-2" onClick={openEditor}>
            <Edit3 className="h-4 w-4" />
            Edit profile
          </button>
        }
      />

      {message && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {message}
        </div>
      )}

      <section className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 px-4 py-6 text-white sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-2xl border-2 border-white/40 object-cover shadow-lg sm:h-20 sm:w-20 sm:rounded-3xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 text-2xl font-bold shadow-lg backdrop-blur sm:h-20 sm:w-20 sm:rounded-3xl sm:text-3xl">
                  {avatarLetter}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-xl font-bold sm:text-2xl">{displayName}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {role}
                  </span>
                </div>
                <p className="mt-1 break-all text-sm text-emerald-50/90">{currentUser?.email || currentMember?.email || "No email"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-50/80">
                  <span>{activeMess?.name || "Mess not set"}</span>
                  <span aria-hidden="true">•</span>
                  <span className="capitalize">{syncStatus}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur">
                <BadgeCheck className="h-4 w-4" />
                {currentMember?.status === "inactive" ? "Inactive membership" : "Active membership"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold backdrop-blur">
                <Utensils className="h-4 w-4" />
                Meals {currentMember?.mealStatus === "suspended" ? "suspended" : "active"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          <InfoRow icon={Phone} label="Phone" value={displayPhone || "Not set"} />
          <InfoRow icon={DoorOpen} label="Room" value={currentMember?.roomNo || "Not set"} />
          <InfoRow icon={CalendarDays} label="Joined" value={formatDate(currentMember?.joinDate)} />
          <InfoRow icon={Home} label="Mess" value={activeMess?.name || "Not set"} />
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white">Monthly profile summary</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Uses the same deposit − payable settlement calculation as Reports.
          </p>
        </div>
        <div className="w-full sm:w-56">
          <label className="label" htmlFor="profile-month">Month</label>
          <select
            id="profile-month"
            className="input"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>{formatMonth(month)}</option>
            ))}
          </select>
        </div>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={CircleDollarSign}
          label="Balance"
          value={money(balance, currency)}
          helper={balanceHelper}
          tone={balanceTone}
        />
        <SummaryCard
          icon={WalletCards}
          label="Deposited"
          value={money(settlement?.deposit || 0, currency)}
          helper={formatMonth(selectedMonth)}
        />
        <SummaryCard
          icon={Utensils}
          label="Meals"
          value={Number(settlement?.meals || 0).toFixed(1)}
          helper={`Meal rate ${money(snapshot.calculation?.mealRate || 0, currency)}`}
        />
        <SummaryCard
          icon={Receipt}
          label="Payable"
          value={money(settlement?.payable || 0, currency)}
          helper="Meal + shared/assigned expenses"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="card">
          <div className="mb-4">
            <h3 className="text-lg font-bold">Cost breakdown</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your settlement components for {formatMonth(selectedMonth)}.</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <span className="text-slate-500 dark:text-slate-400">Meal cost</span>
              <span className="font-bold">{money(settlement?.mealCost || 0, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <span className="text-slate-500 dark:text-slate-400">Shared expense</span>
              <span className="font-bold">{money(settlement?.sharedExtra || 0, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
              <span className="text-slate-500 dark:text-slate-400">Assigned expense</span>
              <span className="font-bold">{money(settlement?.assignedExtra || 0, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <span className="font-semibold">Final balance</span>
              <span className={`font-bold ${balance > 0 ? "text-emerald-600 dark:text-emerald-400" : balance < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                {money(balance, currency)}
              </span>
            </div>
          </div>
        </section>

        <section className="card min-w-0">
          <div className="mb-4">
            <h3 className="text-lg font-bold">Recent entries</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Only your meals and deposits for the selected month.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <Utensils className="h-4 w-4 text-emerald-600" />
                <h4 className="text-sm font-bold">Recent meals</h4>
              </div>
              {recent.meals.length ? (
                <div className="space-y-2">
                  {recent.meals.map((meal) => (
                    <div key={meal.id} className="rounded-2xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800/70">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{formatDate(meal.mealDate)}</span>
                        <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300">
                          {Number(meal.totalMeals || 0).toFixed(1)} meals
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        B {Number(meal.breakfast || 0)} · L {Number(meal.lunch || 0)} · D {Number(meal.dinner || 0)}
                      </p>
                      {meal.note && <p className="mt-1.5 break-words text-xs text-slate-600 dark:text-slate-300">{meal.note}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyRecent>No meal entries in this month.</EmptyRecent>
              )}
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-emerald-600" />
                <h4 className="text-sm font-bold">Recent deposits</h4>
              </div>
              {recent.deposits.length ? (
                <div className="space-y-2">
                  {recent.deposits.map((deposit) => (
                    <div key={deposit.id} className="rounded-2xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800/70">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{formatDate(deposit.depositDate)}</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{money(deposit.amount, currency)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {deposit.paymentMethod || "Payment method not set"}
                      </p>
                      {deposit.note && <p className="mt-1.5 break-words text-xs text-slate-600 dark:text-slate-300">{deposit.note}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyRecent>No deposit entries in this month.</EmptyRecent>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="card mt-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">Account & membership</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Contact and access details. Protected fields are read-only here.</p>
          </div>
          <button className="btn-secondary shrink-0 gap-2" onClick={openEditor}>
            <Edit3 className="h-4 w-4" />
            Edit name & phone
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoRow icon={Mail} label="Email" value={currentUser?.email || "Not set"} />
          <InfoRow icon={Phone} label="Phone" value={displayPhone || "Not set"} />
          <InfoRow icon={ShieldCheck} label="Account type" value={authMode === "supabase" ? "Cloud account" : "Local demo account"} />
          <InfoRow icon={BadgeCheck} label="Role" value={role} />
        </div>
      </section>

      <Modal open={editOpen} onClose={() => !busy && setEditOpen(false)} title="Edit profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="profile-name">Full name</label>
              <input
                id="profile-name"
                className="input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="profile-phone">Phone</label>
              <input
                id="profile-phone"
                className="input"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
              />
            </div>

            <div>
              <label className="label" htmlFor="profile-email">Email</label>
              <input id="profile-email" className="input cursor-not-allowed opacity-75" value={currentUser?.email || ""} disabled />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Only your <strong>name</strong> and <strong>phone</strong> can be changed here. Room, role, meal access, membership status and all financial data stay unchanged.
          </div>

          {(saveState.account !== "idle" || saveState.mess !== "idle") && (
            <div className="grid gap-2 sm:grid-cols-2">
              <SaveStatus label="Account profile" status={saveState.account} error={saveState.accountError} />
              <SaveStatus label="Mess profile" status={saveState.mess} error={saveState.messError} />
            </div>
          )}

          {formError && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn-primary" disabled={busy || !form.name.trim()}>
              {busy ? "Saving..." : saveState.account === "error" || saveState.mess === "error" ? "Retry save" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
