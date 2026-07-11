import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const stateDir = join(root, ".deploy");
const pendingPath = join(stateDir, "pending.json");
const historyPath = join(stateDir, "deployments.jsonl");
const config = JSON.parse(readFileSync(join(root, "deploy.config.json"), "utf8"));
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

const currentState = () => {
  const branch = git("branch", "--show-current");
  const commitId = git("rev-parse", "HEAD");
  const dirty = git("status", "--porcelain");
  if (dirty) throw new Error("Deployment blocked: commit or stash all working-tree changes first.");
  if (!existsSync(resolve(root, config.artifactDirectory))) {
    throw new Error(`Deployment blocked: ${config.artifactDirectory} does not exist. Run npm run build first.`);
  }
  const buildIdPath = join(root, config.artifactDirectory, "BUILD_ID");
  const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : "unavailable";
  return { branch, commitId, buildId };
};

const deployArgs = (environment) => [
  "netlify",
  "deploy",
  ...(environment === "production" ? ["--prod"] : []),
  `--dir=${config.artifactDirectory}`,
  "--json",
];

const displayCommand = (environment) => `npx netlify deploy${environment === "production" ? " --prod" : ""} --dir=${config.artifactDirectory} --json`;

const createPlan = () => {
  const environment = args.includes("--prod") ? "production" : "preview";
  const state = currentState();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + Number(config.approvalTtlMinutes || 15) * 60_000);
  const nonce = randomBytes(4).toString("hex");
  const approval = `APPROVE DEPLOY ${config.service} ${config.siteName} ${environment} ${state.commitId} ${nonce}`;
  const plan = {
    version: 1,
    service: config.service,
    siteName: config.siteName,
    publicUrl: config.publicUrl,
    environment,
    branch: state.branch,
    commitId: state.commitId,
    buildId: state.buildId,
    artifacts: [`${config.artifactDirectory}/**`],
    command: displayCommand(environment),
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

  const state = currentState();
  if (state.commitId !== plan.commitId || state.branch !== plan.branch || state.buildId !== plan.buildId) {
    throw new Error("Deployment blocked: branch, commit, or build changed after approval. Create a new plan.");
  }

  // Consume approval before starting the external side effect. Failed attempts require a new plan.
  unlinkSync(pendingPath);
  const startedAt = new Date().toISOString();
  const result = process.platform === "win32"
    ? run(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npx.cmd", ...deployArgs(plan.environment)])
    : run("npx", deployArgs(plan.environment));
  if (result.status !== 0) {
    appendRecord({ ...plan, status: "failed", startedAt, finishedAt: new Date().toISOString(), error: result.stderr.trim().slice(0, 500) });
    throw new Error(result.stderr.trim() || "Netlify deployment failed.");
  }

  const provider = parseDeployJson(result.stdout);
  const deployUrl = provider.url || provider.deploy_url || provider.deployUrl || (plan.environment === "production" ? plan.publicUrl : "");
  const deploymentId = provider.deploy_id || provider.deployId || provider.id || "unavailable";
  const publicUrl = plan.environment === "production" ? plan.publicUrl : deployUrl;
  if (!publicUrl) throw new Error("Deployment completed but no public URL was returned.");

  const finalBuildIdPath = join(root, config.artifactDirectory, "BUILD_ID");
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
  const requiredPassed = checks.publicUrlReachable && checks.commitUnchanged && checks.buildIdMatches !== false;
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
  else throw new Error("Usage: npm run deploy:plan -- [--prod] OR npm run deploy:approved -- --approval=\"...\"");
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
}
