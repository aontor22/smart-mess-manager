import { useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RoleNotice from "../components/RoleNotice";
import { useData } from "../context/DataContext";
import { money } from "../utils/calculations";

const blank = { expenseDate: new Date().toISOString().slice(0, 10), title: "", category: "Rent", amount: "", splitType: "shared", assignedMemberId: "", note: "" };

export default function Expenses() {
  const { activeMess, members, expenses, addRow, updateRow, deleteRow, isManager, monthly } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const currency = activeMess?.currency || "BDT";
  const memberName = (id) => members.find((m) => m.id === id)?.name || "-";

  const save = (e) => {
    e.preventDefault();
    const data = { ...form, amount: Number(form.amount) };
    if (editing) updateRow("expenses", editing.id, data, `Updated expense ${data.title}`);
    else addRow("expenses", data, `Added expense ${data.title}`);
    setOpen(false);
    setEditing(null);
    setForm(blank);
  };

  return (
    <div>
      <PageHeader
        title="Other expenses"
        description={`Current month extra expenses: ${money(monthly.totalExpenses, currency)}`}
        action={isManager && <button className="btn-primary" onClick={() => { setEditing(null); setForm(blank); setOpen(true); }}>Add expense</button>}
      />
      <RoleNotice />

      <div className="card overflow-x-auto">
        {expenses.length === 0 ? <EmptyState /> : (
          <table className="w-full min-w-[900px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Split</th>
                <th className="px-4 py-3">Assigned</th>
                {isManager && <th className="px-4 py-3">Action</th>}
              </tr>
            </thead>
            <tbody>
              {[...expenses].sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate)).map((expense) => (
                <tr key={expense.id}>
                  <td className="table-cell">{expense.expenseDate}</td>
                  <td className="table-cell font-semibold">{expense.title}</td>
                  <td className="table-cell">{expense.category}</td>
                  <td className="table-cell font-bold">{money(expense.amount, currency)}</td>
                  <td className="table-cell capitalize">{expense.splitType}</td>
                  <td className="table-cell">{memberName(expense.assignedMemberId)}</td>
                  {isManager && (
                    <td className="table-cell">
                      <button className="btn-secondary mr-2" onClick={() => { setEditing(expense); setForm(expense); setOpen(true); }}>Edit</button>
                      <ConfirmButton onConfirm={() => deleteRow("expenses", expense.id, "Deleted an expense record")} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit expense" : "Add expense"}>
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} required />
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Rent", "Gas", "Electricity", "Water", "WiFi", "Cleaner", "Maintenance", "Misc"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount</label>
            <input className="input" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="label">Split type</label>
            <select className="input" value={form.splitType} onChange={(e) => setForm({ ...form, splitType: e.target.value })}>
              <option value="shared">Shared among active members</option>
              <option value="assigned">Assigned to one member</option>
            </select>
          </div>
          <div>
            <label className="label">Assigned member</label>
            <select className="input" value={form.assignedMemberId} onChange={(e) => setForm({ ...form, assignedMemberId: e.target.value })} disabled={form.splitType !== "assigned"}>
              <option value="">None</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Note</label>
            <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button className="btn-primary md:col-span-2">Save expense</button>
        </form>
      </Modal>
    </div>
  );
}
