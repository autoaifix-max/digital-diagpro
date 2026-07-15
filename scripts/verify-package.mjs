import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const required = [
  ".env.example",
  ".gitignore",
  "README.md",
  "SETUP.md",
  "RELEASE_NOTES.md",
  "RELEASE_MANIFEST.txt",
  "supabase/ALL_MIGRATIONS.sql",
  ...Array.from({ length: 10 }, (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    const names = [
      "foundation",
      "schema",
      "functions_and_workflows",
      "rls_policies",
      "storage",
      "pilot_seed",
      "diagnostic_workflow",
      "security_hardening_and_admin_bootstrap",
      "pilot_operations_modules",
      "operational_hardening",
    ];
    return `supabase/migrations/${number}_${names[index]}.sql`;
  }),
  "docs/ACCEPTANCE_CHECKLIST.md",
  "docs/DATABASE_SCHEMA.md",
  "docs/PILOT_WORKFLOW.md",
  "docs/RELEASE_SCOPE.md",
  "docs/SECURITY.md",
  "docs/TEST_RESULTS.md",
  "src/app/admin/(protected)/intake/page.tsx",
  "src/app/admin/(protected)/staff/page.tsx",
  "src/app/admin/(protected)/account/page.tsx",
  "src/app/admin/(protected)/customers/page.tsx",
  "src/app/admin/(protected)/vehicles/page.tsx",
  "src/app/admin/(protected)/services/page.tsx",
  "src/app/admin/(protected)/approvals/page.tsx",
  "src/app/admin/(protected)/quality/page.tsx",
  "src/app/admin/(protected)/bookings/page.tsx",
  "src/app/admin/(protected)/work-orders/page.tsx",
  "src/app/admin/(protected)/diagnostics/page.tsx",
  "src/app/admin/(protected)/documents/page.tsx",
  "src/app/customer/(protected)/page.tsx",
  "src/app/api/admin/intake/route.ts",
  "src/app/api/admin/staff/route.ts",
  "src/app/api/admin/staff/[id]/route.ts",
  "src/app/api/admin/work-orders/[id]/details/route.ts",
  "src/app/api/admin/customers/[id]/portal/route.ts",
  "src/app/api/customer/approvals/[id]/route.ts",
  "src/components/admin/intake-form.tsx",
  "src/components/admin/staff-manager.tsx",
  "src/lib/supabase/admin.ts",
  "src/lib/domain/quality.ts",
];

for (const file of required) {
  await access(file);
  const info = await stat(file);
  if (!info.isFile() || info.size === 0) throw new Error(`Missing or empty release file: ${file}`);
}

for (const forbidden of [".env", ".env.local", ".env.production", ".env.development.local"]) {
  try {
    await access(forbidden);
    throw new Error(`Forbidden environment file is present: ${forbidden}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const env = await readFile(".env.example", "utf8");
const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];
for (const key of requiredEnv) {
  if (!env.includes(`${key}=`)) throw new Error(`Missing environment template key: ${key}`);
}
if (/sb_secret_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/.test(env)) {
  throw new Error(".env.example appears to contain a real secret");
}

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (packageJson.version !== "1.2.0") throw new Error(`Unexpected package version: ${packageJson.version}`);

const combined = await readFile("supabase/ALL_MIGRATIONS.sql", "utf8");
for (let i = 1; i <= 10; i += 1) {
  const marker = String(i).padStart(3, "0");
  if (!combined.includes(`migrations/${marker}_`)) throw new Error(`Combined migrations file is missing ${marker}`);
}
if (!combined.includes("create table public.work_order_approvals") || !combined.includes("create table public.quality_checks")) {
  throw new Error("Combined migrations file is missing final Pilot operations tables");
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", ".next", ".git", "coverage"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(full)));
    else files.push(full);
  }
  return files;
}

const scanFiles = (await collectFiles(".")).filter((file) => !file.endsWith("package-lock.json"));
const secretPatterns = [
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  /sk-proj-[A-Za-z0-9_-]{20,}/,
  /ghp_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{30,}/,
  /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/,
];
for (const file of scanFiles) {
  const text = await readFile(file, "utf8").catch(() => "");
  if (secretPatterns.some((pattern) => pattern.test(text))) {
    throw new Error(`Possible secret detected in ${file}`);
  }
}

console.log(`Verified ${required.length} required release artifacts, migrations 001-010, environment template, and common secret patterns.`);
