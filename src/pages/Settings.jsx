import { Check, Copy, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";

const withDefaults = (mess) => ({
  name: mess?.name || "",
  month: mess?.month || new Date().toISOString().slice(0, 7),
  currency: mess?.currency || "BDT",
  monthlyRent: mess?.monthlyRent || 0,
  serviceCharge: mess?.serviceCharge || 0,
  address: mess?.address || "",
  warningSettings: {
    enabled: mess?.warningSettings?.enabled ?? true,
    warningAfterDays: mess?.warningSettings?.warningAfterDays ?? 4,
    mealOffAfterDays: mess?.warningSettings?.mealOffAfterDays ?? 7,
    minimumDue: mess?.warningSettings?.minimumDue ?? 1,
    autoSuspendMeals: mess?.warningSettings?.autoSuspendMeals ?? true,
  },
});

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
  const [form, setForm] = useState(() => withDefaults(activeMess));
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(withDefaults(activeMess));
  }, [activeMess]);

  if (!activeMess) return null;

  const save = (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const warningAfterDays = Math.max(0, Number(form.warningSettings.warningAfterDays || 0));
    const mealOffAfterDays = Math.max(
      warningAfterDays,
      Number(form.warningSettings.mealOffAfterDays || warningAfterDays)
    );

    updateMess({
      ...form,
      monthlyRent: Number(form.monthlyRent || 0),
      serviceCharge: Number(form.serviceCharge || 0),
      warningSettings: {
        ...form.warningSettings,
        warningAfterDays,
        mealOffAfterDays,
        minimumDue: Math.max(0, Number(form.warningSettings.minimumDue || 0)),
      },
    });
    setMessage("Settings saved.");
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
    setError("");
    setMessage("");
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
    setError("");
    setMessage("");
    try {
      await transferManager(memberId);
      setMessage("Manager role transferred successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage mess profile, secure Mess ID, payment warnings, and manager access." />

      {(message || error) && (
        <div className={`mb-5 rounded-2xl p-3 text-sm ${error ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"}`}>
          {error || message}
        </div>
      )}

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-600">Unique Mess ID</p>
              <h3 className="mt-1 text-lg font-bold">Member access code</h3>
              <p className="mt-1 text-sm text-slate-500">Only people who sign in and join with this ID can open this mess workspace.</p>
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

        <div className="card">
          <h3 className="text-lg font-bold">Automatic payment warning</h3>
          <p className="mt-1 text-sm text-slate-500">
            When a member stays in negative balance, the app creates a targeted warning and can automatically suspend new meal entries after the configured number of days.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Warning after (days)</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.warningSettings.warningAfterDays}
                onChange={(e) => setForm({ ...form, warningSettings: { ...form.warningSettings, warningAfterDays: e.target.value } })}
                disabled={!isManager}
              />
            </div>
            <div>
              <label className="label">Meal off after (days)</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.warningSettings.mealOffAfterDays}
                onChange={(e) => setForm({ ...form, warningSettings: { ...form.warningSettings, mealOffAfterDays: e.target.value } })}
                disabled={!isManager}
              />
            </div>
            <div>
              <label className="label">Minimum due ({form.currency})</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.warningSettings.minimumDue}
                onChange={(e) => setForm({ ...form, warningSettings: { ...form.warningSettings, minimumDue: e.target.value } })}
                disabled={!isManager}
              />
            </div>
            <div className="flex items-end">
              <label className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={form.warningSettings.autoSuspendMeals}
                  onChange={(e) => setForm({ ...form, warningSettings: { ...form.warningSettings, autoSuspendMeals: e.target.checked } })}
                  disabled={!isManager}
                />
                Auto meal suspension
              </label>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.warningSettings.enabled}
              onChange={(e) => setForm({ ...form, warningSettings: { ...form.warningSettings, enabled: e.target.checked } })}
              disabled={!isManager}
            />
            Enable payment warning automation
          </label>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form className="card" onSubmit={save}>
          <h3 className="mb-4 text-lg font-bold">Mess settings</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Mess name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!isManager} />
            </div>
            <div>
              <label className="label">Month</label>
              <input className="input" type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} disabled={!isManager} />
            </div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} disabled={!isManager}>
                <option>BDT</option>
                <option>USD</option>
                <option>INR</option>
              </select>
            </div>
            <div>
              <label className="label">Monthly rent</label>
              <input className="input" type="number" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} disabled={!isManager} />
            </div>
            <div>
              <label className="label">Service charge</label>
              <input className="input" type="number" value={form.serviceCharge} onChange={(e) => setForm({ ...form, serviceCharge: e.target.value })} disabled={!isManager} />
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={!isManager} />
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
