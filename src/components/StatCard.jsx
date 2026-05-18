export default function StatCard({ title, value, helper, icon: Icon }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
          {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
        </div>
        {Icon && (
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
