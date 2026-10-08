import {
  AlertTriangle,
  BellRing,
  Check,
  Clock3,
  Copy,
  RefreshCw,
  Save,
  ShieldAlert,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";
import { normalizeWarningSettings } from "../utils/warnings";

const messDefaults = (mess) => ({
  name: mess?.name || "",
  month: mess?.month || new Date().toISOString().slice(0, 7),
  currency: mess?.currency || "BDT",
  monthlyRent: mess?.monthlyRent || 0,
  serviceCharge: mess?.serviceCharge || 0,
  address: mess?.address || "",
});

const warningDefaults = (mess) => {
  const normalized = normalizeWarningSettings(mess?.warningSettings || {});
  return {
    enabled: normalized.enabled,
    warningAfterDays: normalized.warningAfterDays,
    mealOffAfterDays: normalized.mealOffAfterDays,
    minimumDue: normalized.minimumDue,
    autoSuspendMeals: normalized.autoSuspendMeals,
  };
};

export default function Settings() {
  const {
    activeMess,
    members,
    updateMess,
    transferManager,
    regenerateJoinCode,
    resetDemoData,
    isManager,
  } = useData();
  const [messForm, setMessForm] = useState(() => messDefaults(activeMess));
  const [warningForm, setWarningForm] = useState(() => warningDefaults(activeMess));
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMessForm(messDefaults(activeMess));
  }, [
    activeMess?.id,
    activeMess?.name,
    activeMess?.month,
    activeMess?.currency,
    activeMess?.monthlyRent,
    activeMess?.serviceCharge,
    activeMess?.address,
  ]);

  useEffect(() => {
    setWarningForm(warningDefaults(activeMess));
  }, [
    activeMess?.id,
    activeMess?.warningSettings?.enabled,
    activeMess?.warningSettings?.warningAfterDays,
    activeMess?.warningSettings?.mealOffAfterDays,
    activeMess?.warningSettings?.minimumDue,
    activeMess?.warningSettings?.autoSuspendMeals,
  ]);

  const warningValidation = useMemo(() => {
    const warningDay = Number(warningForm.warningAfterDays);
    const mealOffDay = Number(warningForm.mealOffAfterDays);
    const minimumDue = Number(warningForm.minimumDue);

    if (!Number.isInteger(warningDay) || warningDay < 1) {
      return "Warning day must be a whole number starting from Day 1.";
    }
    if (!Number.isInteger(mealOffDay) || mealOffDay <= warningDay) {
      return `Meal off day must be later than warning day (Day ${warningDay + 1} or later).`;
    }
    if (!Number.isFinite(minimumDue) || minimumDue < 0) {
      return "Minimum due cannot be negative.";
    }
    return "";
  }, [warningForm.warningAfterDays, warningForm.mealOffAfterDays, warningForm.minimumDue]);

  if (!activeMess) return null;

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  const saveMessSettings = (event) => {
    event.preventDefault();
    clearFeedback();

    updateMess({
      ...messForm,
      monthlyRent: Math.max(0, Number(messForm.monthlyRent || 0)),
      serviceCharge: Math.max(0, Number(messForm.serviceCharge || 0)),
    });
    setMessage("Mess settings saved.");
  };

  const saveWarningSettings = (event) => {
    event.preventDefault();
    clearFeedback();

    if (warningValidation) {
      setError(warningValidation);
      return;
    }

    const normalized = normalizeWarningSettings(warningForm);
    setWarningForm(normalized);
    updateMess({ warningSettings: normalized });
    setMessage(
      `Automation saved: first warning on Day ${normalized.warningAfterDays}, meal off on Day ${normalized.mealOffAfterDays}.`
    );
  };

  const setWarningDay = (value) => {
    setWarningForm((previous) => {
      const next = { ...previous, warningAfterDays: value };
      const warningDay = Number(value);
      const mealOffDay = Number(previous.mealOffAfterDays);
      if (Number.isInteger(warningDay) && warningDay >= 1 && Number.isFinite(mealOffDay) && mealOffDay <= warningDay) {
        next.mealOffAfterDays = warningDay + 1;
      }
      return next;
    });
  };

  const copyMessId = async () => {
    try {
      await navigator.clipboard.writeText(activeMess.joinCode || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy automatically. Select the Mess ID and copy it manually.");
    }
  };

  const regenerate = async () => {
    if (!window.confirm("Generate a new Mess ID? The old ID will stop working immediately.")) return;
    setBusy(true);
    clearFeedback();
    try {
      await regenerateJoinCode();
      setMessage("A new Mess ID was generated. Share only the new ID with members.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const makeManager = async (memberId) => {
    if (!window.confirm("Transfer manager access to this member? You will become a regular member.")) return;
    setBusy(true);
    clearFeedback();
    try {
      await transferManager(memberId);
      setMessage("Manager role transferred successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const warningDay = Math.max(1, Number(warningForm.warningAfterDays) || 1);
  const mealOffDay = Math.max(warningDay + 1, Number(warningForm.mealOffAfterDays) || warningDay + 1);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage mess profile, secure Mess ID, payment warnings, and manager access."
      />

      {(message || error) && (
        <div
          className={`mb-5 rounded-2xl p-3 text-sm ${
            error
              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-600">Unique Mess ID</p>
              <h3 className="mt-1 text-lg font-bold">Member access code</h3>
              <p className="mt-1 text-sm text-slate-500">
                Only people who sign in and join with this ID can open this mess workspace.
              </p>
            </div>
            <ShieldAlert className="h-6 w-6 text-emerald-600" />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-3 font-mono text-lg font-bold tracking-wider text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              {activeMess.joinCode || "Not available"}
            </div>
            <button type="button" className="btn-secondary gap-2" onClick={copyMessId} disabled={!activeMess.joinCode}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {isManager && (
            <button type="button" className="btn-secondary mt-3 gap-2" onClick={regenerate} disabled={busy}>
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              Generate new Mess ID
            </button>
          )}
        </div>

        <form className="card overflow-hidden" onSubmit={saveWarningSettings}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Automatic payment warning</h3>
                  <p className="text-xs font-medium text-emerald-600">Due date counts as Day 1</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                A warning is sent on the configured due day. If the balance remains due, automatic meal suspension can start on the later meal-off day.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/70 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <BellRing className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">First warning</span>
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Day {warningDay}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-3 dark:border-red-900/70 dark:bg-red-950/20">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <Utensils className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Meal off</span>
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Day {mealOffDay}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="warning-after-days">Warning on due day</label>
              <input
                id="warning-after-days"
                className="input"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={warningForm.warningAfterDays}
                onChange={(e) => setWarningDay(e.target.value)}
                disabled={!isManager}
              />
              <p className="mt-1 text-xs text-slate-500">Example: 4 means the first warning is sent on Day 4.</p>
            </div>
            <div>
              <label className="label" htmlFor="meal-off-after-days">Meal off on due day</label>
              <input
                id="meal-off-after-days"
                className="input"
                type="number"
                min={warningDay + 1}
                step="1"
                inputMode="numeric"
                value={warningForm.mealOffAfterDays}
                onChange={(e) => setWarningForm({ ...warningForm, mealOffAfterDays: e.target.value })}
                disabled={!isManager}
              />
              <p className="mt-1 text-xs text-slate-500">Must be later than the first warning day.</p>
            </div>
            <div>
              <label className="label" htmlFor="minimum-due">Minimum due ({messForm.currency})</label>
              <input
                id="minimum-due"
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={warningForm.minimumDue}
                onChange={(e) => setWarningForm({ ...warningForm, minimumDue: e.target.value })}
                disabled={!isManager}
              />
              <p className="mt-1 text-xs text-slate-500">Balances below this amount do not start the due timer.</p>
            </div>
            <div className="flex items-end">
              <label className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={warningForm.autoSuspendMeals}
                  onChange={(e) => setWarningForm({ ...warningForm, autoSuspendMeals: e.target.checked })}
                  disabled={!isManager}
                />
                Auto meal suspension
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800/70">
            <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p>
                Timer starts only while the member remains at least {Number(warningForm.minimumDue || 0)} {messForm.currency} in negative balance. Clearing the due resets the timer and automatically restores meals if they were suspended by this automation.
              </p>
            </div>
          </div>

          {warningValidation && isManager && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warningValidation}</span>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={warningForm.enabled}
                onChange={(e) => setWarningForm({ ...warningForm, enabled: e.target.checked })}
                disabled={!isManager}
              />
              Enable payment warning automation
            </label>

            {isManager && (
              <button className="btn-primary gap-2" type="submit" disabled={Boolean(warningValidation)}>
                <Save className="h-4 w-4" />
                Save automation
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form className="card" onSubmit={saveMessSettings}>
          <h3 className="mb-4 text-lg font-bold">Mess settings</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Mess name</label>
              <input className="input" value={messForm.name} onChange={(e) => setMessForm({ ...messForm, name: e.target.value })} disabled={!isManager} />
            </div>
            <div>
              <label className="label">Month</label>
              <input className="input" type="month" value={messForm.month} onChange={(e) => setMessForm({ ...messForm, month: e.target.value })} disabled={!isManager} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={messForm.currency} onChange={(e) => setMessForm({ ...messForm, currency: e.target.value })} disabled={!isManager}>
                <option>BDT</option>
                <option>USD</option>
                <option>INR</option>
              </select>
            </div>
            <div>
              <label className="label">Monthly rent</label>
              <input className="input" type="number" min="0" value={messForm.monthlyRent} onChange={(e) => setMessForm({ ...messForm, monthlyRent: e.target.value })} disabled={!isManager} />
            </div>
            <div>
              <label className="label">Service charge</label>
              <input className="input" type="number" min="0" value={messForm.serviceCharge} onChange={(e) => setMessForm({ ...messForm, serviceCharge: e.target.value })} disabled={!isManager} />
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" value={messForm.address} onChange={(e) => setMessForm({ ...messForm, address: e.target.value })} disabled={!isManager} />
            </div>
          </div>
          {isManager && <button className="btn-primary mt-5">Save settings</button>}
        </form>

        <div className="card">
          <h3 className="mb-1 text-lg font-bold">Manager role</h3>
          <p className="mb-4 text-sm text-slate-500">Only members who have joined with their own account can receive manager access.</p>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {member.role} · {member.userId ? "account linked" : "not joined yet"}
                  </p>
                </div>
                {isManager && member.role !== "manager" && (
                  <button
                    className="btn-secondary"
                    onClick={() => makeManager(member.id)}
                    disabled={busy || !member.userId}
                    title={!member.userId ? "Member must join with their account first" : "Transfer manager role"}
                  >
                    Make manager
                  </button>
                )}
              </div>
            ))}
          </div>

          {isManager && (
            <button
              className="mt-6 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => {
                if (window.confirm("Clear meals, deposits, expenses, notices, and to-let posts for this mess? Members and Mess ID will stay.")) {
                  resetDemoData();
                }
              }}
              disabled={busy}
            >
              Clear transaction data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
