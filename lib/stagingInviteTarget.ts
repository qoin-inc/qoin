/** Refuse invite operations unless this branch is explicitly pointed at its staging project. */
export const isStagingInviteTarget = (supabaseUrl: string, expectedRef: string) => {
  if (!/^[a-z0-9]{10,30}$/.test(expectedRef)) return false;
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === 'https:' && url.hostname === `${expectedRef}.supabase.co`;
  } catch {
    return false;
  }
};

export const isStagingSystemAdmin = (userId: string, configuredId: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(configuredId)
  && userId.toLowerCase() === configuredId.toLowerCase();
