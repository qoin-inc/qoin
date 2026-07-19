import { createHash, timingSafeEqual } from "crypto";

export const SYSTEM_SESSION_COOKIE_NAME = "el_town_system_session";

const loginId = () => process.env.SYSTEM_LOGIN_ID || "admin";
const loginPassword = () => process.env.SYSTEM_LOGIN_PASSWORD || "eltown-admin";
const sessionSecret = () => process.env.SYSTEM_SESSION_SECRET || `${loginId()}:${loginPassword()}:el-town-system`;

export const systemSessionToken = () => createHash("sha256").update(sessionSecret()).digest("hex");

export const sameSystemSecret = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const cookieValue = (request: Request, name: string) => {
  const cookieHeader = request.headers.get("cookie") || "";
  const entry = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : "";
};

export const isSystemAdminRequest = (request: Request) => (
  sameSystemSecret(cookieValue(request, SYSTEM_SESSION_COOKIE_NAME), systemSessionToken())
);

export const isSystemBillingCronRequest = (request: Request) => {
  const configured = process.env.SYSTEM_BILLING_CRON_SECRET || "";
  const received = request.headers.get("x-system-billing-secret") || "";
  return Boolean(configured && received && sameSystemSecret(received, configured));
};

// Fail closed: billing mutations remain disabled unless production is explicitly enabled.
export const isSystemBillingEnabled = () => (
  String(process.env.SYSTEM_BILLING_ENABLED || "").trim().toLowerCase() === "true"
);

export const systemLoginCredentialsMatch = (inputLoginId: string, inputPassword: string) => (
  sameSystemSecret(inputLoginId, loginId()) && sameSystemSecret(inputPassword, loginPassword())
);
