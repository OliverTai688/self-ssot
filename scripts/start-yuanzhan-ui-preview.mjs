/** Isolated localhost UI preview. Copies only the UI route; never replaces a running app. */
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
const root = process.cwd()
const mode = process.argv[2] ?? "showcase"
if (!["showcase", "empty"].includes(mode)) throw new Error("mode must be showcase or empty")
const port = Number(process.argv[3] ?? (mode === "showcase" ? 3011 : 3012))
const target = path.join(os.tmpdir(), `personal-os-yuanzhan-${mode}`)
fs.mkdirSync(target, { recursive: true })
const copy = (name) => { const to = path.join(target, name); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.cpSync(path.join(root, name), to, { recursive: true }) }
for (const name of ["src/components", "src/lib", "src/types", "src/hooks", "src/app/globals.css", "src/app/layout.tsx", "src/app/(operating)", "postcss.config.mjs", "components.json", "package.json"]) if (fs.existsSync(path.join(root, name))) copy(name)
if (!fs.existsSync(path.join(target, "tsconfig.json"))) copy("tsconfig.json")
fs.writeFileSync(path.join(target, "next.config.mjs"), "export default { experimental: { webpackBuildWorker: true, webpackMemoryOptimizations: true } }\n")
if (!fs.existsSync(path.join(target, "node_modules"))) fs.symlinkSync(path.join(root, "node_modules"), path.join(target, "node_modules"), "dir")
if (process.argv.includes("--sync")) { console.log(`Synced current UI sources to ${mode} preview`); process.exit(0) }
// Read the same local auth configuration without copying env files or printing secrets.
const require = createRequire(fs.realpathSync(path.join(root, "node_modules/next/package.json")))
const { loadEnvConfig } = require("@next/env")
loadEnvConfig(root, true, { info() {}, error() {} })
const child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", target, "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: target, stdio: "inherit", env: { ...process.env, PERSONAL_OS_UI_DATA_MODE: mode, PERSONAL_OS_AUTH_MODE: "mock", PERSONAL_OS_DEV_USER_EMAIL: process.env.PERSONAL_OS_UI_PREVIEW_PROFILE_EMAIL || "test@yzedtech.com", YUANZHAN_SEATS: process.env.YUANZHAN_SEATS || (process.env.PERSONAL_OS_UI_PREVIEW_PROFILE_EMAIL ? undefined : "test@yzedtech.com:yz:switch") },
})
console.log(`UI preview: http://127.0.0.1:${port}/company/operating (${mode}); existing mock-auth Profile read only; no business routes copied`)
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal))
child.on("exit", code => { process.exitCode = code ?? 0 })
