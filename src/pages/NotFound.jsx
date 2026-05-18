import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
      <div>
        <h1 className="text-6xl font-black text-slate-900">404</h1>
        <p className="mt-3 text-slate-500">The page you are looking for was not found.</p>
        <Link className="btn-primary mt-6" to="/app">Go dashboard</Link>
      </div>
    </div>
  );
}
