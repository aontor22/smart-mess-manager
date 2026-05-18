import PageHeader from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";

export default function Profile() {
  const { currentUser } = useAuth();
  const { currentMember, isManager } = useData();

  return (
    <div>
      <PageHeader title="Profile" description="Your account and mess membership information." />
      <div className="card max-w-2xl">
        <div className="mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-emerald-600 text-3xl font-bold text-white">
          {currentUser?.name?.[0] || "U"}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Name</p>
            <p className="font-bold">{currentUser?.name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-bold">{currentUser?.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Phone</p>
            <p className="font-bold">{currentUser?.phone || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Role</p>
            <p className="font-bold">{isManager ? "Manager" : currentMember?.role || "Member"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
