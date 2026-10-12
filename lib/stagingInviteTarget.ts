/** This worktree may only use the verified el-town staging Supabase project. */
export const EL_TOWN_STAGING_PROJECT_REF = 'zghcorbdtslrjtkkspfe';

/** Refuse invite operations unless this branch is explicitly pointed at its staging project. */
export const isStagingInviteTarget = (supabaseUrl: string, expectedRef: string) => {
  if (expectedRef !== EL_TOWN_STAGING_PROJECT_REF) return false;
  try {
    const url = new URL(supabaseUrl);
    return url.href === `https://${EL_TOWN_STAGING_PROJECT_REF}.supabase.co/`;
  } catch {
    return false;
  }
};

export const isStagingSystemAdmin = (userId: string, configuredId: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(configuredId)
  && userId.toLowerCase() === configuredId.toLowerCase();
