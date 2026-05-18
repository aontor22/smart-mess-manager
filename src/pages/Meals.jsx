import { useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RoleNotice from "../components/RoleNotice";
import { useData } from "../context/DataContext";
import { mealTotal } from "../utils/calculations";

const blank = { memberId: "", mealDate: new Date().toISOString().slice(0, 10), breakfast: 0, lunch: 1, dinner: 1, note: "" };

export default function Meals() {
  const { members, meals, addRow, updateRow, deleteRow, isManager } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";

  const save = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      breakfast: Number(form.breakfast),
      lunch: Number(form.lunch),
      dinner: Number(form.dinner),
    };
    if (editing) updateRow("meals", editing.id, data, `Updated meal for ${memberName(form.memberId)}`);
    else addRow("meals", data, `Added meal for ${memberName(form.memberId)}`);
    setOpen(false);
    setEditing(null);
    setForm(blank);
  };

  const edit = (row) => {
    setEditing(row);
    setForm(row);
    setOpen(true);
  };

  const rows = [...meals].sort((a, b) => new Date(b.mealDate) - new Date(a.mealDate));

  return (
    <div>
      <PageHeader
        title="Meals"
        description="Track breakfast, lunch, dinner, and half meals by member and date."
        action={isManager && <button className="btn-primary" onClick={() => { setEditing(null); setForm({ ...blank, memberId: members[0]?.id || "" }); setOpen(true); }}>Add meal</button>}
      />
      <RoleNotice />

      <div className="card overflow-x-auto">
        {rows.length === 0 ? <EmptyState /> : (
          <table className="w-full min-w-[900px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Breakfast</th>
                <th className="px-4 py-3">Lunch</th>
                <th className="px-4 py-3">Dinner</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Note</th>
                {isManager && <th className="px-4 py-3">Action</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((meal) => (
                <tr key={meal.id}>
                  <td className="table-cell">{meal.mealDate}</td>
                  <td className="table-cell font-semibold">{memberName(meal.memberId)}</td>
                  <td className="table-cell">{meal.breakfast}</td>
                  <td className="table-cell">{meal.lunch}</td>
                  <td className="table-cell">{meal.dinner}</td>
                  <td className="table-cell font-bold">{mealTotal(meal)}</td>
                  <td className="table-cell">{meal.note || "-"}</td>
                  {isManager && (
                    <td className="table-cell">
                      <button className="btn-secondary mr-2" onClick={() => edit(meal)}>Edit</button>
                      <ConfirmButton onConfirm={() => deleteRow("meals", meal.id, "Deleted a meal record")} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit meal" : "Add meal"}>
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Member</label>
            <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
              <option value="">Select member</option>
              {members.filter((m) => m.status === "active").map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.mealDate} onChange={(e) => setForm({ ...form, mealDate: e.target.value })} required />
          </div>
          {["breakfast", "lunch", "dinner"].map((field) => (
            <div key={field}>
              <label className="label capitalize">{field}</label>
              <input className="input" type="number" step="0.5" min="0" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="label">Note</label>
            <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <button className="btn-primary w-full">Save meal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
