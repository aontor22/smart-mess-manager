export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 sm:p-4">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="min-w-0 break-words text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button className="btn-secondary shrink-0 px-3" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
