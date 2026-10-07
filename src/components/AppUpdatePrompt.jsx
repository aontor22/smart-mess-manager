import { RefreshCw, Rocket, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const CURRENT_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const CHECK_INTERVAL_MS = 2 * 60 * 1000;

const readRemoteVersion = async () => {
  const response = await fetch(`/version.json?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) throw new Error("Could not check the latest app version.");
  return response.json();
};

export default function AppUpdatePrompt() {
  const [remote, setRemote] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [hiddenVersion, setHiddenVersion] = useState(() => sessionStorage.getItem("smm-update-later") || "");
  const mountedRef = useRef(true);

  const checkForUpdate = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const next = await readRemoteVersion();
      if (!mountedRef.current || !next?.version || next.version === CURRENT_VERSION) return;
      if (next.version !== hiddenVersion) setRemote(next);
    } catch {
      // Version checks are intentionally silent; offline-first use must continue normally.
    }

    try {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      await registration?.update?.();
      if (registration?.waiting && mountedRef.current) {
        setRemote((previous) => previous || { version: "service-worker-update", builtAt: null });
      }
    } catch {
      // A service-worker update failure should never block the app.
    }
  }, [hiddenVersion]);

  useEffect(() => {
    mountedRef.current = true;
    const timeout = window.setTimeout(checkForUpdate, 2500);
    const interval = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    const onFocus = () => checkForUpdate();
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkForUpdate]);

  const updateNow = async () => {
    if (updating) return;
    setUpdating(true);

    try {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      if (registration?.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
      registration?.active?.postMessage?.({ type: "CLEAR_APP_CACHE" });

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith("smart-mess-manager-")).map((key) => caches.delete(key)));
      }
    } catch {
      // Even if cache cleanup fails, a network reload still upgrades the hashed Vite assets.
    }

    window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("appUpdated", remote?.version || String(Date.now()));
      window.location.replace(url.toString());
    }, 180);
  };

  const updateLater = () => {
    const version = remote?.version || "deferred";
    sessionStorage.setItem("smm-update-later", version);
    setHiddenVersion(version);
    setRemote(null);
  };

  if (!remote) return null;

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="app-update-title">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">Smart Mess Manager</p>
                <h2 id="app-update-title" className="mt-1 text-xl font-bold">A new version is ready</h2>
              </div>
            </div>
            <button type="button" onClick={updateLater} className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Update later">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            A newer deployment is available. Update now to load the latest features and fixes without signing out or losing your mess data.
          </p>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            Your Supabase data and offline records are preserved. Only cached app files are refreshed.
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={updateLater} disabled={updating}>Later</button>
            <button type="button" className="btn-primary gap-2" onClick={updateNow} disabled={updating}>
              <RefreshCw className={`h-4 w-4 ${updating ? "animate-spin" : ""}`} />
              {updating ? "Updating…" : "Update now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
