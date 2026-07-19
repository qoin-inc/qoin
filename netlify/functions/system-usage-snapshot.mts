export default async () => {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.SYSTEM_BILLING_CRON_SECRET;
  if (!baseUrl || !secret) throw new Error("URL or SYSTEM_BILLING_CRON_SECRET is not configured.");
  const response = await fetch(`${baseUrl}/api/system-usage/billing-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-system-billing-secret": secret },
    body: JSON.stringify({ mode: "snapshot" }),
  });
  if (!response.ok) throw new Error(`System usage snapshot failed: ${response.status} ${await response.text()}`);
  console.log("System usage snapshot completed", await response.json());
};

export const config = { schedule: "0 0 16 * *" };
