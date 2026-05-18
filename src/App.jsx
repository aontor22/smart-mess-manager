import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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

function Protected({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route
        path="/app"
        element={
          <Protected>
            <Layout />
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
