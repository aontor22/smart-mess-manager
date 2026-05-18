import { useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RoleNotice from "../components/RoleNotice";
import { useData } from "../context/DataContext";

const empty = { name: "", email: "", phone: "", roomNo: "", role: "member", joinDate: new Date().toISOString().slice(0, 10), status: "active" };

export default function Members() {
  const { members, addRow, updateRow, deleteRow, isManager } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const save = (e) => {
    e.preventDefault();
    if (editing) {
      updateRow("members", editing.id, form, `Updated member ${form.name}`);
    } else {
      addRow("members", { ...form, userId: null }, `Added member ${form.name}`);
    }
    setOpen(false);
    setEditing(null);
    setForm(empty);
  };

  const edit = (member) => {
    setEditing(member);
    setForm(member);
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Members"
        description="Add, update, and manage active or inactive mess members."
        action={isManager && <button className="btn-primary" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>Add member</button>}
      />
      <RoleNotice />

      <div className="card overflow-x-auto">
        {members.length === 0 ? <EmptyState /> : (
          <table className="w-full min-w-[850px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Join date</th>
                <th className="px-4 py-3">Status</th>
                {isManager && <th className="px-4 py-3">Action</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="table-cell font-semibold">{member.name}</td>
                  <td className="table-cell">{member.email}<br /><span className="text-xs text-slate-500">{member.phone}</span></td>
                  <td className="table-cell">{member.roomNo || "-"}</td>
                  <td className="table-cell capitalize">{member.role}</td>
                  <td className="table-cell">{member.joinDate}</td>
                  <td className="table-cell capitalize">{member.status}</td>
                  {isManager && (
                    <td className="table-cell">
                      <button className="btn-secondary mr-2" onClick={() => edit(member)}>Edit</button>
                      <ConfirmButton onConfirm={() => deleteRow("members", member.id, `Deleted member ${member.name}`)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit member" : "Add member"}>
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Room number</label>
            <input className="input" value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="member">Member</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="label">Join date</label>
            <input className="input" type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full">Save member</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
