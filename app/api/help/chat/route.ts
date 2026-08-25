import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

type HelpAudience = "member" | "portal" | "admin";
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
- ボタン階層: 管理トップの主な機能は「基本機能」「発信機能」「Live・施設予約」「総会会計」。質問には最初に押す主機能、その次に押す操作画面、最後に行う操作の順で説明する。
- 基本機能: 「基本情報」「会員管理」「会費管理」「システム利用料」「役員管理」「Stripe連携」がある。基本情報では町内会・自治会名、決算月、世帯規模、郵便番号、代表者表示を管理する。会員管理では名簿、LINE連携、家族アカウント、退会状態を管理する。会費管理では会費設定、年間請求額、納入額、手集金を管理する。システム利用料では月額世帯単価、無料プッシュ枠、超過配信数、請求額を確認する。役員管理では招待、再送、退任、復活を行う。Stripe連携ではConnect登録と決済受付状態を確認する。
- 発信機能: 「電子回覧板」「連絡」「イベント」「総会案内」がある。表題、発信者、本文、必要な日時や添付資料を入力し、LINE通知の有無を確認して保存する。イベントは大人・子供の参加人数、総会案内は出欠と委任状を受け付ける。配信済み内容は発信一覧から編集・削除できる。
- Live・施設予約: 「Web会議」ではLINEまたはYouTube、表題、開催日、時間、URL、内容を入力して案内を登録する。「施設予約」では施設名、場所、規模、利用可能時間、利用できない曜日・日付を管理する。予約は施設、状態、月、日で絞り込み、承認・否認・解除を行える。
- 総会会計: 科目管理、予算書作成、決算書作成、CSV・PDF・印刷がある。会計年度を確認して収入・支出科目、予算額、決算実績を管理し、必要な帳票を出力する。
- 迷った場合: 画面にない機能や権限・契約に関する仕様を推測しない。削除操作は元に戻せない場合があるため、対象確認を案内する。
`;

const PORTAL_GUIDE = `
- ボタン階層: 画面下の主ボタンは「食べ・映えel-town」「伝えel-town」「マイel-town」。その下の「メニューを閉じる」「メニューを開く」で3つの主ボタンを隠したり戻したりできる。
- 食べ・映えel-town: お店、グルメ、景色などのおすすめ投稿を表示する。投稿内の町内会・自治会名を押すと、その地域を地図で開ける。
- 伝えel-town: 町内会・自治会の行事や活動の投稿を表示する。投稿内の町内会・自治会名を押すと、その地域を地図で開ける。
- 投稿: 「食べ・映えel-town」または「伝えel-town」を選び、右下の鉛筆ボタンを押す。投稿の種類を選び、ニックネーム、タイトル、アピール内容を入力して「発信する」を押す。場所と写真は任意。
- 投稿の編集・削除: 自分の投稿だけ、投稿右上の鉛筆ボタンから編集、ごみ箱ボタンから削除できる。編集後は「更新する」を押す。削除した投稿は元に戻せない。
- マイel-town: 地図上の町内会・自治会を押すと、その地域の投稿欄が開く。「閉じる」「開く」で投稿欄をたたんだり表示したりでき、右上の×で地域の選択を終了する。新しい投稿は投稿欄の下に表示される。
- 迷った場合: 最初に押す画面下のボタン、その次に押すボタン、最後に行う操作の順で説明する。案内にない仕様は推測しない。
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

function answerCourtesyMessage(question: string) {
  const normalized = question.trim().toLowerCase().replace(/[。．.!！?？\s]+$/g, "");
  if (/^(ありがとう|ありがとうございます|ありがとうございました|どうもありがとう|助かりました)$/.test(normalized)) {
    return "どういたしまして。また分からないことがあれば、いつでも質問してください。";
  }
  return "";
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
    const audience: HelpAudience = body?.audience === "admin" ? "admin" : body?.audience === "portal" ? "portal" : "member";
    const question = String(body?.question || "").trim();
    if (!question) return NextResponse.json({ error: "質問を入力してください。" }, { status: 400 });
    if (question.length > 300) return NextResponse.json({ error: "質問は300文字以内で入力してください。" }, { status: 400 });
    const courtesyAnswer = answerCourtesyMessage(question);
    if (courtesyAnswer) return NextResponse.json({ answer: courtesyAnswer });
    const history: ChatMessage[] = (Array.isArray(body?.history) ? body.history : [])
      .slice(-6)
      .flatMap((item: any) => {
        const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
        const content = String(item?.content || "").trim();
        return role && content && content.length <= 300 ? [{ role, content }] : [];
      });

    const apiKey = process.env.OPENAI_API_KEY || "";
    if (!apiKey) return NextResponse.json({ error: "AIヘルプを準備中です。" }, { status: 503 });

    const guide = audience === "member" ? MEMBER_GUIDE : audience === "portal" ? PORTAL_GUIDE : ADMIN_GUIDE;
    const roleLabel = audience === "member" ? "会員" : audience === "portal" ? "マイel-town利用者" : "役員";
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
        instructions: `あなたはel-townの${roleLabel}向け操作サポート担当です。次の案内を根拠に、日本語で分かりやすく回答してください。最初に結論を示し、その後に「押すボタンの順番」と具体的な操作手順を説明してください。変更できるか、やり直せるか、見つからない場合の確認方法も、案内から判断できる範囲で補足してください。直前の会話を踏まえて追加質問にも答えてください。ただし、挨拶やお礼だけの入力には短く自然に返し、直前の操作説明を繰り返さないでください。案内にない仕様を推測せず、確認できない内容だけは町内会・自治会の役員への問い合わせを案内してください。個人情報、パスワード、カード番号、APIキーの入力を求めないでください。会員画面について回答する場合、総会は必ずLiveから案内し、回覧板からは案内しないでください。\n\n${guide}`,
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
