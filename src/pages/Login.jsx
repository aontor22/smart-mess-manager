import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "manager@demo.com", password: "123456" });
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    try {
      login(form.email, form.password);
      navigate("/app");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form className="card w-full max-w-md" onSubmit={submit}>
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-1 text-sm text-slate-500">Use the demo account or your own signup account.</p>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="mt-5">
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div className="mt-4">
          <label className="label">Password</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>

        <button className="btn-primary mt-6 w-full">Login</button>

        <p className="mt-4 text-center text-sm text-slate-500">
          No account? <Link className="font-semibold text-emerald-600" to="/signup">Create one</Link>
        </p>
      </form>
    </div>
  );
}
