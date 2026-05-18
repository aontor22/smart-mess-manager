import { Lock } from "lucide-react";
import { useData } from "../context/DataContext";

export default function RoleNotice() {
  const { isManager } = useData();
  if (isManager) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <Lock className="h-4 w-4" />
      You are viewing as a member. Only the manager can add, edit, or delete records.
    </div>
  );
}
