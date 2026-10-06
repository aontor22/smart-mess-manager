import { useState } from "react";
import { Bell, Utensils, UtensilsCrossed } from "lucide-react";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import RoleNotice from "../components/RoleNotice";
import { useData } from "../context/DataContext";
import { getMemberAlertState } from "../utils/memberStatus";

const empty = {
  name: "",
  email: "",
  phone: "",
  roomNo: "",
  role: "member",
  joinDate: new Date().toISOString().slice(0, 10),
  status: "active",
  mealStatus: "active",
};

function WarningIndicator({ state }) {
  const isFinal = state === "final";
  const isWarning = state === "warning";
  const label = isFinal
    ? "Final warning / meal suspension reached"
    : isWarning
      ? "Payment warning active"
      : "No payment warning";

  return (
    <span
      className={`mx-auto grid h-9 w-9 place-items-center rounded-xl border transition ${
        isFinal
          ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
          : isWarning
            ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
            : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
      }`}
      title={label}
      aria-label={label}
    >
      <Bell className="h-4 w-4" />
    </span>
  );
}

function MealIndicator({ state }) {
  const isOff = state === "off";
  const isInactive = state === "inactive";
  const label = isOff ? "Meal access off" : isInactive ? "Member inactive" : "Meal access active";

  return (
    <span
      className={`mx-auto grid h-9 w-9 place-items-center rounded-xl border transition ${
        isOff
          ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
          : isInactive
            ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
            : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
      }`}
      title={label}
      aria-label={label}
    >
      {isOff ? <UtensilsCrossed className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
    </span>
  );
}

export default function Members() {
  const { members, addRow, updateRow, deleteRow, isManager, monthly } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const balanceByMember = new Map(monthly.memberRows.map((row) => [row.memberId, row.balance]));

  const save = (e) => {
    e.preventDefault();
    if (editing) {
      updateRow("members", editing.id, form, `Updated member ${form.name}`);
    } else {
      addRow(
        "members",
        {
          ...form,
          userId: null,
          autoMealSuspended: false,
          dueSince: null,
          paymentWarningSentAt: null,
          mealSuspendedAt: null,
        },
        `Added member ${form.name}`
      );
    }
    setOpen(false);
    setEditing(null);
    setForm(empty);
  };

  const edit = (member) => {
    setEditing(member);
    setForm({ ...empty, ...member });
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage mess members, account linkage, due status, and meal access."
        action={isManager && <button className="btn-primary" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>Add member</button>}
      />
      <RoleNotice />

      <div className="card overflow-hidden p-0 sm:p-0">
        {members.length === 0 ? <div className="p-5"><EmptyState /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1260px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="w-[76px] px-2 py-3 text-center">Warning</th>
                  <th className="w-[76px] px-2 py-3 text-center">Meal</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Due since</th>
                  <th className="px-4 py-3">Meal access</th>
                  <th className="px-4 py-3">Status</th>
                  {isManager && <th className="px-4 py-3">Action</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const balance = Number(balanceByMember.get(member.id) || 0);
                  const alertState = getMemberAlertState(member);
                  return (
                    <tr key={member.id} className="align-middle transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="table-cell min-w-[150px] font-semibold">{member.name}</td>
                      <td className="table-cell px-2 text-center"><WarningIndicator state={alertState.warning} /></td>
                      <td className="table-cell px-2 text-center"><MealIndicator state={alertState.meal} /></td>
                      <td className="table-cell min-w-[210px]">
                        <span className="break-all">{member.email || "-"}</span><br />
                        <span className="text-xs text-slate-500">{member.phone || "-"}</span>
                      </td>
                      <td className="table-cell min-w-[100px]">{member.roomNo || "-"}</td>
                      <td className="table-cell capitalize">{member.role}</td>
                      <td className="table-cell">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${member.userId ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {member.userId ? "Linked" : "Not joined"}
                        </span>
                      </td>
                      <td className="table-cell whitespace-nowrap">
                        {balance < 0 && member.dueSince ? member.dueSince : "-"}
                      </td>
                      <td className="table-cell">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${member.mealStatus === "suspended" ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"}`}>
                          {member.mealStatus === "suspended" ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="table-cell capitalize">{member.status}</td>
                      {isManager && (
                        <td className="table-cell whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button className="btn-secondary px-3" onClick={() => edit(member)}>Edit</button>
                            {member.role !== "manager" && (
                              <ConfirmButton className="px-2.5" onConfirm={() => deleteRow("members", member.id, `Deleted member ${member.name}`)} />
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-amber-500" /> Yellow = payment warning</span>
        <span className="inline-flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-red-500" /> Red = final / meal-off stage</span>
        <span className="inline-flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5 text-emerald-500" /> Meal active</span>
        <span className="inline-flex items-center gap-1.5"><UtensilsCrossed className="h-3.5 w-3.5 text-red-500" /> Meal off</span>
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
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={Boolean(editing?.userId)}>
              <option value="member">Member</option>
              <option value="manager">Manager</option>
            </select>
            {editing?.userId && <p className="mt-1 text-xs text-slate-500">Use Settings → Manager role for linked accounts.</p>}
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="label">Meal access</label>
            <select
              className="input"
              value={form.mealStatus || "active"}
              onChange={(e) => setForm({
                ...form,
                mealStatus: e.target.value,
                autoMealSuspended: false,
                mealSuspendedAt: e.target.value === "suspended" ? new Date().toISOString() : null,
              })}
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="label">Join date</label>
            <input className="input" type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
          </div>
          <div className="flex items-end md:col-span-2">
            <button className="btn-primary w-full">Save member</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
