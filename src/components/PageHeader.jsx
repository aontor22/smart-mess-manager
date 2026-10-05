export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h2 className="break-words text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
        {description && <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action && <div className="w-full shrink-0 md:w-auto [&>button]:w-full md:[&>button]:w-auto">{action}</div>}
    </div>
  );
}
