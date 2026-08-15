import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

type HelpAudience = "member" | "admin";
type ChatMessage = { role: "user" | "assistant"; content: string };

const MEMBER_GUIDE = `
- ボタン階層: 画面下の主ボタンは「回覧板」「会費」「Live」「設定」。回覧板の下は「全て」「電子回覧板」「連絡」「イベント」。会費の下は「会費」。Liveの下は「Live」「施設予約」。設定の下は「退会申請」。
- 回覧板: 「全て」は電子回覧板・連絡・イベントをまとめて表示する。「電子回覧板」「連絡」「イベント」を押すと種類を絞り込める。カードを押すと本文、配信日、添付画像や資料を確認できる。
- イベントの参加回答: 「回覧板」→「イベント」→予定カードを開き、大人と子供の参加人数を入力して「参加申込を保存する」を押す。回答済みの予定をもう一度開くと人数が表示され、「参加人数を変更する」から変更できる。
- 会費: 「会費」→「会費」で請求額、入金額、納入状態、支払方法を確認する。未納時は表示された支払方法を使う。入金後は同じ画面から領収書を開ける。会費状態は同じ世帯で共有される。
- Live・総会: 総会は回覧板ではなく「Live」→「Live」に表示される。予定を開き、必要に応じて参加人数を入力して申し込む。開始時刻になったら参加ボタンからWeb会議を開く。
- 施設予約: 「Live」→「施設予約」でカレンダーから日付を選び、施設、開始・終了時間、人数、用途を入力して申し込む。自分の申込は同じ画面で確認でき、変更や取消もできる。
- 設定・退会: 「設定」→「退会申請」から申請する。役員の承認後はその町内会・自治会の会員画面を利用できなくなる。
- 迷った場合: 最初に押す主ボタン、その次に押すボタン、最後に行う操作の順で説明する。質問が曖昧なら、どの画面・どの操作かを短く確認する。
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
        model: process.env.OPENAI_HELP_MODEL || "gpt-5.6-terra",
        store: false,
        reasoning: { effort: "low" },
        text: { verbosity: "medium" },
        max_output_tokens: 700,
        safety_identifier: createHash("sha256").update(userData.user.id).digest("hex"),
        instructions: `あなたはel-townの${roleLabel}向け操作サポート担当です。次の案内を根拠に、日本語で分かりやすく回答してください。最初に結論を示し、その後に「押すボタンの順番」と具体的な操作手順を説明してください。変更できるか、やり直せるか、見つからない場合の確認方法も、案内から判断できる範囲で補足してください。直前の会話を踏まえて追加質問にも答えてください。案内にない仕様を推測せず、確認できない内容だけは町内会・自治会の役員への問い合わせを案内してください。個人情報、パスワード、カード番号、APIキーの入力を求めないでください。総会は必ずLiveから案内し、回覧板からは案内しないでください。\n\n${guide}`,
        input: [...history, { role: "user", content: question }],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const payload = await openAIResponse.json().catch(() => ({}));
    if (!openAIResponse.ok) {
      console.error("OpenAI help response failed", { status: openAIResponse.status, code: payload?.error?.code || payload?.error?.type || "unknown" });
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
