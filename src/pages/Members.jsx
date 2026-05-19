import { useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RoleNotice from "../components/RoleNotice";
import { useData } from "../context/DataContext";

const empty = {
  name: "",
  email: "",
  phone: "",
  roomNo: "",
  role: "member",
  joinDate: new Date().toISOString().slice(0, 10),
  status: "active",
};

export default function Members() {
  const {
    members,
    addRow,
    updateRow,
    deleteRow,
    isManager,
    findRegisteredUserByEmail,
    isUserAlreadyMember,
  } = useData();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const openAddModal = () => {
    setEditing(null);
    setForm(empty);
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    setForm(empty);
    setError("");
  };

  const validateRegisteredMember = () => {
    const email = String(form.email || "").trim().toLowerCase();

    if (!email) {
      return "Member email is required because members must have a registered account.";
    }

    const registeredUser = findRegisteredUserByEmail(email);

    if (!registeredUser) {
      return "This email is not registered yet. Ask the member to sign up first, then add them using the same email.";
    }

    if (isUserAlreadyMember(registeredUser.id, editing?.id || null)) {
      return "This registered user is already a member of this mess.";
    }

    return null;
  };

  const save = (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateRegisteredMember();
    if (validationError) {
      setError(validationError);
      return;
    }

    const registeredUser = findRegisteredUserByEmail(form.email);
    const payload = {
      ...form,
      userId: registeredUser.id,
      name: form.name.trim() || registeredUser.name,
      email: registeredUser.email,
      phone: form.phone.trim() || registeredUser.phone || "",
    };

    if (editing) {
      updateRow("members", editing.id, payload, `Updated member ${payload.name}`);
    } else {
      addRow("members", payload, `Added registered member ${payload.name}`);
    }

    closeModal();
  };

  const edit = (member) => {
    setEditing(member);
    setForm(member);
    setError("");
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Members"
        description="Only registered users can be added as mess members."
        action={isManager && <button className="btn-primary" onClick={openAddModal}>Add member</button>}
      />
      <RoleNotice />

      <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        New members must create an account first. Then the manager can add them using their registered email address.
      </div>

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
                <th className="px-4 py-3">Auth</th>
                {isManager && <th className="px-4 py-3">Action</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="table-cell font-semibold">{member.name}</td>
                  <td className="table-cell">
                    {member.email}
                    <br />
                    <span className="text-xs text-slate-500">{member.phone}</span>
                  </td>
                  <td className="table-cell">{member.roomNo || "-"}</td>
                  <td className="table-cell capitalize">{member.role}</td>
                  <td className="table-cell">{member.joinDate}</td>
                  <td className="table-cell capitalize">{member.status}</td>
                  <td className="table-cell">
                    {member.userId ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Registered
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                        Not linked
                      </span>
                    )}
                  </td>
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

      <Modal open={open} onClose={closeModal} title={editing ? "Edit registered member" : "Add registered member"}>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Registered email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder="member@example.com"
            />
            <p className="mt-1 text-xs text-slate-500">This email must already exist in Signup/Login users.</p>
          </div>

          <div>
            <label className="label">Display name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Auto-filled or custom display name"
            />
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
