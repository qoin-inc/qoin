import { supabase } from '@/lib/supabaseClient';

const STAGING_CHANNEL_ID = '2009700969';

export const isVerifiedStagingLineUser = (user: any, lineUserId?: string) =>
  user?.app_metadata?.eltown_line_channel_id === STAGING_CHANNEL_ID
  && typeof user?.app_metadata?.eltown_line_user_id === 'string'
  && (!lineUserId || user.app_metadata.eltown_line_user_id === lineUserId);

export const exchangeLineSession = async (liff: { getIDToken?: () => string | null }) => {
  const idToken = liff?.getIDToken?.();
  if (!idToken) throw new Error('LINEのID tokenを取得できませんでした。');

  const response = await fetch('/api/line/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.accessToken || !data.refreshToken) {
    throw new Error(data.error || 'LINE認証に失敗しました。');
  }
  const { data: session, error } = await supabase.auth.setSession({
    access_token: data.accessToken,
    refresh_token: data.refreshToken,
  });
  if (error || !session.session || !isVerifiedStagingLineUser(session.user)) {
    await supabase.auth.signOut();
    throw error || new Error('検証用LINE利用者を確認できませんでした。');
  }
  return session.session;
};
