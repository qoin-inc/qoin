"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ResidentViewProps = {
  townId?: number;
  townName?: string;
  residentName?: string;
  userId?: string;
  openTargetId?: string | null;
  initialTab?: string | null;
};

type Circular = {
  id: number;
  title: string;
  content?: string | null;
  body?: string | null;
  category?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  meeting_at?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  author?: string | null;
  author_name?: string | null;
  attachments?: any;
  attachment_url?: string | null;
  image_url?: string | null;
  pdf_url?: string | null;
  proxy_template_text?: string | null;
  is_read?: boolean;
};

type BoardFilter = "all" | "circular" | "notice" | "event";
type ResidentTab = "board" | "payment" | "live" | "settings";
type ViewMode = "cards" | "calendar";
type BottomNavMode = "main" | "sub";

type ReplyDraft = {
  adults: string;
  children: string;
  assemblyStatus: "present" | "absent";
  proxyEnabled: boolean;
  proxyDate: string;
  proxySignerName: string;
  proxyAgentName: string;
  proxyText: string;
};

type FeeRecord = {
  id: number | string;
  year?: number;
  fiscal_year?: number;
  expected_amount?: number;
  billing_amount?: number;
  amount?: number;
  paid_amount?: number;
  paid_amount_cash?: number;
  paid_amount_stripe?: number;
  billing_channel?: string;
  payment_method?: string;
  last_payment_method?: string;
  status?: string;
  is_billed?: boolean;
};

type LiveSession = {
  id: number | string;
  provider?: string | null;
  title?: string | null;
  content?: string | null;
  description?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  starts_at?: string | null;
  meeting_url?: string | null;
  live_url?: string | null;
  event_url?: string | null;
  status?: string | null;
};

type Facility = {
  id: number | string;
  name?: string | null;
  location?: string | null;
  capacity?: string | null;
  scale?: string | null;
  available_start_time?: string | null;
  available_end_time?: string | null;
  available_hours?: string | null;
  unavailable_weekdays?: string[] | string | null;
  unavailable_dates?: string[] | string | null;
  is_active?: boolean | null;
};

type FacilityReservation = {
  id: number | string;
  facility_id?: number | string | null;
  facility_name?: string | null;
  applicant_name?: string | null;
  resident_name?: string | null;
  participant_count?: number | string | null;
  people_count?: number | string | null;
  reservation_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
};

type LiveCalendarEntry = {
  id: string;
  kind: "live" | "facility";
  label: string;
  onSelect?: () => void;
};

type LiveReplyDraft = {
  sessionId: string;
  participantCount: string;
};

type FacilityReservationDraft = {
  facilityId: string;
  applicantName: string;
  participantCount: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
};

type LiveScreen = "live" | "facility";

const tabs = [
  { id: "board", label: "回覧板", icon: "fa-clipboard-list" },
  { id: "payment", label: "会費", icon: "fa-yen-sign" },
  { id: "live", label: "Live", icon: "fa-video" },
  { id: "settings", label: "設定", icon: "fa-gear" },
] satisfies { id: ResidentTab; label: string; icon: string }[];

const normalizeResidentTab = (tab?: string | null, openTargetId?: string | null): ResidentTab => {
  if (openTargetId) return "board";
  if (tab === "payment" || tab === "fee") return "payment";
  if (tab === "live" || tab === "facility") return "live";
  if (tab === "settings" || tab === "profile") return "settings";
  return "board";
};

const yen = (value: number) => `¥${Math.round(value || 0).toLocaleString()}`;
const getFeeYear = (fee: FeeRecord) => Number(fee.fiscal_year ?? fee.year ?? new Date().getFullYear());
const getFeeBillingAmount = (fee: FeeRecord) => Number(fee.expected_amount ?? fee.billing_amount ?? fee.amount ?? 0);
const getFeeCashPaid = (fee: FeeRecord) => Number(fee.paid_amount_cash ?? (fee.payment_method === "cash" ? fee.paid_amount : 0) ?? 0);
const getFeeStripePaid = (fee: FeeRecord) => Number(fee.paid_amount_stripe ?? (fee.payment_method === "stripe" ? fee.paid_amount : 0) ?? 0);
const getFeePaidAmount = (fee: FeeRecord) => Number(fee.paid_amount ?? (getFeeCashPaid(fee) + getFeeStripePaid(fee)));
const getFeeStatusLabel = (fee: FeeRecord) => {
  const billed = getFeeBillingAmount(fee);
  const paid = getFeePaidAmount(fee);
  if (billed > 0 && paid >= billed) return "納入済";
  if (paid > 0) return "一部入金";
  return "未納";
};
const getPaymentMethodLabel = (fee: FeeRecord) => {
  const cash = getFeeCashPaid(fee);
  const stripe = getFeeStripePaid(fee);
  if (cash > 0 && stripe > 0) return "Stripe + 手集金";
  if (stripe > 0 || fee.payment_method === "stripe" || fee.last_payment_method === "stripe") return "Stripe";
  if (cash > 0 || fee.payment_method === "cash" || fee.last_payment_method === "cash") return "手集金";
  return "未入金";
};

const parseAttachmentList = (item: Circular) => {
  const raw = item.attachments;
  let list: any[] = [];
  if (Array.isArray(raw)) list = raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = [];
    }
  }
  const extras = [
    item.image_url ? { name: "画像", url: item.image_url, type: "image/*" } : null,
    item.pdf_url ? { name: "PDF", url: item.pdf_url, type: "application/pdf" } : null,
    item.attachment_url ? { name: "添付", url: item.attachment_url, type: "" } : null,
  ].filter(Boolean) as any[];
  return [...list, ...extras].filter((attachment, index, all) => {
    const url = attachment?.url;
    return url && all.findIndex((candidate) => candidate?.url === url) === index;
  });
};

const categoryLabel = (item: Circular) => {
  if (item.category === "event") return "イベント";
  if (item.category === "assembly") return "総会通知";
  if (item.category === "notice" || item.category === "info") return "連絡";
  return "電子回覧板";
};

const categoryIcon = (item: Circular) => {
  if (item.category === "event") return "fa-calendar-days";
  if (item.category === "assembly") return "fa-users-viewfinder";
  if (item.category === "notice" || item.category === "info") return "fa-circle-info";
  return "fa-clipboard-list";
};

const safeFileName = (name: string) => name.replace(/[^\w.\-]+/g, "_").replace(/^_+/, "") || "attachment";

