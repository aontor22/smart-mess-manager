import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import RoleNotice from "../components/RoleNotice";
import { useData } from "../context/DataContext";
import { mealTotal } from "../utils/calculations";
import { dayMemberMeals, localMealDate, mealFields, mealFingerprint, summarizeMealRows, validMealDate } from "../utils/mealBatch";
import "./Meals.css";

const label = (field) => field[0].toUpperCase() + field.slice(1);
const sameDraft = (a, b) => mealFields.every((field) => String(a[field]) === String(b[field])) && a.note === b.note;
const displayDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

export default function Meals() {
  const { activeMess, members, meals, deleteRow, saveMealsForDate, isManager, syncStatus } = useData();
  const [month, setMonth] = useState(activeMess?.month || localMealDate().slice(0, 7));
  const [view, setView] = useState("register");
  const [showAllDays, setShowAllDays] = useState(false);
  const [search, setSearch] = useState("");
  const [editingDate, setEditingDate] = useState("");
  const [entryDate, setEntryDate] = useState(localMealDate());
  const [drafts, setDrafts] = useState([]);
  const [baseline, setBaseline] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const registerRef = useRef(null);
  const editorRef = useRef(null);
  const messId = activeMess?.id;
  const dirtyEntries = drafts.filter((draft) => !sameDraft(draft, baseline.find((item) => item.memberId === draft.memberId)));
  const dirty = dirtyEntries.length > 0;
  const canEnter = (member) => member?.status === "active" && member.mealStatus !== "suspended";
  const availableMembers = members.filter(canEnter);
  const names = new Map(members.map((member) => [member.id, member.name]));
  const monthMeals = useMemo(() => meals.filter((row) => row.mealDate.startsWith(month)), [meals, month]);
  const columns = useMemo(() => {
    const list = members.filter((member) => member.status === "active" || monthMeals.some((row) => row.memberId === member.id));
    for (const row of monthMeals) {
      if (!list.some((member) => member.id === row.memberId)) list.push({ id: row.memberId, name: "Removed member", status: "inactive" });
    }
    return list.filter((member) => member.name.toLowerCase().includes(search.toLowerCase()));
  }, [members, monthMeals, search]);
  const dates = useMemo(() => {
    const result = new Set(monthMeals.map((row) => row.mealDate));
    const today = localMealDate();
    if (today.startsWith(month)) result.add(today);
    if (showAllDays && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNumber] = month.split("-").map(Number);
      const count = new Date(year, monthNumber, 0).getDate();
      for (let day = 1; day <= count; day += 1) result.add(`${month}-${String(day).padStart(2, "0")}`);
    }
    return [...result].sort();
  }, [monthMeals, month, showAllDays]);
  const register = useMemo(() => {
    const result = new Map();
    for (const row of monthMeals) {
      const key = `${row.mealDate}:${row.memberId}`;
      const cell = result.get(key) || { breakfast: 0, lunch: 0, dinner: 0, note: "", count: 0 };
      for (const field of mealFields) cell[field] += Number(row[field] || 0);
      cell.note = [cell.note, row.note].filter(Boolean).join(" | ");
      cell.count += 1;
      result.set(key, cell);
    }
    return result;
  }, [monthMeals]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  useEffect(() => {
    if (editingDate) editorRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [editingDate]);

  useEffect(() => {
    const container = registerRef.current;
    const dateHeader = container?.querySelector("thead .meal-date");
    if (!dateHeader || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => container.style.setProperty("--meal-date-width", `${dateHeader.getBoundingClientRect().width}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(dateHeader);
    measure();
    return () => observer.disconnect();
  }, [view, columns.length, dates.length]);

  const discardAllowed = () => !dirty || window.confirm("Discard unsaved meal changes?");
  const closeEditor = () => {
    if (!discardAllowed()) return;
    setEditingDate(""); setDrafts([]); setBaseline([]); setError("");
  };
  const openDay = (date) => {
    if (!validMealDate(date)) { setError("Select a valid date."); return; }
    if (!discardAllowed()) return;
    const nextDrafts = members.filter((member) => member.status === "active" || meals.some((row) => row.memberId === member.id && row.mealDate === date)).map((member) => {
      const existing = dayMemberMeals(meals, messId, date, member.id);
      return { memberId: member.id, ...summarizeMealRows(existing), expected: mealFingerprint(existing), recordCount: existing.length };
    });
    setDrafts(nextDrafts); setBaseline(nextDrafts); setEditingDate(date); setEntryDate(date); setError(""); setMessage("");
  };
  const changeDraft = (id, field, value) => setDrafts((previous) => previous.map((draft) => draft.memberId === id ? { ...draft, [field]: value } : draft));
  const applyToAll = (values) => setDrafts((previous) => previous.map((draft) => canEnter(members.find((member) => member.id === draft.memberId)) ? { ...draft, ...values } : draft));
  const saveDay = (event) => {
    event.preventDefault();
    if (saving || !dirty || !isManager) return;
    setSaving(true); setError("");
    try {
      const count = saveMealsForDate(editingDate, dirtyEntries);
      setMonth(editingDate.slice(0, 7));
      setMessage(`${count} member${count === 1 ? "" : "s"} saved for ${displayDate(editingDate)}.`);
      setEditingDate(""); setDrafts([]); setBaseline([]);
    } catch (saveError) { setError(saveError.message || "Could not save meals."); }
    finally { setSaving(false); }
  };
  const recordRows = [...monthMeals].filter((row) => (names.get(row.memberId) || "Removed member").toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.mealDate.localeCompare(a.mealDate));

  return (
    <div>
      <PageHeader title="Meals" description="A daily meal register for your mess. Enter everyone's meals together and save once."
        action={isManager && <button className="btn-primary" disabled={!availableMembers.length} onClick={() => openDay(localMealDate())}>Add meals for everyone</button>} />
      <RoleNotice />
      {message && <div role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{message} {syncStatus === "synced" ? "Synced." : "Saved on this device; check the header sync status for cloud upload."}</div>}
      {error && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</div>}
      {isManager && !availableMembers.length && <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">No member currently has meal access. Add an active member or restore meal access first.</p>}

      {isManager && <div className="card mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="label" htmlFor="entry-date">Meal entry date</label><input id="entry-date" className="input" type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></div>
          <button className="btn-secondary" disabled={!entryDate || !availableMembers.length} onClick={() => openDay(entryDate)}>Open daily entry</button>
          <p className="text-sm text-slate-500">Existing meals load automatically. Half meals (0.5) are supported.</p>
        </div>
      </div>}

      {editingDate && isManager && <form ref={editorRef} onSubmit={saveDay} className="card mb-5 scroll-mt-24" aria-label="Daily meal entry">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-bold">Meals for {displayDate(editingDate)}</h3><p className="mt-1 text-sm text-slate-500">Change individual cells, or fill every eligible member with a preset. Changes replace that day's totals.</p></div>
          <button type="button" className="btn-secondary" onClick={closeEditor}>Close entry</button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => applyToAll({ breakfast: 0, lunch: 1, dinner: 1 })}>All: lunch + dinner</button>
          <button type="button" className="btn-secondary" onClick={() => applyToAll({ breakfast: 1, lunch: 1, dinner: 1 })}>All: 3 meals</button>
          <button type="button" className="btn-secondary" onClick={() => applyToAll({ breakfast: 0, lunch: 0, dinner: 0 })}>All: meal off</button>
        </div>
        <div className="meal-scroll" tabIndex={0} role="region" aria-label="Daily meal inputs, scroll horizontally for all members">
          <table className="meal-matrix"><caption className="sr-only">Daily meal inputs for {editingDate}</caption>
            <thead><tr><th scope="col" className="meal-label">Meal</th>{drafts.map((draft) => {
              const member = members.find((item) => item.id === draft.memberId);
              return <th scope="col" key={draft.memberId} className="meal-member">{member?.name || "Removed member"}{!canEnter(member) && <span className="mt-1 block text-xs font-normal text-amber-700 dark:text-amber-300">Meal access unavailable</span>}{draft.recordCount > 1 && <span className="mt-1 block text-xs font-normal">{draft.recordCount} records combined</span>}</th>;
            })}<th scope="col">Total</th></tr></thead>
            <tbody>{mealFields.map((field) => <tr key={field}><th scope="row" className="meal-label">{label(field)}</th>{drafts.map((draft) => <td key={draft.memberId}><input className="input meal-number" type="number" min="0" step="0.5" required disabled={!canEnter(members.find((item) => item.id === draft.memberId))} aria-label={`${names.get(draft.memberId)} ${field}`} value={draft[field]} onChange={(event) => changeDraft(draft.memberId, field, event.target.value)} /></td>)}<td className="font-semibold">{drafts.reduce((sum, draft) => sum + Number(draft[field] || 0), 0)}</td></tr>)}
              <tr className="meal-total"><th scope="row" className="meal-label">Daily total</th>{drafts.map((draft) => <td key={draft.memberId}>{mealTotal(draft)}</td>)}<td>{drafts.reduce((sum, draft) => sum + mealTotal(draft), 0)}</td></tr>
              <tr><th scope="row" className="meal-label">Note</th>{drafts.map((draft) => <td key={draft.memberId}><input className="input" aria-label={`${names.get(draft.memberId)} note`} disabled={!canEnter(members.find((item) => item.id === draft.memberId))} value={draft.note} onChange={(event) => changeDraft(draft.memberId, "note", event.target.value)} /></td>)}<td /></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">{dirtyEntries.length} member(s) changed. Unchanged entries are kept.</p><button className="btn-primary" disabled={saving || !dirty}>{saving ? "Saving..." : "Save all meals"}</button></div>
      </form>}

      <div className="card">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div><label className="label" htmlFor="meal-month">Month</label><input id="meal-month" className="input" type="month" value={month} onChange={(event) => { if (event.target.value) setMonth(event.target.value); }} /></div>
            <div><label className="label" htmlFor="member-search">Find member</label><input id="member-search" className="input" placeholder="Search by name" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          </div>
          <div className="flex gap-2" aria-label="Meal view"><button className={view === "register" ? "btn-primary" : "btn-secondary"} aria-pressed={view === "register"} onClick={() => setView("register")}>Meal register</button><button className={view === "records" ? "btn-primary" : "btn-secondary"} aria-pressed={view === "records"} onClick={() => setView("records")}>Individual records</button></div>
        </div>
        {view === "register" ? <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500"><label className="flex items-center gap-2"><input type="checkbox" checked={showAllDays} onChange={(event) => setShowAllDays(event.target.checked)} />Show every date in this month</label><span>— = no entry · 0 = recorded meal off · scroll to see all members</span></div>
          {!columns.length || !dates.length ? <EmptyState /> : <div ref={registerRef} className="meal-scroll meal-register-scroll" tabIndex={0} role="region" aria-label="Monthly meal register, scroll to see dates and members">
            <table className="meal-matrix"><caption className="sr-only">Meals by date and member for {month}</caption>
              <thead><tr><th scope="col" className="meal-date">Date</th><th scope="col" className="meal-label">Meal</th>{columns.map((member) => <th scope="col" className="meal-member" key={member.id}>{member.name}{member.status !== "active" && <span className="block text-xs font-normal">Inactive</span>}</th>)}<th scope="col">Total</th></tr></thead>
              <tbody>{dates.map((date) => <Fragment key={date}>{[...mealFields, "total"].map((field, index) => <tr key={field} className={`${field === "total" ? "meal-total" : ""} ${index === 0 ? "meal-day-start" : ""}`}>
                {index === 0 && <th scope="rowgroup" rowSpan={4} className="meal-date"><time dateTime={date}>{displayDate(date)}</time>{isManager && <button className="mt-2 block text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300" onClick={() => openDay(date)} aria-label={`Edit meals for ${date}`}>Edit day</button>}</th>}
                <th scope="row" className="meal-label">{field === "total" ? "Daily total" : label(field)}</th>
                {columns.map((member) => { const cell = register.get(`${date}:${member.id}`); return <td key={member.id} title={cell?.note || undefined}>{cell ? (field === "total" ? mealTotal(cell) : cell[field]) : <span className="text-slate-400">—</span>}</td>; })}
                <td className="font-semibold">{columns.reduce((sum, member) => { const cell = register.get(`${date}:${member.id}`); return sum + (cell ? (field === "total" ? mealTotal(cell) : cell[field]) : 0); }, 0)}</td>
              </tr>)}</Fragment>)}</tbody>
              <tfoot><tr className="meal-total"><th className="meal-date" scope="row">Month total</th><th className="meal-label">All meals</th>{columns.map((member) => <td key={member.id}>{monthMeals.filter((row) => row.memberId === member.id).reduce((sum, row) => sum + mealTotal(row), 0)}</td>)}<td>{monthMeals.filter((row) => columns.some((member) => member.id === row.memberId)).reduce((sum, row) => sum + mealTotal(row), 0)}</td></tr></tfoot>
            </table>
          </div>}
        </> : !recordRows.length ? <EmptyState /> : <div className="meal-scroll" tabIndex={0} role="region" aria-label="Individual meal records"><table className="meal-matrix"><thead><tr><th>Date</th><th>Member</th>{mealFields.map((field) => <th key={field}>{label(field)}</th>)}<th>Total</th><th>Note</th>{isManager && <th>Action</th>}</tr></thead><tbody>{recordRows.map((row) => <tr key={row.id}><td>{displayDate(row.mealDate)}</td><td className="font-semibold">{names.get(row.memberId) || "Removed member"}</td>{mealFields.map((field) => <td key={field}>{row[field]}</td>)}<td>{mealTotal(row)}</td><td>{row.note || "—"}</td>{isManager && <td className="whitespace-nowrap"><button className="btn-secondary" onClick={() => openDay(row.mealDate)}>Edit day</button><ConfirmButton onConfirm={() => { deleteRow("meals", row.id, "Deleted a meal record"); setMessage(""); }} /></td>}</tr>)}</tbody></table></div>}
      </div>
    </div>
  );
}
