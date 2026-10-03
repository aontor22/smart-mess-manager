import { useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RoleNotice from "../components/RoleNotice";
import { useData } from "../context/DataContext";
import { mealTotal } from "../utils/calculations";

const blank = {
  memberId: "",
  mealDate: new Date().toISOString().slice(0, 10),
  breakfast: 0,
  lunch: 1,
  dinner: 1,
  note: "",
};

export default function Meals() {
  const { members, meals, addRow, updateRow, deleteRow, isManager } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  const memberName = (id) => members.find((m) => m.id === id)?.name || "Unknown";
  const availableMembers = members.filter(
    (member) => member.status === "active" && member.mealStatus !== "suspended"
  );

  const save = (e) => {
    e.preventDefault();
    setError("");

    const selectedMember = members.find((member) => member.id === form.memberId);
    if (!editing && selectedMember?.mealStatus === "suspended") {
      setError("Meal access is suspended for this member. Add deposit or restore access first.");
      return;
    }

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
    setError("");
    setEditing(row);
    setForm(row);
    setOpen(true);
  };

  const rows = [...meals].sort((a, b) => new Date(b.mealDate) - new Date(a.mealDate));

  return (
    <div>
      <PageHeader
        title="Meals"
        description="Track breakfast, lunch, dinner, and half meals. Auto-suspended members cannot receive new meal entries."
        action={isManager && (
          <button
            className="btn-primary"
            disabled={availableMembers.length === 0}
            onClick={() => {
              setError("");
              setEditing(null);
              setForm({ ...blank, memberId: availableMembers[0]?.id || "" });
              setOpen(true);
            }}
          >
            Add meal
          </button>
        )}
      />
      <RoleNotice />

      {isManager && availableMembers.length === 0 && members.some((member) => member.status === "active") && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          No active member currently has meal access. Check Members or payment warning settings.
        </div>
      )}

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
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300 md:col-span-2">{error}</div>}
          <div>
            <label className="label">Member</label>
            <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
              <option value="">Select member</option>
              {(editing ? members.filter((member) => member.status === "active") : availableMembers).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}{member.mealStatus === "suspended" ? " (suspended)" : ""}
                </option>
              ))}
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
