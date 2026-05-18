import PageHeader from "../components/PageHeader";
import { useData } from "../context/DataContext";

export default function ActivityLog() {
  const { activityLogs } = useData();

  return (
    <div>
      <PageHeader title="Activity log" description="Every important change is recorded here for transparency." />
      <div className="card">
        <div className="space-y-3">
          {activityLogs.map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="font-semibold">{item.action}</p>
              <p className="mt-1 text-sm text-slate-500">{new Date(item.createdAt).toLocaleString()} · {item.actorName}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
