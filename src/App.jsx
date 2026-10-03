import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useData } from "./context/DataContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MessSetup from "./pages/MessSetup";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Meals from "./pages/Meals";
import MarketCosts from "./pages/MarketCosts";
import Deposits from "./pages/Deposits";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import ActivityLog from "./pages/ActivityLog";
import Notices from "./pages/Notices";
import ToletBoard from "./pages/ToletBoard";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600 dark:border-slate-800 dark:border-t-emerald-400" />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading your workspace...</p>
      </div>
    </div>
  );
}

function Protected({ children }) {
  const { isAuthenticated, authLoading } = useAuth();
  if (authLoading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function MessReady({ children }) {
  const { workspaceStatus } = useData();
  if (workspaceStatus === "loading") return <LoadingScreen />;
  if (workspaceStatus === "needs-setup") return <Navigate to="/mess-setup" replace />;
  return children;
}

function SetupRoute() {
  const { workspaceStatus } = useData();
  if (workspaceStatus === "loading") return <LoadingScreen />;
  if (workspaceStatus === "ready") return <Navigate to="/app" replace />;
  return <MessSetup />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/mess-setup"
        element={
          <Protected>
            <SetupRoute />
          </Protected>
        }
      />

      <Route
        path="/app"
        element={
          <Protected>
            <MessReady>
              <Layout />
            </MessReady>
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="meals" element={<Meals />} />
        <Route path="market" element={<MarketCosts />} />
        <Route path="deposits" element={<Deposits />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reports" element={<Reports />} />
        <Route path="activity" element={<ActivityLog />} />
        <Route path="notices" element={<Notices />} />
        <Route path="tolet" element={<ToletBoard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