const missingColumnFromError = (error: any) => {
  const message = String(error?.message || "");
  const quoted = message.match(/'([^']+)' column/);
  if (quoted?.[1]) return quoted[1];
  const plain = message.match(/column ["']?([a-zA-Z0-9_]+)["']?/);
  return plain?.[1] || "";
};

const dateKey = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayKey = () => dateKey(new Date().toISOString());

const splitSettingList = (value?: string[] | string | null) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[\n,、，]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const liveProviderLabel = (provider?: string | null) => provider === "youtube" ? "YouTube" : "LINE";

const liveSessionUrl = (session: LiveSession) => session.meeting_url || session.live_url || session.event_url || "";

const liveSessionDateKey = (session: LiveSession) => dateKey(session.event_date || session.starts_at);

const timeToMinutes = (value?: string | null) => {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const timeRangesOverlap = (startA?: string | null, endA?: string | null, startB?: string | null, endB?: string | null) => {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  if ([aStart, aEnd, bStart, bEnd].some((value) => value === null)) return false;
  return (aStart as number) < (bEnd as number) && (bStart as number) < (aEnd as number);
};

const facilityAvailableStart = (facility?: Facility | null) => {
  if (!facility) return "";
  if (facility.available_start_time) return facility.available_start_time;
  return String(facility.available_hours || "").match(/(\d{1,2}:\d{2})/)?.[1] || "";
};

const facilityAvailableEnd = (facility?: Facility | null) => {
  if (!facility) return "";
  if (facility.available_end_time) return facility.available_end_time;
  const matches = String(facility.available_hours || "").match(/(\d{1,2}:\d{2})/g);
  return matches?.[1] || "";
};

const facilityAvailableLabel = (facility?: Facility | null) => {
  const start = facilityAvailableStart(facility);
  const end = facilityAvailableEnd(facility);
  if (start && end) return `${start}-${end}`;
  return facility?.available_hours || "未設定";
};

const defaultProxyText = (title?: string | null) => `私は、${title || "総会"}に出席できませんので、同総会における議決権を代理人に委任します。`;

const createReplyDraft = (name = "", circular?: Circular | null): ReplyDraft => ({
  adults: "1",
  children: "0",
  assemblyStatus: "present",
  proxyEnabled: false,
  proxyDate: todayKey(),
  proxySignerName: name,
  proxyAgentName: "",
  proxyText: circular?.proxy_template_text || defaultProxyText(circular?.title),
});

export default function ResidentView({ townId, townName, residentName, userId, openTargetId, initialTab }: ResidentViewProps) {
  const [activeTab, setActiveTab] = useState<ResidentTab>(() => normalizeResidentTab(initialTab, openTargetId));
  const [bottomNavMode, setBottomNavMode] = useState<BottomNavMode>(() => (initialTab || openTargetId ? "sub" : "main"));
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityReservations, setFacilityReservations] = useState<FacilityReservation[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [stripeReady, setStripeReady] = useState(false);
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeMessage, setFeeMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [residentRosterId, setResidentRosterId] = useState<number | string | null>(null);
  const [replyDraft, setReplyDraft] = useState<ReplyDraft>(() => createReplyDraft(residentName || ""));
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [boardViewMode, setBoardViewMode] = useState<ViewMode>("cards");
  const [liveReplyDraft, setLiveReplyDraft] = useState<LiveReplyDraft>({ sessionId: "", participantCount: "1" });
  const [facilityReservationDraft, setFacilityReservationDraft] = useState<FacilityReservationDraft>({
    facilityId: "",
    applicantName: residentName || "",
    participantCount: "1",
    reservationDate: todayKey(),
    startTime: "",
    endTime: "",
  });
  const [liveMessage, setLiveMessage] = useState("");
  const [activeLiveScreen, setActiveLiveScreen] = useState<LiveScreen>("live");
  const [liveViewMode, setLiveViewMode] = useState<ViewMode>("calendar");
  const [withdrawalBusy, setWithdrawalBusy] = useState(false);
  const [withdrawalMessage, setWithdrawalMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const fetchCirculars = async () => {
      if (!townId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [circularResult, liveResult, facilityResult, reservationResult] = await Promise.all([
        supabase
          .from("circulars")
          .select("*")
          .eq("neighborhood_id", townId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("live_sessions")
          .select("*")
          .eq("neighborhood_id", townId)
          .order("event_date", { ascending: true })
          .limit(100),
        supabase
          .from("facilities")
          .select("*")
          .eq("neighborhood_id", townId)
          .limit(100),
        supabase
          .from("facility_reservations")
          .select("*")
          .eq("neighborhood_id", townId)
          .in("status", ["approved", "pending"])
          .limit(300),
      ]);

      if (!circularResult.error && circularResult.data) {
        const items = circularResult.data as Circular[];
        setCirculars(items);
        const target = openTargetId ? items.find((item) => String(item.id) === String(openTargetId)) : null;
        if (target) setSelectedCircular(target);
      }
      if (!liveResult.error && liveResult.data) setLiveSessions(liveResult.data as LiveSession[]);
      if (!facilityResult.error && facilityResult.data) setFacilities((facilityResult.data as Facility[]).filter((facility) => facility.is_active !== false));
      if (!reservationResult.error && reservationResult.data) setFacilityReservations(reservationResult.data as FacilityReservation[]);
      setLoading(false);
    };

    fetchCirculars();
  }, [townId, openTargetId]);

  useEffect(() => {
    const fetchFees = async () => {
      if (!townId) {
        setFeeLoading(false);
        return;
      }

      setFeeLoading(true);
      setFeeMessage("");

      let townResult = await supabase
        .from("neighborhoods")
        .select("stripe_account_id,stripe_account_mode,stripe_onboarding_status,stripe_charges_enabled,stripe_payouts_enabled")
        .eq("id", townId)
        .maybeSingle();

      if (townResult.error && String(townResult.error.message || "").includes("stripe_")) {
        townResult = await supabase
          .from("neighborhoods")
          .select("stripe_account_id")
          .eq("id", townId)
          .maybeSingle();
      }
      const townData = townResult.data as any;
      setStripeAccountId(townData?.stripe_account_id || "");
      setStripeReady(Boolean(
        townData?.stripe_account_id &&
        (townData?.stripe_onboarding_status === "active" || (townData?.stripe_charges_enabled === true && townData?.stripe_payouts_enabled === true)),
      ));

      let rosterId: number | string | null = null;
      if (userId) {
        const { data: roster } = await supabase
          .from("resident_rosters")
          .select("id")
          .eq("neighborhood_id", townId)
          .or(`user_auth_id.eq.${userId},family_user_auth_id_1.eq.${userId},family_user_auth_id_2.eq.${userId}`)
          .maybeSingle();
        rosterId = roster?.id || null;
      }
      setResidentRosterId(rosterId);

      let records: FeeRecord[] = [];
      if (rosterId !== null) {
        const { data } = await supabase
          .from("fee_records")
          .select("*")
          .eq("roster_id", rosterId)
          .order("year", { ascending: false })
          .limit(5);
        records = (data || []) as FeeRecord[];
      }

      if (!records.length && residentName) {
        const { data } = await supabase
          .from("fee_records")
          .select("*")
          .eq("neighborhood_id", townId)
          .eq("resident_name", residentName)
          .order("year", { ascending: false })
          .limit(5);
        records = (data || []) as FeeRecord[];
      }

      setFeeRecords(records);
      setFeeLoading(false);
    };

    fetchFees();
  }, [residentName, townId, userId]);

  const boardCirculars = circulars.filter((item) => item.category !== "assembly");
  const eventItems = circulars.filter((item) => item.category === "event");
  const assemblyItems = circulars.filter((item) => item.category === "assembly");
  const boardItems = boardCirculars.filter((item) => {
    if (boardFilter === "all") return true;
    if (boardFilter === "notice") return item.category === "notice" || item.category === "info";
    return item.category === boardFilter;
  });
  const unreadCount = circulars.filter((item) => !item.is_read).length;
  const displayName = residentName || "会員";
  const placeName = townName || "町内会・自治会";

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }), []);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long" }), []);
  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dateKey(date.toISOString());
      return {
        key,
        date,
        inMonth: date.getMonth() === calendarMonth.getMonth(),
        events: eventItems.filter((item) => dateKey(item.event_date || item.published_at || item.created_at) === key),
      };
    });
  }, [calendarMonth, eventItems]);

  const formatDate = (item: Circular) => {
    const raw = item.event_date || item.published_at || item.created_at;
    if (!raw) return "日付未設定";
    return dateFormatter.format(new Date(raw));
  };

  const bodyText = (item: Circular) => item.content || item.body || "本文はまだ登録されていません。";
  const authorName = (item: Circular) => item.author_name || item.author || placeName;
  const latestFee = feeRecords[0];
  const facilityNameById = (facilityId?: number | string | null) => (
    facilities.find((facility) => String(facility.id) === String(facilityId))?.name || "施設"
  );
  const approvedFacilityReservations = facilityReservations.filter((reservation) => reservation.status === "approved");
  const selectedFacility = facilities.find((facility) => String(facility.id) === String(facilityReservationDraft.facilityId));
  const selectedFacilityApprovedReservations = approvedFacilityReservations.filter(
    (reservation) => String(reservation.facility_id) === String(facilityReservationDraft.facilityId),
  );
  const liveCalendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = dateKey(date.toISOString());
      const liveEntries: LiveCalendarEntry[] = activeLiveScreen === "live" ? liveSessions
        .filter((session) => liveSessionDateKey(session) === key)
        .map((session) => ({
          id: `live-${session.id}`,
          kind: "live",
          label: `${session.event_time ? `${session.event_time} ` : ""}${session.title || "Web会議"}`,
          onSelect: () => setLiveReplyDraft((current) => ({ ...current, sessionId: String(session.id) })),
        })) : [];
      const facilityEntries: LiveCalendarEntry[] = activeLiveScreen === "facility" ? approvedFacilityReservations
        .filter((reservation) => dateKey(reservation.reservation_date) === key)
        .map((reservation) => ({
          id: `facility-${reservation.id}`,
          kind: "facility",
          label: `${reservation.start_time || ""}${reservation.end_time ? `-${reservation.end_time}` : ""} ${reservation.facility_name || facilityNameById(reservation.facility_id)}`,
          onSelect: () => setFacilityReservationDraft((current) => ({
            ...current,
            facilityId: String(reservation.facility_id || ""),
            reservationDate: key,
          })),
        })) : [];
      return {
        key,
        date,
        inMonth: date.getMonth() === calendarMonth.getMonth(),
        entries: [...liveEntries, ...facilityEntries],
      };
    });
  }, [activeLiveScreen, approvedFacilityReservations, calendarMonth, facilities, liveSessions]);

  const handleOnlinePayment = async (fee: FeeRecord) => {
    setFeeMessage("");
    if (!stripeAccountId || !stripeReady) {
      setFeeMessage("この町内会・自治会はStripe本番連携の確認中です。役員からの案内をお待ちください。");
      return;
    }

    const amount = Math.max(getFeeBillingAmount(fee) - getFeePaidAmount(fee), 0);
    if (amount <= 0) {
      setFeeMessage("未納額はありません。");
      return;
    }

    try {
      const response = await fetch("/api/fees/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeRecordId: fee.id,
          amount,
          stripeAccountId,
          residentName: displayName,
          townName: placeName,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "決済画面を作成できませんでした。");
      window.location.href = data.url;
    } catch (error: any) {
      setFeeMessage(error?.message || "オンライン支払いを開始できませんでした。");
    }
  };

  const openCircular = (item: Circular) => {
    setSelectedCircular(item);
    setReplyDraft(createReplyDraft(displayName, item));
    setReplyMessage("");
    setReplyFile(null);
  };

  const shiftCalendarMonth = (amount: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const uploadReplyFile = async (file: File, circularId: number | string) => {
    const fileName = `${townId || "town"}/replies/${circularId}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("attachments").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("attachments").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const openProxyPreview = () => {
    if (!selectedCircular) return;
    const params = new URLSearchParams({
      title: selectedCircular.title,
      signer: replyDraft.proxySignerName.trim() || displayName,
      town: placeName,
      date: replyDraft.proxyDate || todayKey(),
      text: replyDraft.proxyText.trim() || defaultProxyText(selectedCircular.title),
    });
    if (replyDraft.proxyAgentName.trim()) params.set("agent", replyDraft.proxyAgentName.trim());
    window.open(`/resident/proxy?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const insertReplyWithFallback = async (payload: Record<string, any>) => {
    let nextPayload = { ...payload };
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const result = await supabase.from("event_applications").insert(nextPayload).select("*").single();
      if (!result.error) return { ...(result.data || {}), ...nextPayload };

      const missingColumn = missingColumnFromError(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
        delete nextPayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    throw new Error("返信を保存できませんでした。");
  };

  const insertResidentRowWithFallback = async (table: string, payload: Record<string, any>, errorMessage: string) => {
    let nextPayload = { ...payload };
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const result = await supabase.from(table).insert(nextPayload).select("*").single();
      if (!result.error) return { ...(result.data || {}), ...nextPayload };

      const missingColumn = missingColumnFromError(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
        delete nextPayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    throw new Error(errorMessage);
  };

  const getFacilityUnavailableReason = (facility: Facility | undefined, reservationDate: string) => {
    if (!facility || !reservationDate) return "";
    const key = dateKey(reservationDate);
    const parsedDate = new Date(`${key}T00:00:00`);
    if (!key || Number.isNaN(parsedDate.getTime())) return "";

    const unavailableDates = splitSettingList(facility.unavailable_dates);
    if (unavailableDates.some((item) => dateKey(item) === key || item === key)) {
      return "この日は施設の利用不可日に設定されています。";
    }

    const weekday = ["日", "月", "火", "水", "木", "金", "土"][parsedDate.getDay()];
    const unavailableWeekdays = splitSettingList(facility.unavailable_weekdays);
    if (unavailableWeekdays.some((item) => item === weekday || item === `${weekday}曜` || item === `${weekday}曜日`)) {
      return "この曜日は施設の利用不可曜日に設定されています。";
    }

    return "";
  };

  const hasApprovedFacilityReservationConflict = (facilityId: string, reservationDate: string, startTime: string, endTime: string) => {
    return approvedFacilityReservations.some((reservation) => (
      String(reservation.facility_id) === String(facilityId) &&
      dateKey(reservation.reservation_date) === dateKey(reservationDate) &&
      timeRangesOverlap(startTime, endTime, reservation.start_time, reservation.end_time)
    ));
  };

  const handleLiveReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const sessionId = liveReplyDraft.sessionId || String(liveSessions[0]?.id || "");
    const session = liveSessions.find((item) => String(item.id) === String(sessionId));
    const participantCount = Math.max(Number(liveReplyDraft.participantCount || 0), 0);
    if (!session) {
      setLiveMessage("参加するWeb会議を選択してください。");
      return;
    }
    if (participantCount <= 0) {
      setLiveMessage("参加人数を入力してください。");
      return;
    }

    setReplyBusy(true);
    setLiveMessage("");
    try {
      await insertResidentRowWithFallback("live_session_applications", {
        live_session_id: session.id,
        session_id: session.id,
        neighborhood_id: townId,
        roster_id: residentRosterId,
        user_auth_id: userId || null,
        resident_name: displayName,
        applicant_name: displayName,
        participant_count: participantCount,
        people_count: participantCount,
        reply_status: "attend",
        response_status: "attend",
        status: "attend",
        applied_at: new Date().toISOString(),
      }, "Web会議の参加申込を保存できませんでした。");
      setLiveReplyDraft((current) => ({ ...current, sessionId: String(session.id) }));
      setLiveMessage("Web会議の参加申込を送信しました。");
    } catch (error: any) {
      setLiveMessage(error?.message || "Web会議の参加申込に失敗しました。");
    } finally {
      setReplyBusy(false);
    }
  };

  const handleFacilityReservationSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const facility = facilities.find((item) => String(item.id) === String(facilityReservationDraft.facilityId));
    const applicantName = facilityReservationDraft.applicantName.trim() || displayName;
    const participantCount = Math.max(Number(facilityReservationDraft.participantCount || 0), 0);
    const startMinutes = timeToMinutes(facilityReservationDraft.startTime);
    const endMinutes = timeToMinutes(facilityReservationDraft.endTime);

    if (!facility) {
      setLiveMessage("予約する施設を選択してください。");
      return;
    }
    if (!facilityReservationDraft.reservationDate || !facilityReservationDraft.startTime || !facilityReservationDraft.endTime) {
      setLiveMessage("予約年月日と時間を入力してください。");
      return;
    }
    if (startMinutes !== null && endMinutes !== null && startMinutes >= endMinutes) {
      setLiveMessage("終了時間は開始時間より後にしてください。");
      return;
    }
    const availableStart = facilityAvailableStart(facility);
    const availableEnd = facilityAvailableEnd(facility);
    const availableStartMinutes = timeToMinutes(availableStart);
    const availableEndMinutes = timeToMinutes(availableEnd);
    if (
      startMinutes !== null &&
      endMinutes !== null &&
      availableStartMinutes !== null &&
      availableEndMinutes !== null &&
      (startMinutes < availableStartMinutes || endMinutes > availableEndMinutes)
    ) {
      setLiveMessage(`この施設の利用可能時間帯は ${availableStart}-${availableEnd} です。`);
      return;
    }
    if (participantCount <= 0) {
      setLiveMessage("利用人数を入力してください。");
      return;
    }

    const unavailableReason = getFacilityUnavailableReason(facility, facilityReservationDraft.reservationDate);
    if (unavailableReason) {
      setLiveMessage(unavailableReason);
      return;
    }
    if (hasApprovedFacilityReservationConflict(
      String(facility.id),
      facilityReservationDraft.reservationDate,
      facilityReservationDraft.startTime,
      facilityReservationDraft.endTime,
    )) {
      setLiveMessage("承認済みの予約と時間が重なるため、この時間帯は申込できません。");
      return;
    }

    setReplyBusy(true);
    setLiveMessage("");
    try {
      const saved = await insertResidentRowWithFallback("facility_reservations", {
        facility_id: facility.id,
        facility_name: facility.name || "施設",
        neighborhood_id: townId,
        roster_id: residentRosterId,
        user_auth_id: userId || null,
        applicant_name: applicantName,
        resident_name: applicantName,
        participant_count: participantCount,
        people_count: participantCount,
        reservation_date: facilityReservationDraft.reservationDate,
        start_time: facilityReservationDraft.startTime,
        end_time: facilityReservationDraft.endTime,
        status: "pending",
        created_at: new Date().toISOString(),
      }, "施設予約の申込を保存できませんでした。");
      setFacilityReservations((current) => [saved as FacilityReservation, ...current]);
      setFacilityReservationDraft((current) => ({ ...current, startTime: "", endTime: "" }));
      setLiveMessage("施設予約の申込を送信しました。役員の承認をお待ちください。");
    } catch (error: any) {
      setLiveMessage(error?.message || "施設予約の申込に失敗しました。");
    } finally {
      setReplyBusy(false);
    }
  };

  const handleWithdrawalRequest = async () => {
    setWithdrawalMessage("");
    if (!residentRosterId) {
      setWithdrawalMessage("会員名簿を確認中です。少し待ってからもう一度お試しください。");
      return;
    }

    const confirmed = window.confirm("退会申請を送信します。役員が承認すると、この町内会・自治会ではel-townを利用できなくなります。よろしいですか？");
    if (!confirmed) return;

    setWithdrawalBusy(true);
    try {
      let result = await supabase
        .from("resident_rosters")
        .update({
          withdrawal_status: "requested",
          withdrawal_reply_message: `${displayName}さんから退会申請が送信されました。`,
        })
        .eq("id", residentRosterId);

      if (result.error && String(result.error.message || "").includes("withdrawal_reply_message")) {
        result = await supabase
          .from("resident_rosters")
          .update({ withdrawal_status: "requested" })
          .eq("id", residentRosterId);
      }

      if (result.error) throw result.error;
      setWithdrawalMessage("退会申請を送信しました。役員の承認をお待ちください。");
    } catch (error: any) {
      setWithdrawalMessage(error?.message || "退会申請を送信できませんでした。");
    } finally {
      setWithdrawalBusy(false);
    }
  };

  const handleEventReply = async () => {
    if (!selectedCircular) return;
    const adults = Math.max(Number(replyDraft.adults || 0), 0);
    const children = Math.max(Number(replyDraft.children || 0), 0);
    if (adults + children <= 0) {
      setReplyMessage("参加人数を入力してください。");
      return;
    }

    setReplyBusy(true);
    setReplyMessage("");
    try {
      await insertReplyWithFallback({
        circular_id: selectedCircular.id,
        event_id: selectedCircular.id,
        neighborhood_id: townId,
        roster_id: residentRosterId,
        user_auth_id: userId || null,
        resident_name: displayName,
        reply_status: "attend",
        response_status: "attend",
        adult_count: adults,
        child_count: children,
        adults,
        children,
        applied_at: new Date().toISOString(),
      });
      setReplyMessage(`参加返信を送信しました。大人${adults}名、子供${children}名で受け付けました。`);
    } catch (error: any) {
      setReplyMessage(error?.message || "参加返信の送信に失敗しました。");
    } finally {
      setReplyBusy(false);
    }
  };

  const handleAssemblyReply = async () => {
    if (!selectedCircular) return;
    setReplyBusy(true);
    setReplyMessage("");
    try {
      const proxyFileUrl = replyDraft.assemblyStatus === "absent" && replyFile ? await uploadReplyFile(replyFile, selectedCircular.id) : null;
      const proxyEnabled = replyDraft.assemblyStatus === "absent" && replyDraft.proxyEnabled;
      await insertReplyWithFallback({
        circular_id: selectedCircular.id,
        event_id: selectedCircular.id,
        assembly_notice_id: selectedCircular.id,
        neighborhood_id: townId,
        roster_id: residentRosterId,
        user_auth_id: userId || null,
        resident_name: displayName,
        reply_status: replyDraft.assemblyStatus,
        response_status: replyDraft.assemblyStatus,
        proxy_text: proxyEnabled ? replyDraft.proxyText.trim() || defaultProxyText(selectedCircular.title) : null,
        proxy_signed_date: proxyEnabled ? replyDraft.proxyDate || todayKey() : null,
        proxy_signer_name: proxyEnabled ? replyDraft.proxySignerName.trim() || displayName : null,
        proxy_agent_name: proxyEnabled ? replyDraft.proxyAgentName.trim() || null : null,
        proxy_file_url: proxyFileUrl,
        proxy_url: proxyFileUrl,
        attachment_url: proxyFileUrl,
        applied_at: new Date().toISOString(),
      });
      setReplyMessage(replyDraft.assemblyStatus === "present" ? "総会の出席返信を送信しました。" : proxyEnabled ? "総会の欠席返信と委任状を送信しました。" : "総会の欠席返信を送信しました。");
    } catch (error: any) {
      setReplyMessage(error?.message || "総会返信の送信に失敗しました。");
    } finally {
      setReplyBusy(false);
    }
  };

  if (selectedCircular) {
    const isEvent = selectedCircular.category === "event";
    const isAssembly = selectedCircular.category === "assembly";
    const attachments = parseAttachmentList(selectedCircular);
    return (
      <div className="el-phone-screen">
        <header className="el-mobile-header compact">
          <button className="el-icon-button" onClick={() => setSelectedCircular(null)} aria-label="戻る">
            <i className="fas fa-arrow-left" />
          </button>
          <div>
            <p className="el-kicker">{categoryLabel(selectedCircular)}</p>
            <h1>{selectedCircular.title}</h1>
          </div>
        </header>
        <main className="el-scroll-area el-detail">
          <span className="el-pill">{formatDate(selectedCircular)}</span>
          {(isEvent || isAssembly) && selectedCircular.event_time && <span className="el-pill muted">{selectedCircular.event_time}</span>}
          <h2>{selectedCircular.title}</h2>
          <p className="el-meta"><i className="fas fa-user-circle" /> {authorName(selectedCircular)}</p>
          <article className="el-message-box">{bodyText(selectedCircular)}</article>
          {attachments.length > 0 && (
            <div className="el-attachments">
              {attachments.map((attachment, index) => {
                const type = attachment.type || "";
                const isImage = type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(attachment.url || "");
                const isExcel = /spreadsheet|excel/i.test(type) || /\.(xls|xlsx)$/i.test(attachment.name || attachment.url || "");
                const isWord = /word/i.test(type) || /\.(doc|docx)$/i.test(attachment.name || attachment.url || "");
                const icon = isExcel ? "fa-file-excel" : isWord ? "fa-file-word" : "fa-file-pdf";
                return (
                  <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" className={isImage ? "image" : ""}>
                    {isImage ? (
                      <img src={attachment.url} alt={attachment.name || "添付画像"} />
                    ) : (
                      <i className={`fas ${icon}`} />
                    )}
                    <span>{attachment.name || (isImage ? "画像を開く" : "添付を開く")}</span>
                  </a>
                );
              })}
            </div>
          )}
          {isEvent ? (
            <section className="el-reply-panel">
              <h3>参加返信</h3>
              <div className="el-reply-grid">
                <label>
                  <span>大人</span>
                  <input value={replyDraft.adults} onChange={(event) => setReplyDraft((current) => ({ ...current, adults: event.target.value }))} inputMode="numeric" />
                </label>
                <label>
                  <span>子供</span>
                  <input value={replyDraft.children} onChange={(event) => setReplyDraft((current) => ({ ...current, children: event.target.value }))} inputMode="numeric" />
                </label>
              </div>
              <button className="el-primary-action" onClick={handleEventReply} disabled={replyBusy}>
                <i className={`fas ${replyBusy ? "fa-spinner fa-spin" : "fa-calendar-check"}`} /> 参加人数を返信する
              </button>
            </section>
          ) : isAssembly ? (
            <section className="el-reply-panel">
              <h3>総会出欠返信</h3>
              <div className="el-segmented">
                <button type="button" className={replyDraft.assemblyStatus === "present" ? "active" : ""} onClick={() => setReplyDraft((current) => ({ ...current, assemblyStatus: "present" }))}>出席</button>
                <button type="button" className={replyDraft.assemblyStatus === "absent" ? "active" : ""} onClick={() => setReplyDraft((current) => ({ ...current, assemblyStatus: "absent" }))}>欠席</button>
              </div>
              {replyDraft.assemblyStatus === "absent" && (
                <div className="el-proxy-tools">
                  <label className="el-proxy-check">
                    <input
                      type="checkbox"
                      checked={replyDraft.proxyEnabled}
                      onChange={(event) => setReplyDraft((current) => ({ ...current, proxyEnabled: event.target.checked }))}
                    />
                    <span>委任状も返信する（任意）</span>
                  </label>
                  {replyDraft.proxyEnabled && (
                    <>
                      <div className="el-reply-grid">
                        <label>
                          <span>委任状日付</span>
                          <input type="date" value={replyDraft.proxyDate} onChange={(event) => setReplyDraft((current) => ({ ...current, proxyDate: event.target.value }))} />
                        </label>
                        <label>
                          <span>名前</span>
                          <input value={replyDraft.proxySignerName} onChange={(event) => setReplyDraft((current) => ({ ...current, proxySignerName: event.target.value }))} placeholder="氏名" />
                        </label>
                        <label>
                          <span>代理人（任意）</span>
                          <input value={replyDraft.proxyAgentName} onChange={(event) => setReplyDraft((current) => ({ ...current, proxyAgentName: event.target.value }))} placeholder="代理人名" />
                        </label>
                      </div>
                      <label>
                        <span>委任状本文</span>
                        <textarea value={replyDraft.proxyText} onChange={(event) => setReplyDraft((current) => ({ ...current, proxyText: event.target.value }))} />
                      </label>
                      <button type="button" className="el-secondary-action" onClick={openProxyPreview}>
                        委任状PDFを確認
                      </button>
                    </>
                  )}
                </div>
              )}
              <button className="el-primary-action" onClick={handleAssemblyReply} disabled={replyBusy}>
                <i className={`fas ${replyBusy ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> 出欠を返信する
              </button>
            </section>
          ) : (
            <button className="el-primary-action"><i className="fas fa-check" /> 確認しました</button>
          )}
          {replyMessage && <div className={`form-alert ${replyMessage.includes("送信しました") || replyMessage.includes("受け付け") ? "success" : ""}`}>{replyMessage}</div>}
        </main>
      </div>
    );
  }

  return (
    <div className="el-phone-screen">
      <header className="el-mobile-header">
        <div>
          <p className="el-kicker">{placeName}</p>
          <h1>{displayName}さん</h1>
        </div>
        <img src="/assets/logo_icon_stacked.png" alt="el-town" className="el-header-logo" />
      </header>

      <main className="el-scroll-area">
        {activeTab === "board" && (
          <section className="el-stack">
            <div className="el-board-title">
              <h2>{placeName} 回覧板</h2>
              <small>未読 {unreadCount} 件</small>
            </div>

            {boardFilter === "event" && boardViewMode === "calendar" ? (
              <div className="el-calendar">
                <div className="el-calendar-tools">
                  <button type="button" onClick={() => shiftCalendarMonth(-1)} aria-label="前月"><i className="fas fa-chevron-left" /></button>
                  <strong>{monthFormatter.format(calendarMonth)}</strong>
                  <button type="button" onClick={() => shiftCalendarMonth(1)} aria-label="翌月"><i className="fas fa-chevron-right" /></button>
                </div>
                <div className="el-calendar-weekdays">
                  {["日", "月", "火", "水", "木", "金", "土"].map((day) => <span key={day}>{day}</span>)}
                </div>
                <div className="el-calendar-grid">
                  {calendarDays.map((day) => (
                    <div key={day.key} className={day.inMonth ? "" : "muted"}>
                      <span>{day.date.getDate()}</span>
                      {day.events.slice(0, 2).map((item) => (
                        <button key={item.id} type="button" onClick={() => openCircular(item)}>
                          {item.event_time ? `${item.event_time} ` : ""}{item.title}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="el-board-feed">
                {boardItems.map((item) => {
                  const attachments = parseAttachmentList(item);
                  return (
                    <article key={item.id} className={`el-board-card ${item.category || "circular"}`}>
                      <div className="el-board-meta">
                        <span><i className={`fas ${categoryIcon(item)}`} /> {authorName(item)}</span>
                        <strong>{formatDate(item)}配信</strong>
                      </div>
                      <button type="button" onClick={() => openCircular(item)}>
                        <span className="el-board-tag">{categoryLabel(item)}</span>
                        <h3>{item.title} {attachments.length > 0 && <i className="fas fa-paperclip" />}</h3>
                        <p>{bodyText(item)}</p>
                        <em>詳細を確認する <i className="fas fa-chevron-right" /></em>
                      </button>
                    </article>
                  );
                })}
                {!loading && boardItems.length === 0 && <div className="el-empty">表示できる発信はまだありません。</div>}
              </div>
            )}
          </section>
        )}

        {activeTab === "live" && (
          <section className="el-stack">
            <div className="el-section-title">
              <h2>{activeLiveScreen === "facility" ? "施設予約" : "Live"}</h2>
              <span className="el-date">{monthFormatter.format(calendarMonth)}</span>
            </div>

            {liveViewMode === "calendar" && (
              <div className="el-calendar">
                <div className="el-calendar-tools">
                  <button type="button" onClick={() => shiftCalendarMonth(-1)} aria-label="前月"><i className="fas fa-chevron-left" /></button>
                  <strong>{monthFormatter.format(calendarMonth)}</strong>
                  <button type="button" onClick={() => shiftCalendarMonth(1)} aria-label="翌月"><i className="fas fa-chevron-right" /></button>
                </div>
                <div className="el-calendar-weekdays">
                  {["日", "月", "火", "水", "木", "金", "土"].map((day) => <span key={day}>{day}</span>)}
                </div>
                <div className="el-calendar-grid live">
                  {liveCalendarDays.map((day) => (
                    <div key={day.key} className={day.inMonth ? "" : "muted"}>
                      <span>{day.date.getDate()}</span>
                      {day.entries.slice(0, 3).map((entry) => (
                        <button key={entry.id} type="button" className={entry.kind} onClick={entry.onSelect}>
                          {entry.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {liveMessage && <div className={`form-alert ${liveMessage.includes("送信しました") ? "success" : ""}`}>{liveMessage}</div>}

            {activeLiveScreen === "live" && liveViewMode === "cards" && (
            <section className="el-reply-panel">
              <h3>Web会議開催案内</h3>
              <div className="el-list">
                {liveSessions.map((session) => {
                  const url = liveSessionUrl(session);
                  return (
                    <article key={session.id} className="el-live-card">
                      <div>
                        <span className="el-date">{liveSessionDateKey(session) || "日付未設定"}</span>
                        <strong>{session.title || "Web会議"}</strong>
                        <small>{liveProviderLabel(session.provider)} / {session.event_time || "時間未設定"}</small>
                        <p>{session.content || session.description || "内容はまだ登録されていません。"}</p>
                      </div>
                      {url && <a href={url} target="_blank" rel="noreferrer"><i className="fas fa-arrow-up-right-from-square" /> 開催URLを開く</a>}
                      <button type="button" className="el-secondary-action compact" onClick={() => setLiveReplyDraft((current) => ({ ...current, sessionId: String(session.id) }))}>
                        この会議を選択
                      </button>
                    </article>
                  );
                })}
                {!loading && liveSessions.length === 0 && <div className="el-empty">Web会議の案内はまだありません。</div>}
              </div>

              <form className="el-live-form" onSubmit={handleLiveReply}>
                <div className="el-reply-grid">
                  <label>
                    <span>参加するWeb会議</span>
                    <select value={liveReplyDraft.sessionId} onChange={(event) => setLiveReplyDraft((current) => ({ ...current, sessionId: event.target.value }))}>
                      <option value="">選択してください</option>
                      {liveSessions.map((session) => (
                        <option key={session.id} value={String(session.id)}>{session.title || "Web会議"}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>参加人数</span>
                    <input value={liveReplyDraft.participantCount} onChange={(event) => setLiveReplyDraft((current) => ({ ...current, participantCount: event.target.value }))} inputMode="numeric" />
                  </label>
                </div>
                <button className="el-primary-action" disabled={replyBusy || liveSessions.length === 0}>
                  <i className={`fas ${replyBusy ? "fa-spinner fa-spin" : "fa-video"}`} /> Web会議に申し込む
                </button>
              </form>
            </section>
            )}

            {activeLiveScreen === "facility" && liveViewMode === "cards" && (
            <section className="el-reply-panel">
              <h3>施設予約</h3>
              <div className="el-facility-list">
                {facilities.map((facility) => (
                  <button key={facility.id} type="button" className="el-facility-card" onClick={() => setFacilityReservationDraft((current) => ({ ...current, facilityId: String(facility.id) }))}>
                    <strong>{facility.name || "施設"}</strong>
                    <small>{facility.location || "場所未設定"} / {facility.capacity || facility.scale || "規模未設定"}</small>
                    <em>利用可能: {facilityAvailableLabel(facility)}</em>
                  </button>
                ))}
                {!loading && facilities.length === 0 && <div className="el-empty">予約できる施設はまだ登録されていません。</div>}
              </div>

              <form className="el-live-form" onSubmit={handleFacilityReservationSubmit}>
                <div className="el-reply-grid">
                  <label>
                    <span>施設</span>
                    <select value={facilityReservationDraft.facilityId} onChange={(event) => setFacilityReservationDraft((current) => ({ ...current, facilityId: event.target.value }))}>
                      <option value="">選択してください</option>
                      {facilities.map((facility) => (
                        <option key={facility.id} value={String(facility.id)}>{facility.name || "施設"}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>代表者</span>
                    <input value={facilityReservationDraft.applicantName} onChange={(event) => setFacilityReservationDraft((current) => ({ ...current, applicantName: event.target.value }))} />
                  </label>
                  <label>
                    <span>人数</span>
                    <input value={facilityReservationDraft.participantCount} onChange={(event) => setFacilityReservationDraft((current) => ({ ...current, participantCount: event.target.value }))} inputMode="numeric" />
                  </label>
                  <label>
                    <span>年月日</span>
                    <input type="date" value={facilityReservationDraft.reservationDate} onChange={(event) => setFacilityReservationDraft((current) => ({ ...current, reservationDate: event.target.value }))} />
                  </label>
                  <label>
                    <span>開始時間</span>
                    <input type="time" value={facilityReservationDraft.startTime} onChange={(event) => setFacilityReservationDraft((current) => ({ ...current, startTime: event.target.value }))} />
                  </label>
                  <label>
                    <span>終了時間</span>
                    <input type="time" value={facilityReservationDraft.endTime} onChange={(event) => setFacilityReservationDraft((current) => ({ ...current, endTime: event.target.value }))} />
                  </label>
                </div>
                {selectedFacility && (
                  <div className="el-live-note">
                    <strong>{selectedFacility.name || "施設"}</strong>
                    <span>利用可能時間: {facilityAvailableLabel(selectedFacility)}</span>
                    <span>利用不可曜日: {splitSettingList(selectedFacility.unavailable_weekdays).join("、") || "なし"}</span>
                    <span>利用不可日: {splitSettingList(selectedFacility.unavailable_dates).join("、") || "なし"}</span>
                  </div>
                )}
                {selectedFacilityApprovedReservations.length > 0 && (
                  <div className="el-reservation-slots">
                    <strong>承認済み予約</strong>
                    {selectedFacilityApprovedReservations.slice(0, 5).map((reservation) => (
                      <span key={reservation.id}>{dateKey(reservation.reservation_date)} {reservation.start_time || ""}{reservation.end_time ? `-${reservation.end_time}` : ""}</span>
                    ))}
                  </div>
                )}
                <button className="el-primary-action" disabled={replyBusy || facilities.length === 0}>
                  <i className={`fas ${replyBusy ? "fa-spinner fa-spin" : "fa-calendar-check"}`} /> 施設予約を申し込む
                </button>
              </form>
            </section>
            )}

            {activeLiveScreen === "live" && liveViewMode === "cards" && (
            <section className="el-reply-panel">
              <h3>総会通知</h3>
              <div className="el-list">
                {assemblyItems.map((item) => (
                  <button key={item.id} className="el-list-item assembly" onClick={() => openCircular(item)}>
                    <span className="el-date">{formatDate(item)}</span>
                    <strong>{item.title}</strong>
                    <small>{item.event_time ? `${item.event_time} / ${bodyText(item)}` : bodyText(item)}</small>
                  </button>
                ))}
                {!loading && assemblyItems.length === 0 && <div className="el-empty">総会通知はまだありません。</div>}
              </div>
            </section>
            )}
          </section>
        )}

        {activeTab === "payment" && (
          <section className="el-stack">
            {feeLoading ? (
              <div className="el-empty"><i className="fas fa-spinner fa-spin" /> 会費情報を確認中...</div>
            ) : latestFee ? (
              <div className="el-status-card accent">
                <p className="el-kicker">会費</p>
                <h2>{getFeeYear(latestFee)}年度</h2>
                <div className="el-fee-summary">
                  <span><small>請求額</small><strong>{yen(getFeeBillingAmount(latestFee))}</strong></span>
                  <span><small>入金額</small><strong>{yen(getFeePaidAmount(latestFee))}</strong></span>
                  <span><small>状態</small><strong>{getFeeStatusLabel(latestFee)}</strong></span>
                </div>
                <p>入金方法: {getPaymentMethodLabel(latestFee)}</p>
                {getFeePaidAmount(latestFee) < getFeeBillingAmount(latestFee) ? (
                  (latestFee.billing_channel === "stripe" || stripeAccountId) && stripeReady ? (
                    <button className="el-primary-action" onClick={() => handleOnlinePayment(latestFee)}>
                      <i className="fas fa-credit-card" /> オンラインで支払う
                    </button>
                  ) : latestFee.billing_channel === "stripe" || stripeAccountId ? (
                    <div className="el-empty">Stripe本番連携の確認中です。役員からの案内をお待ちください。</div>
                  ) : (
                    <div className="el-empty">役員からの集金案内をご確認ください。</div>
                  )
                ) : (
                  <Link
                    href={`/resident/receipt?name=${encodeURIComponent(displayName)}&amount=${getFeePaidAmount(latestFee)}&method=${encodeURIComponent(getPaymentMethodLabel(latestFee))}&town=${encodeURIComponent(placeName)}`}
                    className="el-secondary-action"
                  >
                    領収書を表示
                  </Link>
                )}
                {feeMessage && <div className="form-alert">{feeMessage}</div>}
              </div>
            ) : (
              <div className="el-status-card accent">
                <p className="el-kicker">会費</p>
                <h2>請求はありません</h2>
                <p>役員が会費請求を設定すると、ここに請求額と入金状況が表示されます。</p>
              </div>
            )}
          </section>
        )}

        {activeTab === "settings" && (
          <section className="el-stack">
            <div className="el-status-card">
              <p className="el-kicker">登録情報</p>
              <h2>{displayName}</h2>
              <p>{placeName} に連携済みです。</p>
            </div>

            <div className="el-status-card danger">
              <p className="el-kicker">退会申請</p>
              <h2>退会を申請する</h2>
              <p>申請後、役員が承認すると同じ町内会・自治会ではel-townを利用できなくなります。</p>
              <button type="button" className="el-danger-action" onClick={handleWithdrawalRequest} disabled={withdrawalBusy}>
                <i className={`fas ${withdrawalBusy ? "fa-spinner fa-spin" : "fa-right-from-bracket"}`} />
                退会申請を送信
              </button>
              {withdrawalMessage && <div className={`form-alert ${withdrawalMessage.includes("送信しました") ? "success" : ""}`}>{withdrawalMessage}</div>}
            </div>

            <div className="el-status-card">
              <p className="el-kicker">ナビゲーション</p>
              <h2>トップメニュー</h2>
              <p>役員画面や操作説明を開く場合はこちらから戻れます。</p>
              <Link href="/" className="el-secondary-action">トップへ戻る</Link>
            </div>
          </section>
        )}
      </main>

      <nav className={`el-bottom-nav ${bottomNavMode === "sub" ? "is-sub" : "is-main"}`} aria-label={bottomNavMode === "sub" ? "住民サブメニュー" : "住民メニュー"}>
        {bottomNavMode === "main" ? (
          tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => {
                setActiveTab(tab.id);
                setBottomNavMode("sub");
              }}
            >
              <i className={`fas ${tab.icon}`} />
              <span>{tab.label}</span>
            </button>
          ))
        ) : (
          <>
            <button type="button" className="is-menu" onClick={() => setBottomNavMode("main")}>
              <i className="fas fa-bars" />
              <span>メニュー</span>
            </button>

            {activeTab === "board" && (
              <>
                {[
                  ["all", "全て", "fa-layer-group"],
                  ["circular", "電子回覧板", "fa-clipboard-list"],
                  ["notice", "連絡", "fa-circle-info"],
                  ["event", "イベント", "fa-calendar-days"],
                ].map(([id, label, icon]) => (
                  <button key={id} type="button" className={boardFilter === id ? "active" : ""} onClick={() => setBoardFilter(id as BoardFilter)}>
                    <i className={`fas ${icon}`} />
                    <span>{label}</span>
                  </button>
                ))}
                {boardFilter === "event" && (
                  <>
                    <button type="button" className={boardViewMode === "cards" ? "active" : ""} onClick={() => setBoardViewMode("cards")}>
                      <i className="fas fa-list" />
                      <span>カード</span>
                    </button>
                    <button type="button" className={boardViewMode === "calendar" ? "active" : ""} onClick={() => setBoardViewMode("calendar")}>
                      <i className="fas fa-calendar-days" />
                      <span>カレンダー</span>
                    </button>
                  </>
                )}
              </>
            )}

            {activeTab === "payment" && (
              <button type="button" className="active">
                <i className="fas fa-yen-sign" />
                <span>会費</span>
              </button>
            )}

            {activeTab === "live" && (
              <>
                <button type="button" className={activeLiveScreen === "live" ? "active" : ""} onClick={() => setActiveLiveScreen("live")}>
                  <i className="fas fa-video" />
                  <span>Live</span>
                </button>
                <button type="button" className={activeLiveScreen === "facility" ? "active" : ""} onClick={() => setActiveLiveScreen("facility")}>
                  <i className="fas fa-building" />
                  <span>施設予約</span>
                </button>
                <button type="button" className={liveViewMode === "calendar" ? "active" : ""} onClick={() => setLiveViewMode("calendar")}>
                  <i className="fas fa-calendar-days" />
                  <span>カレンダー</span>
                </button>
                <button type="button" className={liveViewMode === "cards" ? "active" : ""} onClick={() => setLiveViewMode("cards")}>
                  <i className="fas fa-list" />
                  <span>カード</span>
                </button>
              </>
            )}

            {activeTab === "settings" && (
              <button type="button" className="active">
                <i className="fas fa-right-from-bracket" />
                <span>退会申請</span>
              </button>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
