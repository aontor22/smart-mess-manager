import { Building2, KeyRound, LogOut, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

export default function MessSetup() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { createMess, joinMess } = useData();
  const [mode, setMode] = useState("join");
  const [createForm, setCreateForm] = useState({ name: "", address: "" });
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitCreate = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createMess(createForm);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitJoin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await joinMess(joinCode);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-600">Smart Mess Manager</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">Choose your mess workspace</h1>
            <p className="mt-2 text-sm text-slate-500">
              Signed in as {currentUser?.email}. One account can be linked to one active mess, so another mess cannot be opened accidentally.
            </p>
          </div>
          <button className="btn-secondary shrink-0 gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => { setMode("join"); setError(""); }}
            className={`rounded-2xl border p-5 text-left transition ${
              mode === "join"
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
            }`}
          >
            <Users className="mb-3 h-6 w-6 text-emerald-600" />
            <p className="font-bold">Join existing mess</p>
            <p className="mt-1 text-sm text-slate-500">Enter the unique Mess ID shared by your manager.</p>
          </button>

          <button
            type="button"
            onClick={() => { setMode("create"); setError(""); }}
            className={`rounded-2xl border p-5 text-left transition ${
              mode === "create"
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
            }`}
          >
            <Building2 className="mb-3 h-6 w-6 text-emerald-600" />
            <p className="font-bold">Create a new mess</p>
            <p className="mt-1 text-sm text-slate-500">You become manager and receive a unique shareable Mess ID.</p>
          </button>
        </div>

        <div className="card">
          {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

          {mode === "join" ? (
            <form onSubmit={submitJoin}>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Enter Mess ID</h2>
                  <p className="text-sm text-slate-500">Example: SMM-ABCD2345</p>
                </div>
              </div>
              <label className="label">Unique Mess ID</label>
              <input
                className="input uppercase tracking-widest"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="SMM-XXXXXXXX"
                autoComplete="off"
                required
              />
              <button className="btn-primary mt-5 w-full" disabled={loading || !joinCode.trim()}>
                {loading ? "Joining..." : "Join mess"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCreate}>
              <h2 className="text-lg font-bold">Create your mess</h2>
              <p className="mt-1 text-sm text-slate-500">A secure, unique Mess ID will be generated automatically.</p>
              <div className="mt-5">
                <label className="label">Mess name</label>
                <input
                  className="input"
                  value={createForm.name}
                  onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                  placeholder="e.g. Green View Mess"
                  required
                />
              </div>
              <div className="mt-4">
                <label className="label">Address</label>
                <input
                  className="input"
                  value={createForm.address}
                  onChange={(event) => setCreateForm({ ...createForm, address: event.target.value })}
                  placeholder="Mess address"
                />
              </div>
              <button className="btn-primary mt-5 w-full" disabled={loading}>
                {loading ? "Creating..." : "Create mess"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
