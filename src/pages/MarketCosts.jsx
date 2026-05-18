import { useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RoleNotice from "../components/RoleNotice";
import { useData } from "../context/DataContext";
import { money } from "../utils/calculations";

const blank = { buyerMemberId: "", costDate: new Date().toISOString().slice(0, 10), amount: "", items: "", note: "" };

export default function MarketCosts() {
  const { activeMess, members, marketCosts, addRow, updateRow, deleteRow, isManager, monthly } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const currency = activeMess?.currency || "BDT";
  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";

  const save = (e) => {
    e.preventDefault();
    const data = { ...form, amount: Number(form.amount) };
    if (editing) updateRow("marketCosts", editing.id, data, `Updated bazar cost ${data.amount} ${currency}`);
    else addRow("marketCosts", data, `Added bazar cost ${data.amount} ${currency}`);
    setOpen(false);
    setEditing(null);
    setForm(blank);
  };

  const rows = [...marketCosts].sort((a, b) => new Date(b.costDate) - new Date(a.costDate));

  return (
    <div>
      <PageHeader
        title="Market costs"
        description={`Current month total bazar cost: ${money(monthly.totalMarketCost, currency)}`}
        action={isManager && <button className="btn-primary" onClick={() => { setEditing(null); setForm({ ...blank, buyerMemberId: members[0]?.id || "" }); setOpen(true); }}>Add cost</button>}
      />
      <RoleNotice />

      <div className="card overflow-x-auto">
        {rows.length === 0 ? <EmptyState /> : (
          <table className="w-full min-w-[850px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Note</th>
                {isManager && <th className="px-4 py-3">Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((cost) => (
                <tr key={cost.id}>
                  <td className="table-cell">{cost.costDate}</td>
                  <td className="table-cell font-semibold">{memberName(cost.buyerMemberId)}</td>
                  <td className="table-cell font-bold">{money(cost.amount, currency)}</td>
                  <td className="table-cell">{cost.items}</td>
                  <td className="table-cell">{cost.note || "-"}</td>
                  {isManager && (
                    <td className="table-cell">
                      <button className="btn-secondary mr-2" onClick={() => { setEditing(cost); setForm(cost); setOpen(true); }}>Edit</button>
                      <ConfirmButton onConfirm={() => deleteRow("marketCosts", cost.id, "Deleted a bazar cost record")} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit market cost" : "Add market cost"}>
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Buyer</label>
            <select className="input" value={form.buyerMemberId} onChange={(e) => setForm({ ...form, buyerMemberId: e.target.value })} required>
              <option value="">Select member</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.costDate} onChange={(e) => setForm({ ...form, costDate: e.target.value })} required />
          </div>
          <div>
            <label className="label">Amount</label>
            <input className="input" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="label">Items</label>
            <input className="input" value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className="label">Note</label>
            <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="btn-primary md:col-span-2">Save cost</button>
        </form>
      </Modal>
    </div>
  );
}
