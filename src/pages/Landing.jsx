import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, CheckCircle2, Receipt, Shield, Users, Utensils } from "lucide-react";

const features = [
  { icon: Utensils, title: "Daily meal tracking", text: "Track breakfast, lunch, dinner, and half meals for every member." },
  { icon: Receipt, title: "Bazar and expense records", text: "Add market costs, rent, utilities, and member-specific expenses." },
  { icon: BarChart3, title: "Automatic settlement", text: "Calculate meal rate, payable amount, deposits, and balances instantly." },
  { icon: Shield, title: "Transparent records", text: "Members can view clear monthly reports without manual confusion." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 font-bold text-white">S</div>
            <span className="font-bold">Smart Mess Manager</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link className="btn-secondary" to="/login">Login</Link>
            <Link className="btn-primary" to="/signup">Get started</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
        <div>
          <div className="mb-4 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            Built for mess, hostel, and shared living
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Stop calculating mess bills on paper.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Manage members, meals, bazar, deposits, rent, utilities, notices, and monthly settlement from one simple dashboard.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/signup" className="btn-primary gap-2">
              Start free demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="btn-secondary">Try demo login</Link>
          </div>
        </div>

        <div className="card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Current month</p>
              <h2 className="text-2xl font-bold">May Settlement</h2>
            </div>
            <Users className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Total meals 187.5", "Meal rate 82.40 BDT", "Bazar cost 15,450 BDT", "Deposits 32,000 BDT"].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-4">
                <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
                <p className="font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold">Everything your mess manager needs</h2>
          <p className="mt-2 text-slate-600">Simple enough for daily use, powerful enough for accurate monthly accounting.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div className="card" key={feature.title}>
                <Icon className="mb-4 h-8 w-8 text-emerald-600" />
                <h3 className="font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h2 className="text-3xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["Create your mess", "Add members and daily records", "Generate final monthly report"].map((step, index) => (
              <div className="rounded-3xl border border-slate-200 p-6" key={step}>
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-emerald-600 font-bold text-white">{index + 1}</div>
                <p className="font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm font-semibold text-white md:flex-row">
          <p>
            © 2026 Smart Mess Manager • Developed by{" "}
            <span className="text-sky-400">Udoy Chowdhury</span>
          </p>
      
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
