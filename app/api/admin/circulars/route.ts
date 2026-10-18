import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isStagingInviteTarget } from '@/lib/stagingInviteTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'no-store' },
});
const positiveId = (value: unknown) => /^[1-9]\d{0,14}$/.test(String(value ?? ''));
const categories = new Set(['circular', 'notice', 'event', 'assembly']);
const allowedTypes = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body) || !positiveId(body.townId)
    || (body.circularId != null && !positiveId(body.circularId))
    || !categories.has(body.category) || typeof body.title !== 'string' || !body.title.trim()
    || body.title.length > 200 || typeof body.content !== 'string' || !body.content.trim()
    || body.content.length > 30000 || typeof body.sender !== 'string' || body.sender.length > 200
    || typeof body.pushEnabled !== 'boolean'
    || (body.eventDate != null && (typeof body.eventDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.eventDate)))
    || (body.eventTime != null && (typeof body.eventTime !== 'string' || body.eventTime.length > 40))
    || (body.proxyTemplateText != null && (typeof body.proxyTemplateText !== 'string' || body.proxyTemplateText.length > 10000))) {
    return json({ error: '発信内容の入力を確認してください。' }, 400);
  }
  if (['event', 'assembly'].includes(body.category) && !body.eventDate) {
    return json({ error: '開催日を入力してください。' }, 400);
  }
  const attachment = body.attachment;
  if (attachment != null && (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)
    || typeof attachment.path !== 'string'
    || !new RegExp(`^${body.townId}/circulars/[A-Za-z0-9._-]+$`).test(attachment.path)
    || typeof attachment.name !== 'string' || !attachment.name.trim() || attachment.name.length > 255
    || typeof attachment.type !== 'string' || !allowedTypes.has(attachment.type)
    || !['attachment', 'assembly_notice'].includes(attachment.role))) {
    return json({ error: '添付ファイルの保存先を確認してください。' }, 400);
  }
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  if (!token) return json({ error: '役員ログインを確認できません。' }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!secret || !isStagingInviteTarget(url, process.env.STAGING_SUPABASE_PROJECT_REF || '')) {
    return json({ error: '検証環境の設定を確認できません。' }, 503);
  }
  try {
    const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user?.id) return json({ error: '役員ログインの有効期限が切れています。' }, 401);
    const townId = Number(body.townId);
    const { data: membership, error: membershipError } = await admin.from('neighborhood_admins')
      .select('id').eq('neighborhood_id', townId).eq('admin_auth_id', auth.user.id)
      .eq('status', 'active').maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: 'この町内会の発信権限がありません。' }, 403);

    let existing: Record<string, any> | null = null;
    if (body.circularId != null) {
      const found = await admin.from('circulars').select('*').eq('id', body.circularId)
        .eq('neighborhood_id', townId).maybeSingle();
      if (found.error) throw found.error;
      if (!found.data) return json({ error: '発信内容が見つかりません。' }, 404);
      existing = found.data;
    }
    if (attachment) {
      const fileName = attachment.path.split('/').at(-1) as string;
      const listed = await admin.storage.from('circular-attachments')
        .list(`${townId}/circulars`, { search: fileName, limit: 100 });
      if (listed.error) throw listed.error;
      if (!listed.data?.some((file) => file.name === fileName)) {
        return json({ error: '添付ファイルを確認できません。' }, 400);
      }
    }
    const now = new Date().toISOString();
    const payload = {
      neighborhood_id: townId,
      title: body.title.trim(), content: body.content.trim(), body: body.content.trim(),
      category: body.category, author: body.sender.trim() || '役員',
      author_name: body.sender.trim() || '役員',
      published_at: existing?.published_at || now, is_pushed: body.pushEnabled,
      attachments: attachment ? [attachment] : existing?.attachments || [],
      attachment_url: attachment ? null : existing?.attachment_url || null,
      image_url: attachment ? null : existing?.image_url || null,
      pdf_url: attachment ? null : existing?.pdf_url || null,
      event_date: body.category === 'event' || body.category === 'assembly' ? body.eventDate : null,
      event_time: body.category === 'event' || body.category === 'assembly' ? body.eventTime || null : null,
      meeting_at: null,
      requires_reply: body.category === 'event' || body.category === 'assembly',
      proxy_template_text: body.category === 'assembly' ? body.proxyTemplateText || null : null,
      updated_at: now,
    };
    const result = existing
      ? await admin.from('circulars').update(payload).eq('id', body.circularId)
        .eq('neighborhood_id', townId).select('*').single()
      : await admin.from('circulars').insert(payload).select('*').single();
    if (result.error) throw result.error;
    return json({ data: result.data });
  } catch (error) {
    console.error('[admin-circulars] save failed', { message: String((error as Error)?.message || 'unknown') });
    return json({ error: '発信内容を保存できませんでした。' }, 503);
  }
}
