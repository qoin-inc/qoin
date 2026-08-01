"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import HelpCenter from "@/components/HelpCenter";
import { supabase } from "@/lib/supabaseClient";

type ResidentViewProps = {
  townId?: number;
  townName?: string;
  residentName?: string;
  userId?: string;
  roster?: any;
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
  facility_bigint_id?: number | string | null;
  facility_name?: string | null;
  resident_roster_id?: number | string | null;
  user_auth_id?: string | null;
  applicant_name?: string | null;
  resident_name?: string | null;
  participant_count?: number | string | null;
  people_count?: number | string | null;
  reservation_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  usage_purpose?: string | null;
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
};

type LiveApplication = {
  id: number | string;
  live_session_id: number | string;
  resident_roster_id?: number | string | null;
  applicant_name?: string | null;
  participant_count?: number | string | null;
  status?: string | null;
};

type FacilityReservationDraft = {
  facilityId: string;
  applicantName: string;
  participantCount: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  usagePurpose: string;
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

const isImageAttachment = (attachment: any) => {
  const type = String(attachment?.type || "");
  const url = String(attachment?.url || "");
  return type.startsWith("image/") || /\.(png|jpe?g|gif|webp)(?:[?#]|$)/i.test(url);
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

const nthWeekdayOfMonth = (year: number, month: number, weekday: number, nth: number) => {
  const firstWeekday = new Date(year, month, 1).getDay();
  return 1 + ((7 + weekday - firstWeekday) % 7) + ((nth - 1) * 7);
};

const facilityReservationFacilityId = (reservation: FacilityReservation) => (
  reservation.facility_bigint_id ?? reservation.facility_id
);

const equinoxDay = (year: number, season: "spring" | "autumn") => {
  const base = season === "spring" ? 20.8431 : 23.2488;
  return Math.floor(base + (0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4));
};

const japaneseHolidayCache = new Map<number, Map<string, string>>();

const japaneseHolidaysForYear = (year: number) => {
  const cached = japaneseHolidayCache.get(year);
  if (cached) return cached;

  const holidays = new Map<string, string>();
  const add = (month: number, day: number, name: string) => {
    holidays.set(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, name);
  };

  add(1, 1, "元日");
  add(1, nthWeekdayOfMonth(year, 0, 1, 2), "成人の日");
  add(2, 11, "建国記念の日");
  add(2, 23, "天皇誕生日");
  add(3, equinoxDay(year, "spring"), "春分の日");
  add(4, 29, "昭和の日");
  add(5, 3, "憲法記念日");
  add(5, 4, "みどりの日");
  add(5, 5, "こどもの日");

  if (year === 2020) {
    add(7, 23, "海の日");
    add(7, 24, "スポーツの日");
    add(8, 10, "山の日");
  } else if (year === 2021) {
    add(7, 22, "海の日");
    add(7, 23, "スポーツの日");
    add(8, 8, "山の日");
  } else {
    add(7, nthWeekdayOfMonth(year, 6, 1, 3), "海の日");
    add(8, 11, "山の日");
    add(10, nthWeekdayOfMonth(year, 9, 1, 2), "スポーツの日");
  }

  add(9, nthWeekdayOfMonth(year, 8, 1, 3), "敬老の日");
  add(9, equinoxDay(year, "autumn"), "秋分の日");
  add(11, 3, "文化の日");
  add(11, 23, "勤労感謝の日");

  const originalHolidays = Array.from(holidays.entries());
  originalHolidays.forEach(([key, name]) => {
    const date = new Date(`${key}T00:00:00`);
    if (date.getDay() !== 0) return;
    const substitute = new Date(date);
    do {
      substitute.setDate(substitute.getDate() + 1);
    } while (holidays.has(dateKey(substitute.toISOString())));
    holidays.set(dateKey(substitute.toISOString()), `${name} 振替休日`);
  });

  for (let month = 0; month < 12; month += 1) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let day = 2; day < lastDay; day += 1) {
      const date = new Date(year, month, day);
      const key = dateKey(date.toISOString());
      if (date.getDay() === 0 || holidays.has(key)) continue;
      const previous = new Date(date);
      const next = new Date(date);
      previous.setDate(day - 1);
      next.setDate(day + 1);
      if (holidays.has(dateKey(previous.toISOString())) && holidays.has(dateKey(next.toISOString()))) {
        holidays.set(key, "国民の休日");
      }
    }
  }

  japaneseHolidayCache.set(year, holidays);
  return holidays;
};

const japaneseHolidayName = (date: Date) => japaneseHolidaysForYear(date.getFullYear()).get(dateKey(date.toISOString())) || "";

const calendarDayClassName = (date: Date, inMonth: boolean, hasEntries: boolean) => [
  !inMonth ? "muted" : "",
  date.getDay() === 0 ? "sunday" : "",
  date.getDay() === 6 ? "saturday" : "",
  japaneseHolidayName(date) ? "holiday" : "",
  hasEntries ? "has-entries" : "",
  dateKey(date.toISOString()) === todayKey() ? "today" : "",
].filter(Boolean).join(" ");

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

export default function ResidentView({ townId, townName, residentName, userId, roster, openTargetId, initialTab }: ResidentViewProps) {
  const [activeTab, setActiveTab] = useState<ResidentTab>(() => normalizeResidentTab(initialTab, openTargetId));
  const [bottomNavMode, setBottomNavMode] = useState<BottomNavMode>(() => (initialTab || openTargetId ? "sub" : "main"));
  const [bottomNavHidden, setBottomNavHidden] = useState(false);
  const [readCircularIds, setReadCircularIds] = useState<Set<string>>(() => new Set());
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [selectedLiveSession, setSelectedLiveSession] = useState<LiveSession | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityReservations, setFacilityReservations] = useState<FacilityReservation[]>([]);
  const [liveApplications, setLiveApplications] = useState<LiveApplication[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [feeSetting, setFeeSetting] = useState<any | null>(null);
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [stripeReady, setStripeReady] = useState(false);
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeMessage, setFeeMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);
  const [boardFilter, setBoardFilter] = useState<BoardFilter>("all");
  const [residentRosterId, setResidentRosterId] = useState<number | string | null>(null);
  const [replyDraft, setReplyDraft] = useState<ReplyDraft>(() => createReplyDraft(residentName || ""));
  const [currentEventReplyId, setCurrentEventReplyId] = useState<number | string | null>(null);
  const [currentAssemblyReplyId, setCurrentAssemblyReplyId] = useState<number | string | null>(null);
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [boardViewMode, setBoardViewMode] = useState<ViewMode>("cards");
  const [liveReplyDraft, setLiveReplyDraft] = useState<LiveReplyDraft>({ sessionId: "" });
  const [liveParticipantCounts, setLiveParticipantCounts] = useState<Record<string, string>>({});
  const [facilityReservationDraft, setFacilityReservationDraft] = useState<FacilityReservationDraft>({
    facilityId: "",
    applicantName: residentName || "",
    participantCount: "1",
    reservationDate: todayKey(),
    startTime: "",
    endTime: "",
    usagePurpose: "",
  });
  const [liveMessage, setLiveMessage] = useState("");
  const [liveLoadMessage, setLiveLoadMessage] = useState("");
  const [activeLiveScreen, setActiveLiveScreen] = useState<LiveScreen>("live");
  const [liveViewMode, setLiveViewMode] = useState<ViewMode>("calendar");
  const [selectedEventDate, setSelectedEventDate] = useState("");
  const [selectedLiveCalendarDate, setSelectedLiveCalendarDate] = useState("");
  const [selectedFacilityDate, setSelectedFacilityDate] = useState(todayKey());
  const [facilityListFilter, setFacilityListFilter] = useState("all");
  const [facilityBookingOpen, setFacilityBookingOpen] = useState(false);
  const [editingFacilityReservationId, setEditingFacilityReservationId] = useState<number | string | null>(null);
  const [withdrawalBusy, setWithdrawalBusy] = useState(false);
  const [withdrawalMessage, setWithdrawalMessage] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const boardFeedEndRef = useRef<HTMLDivElement | null>(null);
  const calendarSelectionRef = useRef<HTMLElement | null>(null);
  const readStorageKey = `eltown.circularReads.${townId || "town"}.${userId || residentName || "resident"}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(readStorageKey) || "[]");
      setReadCircularIds(new Set(Array.isArray(saved) ? saved.map(String) : []));
    } catch {
      setReadCircularIds(new Set());
    }
  }, [readStorageKey]);

  useEffect(() => {
    const fetchCirculars = async () => {
      if (!townId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const circularRequest = supabase
        .from("circulars")
        .select("*")
        .eq("neighborhood_id", townId)
        .order("created_at", { ascending: false })
        .limit(30);
      const targetRequest = openTargetId
        ? supabase.from("circulars").select("*").eq("neighborhood_id", townId).eq("id", openTargetId).maybeSingle()
        : Promise.resolve({ data: null, error: null });
      const [circularResult, targetResult] = await Promise.all([circularRequest, targetRequest]);

      if (!circularResult.error && circularResult.data) {
        const items = [...(circularResult.data as Circular[])].reverse();
        setCirculars(items);
        const target = targetResult.data as Circular | null;
        if (target) {
          setSelectedCircular(target);
          setReplyDraft(createReplyDraft(displayName, target));
        }
      }
      setLoading(false);

      let liveResult = await supabase
        .from("live_sessions")
        .select("*")
        .eq("neighborhood_id", townId)
        .order("event_date", { ascending: true })
        .limit(100);
      if (liveResult.error && /event_date|column|schema cache/i.test(String(liveResult.error.message || ""))) {
        liveResult = await supabase
          .from("live_sessions")
          .select("*")
          .eq("neighborhood_id", townId)
          .order("starts_at", { ascending: true })
          .limit(100);
      }
      if (liveResult.error && /starts_at|column|schema cache/i.test(String(liveResult.error.message || ""))) {
        liveResult = await supabase
          .from("live_sessions")
          .select("*")
          .eq("neighborhood_id", townId)
          .order("created_at", { ascending: true })
          .limit(100);
      }

      const [facilityResult, reservationResult] = await Promise.all([
        supabase
          .from("facilities")
          .select("*")
          .eq("neighborhood_id", townId)
          .limit(100),
        supabase
          .from("facility_reservations")
          .select("*")
          .eq("neighborhood_id", townId)
          .limit(300),
      ]);

      if (!liveResult.error && liveResult.data) {
        setLiveSessions(liveResult.data as LiveSession[]);
        setLiveLoadMessage("");
      } else {
        setLiveSessions([]);
        setLiveLoadMessage("LIVE予定を読み込めませんでした。時間をおいて再度開くか、役員へお知らせください。");
      }
      if (!facilityResult.error && facilityResult.data) setFacilities((facilityResult.data as Facility[]).filter((facility) => facility.is_active !== false));
      if (!reservationResult.error && reservationResult.data) setFacilityReservations(reservationResult.data as FacilityReservation[]);
    };

    fetchCirculars();
  }, [townId, openTargetId]);

  useEffect(() => {
    if (!loading && !openTargetId && activeTab === "board" && boardViewMode === "cards") {
      boardFeedEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [activeTab, boardFilter, boardViewMode, loading, openTargetId]);

  useEffect(() => {
    let active = true;
    const fetchFees = async (showLoading = true) => {
      if (!townId) {
        if (active) setFeeLoading(false);
        return;
      }

      if (showLoading) {
        setFeeLoading(true);
        setFeeMessage("");
      }

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
      const { data: feeSettingData } = await supabase
        .from("neighborhood_fee_settings")
        .select("*")
        .eq("neighborhood_id", townId)
        .maybeSingle();
      if (active) {
        setFeeSetting(feeSettingData || null);
        setStripeAccountId(townData?.stripe_account_id || "");
        setStripeReady(Boolean(
          townData?.stripe_account_id &&
          (townData?.stripe_onboarding_status === "active" || (townData?.stripe_charges_enabled === true && townData?.stripe_payouts_enabled === true)),
        ));
      }

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
      if (active) setResidentRosterId(rosterId);

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

      if (active) {
        setFeeRecords(records);
        setFeeLoading(false);
      }
    };

    fetchFees();
    const refreshFees = () => fetchFees(false);
    window.addEventListener("focus", refreshFees);
    const refreshTimers = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("payment") === "success"
      ? [1500, 4000, 8000].map((delay) => window.setTimeout(refreshFees, delay))
      : [];

    return () => {
      active = false;
      window.removeEventListener("focus", refreshFees);
      refreshTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [residentName, townId, userId]);

  useEffect(() => {
    if (!residentRosterId) {
      setLiveApplications([]);
      return;
    }
    const fetchMyLiveApplications = async () => {
      const { data, error } = await supabase
        .from("live_session_applications")
        .select("*")
        .eq("resident_roster_id", residentRosterId)
        .limit(200);
      if (error) return;
      const applications = (data || []) as LiveApplication[];
      setLiveApplications(applications);
      setLiveParticipantCounts((current) => {
        const next = { ...current };
        applications.forEach((application) => {
          next[String(application.live_session_id)] = String(application.participant_count || 1);
        });
        return next;
      });
    };
    fetchMyLiveApplications();
  }, [residentRosterId]);

  const boardCirculars = circulars.filter((item) => item.category !== "assembly");
  const eventItems = circulars.filter((item) => item.category === "event");
  const assemblyItems = circulars.filter((item) => item.category === "assembly");
  const boardItems = boardCirculars.filter((item) => {
    if (boardFilter === "all") return true;
    if (boardFilter === "notice") return item.category === "notice" || item.category === "info";
    return item.category === boardFilter;
  });
  const displayName = residentName || "会員";
  const placeName = townName || "町内会・自治会";
  const showViewModeSwitch = (activeTab === "board" && boardFilter === "event") || activeTab === "live";

  useEffect(() => {
    if (loading || activeTab !== "board" || boardViewMode !== "cards") return;
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-circular-id]"));
    if (!cards.length) return;

    const observer = new IntersectionObserver((entries) => {
      const visibleIds = entries
        .filter((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.65)
        .map((entry) => (entry.target as HTMLElement).dataset.circularId)
        .filter((id): id is string => Boolean(id));
      if (!visibleIds.length) return;

      setReadCircularIds((current) => {
        const next = new Set(current);
        visibleIds.forEach((id) => next.add(id));
        try {
          window.localStorage.setItem(readStorageKey, JSON.stringify(Array.from(next)));
        } catch {
          // Continue with in-memory read status when storage is unavailable.
        }
        return next;
      });
      visibleIds.forEach((id) => {
        const card = document.querySelector<HTMLElement>(`[data-circular-id="${id}"]`);
        if (card) observer.unobserve(card);
      });
    }, { threshold: 0.65 });

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [activeTab, boardFilter, boardItems.length, boardViewMode, loading, readStorageKey]);

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
        holidayName: japaneseHolidayName(date),
        events: eventItems.filter((item) => dateKey(item.event_date || item.published_at || item.created_at) === key),
      };
    });
  }, [calendarMonth, eventItems]);
  const selectedEventDay = calendarDays.find((day) => day.key === selectedEventDate);

  const formatDate = (item: Circular) => {
    const raw = item.event_date || item.published_at || item.created_at;
    if (!raw) return "日付未設定";
    return dateFormatter.format(new Date(raw));
  };

  const formatPublishedDate = (item: Circular) => {
    const raw = item.published_at || item.created_at;
    if (!raw) return "日付未設定";
    return dateFormatter.format(new Date(raw));
  };

  const eventSchedule = (item: Circular) => {
    if (!item.event_date) return "開催日未設定";
    const date = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(item.event_date));
    return `${date}${item.event_time ? ` ${item.event_time}` : ""}`;
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
    (reservation) => (
      String(facilityReservationFacilityId(reservation)) === String(facilityReservationDraft.facilityId)
      && dateKey(reservation.reservation_date) === facilityReservationDraft.reservationDate
    ),
  );
  const selectedDateFacilityReservations = facilityReservations.filter(
    (reservation) => dateKey(reservation.reservation_date) === selectedFacilityDate,
  );
  const filteredFacilityReservations = facilityReservations.filter((reservation) => (
    facilityListFilter === "all" || String(facilityReservationFacilityId(reservation)) === facilityListFilter
  ));
  const isOwnFacilityReservation = (reservation: FacilityReservation) => (
    (residentRosterId !== null && String(reservation.resident_roster_id || "") === String(residentRosterId))
    || (Boolean(userId) && String(reservation.user_auth_id || "") === String(userId))
  );
  const liveApplicationBySessionId = new Map(liveApplications.map((application) => [String(application.live_session_id), application]));
  const openCircular = (item: Circular) => {
    setSelectedCircular(item);
    setReplyDraft(createReplyDraft(displayName, item));
    setReplyMessage("");
  };
  const openLiveSession = (session: LiveSession) => {
    setLiveReplyDraft((current) => ({ ...current, sessionId: String(session.id) }));
    setLiveMessage("");
    setSelectedLiveSession(session);
  };
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
          onSelect: () => openLiveSession(session),
        })) : [];
      const assemblyEntries: LiveCalendarEntry[] = activeLiveScreen === "live" ? assemblyItems
        .filter((item) => dateKey(item.event_date || item.published_at || item.created_at) === key)
        .map((item) => ({
          id: `assembly-${item.id}`,
          kind: "live",
          label: `${item.event_time ? `${item.event_time} ` : ""}総会 ${item.title}`,
          onSelect: () => openCircular(item),
        })) : [];
      const facilityEntries: LiveCalendarEntry[] = activeLiveScreen === "facility" ? facilityReservations
        .filter((reservation) => dateKey(reservation.reservation_date) === key)
        .map((reservation) => ({
          id: `facility-${reservation.id}`,
          kind: "facility",
          label: `${reservation.start_time || ""}${reservation.end_time ? `-${reservation.end_time}` : ""} ${reservation.facility_name || facilityNameById(facilityReservationFacilityId(reservation))}`,
          onSelect: () => {
            setSelectedFacilityDate(key);
            setFacilityReservationDraft((current) => ({
              ...current,
              facilityId: String(facilityReservationFacilityId(reservation) || ""),
              reservationDate: key,
            }));
          },
        })) : [];
      return {
        key,
        date,
        inMonth: date.getMonth() === calendarMonth.getMonth(),
        holidayName: japaneseHolidayName(date),
        entries: [...liveEntries, ...assemblyEntries, ...facilityEntries],
      };
    });
  }, [activeLiveScreen, assemblyItems, calendarMonth, facilities, facilityReservations, liveSessions]);
  const selectedLiveCalendarDay = liveCalendarDays.find((day) => day.key === selectedLiveCalendarDate);

  useEffect(() => {
    if (!selectedEventDate && !selectedLiveCalendarDate) return;
    calendarSelectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedEventDate, selectedLiveCalendarDate]);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("会員ログインを確認できません。もう一度ログインしてください。");
      const response = await fetch("/api/fees/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          feeRecordId: fee.id,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "決済画面を作成できませんでした。");
      window.location.href = data.url;
    } catch (error: any) {
      setFeeMessage(error?.message || "オンライン支払いを開始できませんでした。");
    }
  };

  const toggleBottomNav = () => {
    setBottomNavHidden((current) => !current);
    if (activeTab !== "board" || boardViewMode !== "cards") return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        boardFeedEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
      });
    });
  };

  const shiftCalendarMonth = (amount: number) => {
    setSelectedEventDate("");
    setSelectedLiveCalendarDate("");
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
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

      const errorMessage = String(result.error.message || "");
      const rosterId = nextPayload.roster_id;
      if (
        rosterId != null &&
        /invalid input syntax for type bigint/i.test(errorMessage) &&
        errorMessage.includes(String(rosterId))
      ) {
        delete nextPayload.roster_id;
        continue;
      }

      throw result.error;
    }

    throw new Error("返信を保存できませんでした。");
  };

  const findCurrentEventReply = async (circularId: number | string) => {
    if (!residentRosterId && !userId) return null;
    let query = supabase
      .from("event_applications")
      .select("*")
      .eq("circular_id", circularId)
      .eq("reply_status", "attend")
      .order("updated_at", { ascending: false })
      .order("applied_at", { ascending: false })
      .limit(1);

    if (residentRosterId && userId) {
      query = query.or(`roster_id.eq.${residentRosterId},user_auth_id.eq.${userId}`);
    } else if (residentRosterId) {
      query = query.eq("roster_id", String(residentRosterId));
    } else {
      query = query.eq("user_auth_id", userId as string);
    }

    const result = await query.maybeSingle();
    if (result.error) throw result.error;
    return result.data;
  };

  useEffect(() => {
    if (!selectedCircular || selectedCircular.category !== "event" || (!residentRosterId && !userId)) {
      setCurrentEventReplyId(null);
      return;
    }

    let active = true;
    findCurrentEventReply(selectedCircular.id)
      .then((reply) => {
        if (!active) return;
        if (!reply) {
          setCurrentEventReplyId(null);
          return;
        }
        setCurrentEventReplyId(reply.id);
        setReplyDraft((current) => ({
          ...current,
          adults: String(reply.adult_count ?? reply.adults ?? 0),
          children: String(reply.child_count ?? reply.children ?? 0),
        }));
        setReplyMessage("参加申込済みです。人数を変更して更新できます。");
      })
      .catch((error: any) => {
        if (active) setReplyMessage(error?.message || "参加申込の確認に失敗しました。");
      });

    return () => { active = false; };
  }, [selectedCircular?.id, selectedCircular?.category, residentRosterId, userId]);

  useEffect(() => {
    if (!selectedCircular || selectedCircular.category !== "assembly" || (!residentRosterId && !userId)) {
      setCurrentAssemblyReplyId(null);
      return;
    }

    let active = true;
    let query = supabase
      .from("event_applications")
      .select("*")
      .eq("circular_id", selectedCircular.id)
      .in("reply_status", ["present", "absent"])
      .order("updated_at", { ascending: false })
      .order("applied_at", { ascending: false })
      .limit(1);
    if (residentRosterId && userId) query = query.or(`roster_id.eq.${residentRosterId},user_auth_id.eq.${userId}`);
    else if (residentRosterId) query = query.eq("roster_id", String(residentRosterId));
    else query = query.eq("user_auth_id", userId as string);

    const loadAssemblyReply = async () => {
      try {
        const { data, error } = await query.maybeSingle();
        if (!active) return;
        if (error) throw error;
        if (!data) {
          setCurrentAssemblyReplyId(null);
          return;
        }
        setCurrentAssemblyReplyId(data.id);
        setReplyDraft((current) => ({
          ...current,
          assemblyStatus: data.reply_status === "absent" ? "absent" : "present",
          proxyEnabled: Boolean(data.proxy_signed_date || data.proxy_signer_name || data.proxy_agent_name),
          proxyDate: data.proxy_signed_date || todayKey(),
          proxySignerName: data.proxy_signer_name || displayName,
          proxyAgentName: data.proxy_agent_name || "",
        }));
        setReplyMessage("総会出欠は返信済みです。内容を変更して更新できます。");
      } catch (error: any) {
        if (active) setReplyMessage(error?.message || "総会返信の確認に失敗しました。");
      }
    };
    void loadAssemblyReply();

    return () => { active = false; };
  }, [selectedCircular?.id, selectedCircular?.category, residentRosterId, userId, displayName]);

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

  const hasActiveFacilityReservationConflict = (facilityId: string, reservationDate: string, startTime: string, endTime: string, excludedReservationId?: number | string | null) => {
    return facilityReservations.some((reservation) => (
      String(reservation.id) !== String(excludedReservationId || "") &&
      ["pending", "approved"].includes(String(reservation.status || "pending")) &&
      String(facilityReservationFacilityId(reservation)) === String(facilityId) &&
      dateKey(reservation.reservation_date) === dateKey(reservationDate) &&
      timeRangesOverlap(startTime, endTime, reservation.start_time, reservation.end_time)
    ));
  };

  const startFacilityReservationEdit = (reservation: FacilityReservation) => {
    if (!isOwnFacilityReservation(reservation)) return;
    const reservationDate = dateKey(reservation.reservation_date) || todayKey();
    setEditingFacilityReservationId(reservation.id);
    setFacilityReservationDraft({
      facilityId: String(facilityReservationFacilityId(reservation) || ""),
      applicantName: reservation.applicant_name || reservation.resident_name || displayName,
      participantCount: String(reservation.participant_count || reservation.people_count || 1),
      reservationDate,
      startTime: String(reservation.start_time || "").slice(0, 5),
      endTime: String(reservation.end_time || "").slice(0, 5),
      usagePurpose: reservation.usage_purpose || "",
    });
    setSelectedFacilityDate(reservationDate);
    setFacilityBookingOpen(true);
    setLiveMessage("修正内容を入力してください。保存すると承認状態は予約中へ戻ります。");
    window.requestAnimationFrame(() => document.getElementById("facility-booking-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const cancelFacilityReservationEdit = () => {
    setEditingFacilityReservationId(null);
    setFacilityBookingOpen(false);
    setFacilityReservationDraft((current) => ({ ...current, startTime: "", endTime: "", usagePurpose: "" }));
    setLiveMessage("");
  };

  const handleFacilityReservationDelete = async (reservation: FacilityReservation) => {
    if (!isOwnFacilityReservation(reservation)) return;
    if (!window.confirm(`${reservation.facility_name || facilityNameById(facilityReservationFacilityId(reservation))}の予約を削除します。よろしいですか？`)) return;
    setReplyBusy(true);
    setLiveMessage("");
    try {
      const { error } = await supabase.rpc("delete_own_facility_reservation", { p_reservation_id: reservation.id });
      if (error) throw error;
      setFacilityReservations((current) => current.filter((item) => String(item.id) !== String(reservation.id)));
      if (String(editingFacilityReservationId || "") === String(reservation.id)) cancelFacilityReservationEdit();
      setLiveMessage("施設予約を削除しました。");
    } catch (error: any) {
      setLiveMessage(error?.message || "施設予約を削除できませんでした。");
    } finally {
      setReplyBusy(false);
    }
  };

  const handleLiveReply = async (event: React.FormEvent, selectedSession?: LiveSession) => {
    event.preventDefault();
    const sessionId = String(selectedSession?.id ?? liveReplyDraft.sessionId ?? "");
    const session = selectedSession || liveSessions.find((item) => String(item.id) === sessionId);
    const participantCount = Math.max(Number(liveParticipantCounts[sessionId] ?? 1), 0);
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
      const rpcResult = await supabase.rpc("create_live_session_application", {
        p_live_session_id: session.id,
        p_participant_count: participantCount,
        p_applicant_name: displayName,
      });
      if (rpcResult.error) throw rpcResult.error;
      const savedApplication = rpcResult.data as LiveApplication;
      setLiveApplications((current) => {
        const withoutCurrent = current.filter((application) => String(application.live_session_id) !== String(session.id));
        return [{ ...savedApplication, live_session_id: session.id, participant_count: participantCount }, ...withoutCurrent];
      });
      setLiveReplyDraft((current) => ({ ...current, sessionId: String(session.id) }));
      setLiveParticipantCounts((current) => ({ ...current, [String(session.id)]: String(participantCount) }));
      setLiveMessage("Web会議の参加申込を保存しました。再申込時は参加人数を更新します。");
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
    const usagePurpose = facilityReservationDraft.usagePurpose.trim();
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
    if (!usagePurpose) {
      setLiveMessage("使用用途を入力してください。");
      return;
    }

    const unavailableReason = getFacilityUnavailableReason(facility, facilityReservationDraft.reservationDate);
    if (unavailableReason) {
      setLiveMessage(unavailableReason);
      return;
    }
    if (hasActiveFacilityReservationConflict(
      String(facility.id),
      facilityReservationDraft.reservationDate,
      facilityReservationDraft.startTime,
      facilityReservationDraft.endTime,
      editingFacilityReservationId,
    )) {
      setLiveMessage("既に予約されている時間帯と重なるため、この時間帯は申込できません。");
      return;
    }

    setReplyBusy(true);
    setLiveMessage("");
    try {
      const reservationPayload = {
        facility_bigint_id: facility.id,
        facility_name: facility.name || "施設",
        title: facility.name || "施設",
        neighborhood_id: townId,
        resident_roster_id: residentRosterId,
        user_auth_id: userId || null,
        applicant_name: applicantName,
        resident_name: applicantName,
        participant_count: participantCount,
        people_count: participantCount,
        num_people: participantCount,
        reservation_date: facilityReservationDraft.reservationDate,
        start_time: facilityReservationDraft.startTime,
        end_time: facilityReservationDraft.endTime,
        usage_purpose: usagePurpose,
        status: "pending",
        created_at: new Date().toISOString(),
      };
      const rpcResult = editingFacilityReservationId
        ? await supabase.rpc("update_own_facility_reservation", {
            p_reservation_id: editingFacilityReservationId,
            p_facility_id: facility.id,
            p_reservation_date: facilityReservationDraft.reservationDate,
            p_start_time: facilityReservationDraft.startTime,
            p_end_time: facilityReservationDraft.endTime,
            p_participant_count: participantCount,
            p_applicant_name: applicantName,
            p_usage_purpose: usagePurpose,
          })
        : await supabase.rpc("create_facility_reservation", {
            p_facility_id: facility.id,
            p_reservation_date: facilityReservationDraft.reservationDate,
            p_start_time: facilityReservationDraft.startTime,
            p_end_time: facilityReservationDraft.endTime,
            p_participant_count: participantCount,
            p_applicant_name: applicantName,
            p_usage_purpose: usagePurpose,
          });
      const rpcUnavailable = !editingFacilityReservationId && (
        rpcResult.error?.code === "PGRST202"
        || /create_facility_reservation|schema cache|function/i.test(String(rpcResult.error?.message || ""))
      );
      if (rpcResult.error && !rpcUnavailable) throw rpcResult.error;
      const saved = rpcResult.error
        ? await insertResidentRowWithFallback("facility_reservations", reservationPayload, "施設予約の申込を保存できませんでした。")
        : { ...reservationPayload, ...(rpcResult.data || {}) };
      setFacilityReservations((current) => editingFacilityReservationId
        ? current.map((item) => String(item.id) === String(editingFacilityReservationId) ? saved as FacilityReservation : item)
        : [saved as FacilityReservation, ...current]);
      setSelectedFacilityDate(facilityReservationDraft.reservationDate);
      setFacilityReservationDraft((current) => ({ ...current, startTime: "", endTime: "", usagePurpose: "" }));
      setFacilityBookingOpen(false);
      setLiveMessage(editingFacilityReservationId
        ? "施設予約を修正しました。承認状態は予約中に戻りました。"
        : "施設予約の申込を送信しました。役員の承認をお待ちください。");
      setEditingFacilityReservationId(null);
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

    const familySlot = roster?.family_user_auth_id_1 === userId ? 1 : roster?.family_user_auth_id_2 === userId ? 2 : 0;
    const confirmed = window.confirm(`${familySlot ? "家族本人のみの" : "世帯全体の"}退会申請を送信します。役員の承認後はこの町内会・自治会でel-townを利用できなくなります。よろしいですか？`);
    if (!confirmed) return;

    setWithdrawalBusy(true);
    try {
      const statusColumn = familySlot ? `family_withdrawal_status_${familySlot}` : "withdrawal_status";
      let result = await supabase
        .from("resident_rosters")
        .update({
          [statusColumn]: "requested",
          withdrawal_reply_message: `${displayName}さんから退会申請が送信されました。`,
        })
        .eq("id", residentRosterId);

      if (result.error && String(result.error.message || "").includes("withdrawal_reply_message")) {
        result = await supabase
          .from("resident_rosters")
          .update({ [statusColumn]: "requested" })
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
      const payload = {
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
        updated_at: new Date().toISOString(),
      };
      const existingReply = currentEventReplyId
        ? { id: currentEventReplyId }
        : await findCurrentEventReply(selectedCircular.id);

      if (existingReply?.id) {
        const { data, error } = await supabase
          .from("event_applications")
          .update(payload)
          .eq("id", existingReply.id)
          .select("id")
          .single();
        if (error) throw error;
        setCurrentEventReplyId(data.id);
        setReplyMessage(`参加人数を更新しました。大人${adults}名、子供${children}名です。`);
      } else {
        const saved = await insertReplyWithFallback(payload);
        setCurrentEventReplyId(saved.id);
        setReplyMessage(`参加申込を保存しました。大人${adults}名、子供${children}名です。`);
      }
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
      const proxyEnabled = replyDraft.assemblyStatus === "absent" && replyDraft.proxyEnabled;
      const payload = {
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
        proxy_file_url: null,
        proxy_url: null,
        attachment_url: null,
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (currentAssemblyReplyId) {
        const { data, error } = await supabase
          .from("event_applications")
          .update(payload)
          .eq("id", currentAssemblyReplyId)
          .select("id")
          .single();
        if (error) throw error;
        setCurrentAssemblyReplyId(data.id);
        setReplyMessage("総会の返信内容を変更しました。");
      } else {
        const saved = await insertReplyWithFallback(payload);
        setCurrentAssemblyReplyId(saved.id);
        setReplyMessage("総会の返信を保存しました。");
      }
    } catch (error: any) {
      setReplyMessage(error?.message || "総会返信の送信に失敗しました。");
    } finally {
      setReplyBusy(false);
    }
  };

  if (selectedLiveSession) {
    const sessionId = String(selectedLiveSession.id);
    const url = liveSessionUrl(selectedLiveSession);
    const application = liveApplicationBySessionId.get(sessionId);
    return (
      <div className="el-phone-screen">
        <header className="el-mobile-header compact">
          <button className="el-icon-button" onClick={() => setSelectedLiveSession(null)} aria-label="戻る">
            <i className="fas fa-arrow-left" />
          </button>
          <div>
            <p className="el-kicker">Live</p>
            <h1>{selectedLiveSession.title || "Web会議"}</h1>
          </div>
        </header>
        <main className="el-scroll-area el-detail">
          <span className="el-pill">{liveProviderLabel(selectedLiveSession.provider)}</span>
          <div className="el-event-schedule">
            <i className="fas fa-calendar-alt" />
            <strong>開催日時</strong>
            <span>{liveSessionDateKey(selectedLiveSession) || "日付未設定"}{selectedLiveSession.event_time ? ` ${selectedLiveSession.event_time}` : ""}</span>
          </div>
          <h2>{selectedLiveSession.title || "Web会議"}</h2>
          <article className="el-message-box">{selectedLiveSession.content || selectedLiveSession.description || "内容はまだ登録されていません。"}</article>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="el-secondary-action">
              <i className="fas fa-arrow-up-right-from-square" /> 開催URLを開く
            </a>
          )}
          <div className={`el-live-application-status ${application ? "applied" : "not-applied"}`}>
            <i className={`fas ${application ? "fa-circle-check" : "fa-circle"}`} />
            {application ? `申込済み・${application.participant_count || 1}名` : "未申込"}
          </div>
          <form className="el-reply-panel" onSubmit={(event) => handleLiveReply(event, selectedLiveSession)}>
            <h3>参加申込</h3>
            <label>
              <span>参加人数</span>
              <input
                value={liveParticipantCounts[sessionId] ?? "1"}
                onChange={(event) => setLiveParticipantCounts((current) => ({ ...current, [sessionId]: event.target.value }))}
                inputMode="numeric"
                min="1"
                type="number"
                aria-label={`${selectedLiveSession.title || "Web会議"}の参加人数`}
              />
            </label>
            <button type="submit" className="el-primary-action" disabled={replyBusy}>
              <i className={`fas ${replyBusy ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} /> 参加申込を保存
            </button>
          </form>
          {liveMessage && <div className={`form-alert ${liveMessage.includes("保存しました") ? "success" : ""}`}>{liveMessage}</div>}
        </main>
      </div>
    );
  }

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
          <span className="el-pill">配信日 {formatPublishedDate(selectedCircular)}</span>
          {(isEvent || isAssembly) && <div className="el-event-schedule"><i className="fas fa-calendar-alt" /> <strong>開催日時</strong><span>{eventSchedule(selectedCircular)}</span></div>}
          <h2>{selectedCircular.title}</h2>
          <p className="el-meta"><i className="fas fa-user-circle" /> {authorName(selectedCircular)}</p>
          <article className="el-message-box">{bodyText(selectedCircular)}</article>
          {attachments.length > 0 && (
            <div className="el-attachments">
              {attachments.map((attachment, index) => {
                const type = attachment.type || "";
                const isImage = type.startsWith("image/") || /\.(png|jpe?g|gif|webp)(?:$|\?)/i.test(attachment.name || attachment.url || "");
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
                    {!isImage && <span>{attachment.name || "添付を開く"}</span>}
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
                <i className={`fas ${replyBusy ? "fa-spinner fa-spin" : "fa-calendar-check"}`} /> {currentEventReplyId ? "参加人数を変更する" : "参加申込を保存する"}
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
                    </>
                  )}
                </div>
              )}
              <button className="el-primary-action" onClick={handleAssemblyReply} disabled={replyBusy}>
                <i className={`fas ${replyBusy ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /> {currentAssemblyReplyId ? "出欠・委任内容を変更する" : "出欠を保存する"}
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
      <main className={`el-scroll-area ${showViewModeSwitch ? "has-view-switch" : ""}`}>
        {activeTab === "board" && (
          <section className="el-stack">
            <div className="el-board-title">
              <h2>{placeName} 回覧板</h2>
            </div>

            {boardFilter === "event" && boardViewMode === "calendar" ? (
              <div className="el-calendar">
                <div className="el-calendar-tools">
                  <button type="button" onClick={() => shiftCalendarMonth(-1)} aria-label="前月"><i className="fas fa-chevron-left" /></button>
                  <strong>{monthFormatter.format(calendarMonth)}</strong>
                  <button type="button" onClick={() => shiftCalendarMonth(1)} aria-label="翌月"><i className="fas fa-chevron-right" /></button>
                </div>
                <div className="el-calendar-weekdays">
                  {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => <span key={day} className={index === 0 ? "sunday" : index === 6 ? "saturday" : ""}>{day}</span>)}
                </div>
                <div className="el-calendar-grid">
                  {calendarDays.map((day) => (
                    <div
                      key={day.key}
                      className={`${calendarDayClassName(day.date, day.inMonth, day.events.length > 0)} ${day.events.length > 0 ? "is-tappable" : ""} ${selectedEventDate === day.key ? "selected" : ""}`.trim()}
                      title={day.holidayName || undefined}
                    >
                      {day.events.length > 0 ? (
                        <button className="el-calendar-day-button" type="button" aria-label={`${day.date.getDate()}日の予定${day.events.length}件を表示`} onClick={() => setSelectedEventDate(day.key)}>
                          <span className="el-calendar-date-row">
                            <span className="el-calendar-date-number">{day.date.getDate()}</span>
                            <span className="el-calendar-count" aria-label={`${day.events.length}件の予定`}>{day.events.length}</span>
                          </span>
                          <span className="el-calendar-event-label">
                            {day.events[0].event_time ? `${day.events[0].event_time} ` : ""}{day.events[0].title}
                          </span>
                          {day.events.length > 1 && <span className="el-calendar-more">ほか{day.events.length - 1}件</span>}
                        </button>
                      ) : (
                        <div className="el-calendar-date-row">
                          <span className="el-calendar-date-number">{day.date.getDate()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {selectedEventDay && selectedEventDay.events.length > 0 && (
                  <section ref={calendarSelectionRef} className="el-calendar-selection" aria-live="polite">
                    <div className="el-calendar-selection-heading">
                      <strong>{selectedEventDay.key} の予定</strong>
                      <span>{selectedEventDay.events.length}件</span>
                    </div>
                    <div className="el-list">
                      {selectedEventDay.events.map((item) => (
                        <button key={item.id} type="button" className="el-list-item event" onClick={() => openCircular(item)}>
                          <span className="el-date">{item.event_time || "時間未設定"}</span>
                          <strong>{item.title}</strong>
                          <small>{bodyText(item)}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="el-board-feed">
                {boardItems.map((item) => {
                  const attachments = parseAttachmentList(item);
                  const previewImage = attachments.find(isImageAttachment);
                  const isRead = item.is_read || readCircularIds.has(String(item.id));
                  return (
                    <article key={item.id} data-circular-id={String(item.id)} className={`el-board-card ${item.category || "circular"}`}>
                      <div className="el-board-meta">
                        <span><i className={`fas ${categoryIcon(item)}`} /> {authorName(item)}</span>
                        <span className="el-board-meta-right">
                          <strong>{formatPublishedDate(item)}配信</strong>
                          <span className={`el-read-status ${isRead ? "read" : "unread"}`}>{isRead ? "既読" : "未読"}</span>
                        </span>
                      </div>
                      <button type="button" onClick={() => openCircular(item)}>
                        <h3>{item.title} {attachments.length > 0 && <i className="fas fa-paperclip" />}</h3>
                        {item.category === "event" && <div className="el-card-event-date"><i className="fas fa-calendar-alt" /> 開催日時：{eventSchedule(item)}</div>}
                        <p>{bodyText(item)}</p>
                        {previewImage && <img className="el-board-thumb" src={previewImage.url} alt={previewImage.name || item.title || "添付画像"} />}
                        <em>詳細を確認する <i className="fas fa-chevron-right" /></em>
                      </button>
                    </article>
                  );
                })}
                {!loading && boardItems.length === 0 && <div className="el-empty">表示できる発信はまだありません。</div>}
                <div ref={boardFeedEndRef} aria-hidden="true" />
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
                  {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => <span key={day} className={index === 0 ? "sunday" : index === 6 ? "saturday" : ""}>{day}</span>)}
                </div>
                <div className="el-calendar-grid live">
                  {liveCalendarDays.map((day) => (
                    <div key={day.key} className={`${calendarDayClassName(day.date, day.inMonth, day.entries.length > 0)} ${activeLiveScreen === "facility" && selectedFacilityDate === day.key ? "selected" : ""} ${activeLiveScreen === "live" && selectedLiveCalendarDate === day.key ? "selected" : ""} ${activeLiveScreen === "live" && day.entries.length > 0 ? "is-tappable" : ""}`.trim()} title={day.holidayName || undefined}>
                      {activeLiveScreen === "live" && day.entries.length > 0 ? (
                        <button className="el-calendar-day-button live" type="button" aria-label={`${day.date.getDate()}日の予定${day.entries.length}件を表示`} onClick={() => setSelectedLiveCalendarDate(day.key)}>
                          <span className="el-calendar-date-row">
                            <span className="el-calendar-date-number">{day.date.getDate()}</span>
                            <span className="el-calendar-count" aria-label={`${day.entries.length}件の予定`}>{day.entries.length}</span>
                          </span>
                          <span className="el-calendar-event-label">{day.entries[0].label}</span>
                          {day.entries.length > 1 && <span className="el-calendar-more">ほか{day.entries.length - 1}件</span>}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="el-calendar-date-row el-calendar-date-select"
                            onClick={() => {
                              if (activeLiveScreen !== "facility") return;
                              setSelectedFacilityDate(day.key);
                              setFacilityReservationDraft((current) => ({ ...current, reservationDate: day.key }));
                            }}
                            disabled={activeLiveScreen !== "facility"}
                            aria-label={activeLiveScreen === "facility" ? `${day.key}の予約を表示` : undefined}
                          >
                            <span className="el-calendar-date-number">{day.date.getDate()}</span>
                            {day.entries.length > 0 && <span className="el-calendar-count" aria-label={`${day.entries.length}件の予定`}>{day.entries.length}</span>}
                          </button>
                          {day.entries.slice(0, 3).map((entry) => (
                            <button key={entry.id} type="button" className={entry.kind} onClick={entry.onSelect}>
                              {entry.label}
                            </button>
                          ))}
                          {day.entries.length > 3 && <span className="el-calendar-more">ほか{day.entries.length - 3}件</span>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {activeLiveScreen === "live" && selectedLiveCalendarDay && selectedLiveCalendarDay.entries.length > 0 && (
                  <section ref={calendarSelectionRef} className="el-calendar-selection" aria-live="polite">
                    <div className="el-calendar-selection-heading">
                      <strong>{selectedLiveCalendarDay.key} の予定</strong>
                      <span>{selectedLiveCalendarDay.entries.length}件</span>
                    </div>
                    <div className="el-list">
                      {selectedLiveCalendarDay.entries.map((entry) => (
                        <button key={entry.id} type="button" className="el-list-item live" onClick={entry.onSelect}>
                          <strong>{entry.label}</strong>
                          <small>タップして詳細を開く</small>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeLiveScreen === "facility" && liveViewMode === "calendar" && (
              <section className="el-calendar-selection" aria-live="polite">
                <div className="el-calendar-selection-heading"><strong>{selectedFacilityDate} の予約</strong><span>{selectedDateFacilityReservations.length}件</span></div>
                <div className="el-reservation-card-list">
                  {selectedDateFacilityReservations.map((reservation) => (
                    <article key={reservation.id} className={`el-reservation-card ${reservation.status || "pending"}`}>
                      <strong>{reservation.facility_name || facilityNameById(facilityReservationFacilityId(reservation))}</strong>
                      <span>{selectedFacilityDate} / {reservation.start_time || "時間未設定"}{reservation.end_time ? `-${reservation.end_time}` : ""} / {reservation.participant_count || reservation.people_count || 1}名</span>
                      <span>使用用途: {reservation.usage_purpose || "未入力"}</span>
                      <em>{reservation.status === "approved" ? "承認" : reservation.status === "rejected" ? "否認" : "予約中"}</em>
                      {isOwnFacilityReservation(reservation) && (
                        <div className="el-reservation-card-actions">
                          <button type="button" onClick={() => startFacilityReservationEdit(reservation)} disabled={replyBusy}>修正</button>
                          <button type="button" className="delete" onClick={() => handleFacilityReservationDelete(reservation)} disabled={replyBusy}>削除</button>
                        </div>
                      )}
                    </article>
                  ))}
                  {selectedDateFacilityReservations.length === 0 && <div className="el-empty">この日の予約はありません。日付を選ぶと予約内容を確認できます。</div>}
                </div>
              </section>
            )}

            {liveMessage && <div className={`form-alert ${/(送信|修正|削除)しました/.test(liveMessage) ? "success" : ""}`}>{liveMessage}</div>}
            {liveLoadMessage && <div className="form-alert">{liveLoadMessage}</div>}

            {activeLiveScreen === "live" && liveViewMode === "cards" && (
            <section className="el-reply-panel">
              <h3>Web会議開催案内</h3>
              <div className="el-list">
                {liveSessions.map((session) => {
                  const url = liveSessionUrl(session);
                  const application = liveApplicationBySessionId.get(String(session.id));
                  return (
                    <article
                      key={session.id}
                      id={`live-session-${session.id}`}
                      className={`el-live-card ${String(liveReplyDraft.sessionId) === String(session.id) ? "selected" : ""}`.trim()}
                    >
                      <div>
                        <span className="el-date">{liveSessionDateKey(session) || "日付未設定"}</span>
                        <strong>{session.title || "Web会議"}</strong>
                        <small>{liveProviderLabel(session.provider)} / {session.event_time || "時間未設定"}</small>
                        <p>{session.content || session.description || "内容はまだ登録されていません。"}</p>
                      </div>
                      {url && <a href={url} target="_blank" rel="noreferrer"><i className="fas fa-arrow-up-right-from-square" /> 開催URLを開く</a>}
                      <div className={`el-live-application-status ${application ? "applied" : "not-applied"}`}>
                        <i className={`fas ${application ? "fa-circle-check" : "fa-circle"}`} />
                        {application ? `申込済み・${application.participant_count || 1}名` : "未申込"}
                      </div>
                      <form className="el-live-card-reply" onSubmit={(event) => handleLiveReply(event, session)}>
                        <label>
                          <span>参加人数</span>
                          <input
                            value={liveParticipantCounts[String(session.id)] ?? "1"}
                            onChange={(event) => setLiveParticipantCounts((current) => ({ ...current, [String(session.id)]: event.target.value }))}
                            inputMode="numeric"
                            min="1"
                            type="number"
                            aria-label={`${session.title || "Web会議"}の参加人数`}
                          />
                        </label>
                        <button type="submit" className="el-primary-action compact" disabled={replyBusy}>
                          <i className={`fas ${replyBusy ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} /> 参加申込を保存
                        </button>
                      </form>
                    </article>
                  );
                })}
                {!loading && liveSessions.length === 0 && <div className="el-empty">Web会議の案内はまだありません。</div>}
              </div>
            </section>
            )}

            {activeLiveScreen === "facility" && (
            <section className="el-reply-panel">
              <h3>施設予約</h3>
              {liveViewMode === "cards" && (
                <div className="el-reservation-history">
                  <label>
                    <span>施設で予約状況を絞り込み</span>
                    <select value={facilityListFilter} onChange={(event) => setFacilityListFilter(event.target.value)}>
                      <option value="all">すべての施設</option>
                      {facilities.map((facility) => <option key={facility.id} value={String(facility.id)}>{facility.name || "施設"}</option>)}
                    </select>
                  </label>
                  <div className="el-reservation-card-list">
                    {[...filteredFacilityReservations]
                      .sort((left, right) => String(right.reservation_date || "").localeCompare(String(left.reservation_date || "")))
                      .map((reservation) => (
                        <article key={reservation.id} className={`el-reservation-card ${reservation.status || "pending"}`}>
                          <strong>{reservation.facility_name || facilityNameById(facilityReservationFacilityId(reservation))}</strong>
                          <span>{dateKey(reservation.reservation_date)} / {reservation.start_time || "時間未設定"}{reservation.end_time ? `-${reservation.end_time}` : ""}</span>
                          <span>{reservation.participant_count || reservation.people_count || 1}名</span>
                          <span>使用用途: {reservation.usage_purpose || "未入力"}</span>
                          <em>{reservation.status === "approved" ? "承認" : reservation.status === "rejected" ? "否認" : "予約中"}</em>
                          {isOwnFacilityReservation(reservation) && (
                            <div className="el-reservation-card-actions">
                              <button type="button" onClick={() => startFacilityReservationEdit(reservation)} disabled={replyBusy}>修正</button>
                              <button type="button" className="delete" onClick={() => handleFacilityReservationDelete(reservation)} disabled={replyBusy}>削除</button>
                            </div>
                          )}
                        </article>
                      ))}
                    {filteredFacilityReservations.length === 0 && <div className="el-empty">該当する予約はありません。</div>}
                  </div>
                </div>
              )}
              <button
                type="button"
                className={`el-facility-booking-toggle ${facilityBookingOpen ? "open" : ""}`.trim()}
                onClick={() => setFacilityBookingOpen((current) => !current)}
                aria-expanded={facilityBookingOpen}
                aria-controls="facility-booking-form"
              >
                <span><i className="fas fa-pen-to-square" /></span>
                <span>
                  <strong>{editingFacilityReservationId ? "施設予約を修正" : "施設予約を入力"}</strong>
                  <small>{editingFacilityReservationId ? "保存すると承認状態は予約中へ戻ります。" : "施設・日付・時間・人数・使用用途を入力します。"}</small>
                </span>
                <i className={`fas fa-chevron-${facilityBookingOpen ? "up" : "down"}`} />
              </button>
              {facilityBookingOpen && (
              <form id="facility-booking-form" className="el-live-form el-facility-booking-card" onSubmit={handleFacilityReservationSubmit}>
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
                    <input type="date" value={facilityReservationDraft.reservationDate} onChange={(event) => { setSelectedFacilityDate(event.target.value); setFacilityReservationDraft((current) => ({ ...current, reservationDate: event.target.value })); }} />
                  </label>
                  <label>
                    <span>開始時間</span>
                    <input type="time" value={facilityReservationDraft.startTime} onChange={(event) => setFacilityReservationDraft((current) => ({ ...current, startTime: event.target.value }))} />
                  </label>
                  <label>
                    <span>終了時間</span>
                    <input type="time" value={facilityReservationDraft.endTime} onChange={(event) => setFacilityReservationDraft((current) => ({ ...current, endTime: event.target.value }))} />
                  </label>
                  <label className="el-reply-wide">
                    <span>使用用途</span>
                    <input value={facilityReservationDraft.usagePurpose} onChange={(event) => setFacilityReservationDraft((current) => ({ ...current, usagePurpose: event.target.value }))} placeholder="例: 役員会、子ども会、交流会" />
                  </label>
                </div>
                {selectedFacility && (
                  <div className="el-live-note">
                    <strong>{selectedFacility.name || "施設"}</strong>
                    <span>場所: {selectedFacility.location || "未設定"}</span>
                    <span>定員: {selectedFacility.capacity || selectedFacility.scale || "未設定"}</span>
                    <span>利用可能時間: {facilityAvailableLabel(selectedFacility)}</span>
                    <span>利用不可曜日: {splitSettingList(selectedFacility.unavailable_weekdays).join("、") || "なし"}</span>
                    <span>利用不可日: {splitSettingList(selectedFacility.unavailable_dates).join("、") || "なし"}</span>
                  </div>
                )}
                {selectedFacilityApprovedReservations.length > 0 && (
                  <div className="el-reservation-slots">
                    <strong>選択日の承認済み予約</strong>
                    {selectedFacilityApprovedReservations.slice(0, 5).map((reservation) => (
                      <span key={reservation.id}>{dateKey(reservation.reservation_date)} {reservation.start_time || ""}{reservation.end_time ? `-${reservation.end_time}` : ""}</span>
                    ))}
                  </div>
                )}
                <div className="el-facility-booking-actions">
                  {editingFacilityReservationId && <button type="button" className="el-secondary-action" onClick={cancelFacilityReservationEdit} disabled={replyBusy}>修正を中止</button>}
                  <button className="el-primary-action" disabled={replyBusy || facilities.length === 0}>
                    <i className={`fas ${replyBusy ? "fa-spinner fa-spin" : editingFacilityReservationId ? "fa-floppy-disk" : "fa-calendar-check"}`} /> {editingFacilityReservationId ? "修正を保存" : "施設予約を申し込む"}
                  </button>
                </div>
              </form>
              )}
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
                <p>この会費は世帯共通です。世帯主または家族が支払うと、同じ世帯の全員に入金状況が反映されます。</p>
                <div className="el-fee-summary">
                  <span><small>請求額</small><strong>{yen(getFeeBillingAmount(latestFee))}</strong></span>
                  <span><small>入金額</small><strong>{yen(getFeePaidAmount(latestFee))}</strong></span>
                  <span><small>状態</small><strong>{getFeeStatusLabel(latestFee)}</strong></span>
                </div>
                <p>入金方法: {getPaymentMethodLabel(latestFee)}</p>
                {feeSetting?.payment_instructions && <p className="el-fee-payment-note">{feeSetting.payment_instructions}</p>}
                {getFeePaidAmount(latestFee) < getFeeBillingAmount(latestFee) ? (
                  <div className="el-fee-payment-methods">
                    {feeSetting?.cash_enabled !== false && (
                      <div className="el-fee-payment-method">
                        <i className="fas fa-hand-holding-yen" />
                        <span><strong>手集金</strong><small>役員からの集金案内をご確認ください。</small></span>
                      </div>
                    )}
                    {feeSetting?.bank_transfer_enabled && (
                      <div className="el-fee-payment-method">
                        <i className="fas fa-building-columns" />
                        <span>
                          <strong>口座振込</strong>
                          <small>{feeSetting.bank_name} {feeSetting.bank_branch_name}／{feeSetting.bank_account_type === "checking" ? "当座" : "普通"} {feeSetting.bank_account_number}</small>
                          <small>口座名義：{feeSetting.bank_account_holder}</small>
                        </span>
                      </div>
                    )}
                    {(feeSetting?.stripe_card_enabled !== false || feeSetting?.stripe_paypay_enabled) && ((latestFee.billing_channel === "stripe" || stripeAccountId) && stripeReady ? (
                      <button className="el-primary-action" onClick={() => handleOnlinePayment(latestFee)}>
                        <i className="fas fa-credit-card" />
                        {feeSetting?.stripe_paypay_enabled && feeSetting?.stripe_card_enabled !== false
                          ? "オンラインで支払う（カード・PayPay）"
                          : feeSetting?.stripe_paypay_enabled ? "オンラインで支払う（PayPay）" : "オンラインで支払う（カード）"}
                      </button>
                    ) : latestFee.billing_channel === "stripe" || stripeAccountId ? (
                      <div className="el-empty">Stripe本番連携の確認中です。役員からの案内をお待ちください。</div>
                    ) : null)}
                    {feeSetting?.stripe_paypay_enabled && (
                      <>
                        <p className="el-fee-payment-caution">PayPayはStripeの安全な決済画面で選択できます。</p>
                        <Link href={`/legal/commercial-transactions/${townId}`} target="_blank" className="el-secondary-action">
                          お支払い条件・特定商取引法に基づく表記
                        </Link>
                      </>
                    )}
                    {feeSetting?.bank_transfer_enabled && (
                      <p className="el-fee-payment-caution">口座振込の着金確認後、役員が入金状況を反映します。</p>
                    )}
                  </div>
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

          </section>
        )}
      </main>

      {activeTab === "board" && boardFilter === "event" && (
        <div className="el-floating-view-switch" aria-label="イベント表示切替">
          <button type="button" className={boardViewMode === "calendar" ? "active" : ""} onClick={() => setBoardViewMode("calendar")}>
            <i className="fas fa-calendar-days" />
            <span>カレンダー</span>
          </button>
          <button type="button" className={boardViewMode === "cards" ? "active" : ""} onClick={() => setBoardViewMode("cards")}>
            <i className="fas fa-list" />
            <span>一覧</span>
          </button>
        </div>
      )}

      {activeTab === "live" && (
        <div className="el-floating-view-switch" aria-label="Live表示切替">
          <button type="button" className={liveViewMode === "calendar" ? "active" : ""} onClick={() => setLiveViewMode("calendar")}>
            <i className="fas fa-calendar-days" />
            <span>カレンダー</span>
          </button>
          <button type="button" className={liveViewMode === "cards" ? "active" : ""} onClick={() => setLiveViewMode("cards")}>
            <i className="fas fa-list" />
            <span>一覧</span>
          </button>
        </div>
      )}

      <HelpCenter audience="member" showLabel={false} className={`el-floating-help ${bottomNavHidden ? "nav-hidden" : ""}`} />

      <button
        type="button"
        className={`el-bottom-nav-toggle ${bottomNavHidden ? "is-hidden" : ""}`}
        onClick={toggleBottomNav}
        aria-label={bottomNavHidden ? "下部メニューを表示" : "下部メニューを隠す"}
      >
        <i className={`fas ${bottomNavHidden ? "fa-chevron-up" : "fa-chevron-down"}`} />
        <span>{bottomNavHidden ? "メニューを表示" : "メニューを隠す"}</span>
      </button>

      {!bottomNavHidden && <nav className={`el-bottom-nav ${bottomNavMode === "sub" ? "is-sub" : "is-main"}`} aria-label={bottomNavMode === "sub" ? "住民サブメニュー" : "住民メニュー"}>
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
      </nav>}
    </div>
  );
}
