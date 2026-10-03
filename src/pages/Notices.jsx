import { AlertTriangle, BellRing } from "lucide-react";
import { useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

export default function Notices() {
  const { currentUser } = useAuth();
  const { notices, addRow, updateRow, deleteRow, isManager } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ message: "", pinned: false });

  const save = (e) => {
    e.preventDefault();
    addRow(
      "notices",
      {
        ...form,
        senderName: currentUser?.name || "Member",
        createdAt: new Date().toISOString(),
        type: "general",
        targetUserId: null,
        targetMemberId: null,
      },
      "Posted a notice"
    );
    setOpen(false);
    setForm({ message: "", pinned: false });
  };

  return (
    <div>
      <PageHeader
        title="Notice board"
        description="General announcements and automatic payment/meal warnings for your account."
        action={<button className="btn-primary" onClick={() => setOpen(true)}>Post notice</button>}
      />

      {notices.length === 0 && (
        <div className="card text-center text-sm text-slate-500">No notices yet.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {notices.map((notice) => {
          const automatic = ["payment_warning", "meal_suspended"].includes(notice.type);
          return (
            <div key={notice.id} className={`card ${automatic ? "border-amber-300 dark:border-amber-800" : notice.pinned ? "border-emerald-300 dark:border-emerald-800" : ""}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {automatic && (
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {notice.type === "meal_suspended" ? <AlertTriangle className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                    </div>
                  )}
                  <div>
                    <p className="font-bold">{notice.senderName}</p>
                    <p className="text-xs text-slate-500">{new Date(notice.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {automatic && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {notice.type === "meal_suspended" ? "Meal off" : "Payment warning"}
                    </span>
                  )}
                  {notice.pinned && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Pinned</span>
                  )}
                </div>
              </div>
              <p className="leading-7 text-slate-700 dark:text-slate-200">{notice.message}</p>
              {isManager && (
                <div className="mt-4 flex gap-2">
                  <button
                    className="btn-secondary"
                    onClick={() => updateRow("notices", notice.id, { pinned: !notice.pinned }, notice.pinned ? "Unpinned a notice" : "Pinned a notice")}
                  >
                    {notice.pinned ? "Unpin" : "Pin"}
                  </button>
                  <ConfirmButton onConfirm={() => deleteRow("notices", notice.id, "Deleted a notice")} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Post notice">
        <form onSubmit={save}>
          <label className="label">Message</label>
          <textarea className="input min-h-32" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            Pin this notice
          </label>
          <button className="btn-primary mt-5 w-full">Publish</button>
        </form>
      </Modal>
    </div>
  );
}
