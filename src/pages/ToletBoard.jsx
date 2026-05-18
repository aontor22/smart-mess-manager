import { useMemo, useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";
import { money } from "../utils/calculations";

const blank = { title: "", location: "", rent: "", facilities: "", contact: "", availableFrom: new Date().toISOString().slice(0, 10), imageUrl: "" };

export default function ToletBoard() {
  const { activeMess, toletPosts, addRow, deleteRow, isManager } = useData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(blank);
  const currency = activeMess?.currency || "BDT";

  const filtered = useMemo(() => {
    return toletPosts.filter((post) =>
      `${post.title} ${post.location} ${post.facilities}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [toletPosts, query]);

  const save = (e) => {
    e.preventDefault();
    addRow("toletPosts", { ...form, rent: Number(form.rent), createdAt: new Date().toISOString() }, "Published a to-let post");
    setOpen(false);
    setForm(blank);
  };

  return (
    <div>
      <PageHeader
        title="To-let board"
        description="Post or search available seats and rooms."
        action={isManager && <button className="btn-primary" onClick={() => setOpen(true)}>Add post</button>}
      />

      <div className="mb-5">
        <input className="input max-w-md" placeholder="Search by location, rent, or facilities" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((post) => (
          <div className="card" key={post.id}>
            <div className="mb-4 grid h-32 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800">
              {post.imageUrl ? <img src={post.imageUrl} alt={post.title} className="h-full w-full rounded-2xl object-cover" /> : "Image placeholder"}
            </div>
            <h3 className="text-lg font-bold">{post.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{post.location}</p>
            <p className="mt-3 text-2xl font-bold text-emerald-600">{money(post.rent, currency)}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{post.facilities}</p>
            <p className="mt-3 text-sm font-semibold">Contact: {post.contact}</p>
            <p className="text-sm text-slate-500">Available from: {post.availableFrom}</p>
            {isManager && <div className="mt-4"><ConfirmButton onConfirm={() => deleteRow("toletPosts", post.id, "Deleted a to-let post")} /></div>}
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add to-let post">
        <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
          {[
            ["title", "Title"],
            ["location", "Location"],
            ["rent", "Rent"],
            ["contact", "Contact"],
            ["availableFrom", "Available from"],
            ["imageUrl", "Image URL"],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="label">{label}</label>
              <input className="input" type={field === "rent" ? "number" : field === "availableFrom" ? "date" : "text"} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={["title", "location", "rent", "contact"].includes(field)} />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="label">Facilities</label>
            <textarea className="input" value={form.facilities} onChange={(e) => setForm({ ...form, facilities: e.target.value })} />
          </div>
          <button className="btn-primary md:col-span-2">Publish post</button>
        </form>
      </Modal>
    </div>
  );
}
