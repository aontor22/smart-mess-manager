import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, isSupabaseConfigured, demoCredentials } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: demoCredentials.email, password: demoCredentials.password });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate("/app");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form className="card w-full max-w-md" onSubmit={submit}>
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isSupabaseConfigured
            ? "Login with your Supabase account. After first login, the app can reopen offline in the same browser."
            : "Supabase is not configured, so demo LocalStorage mode is active."}
        </p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="mt-5">
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="mt-4">
          <label className="label">Password</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>

        <button className="btn-primary mt-6 w-full" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          No account? <Link className="font-semibold text-emerald-600" to="/signup">Create one</Link>
        </p>
      </form>
    </div>
  );
}
