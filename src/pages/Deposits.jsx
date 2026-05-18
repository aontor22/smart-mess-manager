import { useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RoleNotice from "../components/RoleNotice";
import { useData } from "../context/DataContext";
import { money } from "../utils/calculations";

const blank = { memberId: "", depositDate: new Date().toISOString().slice(0, 10), amount: "", paymentMethod: "Cash", note: "" };

export default function Deposits() {
  const { activeMess, members, deposits, addRow, updateRow, deleteRow, isManager, monthly } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const currency = activeMess?.currency || "BDT";
  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";

  const save = (e) => {
    e.preventDefault();
    const data = { ...form, amount: Number(form.amount) };
    if (editing) updateRow("deposits", editing.id, data, `Updated deposit for ${memberName(data.memberId)}`);
    else addRow("deposits", data, `Added deposit for ${memberName(data.memberId)}`);
    setOpen(false);
    setEditing(null);
    setForm(blank);
  };

  return (
    <div>
      <PageHeader
        title="Deposits"
        description={`Current month total deposit: ${money(monthly.totalDeposits, currency)}`}
        action={isManager && <button className="btn-primary" onClick={() => { setEditing(null); setForm({ ...blank, memberId: members[0]?.id || "" }); setOpen(true); }}>Add deposit</button>}
      />
      <RoleNotice />

      <div className="card overflow-x-auto">
        {deposits.length === 0 ? <EmptyState /> : (
          <table className="w-full min-w-[850px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Note</th>
                {isManager && <th className="px-4 py-3">Action</th>}
              </tr>
            </thead>
            <tbody>
              {[...deposits].sort((a, b) => new Date(b.depositDate) - new Date(a.depositDate)).map((deposit) => (
                <tr key={deposit.id}>
                  <td className="table-cell">{deposit.depositDate}</td>
                  <td className="table-cell font-semibold">{memberName(deposit.memberId)}</td>
                  <td className="table-cell font-bold">{money(deposit.amount, currency)}</td>
                  <td className="table-cell">{deposit.paymentMethod}</td>
                  <td className="table-cell">{deposit.note || "-"}</td>
                  {isManager && (
                    <td className="table-cell">
                      <button className="btn-secondary mr-2" onClick={() => { setEditing(deposit); setForm(deposit); setOpen(true); }}>Edit</button>
                      <ConfirmButton onConfirm={() => deleteRow("deposits", deposit.id, "Deleted a deposit record")} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit deposit" : "Add deposit"}>
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Member</label>
            <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
              <option value="">Select member</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.depositDate} onChange={(e) => setForm({ ...form, depositDate: e.target.value })} required />
          </div>
          <div>
            <label className="label">Amount</label>
            <input className="input" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="label">Payment method</label>
            <select className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              <option>Cash</option>
              <option>bKash</option>
              <option>Nagad</option>
              <option>Bank</option>
              <option>Other</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Note</label>
            <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="btn-primary md:col-span-2">Save deposit</button>
        </form>
      </Modal>
    </div>
  );
}
