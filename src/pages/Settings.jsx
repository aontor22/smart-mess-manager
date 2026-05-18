import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";

export default function Settings() {
  const { activeMess, members, updateMess, transferManager, resetDemoData, isManager } = useData();
  const [form, setForm] = useState(activeMess);

  const save = (e) => {
    e.preventDefault();
    updateMess({
      ...form,
      monthlyRent: Number(form.monthlyRent || 0),
      serviceCharge: Number(form.serviceCharge || 0),
    });
  };

  return (
    <div>
      <PageHeader title="Settings" description="Update mess profile, month, currency, and manager role." />

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
          <h3 className="mb-4 text-lg font-bold">Manager role</h3>
          <p className="mb-4 text-sm text-slate-500">Transfer manager role to another active member.</p>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                </div>
                {isManager && member.role !== "manager" && (
                  <button className="btn-secondary" onClick={() => transferManager(member.id)}>Make manager</button>
                )}
              </div>
            ))}
          </div>

          {isManager && (
            <button className="mt-6 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={resetDemoData}>
              Reset demo data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
