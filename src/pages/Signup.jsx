import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup, loginWithGoogle, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await signup(form);
      if (result.hasSession) {
        navigate("/mess-setup");
      } else {
        setSuccess("Account created. Check your email to confirm the account, then login.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const googleSignup = async () => {
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
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <form className="card w-full max-w-md" onSubmit={submit}>
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isSupabaseConfigured
            ? "Create an account, then create your own mess or join one with its unique Mess ID."
            : "Supabase is not configured, so signup will run in local demo mode."}
        </p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
        {success && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{success}</div>}

        {isSupabaseConfigured && (
          <div className="mt-5">
            <GoogleAuthButton
              onClick={googleSignup}
              disabled={googleLoading || loading}
              label={googleLoading ? "Opening Google..." : "Sign up with Google"}
            />
            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              or
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )}

        <div className={isSupabaseConfigured ? "" : "mt-5"}>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="mt-4">
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="mt-4">
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="mt-4">
          <label className="label">Password</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
        </div>

        <button className="btn-primary mt-6 w-full" disabled={loading || googleLoading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account? <Link className="font-semibold text-emerald-600" to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
