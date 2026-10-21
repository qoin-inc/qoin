import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const stateDir = join(root, ".deploy");
const pendingPath = join(stateDir, "pending.json");
const historyPath = join(stateDir, "deployments.jsonl");
const productionConfig = JSON.parse(readFileSync(join(root, "deploy.config.json"), "utf8"));
const mode = process.argv[2];
const args = process.argv.slice(3);

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    shell: false,
    ...options,
  });
  if (result.error) throw result.error;
  return result;
};

const git = (...gitArgs) => {
  const result = run("git", gitArgs);
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${gitArgs.join(" ")} failed`);
  return result.stdout.trim();
};

const valueArg = (name) => {
  const direct = args.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : "";
};

const appendRecord = (record) => {
  mkdirSync(stateDir, { recursive: true });
  appendFileSync(historyPath, `${JSON.stringify(record)}\n`, "utf8");
};

const currentState = (config) => {
  const branch = git("branch", "--show-current");
  const commitId = git("rev-parse", "HEAD");
  const dirty = git("status", "--porcelain");
  if (dirty) throw new Error("Deployment blocked: commit or stash all working-tree changes first.");
  if (!existsSync(resolve(root, config.artifactDirectory))) {
    throw new Error(`Deployment blocked: ${config.artifactDirectory} does not exist. Run npm run build first.`);
  }
  if (config.buildIdFile) {
    const requiredArtifacts = [
      join(root, config.artifactDirectory, "assets", "logo_horizontal_final.png"),
      join(root, config.artifactDirectory, "_next", "static"),
      join(root, ".netlify", "functions", "___netlify-server-handler.zip"),
      join(root, config.buildIdFile),
    ];
    if (requiredArtifacts.some((path) => !existsSync(path))) {
      throw new Error("Deployment blocked: staging static assets or server function are missing. Run netlify build first.");
    }
  }
  const buildIdPath = join(root, config.buildIdFile || join(config.artifactDirectory, "BUILD_ID"));
  const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : "unavailable";
  return { branch, commitId, buildId };
};

const deployArgs = (plan) => [
  ...(plan.environment === "staging" ? ["--yes", "netlify-cli@26.1.0"] : ["netlify"]),
  "deploy",
  ...(plan.environment === "production" || plan.environment === "staging" ? ["--prod"] : []),
  ...(plan.environment === "staging" ? ["--no-build"] : []),
  ...(plan.siteId ? [`--site=${plan.siteId}`] : []),
  `--dir=${plan.artifactDirectory}`,
  "--json",
];

const displayCommand = (plan) => `npx ${plan.environment === "staging" ? "--yes netlify-cli@26.1.0" : "netlify"} deploy${plan.environment === "production" || plan.environment === "staging" ? " --prod" : ""}${plan.environment === "staging" ? " --no-build" : ""}${plan.siteId ? ` --site=${plan.siteId}` : ""} --dir=${plan.artifactDirectory} --json`;

const verifyStagingEnvironment = (config) => {
  const cliArgs = ["--yes", "netlify-cli@26.1.0", "env:list", "--site", config.siteId,
    "--context", "production", "--json"];
  const options = { env: { ...process.env, NETLIFY_SITE_ID: config.siteId,
    NPM_CONFIG_CACHE: join(process.env.TEMP || process.env.TMP || root, "codex-netlify-npm-cache") } };
  const result = process.platform === "win32"
    ? run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npx.cmd", ...cliArgs], options)
    : run("npx", cliArgs, options);
  if (result.status !== 0) throw new Error("Deployment blocked: cannot verify staging site variables.");
  let remote;
  try { remote = JSON.parse(result.stdout); }
  catch { throw new Error("Deployment blocked: cannot parse staging site variables."); }
  const local = Object.fromEntries(readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/).map((line) => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
    .map((match) => [match[1], match[2]]));
  const expected = {
    NEXT_PUBLIC_SUPABASE_URL: "https://zghcorbdtslrjtkkspfe.supabase.co",
    STAGING_SUPABASE_PROJECT_REF: "zghcorbdtslrjtkkspfe",
    STAGING_SYSTEM_ADMIN_AUTH_ID: "575133be-3165-4a3c-b008-21c6804f5447",
    NEXT_PUBLIC_BASE_URL: "https://el-town-staging.netlify.app",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SECRET_KEY: local.SUPABASE_SECRET_KEY,
    NEXT_PUBLIC_LIFF_ID: "2009700969-9dn0R2dB",
    LINE_CHANNEL_ACCESS_TOKEN: "disabled-for-staging",
    LINE_CHANNEL_SECRET: "disabled-for-staging",
    RESEND_API_KEY: "disabled-for-staging",
    ADMIN_INVITE_EMAIL_FROM: "disabled-for-staging",
    STRIPE_SECRET_KEY: "disabled-for-staging",
    STRIPE_SECRET_KEY_LIVE: "disabled-for-staging",
    STRIPE_SECRET_KEY_TEST: "disabled-for-staging",
    STRIPE_CONNECT_WEBHOOK_SECRET: "disabled-for-staging",
    OPENAI_API_KEY: "disabled-for-staging",
    SYSTEM_BILLING_ENABLED: "false",
    SYSTEM_BILLING_CRON_SECRET: "disabled-for-staging",
    SUPABASE_SEVRET_KEY: "disabled-for-staging",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (!value || remote[key] !== value) {
      throw new Error(`Deployment blocked: staging site variable ${key} is missing or differs from the reviewed value.`);
    }
  }
  for (const key of ["SYSTEM_LOGIN_ID", "SYSTEM_LOGIN_PASSWORD", "SYSTEM_SESSION_SECRET"]) {
    if (!remote[key] || remote[key] !== local[key]) {
      throw new Error(`Deployment blocked: staging site variable ${key} is not configured for this checkout.`);
    }
  }
  const permittedKeys = new Set([...Object.keys(expected),
    "SYSTEM_LOGIN_ID", "SYSTEM_LOGIN_PASSWORD", "SYSTEM_SESSION_SECRET"]);
  const unexpectedKeys = Object.keys(remote).filter((key) => !permittedKeys.has(key));
  if (unexpectedKeys.length) {
    throw new Error(`Deployment blocked: unreviewed staging site variables: ${unexpectedKeys.join(", ")}.`);
  }
};

const createPlan = () => {
  if (args.includes("--staging") && args.includes("--prod")) {
    throw new Error("Choose either --staging or --prod, not both.");
  }
  const environment = args.includes("--staging") ? "staging" : args.includes("--prod") ? "production" : "preview";
  const config = environment === "staging"
    ? JSON.parse(readFileSync(join(root, "deploy.staging.config.json"), "utf8"))
    : productionConfig;
  const state = currentState(config);
  if (config.requiredBranch && state.branch !== config.requiredBranch) {
    throw new Error(`Deployment blocked: staging requires branch ${config.requiredBranch}.`);
  }
  if (environment === "staging" && !/^[0-9a-f-]{36}$/i.test(config.siteId || "")) {
    throw new Error("Deployment blocked: staging Site ID is missing.");
  }
  if (environment === "staging") verifyStagingEnvironment(config);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + Number(config.approvalTtlMinutes || 15) * 60_000);
  const nonce = randomBytes(4).toString("hex");
  const approval = `APPROVE DEPLOY ${config.service} ${config.siteName} ${environment} ${state.commitId} ${nonce}`;
  const plan = {
    version: 1,
    service: config.service,
    siteName: config.siteName,
    siteId: config.siteId || null,
    publicUrl: config.publicUrl,
    artifactDirectory: config.artifactDirectory,
    buildIdFile: config.buildIdFile || null,
    requiredBranch: config.requiredBranch || null,
    environment,
    branch: state.branch,
    commitId: state.commitId,
    buildId: state.buildId,
    artifacts: config.buildIdFile
      ? [`${config.artifactDirectory}/**`, ".netlify/functions/**"]
      : [`${config.artifactDirectory}/**`],
    command: displayCommand({ environment, siteId: config.siteId, artifactDirectory: config.artifactDirectory }),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nonce,
    approvalHash: createHash("sha256").update(approval).digest("hex"),
  };
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(pendingPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");

  console.log("\nDEPLOYMENT APPROVAL REQUIRED\n");
  console.table({
    service: plan.service,
    site: plan.siteName,
    siteId: plan.siteId || "linked site",
    environment: plan.environment,
    branch: plan.branch,
    commit: plan.commitId,
    build: plan.buildId,
    artifacts: plan.artifacts.join(", "),
    command: plan.command,
    expires: plan.expiresAt,
  });
  console.log("\nNo credentials or provider account identifiers are included.");
  console.log("To approve this one attempt, run:\n");
  console.log(`npm run deploy:approved -- --approval="${approval}"`);
};

const parseDeployJson = (output) => {
  const trimmed = output.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.lastIndexOf("{");
    if (start >= 0) return JSON.parse(trimmed.slice(start));
    throw new Error("Netlify did not return parseable JSON output.");
  }
};

const executePlan = async () => {
  if (!existsSync(pendingPath)) throw new Error("Deployment blocked: create a fresh plan first.");
  const plan = JSON.parse(readFileSync(pendingPath, "utf8"));
  const approval = valueArg("--approval");
  const approvalHash = createHash("sha256").update(approval).digest("hex");
  if (!approval || approvalHash !== plan.approvalHash) throw new Error("Deployment blocked: approval does not match the pending plan.");
  if (Date.now() > new Date(plan.expiresAt).getTime()) throw new Error("Deployment blocked: approval expired. Create a new plan.");

  if (plan.environment === "staging") {
    const stagingConfig = JSON.parse(readFileSync(join(root, "deploy.staging.config.json"), "utf8"));
    if (plan.siteId !== stagingConfig.siteId || plan.publicUrl !== stagingConfig.publicUrl
      || plan.siteName !== stagingConfig.siteName || plan.requiredBranch !== stagingConfig.requiredBranch
      || plan.artifactDirectory !== stagingConfig.artifactDirectory
      || plan.buildIdFile !== stagingConfig.buildIdFile) {
      throw new Error("Deployment blocked: staging target changed after approval.");
    }
    verifyStagingEnvironment(stagingConfig);
  }
  const state = currentState(plan);
  if (plan.requiredBranch && state.branch !== plan.requiredBranch) {
    throw new Error(`Deployment blocked: expected branch ${plan.requiredBranch}.`);
  }
  if (state.commitId !== plan.commitId || state.branch !== plan.branch || state.buildId !== plan.buildId) {
    throw new Error("Deployment blocked: branch, commit, or build changed after approval. Create a new plan.");
  }

  // Consume approval before starting the external side effect. Failed attempts require a new plan.
  unlinkSync(pendingPath);
  const startedAt = new Date().toISOString();
  const deployOptions = plan.environment === "staging"
    ? { env: { ...process.env, NETLIFY_SITE_ID: plan.siteId,
      NPM_CONFIG_CACHE: join(process.env.TEMP || process.env.TMP || root, "codex-netlify-npm-cache") } }
    : {};
  const result = process.platform === "win32"
    ? run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npx.cmd", ...deployArgs(plan)], deployOptions)
    : run("npx", deployArgs(plan), deployOptions);
  if (result.status !== 0) {
    appendRecord({ ...plan, status: "failed", startedAt, finishedAt: new Date().toISOString(), error: result.stderr.trim().slice(0, 500) });
    throw new Error(result.stderr.trim() || "Netlify deployment failed.");
  }

  const provider = parseDeployJson(result.stdout);
  const returnedSiteId = provider.site_id || provider.siteId || null;
  if (plan.siteId && returnedSiteId && returnedSiteId !== plan.siteId) {
    throw new Error("Deployment returned a different Site ID from the approved target.");
  }
  const deployUrl = provider.url || provider.deploy_url || provider.deployUrl || (plan.environment === "production" || plan.environment === "staging" ? plan.publicUrl : "");
  const deploymentId = provider.deploy_id || provider.deployId || provider.id || "unavailable";
  const publicUrl = plan.environment === "production" || plan.environment === "staging" ? plan.publicUrl : deployUrl;
  if (!publicUrl) throw new Error("Deployment completed but no public URL was returned.");

  const finalBuildIdPath = join(root, plan.buildIdFile || join(plan.artifactDirectory, "BUILD_ID"));
  const finalBuildId = existsSync(finalBuildIdPath) ? readFileSync(finalBuildIdPath, "utf8").trim() : plan.buildId;

  const response = await fetch(`${publicUrl}${publicUrl.includes("?") ? "&" : "?"}deploy_check=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const html = await response.text();
  const checks = {
    publicUrlReachable: response.ok,
    commitUnchanged: git("rev-parse", "HEAD") === plan.commitId,
    buildIdMatches: finalBuildId === "unavailable" ? "unavailable" : html.includes(finalBuildId),
    deploymentIdAvailable: deploymentId !== "unavailable",
  };
  if (plan.environment === "staging") {
    const scriptPath = html.match(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"/)?.[1];
    const logoPath = "/assets/logo_horizontal_final.png";
    const [scriptResponse, logoResponse] = await Promise.all([
      scriptPath ? fetch(new URL(scriptPath, publicUrl), { method: "HEAD" }) : Promise.resolve(null),
      fetch(new URL(logoPath, publicUrl), { method: "HEAD" }),
    ]);
    checks.staticAssetsReachable = Boolean(scriptResponse?.ok && logoResponse.ok);
  }
  const requiredPassed = checks.publicUrlReachable && checks.commitUnchanged
    && checks.buildIdMatches !== false && checks.staticAssetsReachable !== false;
  const record = {
    ...plan,
    approvalHash: undefined,
    nonce: undefined,
    status: requiredPassed ? "verified" : "mismatch",
    startedAt,
    finishedAt: new Date().toISOString(),
    publicUrl,
    deploymentId,
    plannedBuildId: plan.buildId,
    finalBuildId,
    checks,
  };
  appendRecord(record);

  console.log("\nDEPLOYMENT RECONCILIATION\n");
  console.table({ publicUrl, deploymentId, commitId: plan.commitId, plannedBuildId: plan.buildId, finalBuildId, ...checks });
  if (!requiredPassed) throw new Error("Deployment finished, but reconciliation failed. Review .deploy/deployments.jsonl.");
  console.log("\nDeployment verified successfully.");
};

try {
  if (mode === "plan") createPlan();
  else if (mode === "execute") await executePlan();
  else throw new Error("Usage: npm run deploy:plan -- [--staging|--prod] OR npm run deploy:approved -- --approval=\"...\"");
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
}
