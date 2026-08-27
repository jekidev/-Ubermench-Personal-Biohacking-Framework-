import { spawn } from "node:child_process";

const host = process.env.TAURI_DEV_HOST ?? "localhost";
const port = Number(process.env.NUXT_PORT ?? 3000);

const child = spawn("bun", ["run", "dev", "--host", host, "--port", String(port)], {
  stdio: "inherit",
  env: { ...process.env, TAURI_DEV_HOST: host }
});

const shutdown = (signal: NodeJS.Signals) => {
  child.kill(signal);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
