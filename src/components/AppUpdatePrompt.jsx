import { RefreshCw, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CURRENT_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const CHECK_INTERVAL_MS = 2 * 60 * 1000;

const DEFAULT_NOTES = [
  "Improved performance and stability",
  "Better warning and meal-off automation",
  "Various bug fixes and UI improvements",
];

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

  const notes = useMemo(() => {
    if (!Array.isArray(remote?.notes)) return DEFAULT_NOTES;
    const clean = remote.notes.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4);
    return clean.length ? clean : DEFAULT_NOTES;
  }, [remote]);

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
        setRemote((previous) => previous || {
          version: "service-worker-update",
          builtAt: null,
          notes: DEFAULT_NOTES,
        });
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
        await Promise.all(
          keys
            .filter((key) => key.startsWith("smart-mess-manager-"))
            .map((key) => caches.delete(key))
        );
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
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/55 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-update-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-t-[2rem] border border-white/30 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl">
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

        <button
          type="button"
          onClick={updateLater}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Update later"
          disabled={updating}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-5 pb-5 pt-7 sm:px-6 sm:pb-6 sm:pt-8">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-950/30">
            <RefreshCw className={`h-9 w-9 ${updating ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Smart Mess Manager</p>
            <h2 id="app-update-title" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              New update available
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-300">
              A new version of Smart Mess Manager is ready. Update now to get the latest features and fixes.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              What's new?
            </div>
            <ul className="mt-2 space-y-1.5 pl-6 text-sm leading-5 text-slate-600 dark:text-slate-300">
              {notes.map((note) => (
                <li key={note} className="list-disc marker:text-emerald-500">{note}</li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              className="btn-primary justify-center gap-2 py-3"
              onClick={updateNow}
              disabled={updating}
            >
              <RefreshCw className={`h-4 w-4 ${updating ? "animate-spin" : ""}`} />
              {updating ? "Updating…" : "Update now"}
            </button>
            <button
              type="button"
              className="btn-secondary justify-center py-3"
              onClick={updateLater}
              disabled={updating}
            >
              Later
            </button>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-slate-400 dark:text-slate-500">
            Your login, Supabase data, and offline records stay safe. Only the app files are refreshed.
          </p>
        </div>
      </div>
    </div>
  );
}
