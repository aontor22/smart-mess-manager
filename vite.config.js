import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildVersion =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  `local-${Date.now()}`;

const builtAt = new Date().toISOString();
const releaseNotes = [
  "Improved performance and stability",
  "Better warning and meal-off automation",
  "Various bug fixes and UI improvements",
];
const publicDir = path.resolve(process.cwd(), "public");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(
  path.join(publicDir, "version.json"),
  JSON.stringify({ version: buildVersion, builtAt, notes: releaseNotes }, null, 2),
  "utf8"
);

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion),
    __APP_BUILT_AT__: JSON.stringify(builtAt),
  },
});
