import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type HelpAudience = "member" | "admin";
type ChatMessage = { role: "user" | "assistant"; content: string };

const MEMBER_GUIDE = `
- 回覧板: 画面下の「回覧板」から「すべて・電子回覧板・連絡・イベント」を選ぶ。カードを押すと詳細や添付資料を確認できる。
- イベント: 「回覧板」内の「イベント」から予定を開き、参加人数を入力して回答する。
- 会費: 画面下の「会費」で請求額、入金状況、支払方法、入金後の領収書を確認する。会費の状態は同じ世帯で共有される。
- Live・総会: 総会は回覧板ではなく、画面下の「Live」から確認する。予定を選び、必要に応じて参加人数を入力して申し込む。開始時刻になったら詳細画面の参加ボタンからWeb会議を開く。
- 施設予約: 「Live」を開き、下部メニューを「施設予約」に切り替える。カレンダーで日付と空き状況を確認し、施設、時間、人数、用途を入力して申し込む。申込内容の確認、変更、取消も同じ画面で行う。
- 設定: 画面下の「設定」で登録情報と家族の連携状況を確認する。退会は「退会手続き」から申請する。
`;

const ADMIN_GUIDE = `
- 電子回覧板などの配信は「発信機能」から配信種別を選んで作成する。
- 会員名簿の確認、登録、修正は「基本機能」→「会員管理」で行う。
- 会費の請求と入金状況は「基本機能」→「会費管理」で確認する。決済連携は「Stripe連携」で行う。
- 役員の招待は「基本機能」→「役員管理」で行う。
- Live配信URL、総会、施設登録、予約承認は「Live・施設予約」で管理する。
`;

const requestLog = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

function readResponseText(payload: any) {
  if (!Array.isArray(payload?.output)) return "";
  return payload.output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((item: any) => item?.type === "output_text" && typeof item?.text === "string")
    .map((item: any) => item.text.trim())
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "認証設定を確認できません。" }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "ログイン情報を確認できませんでした。" }, { status: 401 });
    }

    if (isRateLimited(userData.user.id)) {
      return NextResponse.json({ error: "質問が続いています。少し待ってからもう一度お試しください。" }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const audience: HelpAudience = body?.audience === "admin" ? "admin" : "member";
    const question = String(body?.question || "").trim();
    if (!question) return NextResponse.json({ error: "質問を入力してください。" }, { status: 400 });
    if (question.length > 300) return NextResponse.json({ error: "質問は300文字以内で入力してください。" }, { status: 400 });
    const history: ChatMessage[] = (Array.isArray(body?.history) ? body.history : [])
      .slice(-6)
      .flatMap((item: any) => {
        const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
        const content = String(item?.content || "").trim();
        return role && content && content.length <= 300 ? [{ role, content }] : [];
      });

    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) return NextResponse.json({ error: "AIヘルプを準備中です。" }, { status: 503 });

    const guide = audience === "member" ? MEMBER_GUIDE : ADMIN_GUIDE;
    const roleLabel = audience === "member" ? "会員" : "役員";
    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_HELP_MODEL || "gpt-5.6-luna",
        store: false,
        reasoning: { effort: "none" },
        text: { verbosity: "low" },
        max_output_tokens: 300,
        instructions: `あなたはel-townの${roleLabel}向け操作ヘルプです。次の案内だけを根拠に、日本語で簡潔に回答してください。案内にない仕様を推測しないでください。分からない場合は「このヘルプでは確認できないため、町内会・自治会の役員へお問い合わせください」と案内してください。個人情報、パスワード、カード番号、APIキーの入力を求めないでください。総会は必ずLiveから案内し、回覧板からは案内しないでください。\n\n${guide}`,
        input: [...history, { role: "user", content: question }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const payload = await openAIResponse.json().catch(() => ({}));
    if (!openAIResponse.ok) {
      return NextResponse.json({ error: "AIから回答を取得できませんでした。" }, { status: 502 });
    }

    const answer = readResponseText(payload);
    if (!answer) return NextResponse.json({ error: "AIから回答を取得できませんでした。" }, { status: 502 });
    return NextResponse.json({ answer });
  } catch (error: any) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json({ error: timedOut ? "回答に時間がかかっています。もう一度お試しください。" : "ヘルプを利用できませんでした。" }, { status: timedOut ? 504 : 500 });
  }
}
