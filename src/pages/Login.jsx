import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, loginWithGoogle, isSupabaseConfigured, demoCredentials } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: demoCredentials.email, password: demoCredentials.password });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const googleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 dark:bg-slate-950">
      <form className="card w-full max-w-md" onSubmit={submit}>
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isSupabaseConfigured
            ? "Sign in, then open only the mess workspace linked to your account."
            : "Supabase is not configured, so demo LocalStorage mode is active."}
        </p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

        {isSupabaseConfigured && (
          <div className="mt-5">
            <GoogleAuthButton
              onClick={googleLogin}
              disabled={googleLoading || loading}
              label={googleLoading ? "Opening Google..." : "Continue with Google"}
            />
            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              or
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )}

        <div className={isSupabaseConfigured ? "" : "mt-5"}>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="mt-4">
          <label className="label">Password</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>

        <button className="btn-primary mt-6 w-full" disabled={loading || googleLoading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          No account? <Link className="font-semibold text-emerald-600" to="/signup">Create one</Link>
        </p>
      </form>
    </div>
  );
}
