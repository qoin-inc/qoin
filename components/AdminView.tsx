"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AdminViewProps = {
  townId: number;
  townName: string;
};

type Summary = {
  linkedMembers: number;
  monthlyPushes: number;
  systemUsageFee: number;
  annualFeeBilling: number;
  paidTotal: number;
};

type BasicFeature = "基本情報" | "会員管理" | "会費管理" | "システム利用料" | "役員管理" | "Stripe連携";
type AdminScreenMode = "dashboard" | "basicFeature" | "publishFeature";

type BasicData = {
  town: any | null;
  members: any[];
  fees: any[];
  systemBillings: any[];
  admins: any[];
  setting: any | null;
};

type BasicInfoDraft = {
  name: string;
  fiscalEndMonth: string;
  memberScale: string;
  postalCode: string;
};

type MemberDraft = {
  fullName: string;
  kanaName: string;
  postalCode: string;
  addressLine2: string;
  addressLine3: string;
  familyName1: string;
  familyName2: string;
};

type FeeDraft = {
  fiscalYear: string;
  amount: string;
  targetMode: "all" | "selected";
};

type AdminInviteDraft = {
  name: string;
  email: string;
  role: string;
};

type LiveSessionDraft = {
  provider: "line" | "youtube";
  title: string;
  content: string;
  eventDate: string;
  eventTime: string;
  url: string;
  notifyEnabled: boolean;
};

type FacilityDraft = {
  name: string;
  location: string;
  capacity: string;
  availableStartTime: string;
  availableEndTime: string;
  unavailableWeekdays: string[];
  unavailableDateInput: string;
  unavailableDates: string[];
};

type LiveFacilityData = {
  liveSessions: any[];
  liveApplications: any[];
  facilities: any[];
  reservations: any[];
};

type WorkItem = {
  id: string;
  circularId?: number | string;
  type: "circular" | "notice" | "event" | "assembly" | "facility" | "live";
  title: string;
  date: string;
  detail: string;
  status: string;
  action: string;
  tone: string;
  attachmentCount?: number;
  replies?: any[];
  replySummary?: string;
  source?: any;
};

type PublishType = "circular" | "notice" | "event" | "assembly";
type PublishFeatureLabel = "電子回覧板" | "連絡" | "イベント" | "総会案内";
type DashboardMenu = "basic" | "publish" | "live" | "accounting";
type LiveFacilityScreen = "live" | "facility";
type AssemblyCategoryType = "income" | "expense";
type AssemblyTab = "categories" | "budget" | "settlement" | "report";

type PublishDraft = {
  type: PublishType;
  title: string;
  sender: string;
  content: string;
  eventDate: string;
  eventTime: string;
  assemblyDate: string;
  assemblyTime: string;
  proxyTemplateText: string;
  pushEnabled: boolean;
};

type AssemblyAccountingData = {
  categories: any[];
  budgets: any[];
  settlements: any[];
};

type AssemblyCategoryDraft = {
  type: AssemblyCategoryType;
  parentId: string;
  name: string;
  sortOrder: string;
};

type AssemblyBudgetDraft = {
  budgetAmount: string;
  previousBudgetAmount: string;
  note: string;
};

type AssemblySettlementDraft = {
  type: AssemblyCategoryType;
  categoryId: string;
  paidDate: string;
  amount: string;
  description: string;
};

type AssemblyReportRow = {
  id: string;
  type: AssemblyCategoryType;
  name: string;
  isChild: boolean;
  isUnassigned?: boolean;
  previousBudget: number;
  budget: number;
  budgetDiff: number;
  actual: number;
  diff: number;
  note: string;
};

const functionGroups: Array<{ key: DashboardMenu; title: string; icon: string; desc: string; items: string[]; tone: string }> = [
  {
    key: "basic",
    title: "基本機能",
    icon: "fa-layer-group",
    desc: "町内会・自治会の基本情報と運営基盤を管理します。",
    items: ["基本情報", "会員管理", "会費管理", "システム利用料", "役員管理", "Stripe連携"],
    tone: "blue",
  },
  {
    key: "publish",
    title: "発信機能",
    icon: "fa-paper-plane",
    desc: "電子回覧板、連絡、イベント、総会案内を会員へ発信します。",
    items: ["電子回覧板", "連絡", "イベント", "総会案内"],
    tone: "green",
  },
  {
    key: "live",
    title: "Live・施設予約",
    icon: "fa-video",
    desc: "会議開催、Live配信URL、施設登録、施設予約を管理します。",
    items: ["会議開催", "Liveイベント", "施設登録", "予約承認"],
    tone: "rose",
  },
  {
    key: "accounting",
    title: "総会会計",
    icon: "fa-chart-pie",
    desc: "総会に必要な予算書と決算書を作成します。",
    items: ["予算書作成", "決算書作成", "科目管理", "CSV/印刷"],
    tone: "indigo",
  },
];

const basicFeatures: Array<{ key: BasicFeature; icon: string; desc: string }> = [
  { key: "基本情報", icon: "fa-house-flag", desc: "名称、決算月、会員数規模、郵便番号、代表者表示" },
  { key: "会員管理", icon: "fa-users", desc: "連携済み会員、未連携名簿、退会状態、家族アカウント" },
  { key: "会費管理", icon: "fa-yen-sign", desc: "年間請求額、納入額、未納状況、領収書管理" },
  { key: "システム利用料", icon: "fa-file-invoice-dollar", desc: "月額世帯単価、無料プッシュ枠、超過単価、請求額" },
  { key: "役員管理", icon: "fa-user-shield", desc: "役員招待、権限、承認待ち、停止状態" },
  { key: "Stripe連携", icon: "fa-credit-card", desc: "Connectアカウント、オンボーディング、決済受付状態" },
];

const typeLabel: Record<WorkItem["type"], string> = {
  circular: "電子回覧板",
  notice: "連絡",
  event: "イベント",
  assembly: "総会案内",
  facility: "施設予約",
  live: "Live",
};

const publishTypeOptions: Array<{ value: PublishType; label: string; hint: string }> = [
  { value: "circular", label: "電子回覧板", hint: "標準仕様。主にPDFや画像を添付して回覧します。" },
  { value: "notice", label: "連絡", hint: "標準の連絡仕様。本文中心の案内に使います。" },
  { value: "event", label: "イベント", hint: "開催日時と大人/子供の参加返信を受け付けます。" },
  { value: "assembly", label: "総会案内", hint: "総会日時、出欠返信、委任状添付を受け付けます。" },
];

const publishFeatureMap: Record<PublishFeatureLabel, PublishType> = {
  電子回覧板: "circular",
  連絡: "notice",
  イベント: "event",
  総会案内: "assembly",
};

const defaultPublishDraft: PublishDraft = {
  type: "circular",
  title: "",
  sender: "役員",
  content: "",
  eventDate: "",
  eventTime: "",
  assemblyDate: "",
  assemblyTime: "",
  proxyTemplateText: "",
  pushEnabled: false,
};

const defaultLiveSessionDraft: LiveSessionDraft = {
  provider: "line",
  title: "",
  content: "",
  eventDate: "",
  eventTime: "",
  url: "",
  notifyEnabled: true,
};

const defaultFacilityDraft: FacilityDraft = {
  name: "",
  location: "",
  capacity: "",
  availableStartTime: "09:00",
  availableEndTime: "21:00",
  unavailableWeekdays: [],
  unavailableDateInput: "",
  unavailableDates: [],
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const defaultAssemblyCategoryDraft: AssemblyCategoryDraft = {
  type: "income",
  parentId: "",
  name: "",
  sortOrder: "",
};

const defaultAssemblySettlementDraft: AssemblySettlementDraft = {
  type: "expense",
  categoryId: "",
  paidDate: todayInputValue(),
  amount: "",
  description: "",
};

const assemblyCategoryTypeLabel: Record<AssemblyCategoryType, string> = {
  income: "収入",
  expense: "支出",
};

const assemblyTabs: Array<{ key: AssemblyTab; label: string; icon: string }> = [
  { key: "categories", label: "科目", icon: "fa-list-check" },
  { key: "budget", label: "予算", icon: "fa-file-invoice" },
  { key: "settlement", label: "決算入力", icon: "fa-receipt" },
  { key: "report", label: "集計/出力", icon: "fa-print" },
];

const standardAssemblyCategories: Array<{ type: AssemblyCategoryType; name: string; sortOrder: number }> = [
  { type: "income", name: "会費", sortOrder: 10 },
  { type: "income", name: "補助金", sortOrder: 20 },
  { type: "income", name: "事業収入", sortOrder: 30 },
  { type: "income", name: "繰越金", sortOrder: 40 },
  { type: "income", name: "雑入", sortOrder: 50 },
  { type: "expense", name: "会議費", sortOrder: 110 },
  { type: "expense", name: "事務費", sortOrder: 120 },
  { type: "expense", name: "印刷費", sortOrder: 130 },
  { type: "expense", name: "通信費", sortOrder: 140 },
  { type: "expense", name: "集会所管理費", sortOrder: 150 },
  { type: "expense", name: "慶弔費", sortOrder: 160 },
  { type: "expense", name: "事業費", sortOrder: 170 },
  { type: "expense", name: "予備費", sortOrder: 180 },
];

const yen = (value: number) => `¥${Math.round(value || 0).toLocaleString()}`;
const weekdayOptions = ["日", "月", "火", "水", "木", "金", "土"];

const defaultBasicInfoDraft: BasicInfoDraft = {
  name: "",
  fiscalEndMonth: "3",
  memberScale: "",
  postalCode: "",
};

const thisMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString(), label: `${now.getFullYear()}年${now.getMonth() + 1}月` };
};

const toDisplayDate = (value?: string | null) => {
  if (!value) return "日付未設定";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const fiscalEndMonthFromStart = (startMonth?: number | string | null) => {
  const parsed = Number(startMonth);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) return 3;
  return parsed === 1 ? 12 : parsed - 1;
};

const fiscalStartMonthFromEnd = (endMonth: number) => (endMonth === 12 ? 1 : endMonth + 1);

const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const memberScaleOptions = [
  "500世帯未満",
  "500世帯～1000世帯",
  "1000世帯～5000世帯",
  "5000世帯以上",
];

const defaultMemberDraft: MemberDraft = {
  fullName: "",
  kanaName: "",
  postalCode: "",
  addressLine2: "",
  addressLine3: "",
  familyName1: "",
  familyName2: "",
};

const memberCsvHeaders = ["氏名", "氏名カタカナ", "郵便番号", "住所２", "住所３", "家族１", "家族２"];
const memberCsvExcelTextHeaders = new Set(["郵便番号", "住所２", "住所３"]);
const rosterDetailColumns = ["kana_name", "postal_code", "address2", "address3", "family_name_1", "family_name_2", "withdrawal_status", "withdrawal_reply_message"];
const adminDetailColumns = ["admin_role", "admin_invite_token", "invite_token", "invited_at", "retired_at"];
const feeDetailColumns = [
  "neighborhood_id",
  "roster_id",
  "resident_name",
  "fiscal_year",
  "expected_amount",
  "billing_amount",
  "amount",
  "paid_amount",
  "paid_amount_cash",
  "paid_amount_stripe",
  "billing_channel",
  "payment_method",
  "last_payment_method",
  "billing_status",
  "status",
  "is_billed",
  "billed_at",
  "paid_at",
  "stripe_payment_intent_id",
];

const memberScaleToHouseholds = (scale: string) => {
  if (scale === "500世帯未満") return 499;
  if (scale === "500世帯～1000世帯") return 1000;
  if (scale === "1000世帯～5000世帯") return 5000;
  if (scale === "5000世帯以上") return 5001;
  return null;
};

const isMissingColumnError = (error: any, columnName: string) => {
  const message = String(error?.message || "");
  return message.includes(columnName) && (message.includes("schema cache") || message.includes("column"));
};

const isMissingAnyColumnError = (error: any, columns: string[]) => columns.some((column) => isMissingColumnError(error, column));
const missingColumnFromError = (error: any) => {
  const message = String(error?.message || "");
  const quoted = message.match(/'([^']+)' column/);
  if (quoted?.[1]) return quoted[1];
  const plain = message.match(/column ["']?([a-zA-Z0-9_]+)["']?/);
  return plain?.[1] || "";
};
const isDuplicateKeyError = (error: any) => {
  const message = String(error?.message || "");
  return error?.code === "23505" || message.includes("duplicate key value violates unique constraint");
};

const safeFileName = (name: string) => name.replace(/[^\w.\-]+/g, "_").replace(/^_+/, "") || "attachment";

const defaultProxyTemplateText = (title?: string | null) => `私は、${title || "総会"}に出席できませんので、同総会における議決権を代理人に委任します。`;

const parseAttachmentList = (value: any): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const isImageAttachment = (attachment: any) => {
  const type = String(attachment?.type || "");
  const url = String(attachment?.url || "");
  return type.startsWith("image/") || /\.(png|jpe?g|gif|webp)(?:[?#]|$)/i.test(url);
};

const firstImageAttachmentUrl = (attachments: any[], fallback?: string | null) =>
  fallback || attachments.find(isImageAttachment)?.url || "";

const summarizeReplies = (type: WorkItem["type"], replies: any[]) => {
  if (type === "event") {
    const adultTotal = replies.reduce((sum, reply) => sum + Number(reply.adult_count ?? reply.adults ?? 0), 0);
    const childTotal = replies.reduce((sum, reply) => sum + Number(reply.child_count ?? reply.children ?? 0), 0);
    return `申込 ${replies.length}件 / 大人 ${adultTotal}名・子供 ${childTotal}名`;
  }

  if (type === "assembly") {
    const present = replies.filter((reply) => ["present", "attend", "出席"].includes(reply.reply_status || reply.response_status)).length;
    const absent = replies.filter((reply) => ["absent", "proxy", "欠席"].includes(reply.reply_status || reply.response_status)).length;
    const proxy = replies.filter((reply) => reply.proxy_file_url || reply.proxy_url || reply.attachment_url).length;
    return `出席 ${present}件 / 欠席 ${absent}件 / 委任状 ${proxy}件`;
  }

  return "";
};

const compactAddress = (draft: MemberDraft) => [draft.postalCode, draft.addressLine2, draft.addressLine3].filter(Boolean).join(" ");

const getMemberFullName = (member: any) => member.full_name || `${member.last_name || ""} ${member.first_name || ""}`.trim() || "氏名未設定";
const getMemberKana = (member: any) => member.kana_name || member.full_name_kana || member.kana || "";
const getMemberPostalCode = (member: any) => member.postal_code || "";
const getMemberAddressLine2 = (member: any) => member.address_line2 || member.address2 || member.address || "";
const getMemberAddressLine3 = (member: any) => member.address_line3 || member.address3 || "";
const getMemberFamilyNames = (member: any) => [member.family_name_1, member.family_name_2].filter(Boolean);
const isLineLinkedMember = (member: any) => Boolean(member.user_auth_id || member.family_user_auth_id_1 || member.family_user_auth_id_2);
const isWithdrawnMember = (member: any) => member.withdrawal_status === "withdrawn" || member.status === "withdrawn";
const getMemberLinkedAccountCount = (member: any) => {
  if (isWithdrawnMember(member)) return 0;
  return [member.user_auth_id, member.family_user_auth_id_1, member.family_user_auth_id_2].filter(Boolean).length;
};
const isWithdrawalRequestedMember = (member: any) => ["requested", "pending", "withdrawal_requested"].includes(member.withdrawal_status || member.status);
const getMemberStatusLabel = (member: any) => {
  if (isWithdrawnMember(member)) return "退会済み";
  if (isWithdrawalRequestedMember(member)) return "退会申請中";
  return "利用中";
};
const getAdminStatusLabel = (admin: any) => {
  if (admin.status === "active") return "管理中";
  if (admin.status === "pending") return "招待中";
  if (admin.status === "waiting_approval") return "承認待ち";
  if (admin.status === "retired") return "退任済み";
  if (admin.status === "rejected") return "停止";
  return admin.status || "状態未設定";
};
const isDeletableAdminInvite = (admin: any) => ["pending", "waiting_approval"].includes(admin.status);
const getFeeRosterId = (fee: any) => fee.roster_id ?? fee.resident_roster_id ?? fee.member_id ?? null;
const getFeeYear = (fee: any) => Number(fee.fiscal_year ?? fee.year ?? new Date().getFullYear());
const getFeeBillingAmount = (fee: any) => Number(fee.expected_amount ?? fee.billing_amount ?? fee.amount ?? 0);
const getFeeCashPaid = (fee: any) => Number(fee.paid_amount_cash ?? (fee.payment_method === "cash" ? fee.paid_amount : 0) ?? 0);
const getFeeStripePaid = (fee: any) => Number(fee.paid_amount_stripe ?? (fee.payment_method === "stripe" ? fee.paid_amount : 0) ?? 0);
const getFeePaidAmount = (fee: any) => Number(fee.paid_amount ?? (getFeeCashPaid(fee) + getFeeStripePaid(fee)));
const getFeeStatusLabel = (fee: any) => {
  const billing = getFeeBillingAmount(fee);
  const paid = getFeePaidAmount(fee);
  if (billing > 0 && paid >= billing) return "納入済";
  if (paid > 0) return "一部入金";
  return fee.is_billed || fee.status === "unpaid" || fee.billing_status === "billed" ? "請求中" : "未請求";
};
const getPaymentMethodLabel = (fee: any) => {
  const cash = getFeeCashPaid(fee);
  const stripe = getFeeStripePaid(fee);
  const paid = getFeePaidAmount(fee);
  if (cash > 0 && stripe > 0) return "Stripe + 手集金";
  if (stripe > 0 || (paid > 0 && (fee.payment_method === "stripe" || fee.last_payment_method === "stripe"))) return "Stripe";
  if (cash > 0 || (paid > 0 && (fee.payment_method === "cash" || fee.last_payment_method === "cash"))) return "手集金";
  return "未入金";
};
const currentFiscalYear = (startMonth?: number | string | null) => {
  const now = new Date();
  const start = Number(startMonth) || 4;
  return now.getMonth() + 1 >= start ? now.getFullYear() : now.getFullYear() - 1;
};

const escapeCsvCell = (value: unknown, forceExcelText = false) => {
  const text = String(value ?? "");
  const output = forceExcelText && text ? `\t${text}` : text;
  return /[",\r\n\t]/.test(output) ? `"${output.replace(/"/g, '""')}"` : output;
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const amountFromInput = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const isActiveAssemblyCategory = (category: any) => category?.is_active !== false;
const isAssemblyFeeCategory = (category: any) =>
  category?.type === "income" && !category?.parent_id && String(category?.name || "").trim() === "会費";
const formatAssemblyChildName = (name: string, isChild: boolean) => isChild ? `　${name}` : name;

const compareAssemblyCategoryOrder = (a: any, b: any) => {
  const sortOrder = Number(a.sort_order ?? 999) - Number(b.sort_order ?? 999);
  if (sortOrder !== 0) return sortOrder;
  return Number(a.id ?? 0) - Number(b.id ?? 0);
};

const sortAssemblyCategories = (categories: any[]) => {
  const childrenByParent = categories.reduce<Map<string, any[]>>((map, category) => {
    if (!category.parent_id) return map;
    const key = String(category.parent_id);
    map.set(key, [...(map.get(key) || []), category]);
    return map;
  }, new Map());
  const childIds = new Set(categories.filter((category) => category.parent_id).map((category) => String(category.id)));
  const roots = categories.filter((category) => !category.parent_id || !categories.some((item) => String(item.id) === String(category.parent_id)));
  const output: any[] = [];

  const appendWithChildren = (items: any[]) => {
    [...items].sort(compareAssemblyCategoryOrder).forEach((category) => {
      if (!output.some((item) => String(item.id) === String(category.id))) output.push(category);
      appendWithChildren(childrenByParent.get(String(category.id)) || []);
    });
  };

  appendWithChildren(roots.filter((category) => category.type === "income"));
  appendWithChildren(roots.filter((category) => category.type === "expense"));
  appendWithChildren(categories.filter((category) => !childIds.has(String(category.id)) && !output.some((item) => String(item.id) === String(category.id))));

  return output;
};

const buildAssemblyBudgetDrafts = (categories: any[], budgets: any[]) => {
  const drafts: Record<string, AssemblyBudgetDraft> = {};
  sortAssemblyCategories(categories).filter(isActiveAssemblyCategory).forEach((category) => {
    const existing = budgets.find((budget) => String(budget.category_id) === String(category.id));
    drafts[String(category.id)] = {
      budgetAmount: String(existing?.budget_amount ?? 0),
      previousBudgetAmount: String(existing?.previous_budget_amount ?? 0),
      note: existing?.note || "",
    };
  });
  return drafts;
};

const getAssemblyBudgetAmount = (budgets: any[], categoryId: number | string) =>
  Number(budgets.find((budget) => String(budget.category_id) === String(categoryId))?.budget_amount ?? 0);

const getAssemblyPreviousBudgetAmount = (budgets: any[], categoryId: number | string) =>
  Number(budgets.find((budget) => String(budget.category_id) === String(categoryId))?.previous_budget_amount ?? 0);

const getAssemblyActualAmount = (category: any, settlements: any[], feeRevenue: number) => {
  if (isAssemblyFeeCategory(category)) return feeRevenue;
  return settlements
    .filter((settlement) => String(settlement.category_id) === String(category.id))
    .reduce((sum, settlement) => sum + Number(settlement.amount || 0), 0);
};

const buildAssemblyUnassignedRows = (categories: any[], settlements: any[]): AssemblyReportRow[] => {
  const categoryIds = new Set(categories.filter(isActiveAssemblyCategory).map((category) => String(category.id)));
  return (["income", "expense"] as AssemblyCategoryType[])
    .map((type) => {
      const targetSettlements = settlements.filter((settlement) => {
        const categoryId = settlement.category_id;
        return (settlement.type === type || (!settlement.type && type === "expense")) && (!categoryId || !categoryIds.has(String(categoryId)));
      });
      const actual = targetSettlements.reduce((sum, settlement) => sum + Number(settlement.amount || 0), 0);
      return {
        id: `unassigned-${type}`,
        type,
        name: "未設定項目",
        isChild: false,
        isUnassigned: true,
        previousBudget: 0,
        budget: 0,
        budgetDiff: 0,
        actual,
        diff: actual,
        note: "科目削除済み/未設定の決算明細",
      };
    })
    .filter((row) => row.actual !== 0);
};

const buildAssemblyReportRows = (categories: any[], budgets: any[], settlements: any[], feeRevenue: number): AssemblyReportRow[] => {
  const categoryRows = sortAssemblyCategories(categories)
    .filter(isActiveAssemblyCategory)
    .map((category) => {
      const type: AssemblyCategoryType = category.type === "expense" ? "expense" : "income";
      const budget = getAssemblyBudgetAmount(budgets, category.id);
      const previousBudget = getAssemblyPreviousBudgetAmount(budgets, category.id);
      const actual = getAssemblyActualAmount(category, settlements, feeRevenue);
      return {
        id: String(category.id),
        type,
        name: category.name || "科目未設定",
        isChild: Boolean(category.parent_id),
        previousBudget,
        budget,
        budgetDiff: budget - previousBudget,
        actual,
        diff: actual - budget,
        note: isAssemblyFeeCategory(category) ? "会費管理の納入実績" : budgets.find((item) => String(item.category_id) === String(category.id))?.note || "",
      };
    });
  const unassignedRows = buildAssemblyUnassignedRows(categories, settlements);
  return [
    ...categoryRows.filter((row) => row.type === "income"),
    ...unassignedRows.filter((row) => row.type === "income"),
    ...categoryRows.filter((row) => row.type === "expense"),
    ...unassignedRows.filter((row) => row.type === "expense"),
  ];
};

const getAssemblyMonthKey = (value?: string | null) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}/.test(value)) return value.slice(0, 7);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const filterAssemblySettlementsByMonth = (settlements: any[], monthKey: string) =>
  monthKey === "all" ? settlements : settlements.filter((settlement) => getAssemblyMonthKey(settlement.paid_date) === monthKey);

const downloadCsv = (fileName: string, rows: unknown[][]) => {
  const csv = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const openAccountingPrintWindow = (title: string, html: string) => {
  const win = window.open("", "_blank", "width=960,height=720");
  if (!win) return;
  win.document.write(`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: "Yu Gothic", "Meiryo", sans-serif; color: #111827; margin: 28px; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  p { margin: 0 0 16px; color: #475569; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #d1d5db; padding: 8px 9px; font-size: 12px; }
  th { background: #f3f4f6; text-align: left; }
  td.num, th.num { text-align: right; }
  tr.section th { background: #f8fafc; color: #374151; font-weight: 700; }
  tr.total th, tr.total td { background: #eef2ff; font-weight: 700; }
</style>
</head>
<body>${html}</body>
</html>`);
  win.document.close();
  win.focus();
  win.print();
};

const parseCsvRows = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

const normalizeMemberScale = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value);
  if (memberScaleOptions.includes(text)) return text;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return text;
  if (numeric < 500) return memberScaleOptions[0];
  if (numeric <= 1000) return memberScaleOptions[1];
  if (numeric <= 5000) return memberScaleOptions[2];
  return memberScaleOptions[3];
};

export default function AdminView({ townId, townName }: AdminViewProps) {
  const [summary, setSummary] = useState<Summary>({
    linkedMembers: 0,
    monthlyPushes: 0,
    systemUsageFee: 0,
    annualFeeBilling: 0,
    paidTotal: 0,
  });
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [basicData, setBasicData] = useState<BasicData>({ town: null, members: [], fees: [], systemBillings: [], admins: [], setting: null });
  const [liveFacilityData, setLiveFacilityData] = useState<LiveFacilityData>({ liveSessions: [], liveApplications: [], facilities: [], reservations: [] });
  const [activeAdminScreen, setActiveAdminScreen] = useState<AdminScreenMode>("dashboard");
  const [activeDashboardMenu, setActiveDashboardMenu] = useState<DashboardMenu>("basic");
  const [activeLiveFacilityScreen, setActiveLiveFacilityScreen] = useState<LiveFacilityScreen>("live");
  const [activeBasicFeature, setActiveBasicFeature] = useState<BasicFeature>("基本情報");
  const [basicInfoDraft, setBasicInfoDraft] = useState<BasicInfoDraft>(defaultBasicInfoDraft);
  const [basicInfoSaving, setBasicInfoSaving] = useState(false);
  const [basicInfoMessage, setBasicInfoMessage] = useState("");
  const [memberDraft, setMemberDraft] = useState<MemberDraft>(defaultMemberDraft);
  const [memberBusy, setMemberBusy] = useState(false);
  const [memberMessage, setMemberMessage] = useState("");
  const [memberReply, setMemberReply] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<number | string | null>(null);
  const [feeDraft, setFeeDraft] = useState<FeeDraft>({ fiscalYear: "", amount: "", targetMode: "all" });
  const [feeSelectedMembers, setFeeSelectedMembers] = useState<Record<string, boolean>>({});
  const [feeRosterSearch, setFeeRosterSearch] = useState("");
  const [feeCashDrafts, setFeeCashDrafts] = useState<Record<string, string>>({});
  const [feeBusy, setFeeBusy] = useState(false);
  const [feeMessage, setFeeMessage] = useState("");
  const [adminInviteDraft, setAdminInviteDraft] = useState<AdminInviteDraft>({ name: "", email: "", role: "" });
  const [adminInviteUrl, setAdminInviteUrl] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [systemBillingMonth, setSystemBillingMonth] = useState("");
  const [systemBillingMessage, setSystemBillingMessage] = useState("");
  const [systemBillingBusy, setSystemBillingBusy] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeMessage, setStripeMessage] = useState("");
  const [publishDraft, setPublishDraft] = useState<PublishDraft>(defaultPublishDraft);
  const proxyTemplateTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [publishAttachment, setPublishAttachment] = useState<File | null>(null);
  const [editingPublishId, setEditingPublishId] = useState<number | string | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [liveSessionDraft, setLiveSessionDraft] = useState<LiveSessionDraft>(defaultLiveSessionDraft);
  const [facilityDraft, setFacilityDraft] = useState<FacilityDraft>(defaultFacilityDraft);
  const [editingLiveSessionId, setEditingLiveSessionId] = useState<number | string | null>(null);
  const [editingFacilityId, setEditingFacilityId] = useState<number | string | null>(null);
  const [liveFacilityBusy, setLiveFacilityBusy] = useState(false);
  const [liveFacilityMessage, setLiveFacilityMessage] = useState("");
  const [activeAssemblyTab, setActiveAssemblyTab] = useState<AssemblyTab>("categories");
  const [assemblyFiscalYear, setAssemblyFiscalYear] = useState(new Date().getFullYear());
  const [assemblyData, setAssemblyData] = useState<AssemblyAccountingData>({ categories: [], budgets: [], settlements: [] });
  const [assemblyCategoryDraft, setAssemblyCategoryDraft] = useState<AssemblyCategoryDraft>(defaultAssemblyCategoryDraft);
  const [editingAssemblyCategoryId, setEditingAssemblyCategoryId] = useState<number | string | null>(null);
  const [assemblyBudgetDrafts, setAssemblyBudgetDrafts] = useState<Record<string, AssemblyBudgetDraft>>({});
  const [assemblySettlementDraft, setAssemblySettlementDraft] = useState<AssemblySettlementDraft>(defaultAssemblySettlementDraft);
  const [assemblySettlementMonth, setAssemblySettlementMonth] = useState("all");
  const [assemblyReceiptFile, setAssemblyReceiptFile] = useState<File | null>(null);
  const [assemblyBusy, setAssemblyBusy] = useState(false);
  const [assemblyMessage, setAssemblyMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const month = useMemo(() => thisMonthRange(), []);
  const assemblyFeeRevenue = useMemo(
    () => basicData.fees
      .filter((fee) => getFeeYear(fee) === assemblyFiscalYear)
      .reduce((sum, fee) => sum + getFeePaidAmount(fee), 0),
    [assemblyFiscalYear, basicData.fees],
  );

  const fetchAssemblyAccounting = async (successMessage = "") => {
    if (!townId) return;
    setAssemblyBusy(true);
    if (!successMessage) setAssemblyMessage("");
    try {
      const [categoriesResult, budgetsResult, settlementsResult] = await Promise.all([
        supabase
          .from("assembly_categories")
          .select("*")
          .eq("neighborhood_id", townId)
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("assembly_budgets")
          .select("*")
          .eq("neighborhood_id", townId)
          .eq("fiscal_year", assemblyFiscalYear),
        supabase
          .from("assembly_settlements")
          .select("*")
          .eq("neighborhood_id", townId)
          .eq("fiscal_year", assemblyFiscalYear)
          .order("paid_date", { ascending: false })
          .order("id", { ascending: false }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (budgetsResult.error) throw budgetsResult.error;
      if (settlementsResult.error) throw settlementsResult.error;

      const categories = sortAssemblyCategories(categoriesResult.data || []);
      const budgets = budgetsResult.data || [];
      const settlements = settlementsResult.data || [];
      setAssemblyData({ categories, budgets, settlements });
      setAssemblyBudgetDrafts(buildAssemblyBudgetDrafts(categories, budgets));
      setAssemblySettlementDraft((current) => {
        const activeCategories = categories.filter((category) => isActiveAssemblyCategory(category) && category.type === current.type);
        const hasCurrentCategory = activeCategories.some((category) => String(category.id) === String(current.categoryId));
        const firstCategory = activeCategories.find((category) => !isAssemblyFeeCategory(category)) || activeCategories[0];
        return {
          ...current,
          categoryId: hasCurrentCategory ? current.categoryId : firstCategory ? String(firstCategory.id) : "",
          paidDate: current.paidDate || todayInputValue(),
        };
      });
      if (successMessage) setAssemblyMessage(successMessage);
    } catch (error: any) {
      const message = String(error?.message || "");
      const isMissingSchema = message.includes("assembly_categories") || message.includes("assembly_budgets") || message.includes("assembly_settlements") || message.includes("schema cache");
      setAssemblyData({ categories: [], budgets: [], settlements: [] });
      setAssemblyBudgetDrafts({});
      setAssemblyMessage(isMissingSchema ? "総会会計DBが未作成です。docs/sql/assembly_accounting_columns_2026-07-09.sql をSupabase SQL Editorで実行してください。" : error?.message || "総会会計データを取得できませんでした。");
    } finally {
      setAssemblyBusy(false);
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [townInfo, billingRows, memberRows, adminRows, pushes, feeRecords, systemUsageBillings, settings, circulars, facilities, reservations, liveSessions, liveApplications] = await Promise.all([
          supabase.from("neighborhoods").select("*").eq("id", townId).maybeSingle(),
          supabase
            .from("resident_rosters")
            .select("*")
            .eq("neighborhood_id", townId)
            .limit(10000),
          supabase.from("resident_rosters").select("*").eq("neighborhood_id", townId).order("id", { ascending: false }).limit(1000),
          supabase.from("neighborhood_admins").select("*").eq("neighborhood_id", townId).order("id", { ascending: false }).limit(100),
          supabase
            .from("circulars")
            .select("id", { count: "exact", head: true })
            .eq("neighborhood_id", townId)
            .eq("is_pushed", true)
            .gte("created_at", month.start)
            .lt("created_at", month.end),
          supabase.from("fee_records").select("*").eq("neighborhood_id", townId),
          supabase.from("system_usage_billings").select("*").eq("neighborhood_id", townId).order("billing_month", { ascending: false }).limit(36),
          supabase.from("system_settings").select("*").eq("neighborhood_id", townId).maybeSingle(),
          supabase.from("circulars").select("*").eq("neighborhood_id", townId).order("created_at", { ascending: false }).limit(30),
          supabase.from("facilities").select("*").eq("neighborhood_id", townId).limit(6),
          supabase.from("facility_reservations").select("*").eq("neighborhood_id", townId).order("reservation_date", { ascending: false }).limit(6),
          supabase.from("live_sessions").select("*").eq("neighborhood_id", townId).order("starts_at", { ascending: false }).limit(6),
          supabase.from("live_session_applications").select("*").eq("neighborhood_id", townId).order("applied_at", { ascending: false }).limit(200),
        ]);

        const memberListRows = memberRows.data || [];
        const billingMemberRows = billingRows.data || memberListRows;
        const linkedAccountCount = billingMemberRows.reduce((sum: number, row: any) => sum + getMemberLinkedAccountCount(row), 0);
        const feeRows = feeRecords.data || [];
        const currentYear = currentFiscalYear(townInfo.data?.fiscal_start_month);
        const withdrawnRosterIds = new Set(memberListRows.filter(isWithdrawnMember).map((member: any) => String(member.id)));
        const summaryFeeRows = feeRows.filter((row: any) => {
          const rosterId = getFeeRosterId(row);
          const isWithdrawnFee = rosterId !== null && withdrawnRosterIds.has(String(rosterId));
          return getFeeYear(row) === currentYear && (!isWithdrawnFee || getFeePaidAmount(row) > 0);
        });
        const annualFeeBilling = summaryFeeRows.reduce((sum: number, row: any) => {
          return sum + getFeeBillingAmount(row);
        }, 0);
        const paidTotal = summaryFeeRows.reduce((sum: number, row: any) => {
          return sum + getFeePaidAmount(row);
        }, 0);

        const setting = settings.data as any;
        const freePushLimit = setting?.free_push_limit || 0;
        const pushUnitPrice = setting?.push_unit_price || 0;
        const monthlyHouseholdPrice = setting?.monthly_household_price || 0;
        const taxRate = Number(setting?.tax_rate ?? setting?.consumption_tax_rate ?? 10);
        const pushOverage = Math.max((pushes.count || 0) - freePushLimit, 0);
        const systemUsageSubtotal = linkedAccountCount * monthlyHouseholdPrice + pushOverage * pushUnitPrice;
        const systemUsageFee = systemUsageSubtotal + Math.round(systemUsageSubtotal * (taxRate / 100));

        setSummary({
          linkedMembers: linkedAccountCount,
          monthlyPushes: pushes.count || 0,
          systemUsageFee,
          annualFeeBilling,
          paidTotal,
        });

        setBasicData({
          town: townInfo.data || null,
          members: memberListRows,
          fees: feeRows,
          systemBillings: systemUsageBillings.data || [],
          admins: adminRows.data || [],
          setting: setting || null,
        });
        setLiveFacilityData({
          liveSessions: liveSessions.data || [],
          liveApplications: liveApplications.data || [],
          facilities: facilities.data || [],
          reservations: reservations.data || [],
        });

        const circularRows = circulars.data || [];
        const circularIds = circularRows.map((row: any) => row.id).filter(Boolean);
        let replyRows: any[] = [];
        if (circularIds.length > 0) {
          const replyResult = await supabase
            .from("event_applications")
            .select("*")
            .in("circular_id", circularIds);
          if (!replyResult.error) replyRows = replyResult.data || [];
        }
        const repliesByCircularId = replyRows.reduce<Map<string, any[]>>((map, reply) => {
          const key = String(reply.circular_id ?? reply.event_id ?? reply.assembly_notice_id ?? "");
          if (!key) return map;
          map.set(key, [...(map.get(key) || []), reply]);
          return map;
        }, new Map());

        const circularItems: WorkItem[] = circularRows.map((row: any) => {
          const category = row.category === "event" ? "event" : row.category === "assembly" ? "assembly" : row.category === "notice" || row.category === "info" ? "notice" : "circular";
          const replies = repliesByCircularId.get(String(row.id)) || [];
          const attachments = parseAttachmentList(row.attachments);
          const attachmentCount = attachments.length + (row.image_url ? 1 : 0) + (row.attachment_url || row.file_url || row.pdf_url ? 1 : 0);
          const replySummary = summarizeReplies(category, replies);
          return {
            id: `circular-${row.id}`,
            circularId: row.id,
            type: category,
            title: row.title || "タイトル未設定",
            date: toDisplayDate(row.event_date || row.created_at),
            detail:
              category === "event"
                ? replySummary || "参加者の返答を確認"
                : category === "assembly"
                  ? replySummary || "出席/欠席と委任状を確認"
                  : row.is_pushed
                    ? "プッシュ通知済み"
                    : "下書きまたは未通知",
            status: row.is_pushed ? "通知済" : "未通知",
            action: category === "event" ? "参加返信" : category === "assembly" ? "出欠・委任状" : "既読確認",
            tone: category,
            attachmentCount,
            replies,
            replySummary,
            source: row,
          };
        });

        const reservationItems: WorkItem[] = (reservations.data || []).map((row: any) => ({
          id: `reservation-${row.id}`,
          type: "facility",
          title: row.title || row.facility_name || "施設予約",
          date: toDisplayDate(row.reservation_date || row.created_at),
          detail: `${row.start_time || ""}${row.end_time ? `-${row.end_time}` : ""} / ${row.applicant_name || row.resident_name || "申込者未設定"} / ${row.participant_count || row.people_count || 1}名`,
          status: row.status === "approved" ? "承認済" : row.status === "rejected" ? "否認" : "承認待ち",
          action: "承認/否認",
          tone: "facility",
          replies: [row],
        }));

        const liveReplyRows = liveApplications.data || [];
        const liveRepliesBySessionId = liveReplyRows.reduce<Map<string, any[]>>((map, reply) => {
          const key = String(reply.live_session_id || "");
          if (!key) return map;
          map.set(key, [...(map.get(key) || []), reply]);
          return map;
        }, new Map());

        const liveItems: WorkItem[] = (liveSessions.data || []).map((row: any) => {
          const replies = liveRepliesBySessionId.get(String(row.id)) || [];
          return {
            id: `live-${row.id}`,
            type: "live",
            title: row.title || "Web会議",
            date: toDisplayDate(row.event_date || row.starts_at || row.created_at),
            detail: `${row.provider === "youtube" ? "YouTube" : "LINE"}案内 / 申込 ${replies.length}件`,
            status: row.status || "予定",
            action: "参加者",
            tone: "live",
            replies,
          };
        });

        const facilityMasterItems: WorkItem[] = (facilities.data || []).map((row: any) => ({
          id: `facility-${row.id}`,
          type: "facility",
          title: row.name || "施設",
          date: row.available_hours || "施設登録",
          detail: `${row.location || "場所未設定"} / 利用可能 ${row.available_hours || "未設定"}`,
          status: row.is_active === false ? "停止中" : "利用可",
          action: "施設設定",
          tone: "facility",
        }));

        const fallbackItems: WorkItem[] = [
          {
            id: "fallback-facility",
            type: "facility",
            title: "施設予約一覧",
            date: month.label,
            detail: "年月ごとに予約を表示し、承認または否認します。",
            status: "DB統合待ち",
            action: "承認/否認",
            tone: "facility",
          },
          {
            id: "fallback-live",
            type: "live",
            title: "ライブイベント一覧",
            date: month.label,
            detail: "会議開催・Live配信URLを同じビューで管理します。",
            status: "DB統合待ち",
            action: "Live確認",
            tone: "live",
          },
          {
            id: "fallback-assembly",
            type: "assembly",
            title: "総会案内",
            date: month.label,
            detail: "出席/欠席を集計し、欠席時は委任状添付を確認します。",
            status: "要実装",
            action: "出欠・委任状",
            tone: "assembly",
          },
        ];

        const merged = [...circularItems, ...reservationItems, ...facilityMasterItems, ...liveItems];
        setWorkItems(merged.length > 0 ? merged : fallbackItems);
      } catch (e) {
        console.error("Admin dashboard failed:", e);
        setWorkItems([
          {
            id: "fallback-assembly",
            type: "assembly",
            title: "総会案内",
            date: month.label,
            detail: "出席/欠席を集計し、欠席時は委任状添付を確認します。",
            status: "要実装",
            action: "出欠・委任状",
            tone: "assembly",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (townId) fetchDashboard();
  }, [townId, month.end, month.label, month.start]);

  useEffect(() => {
    if (townId) fetchAssemblyAccounting();
  }, [townId, assemblyFiscalYear]);

  useEffect(() => {
    setAssemblySettlementMonth("all");
  }, [assemblyFiscalYear]);

  useEffect(() => {
    if (!basicData.town) {
      setBasicInfoDraft((current) => ({ ...current, name: townName || current.name }));
      return;
    }

    const town = basicData.town;
    const memberScale = town.member_scale ?? town.member_count_scale ?? town.households ?? "";
    const fiscalEndMonth = town.fiscal_end_month ?? fiscalEndMonthFromStart(town.fiscal_start_month);

    setBasicInfoDraft({
      name: town.name || townName || "",
      fiscalEndMonth: String(fiscalEndMonth || 3),
      memberScale: normalizeMemberScale(memberScale),
      postalCode: town.postal_code || "",
    });
  }, [basicData.town, townName]);

  useEffect(() => {
    const year = currentFiscalYear(basicData.town?.fiscal_start_month);
    const defaultAmount = basicData.setting?.annual_fee_amount || 3000;
    setFeeDraft((current) => ({
      fiscalYear: current.fiscalYear || String(year),
      amount: current.amount || String(defaultAmount),
      targetMode: current.targetMode,
    }));
  }, [basicData.setting?.annual_fee_amount, basicData.town?.fiscal_start_month]);

  const handlePublishDraftChange = <K extends keyof PublishDraft>(field: K, value: PublishDraft[K]) => {
    setPublishDraft((current) => ({ ...current, [field]: value }));
    setPublishMessage("");
  };

  const alignProxyTemplateLines = (alignment: "left" | "center" | "right") => {
    const textarea = proxyTemplateTextareaRef.current;
    if (!textarea) return;
    const text = publishDraft.proxyTemplateText;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const lineStart = text.lastIndexOf("\n", Math.max(selectionStart - 1, 0)) + 1;
    const nextBreak = text.indexOf("\n", selectionEnd);
    const lineEnd = nextBreak === -1 ? text.length : nextBreak;
    const selectedLines = text.slice(lineStart, lineEnd).split("\n");
    const marker = alignment === "left" ? "" : `[${alignment}] `;
    const aligned = selectedLines
      .map((line) => `${marker}${line.replace(/^\[(?:left|center|right)\]\s*/, "")}`)
      .join("\n");
    const nextText = `${text.slice(0, lineStart)}${aligned}${text.slice(lineEnd)}`;
    handlePublishDraftChange("proxyTemplateText", nextText);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + aligned.length);
    });
  };

  const cancelPublishEdit = () => {
    const sender = publishDraft.sender || "役員";
    setEditingPublishId(null);
    setPublishDraft({ ...defaultPublishDraft, sender });
    setPublishAttachment(null);
    setPublishMessage("");
  };

  const startPublishEdit = (item: WorkItem) => {
    const row = item.source || {};
    const type: PublishType = item.type === "assembly" ? "assembly" : item.type === "event" ? "event" : item.type === "notice" ? "notice" : "circular";
    setEditingPublishId(item.circularId || row.id || null);
    setPublishDraft({
      type,
      title: row.title || item.title || "",
      sender: row.author_name || row.author || "役員",
      content: row.content || row.body || "",
      eventDate: type === "event" ? toDateInputValue(row.event_date) : "",
      eventTime: type === "event" ? row.event_time || "" : "",
      assemblyDate: type === "assembly" ? toDateInputValue(row.event_date) : "",
      assemblyTime: type === "assembly" ? row.event_time || "" : "",
      proxyTemplateText: type === "assembly" ? row.proxy_template_text || defaultProxyTemplateText(row.title || item.title || "総会") : "",
      pushEnabled: false,
    });
    setPublishAttachment(null);
    setActiveAdminScreen("publishFeature");
    setPublishMessage("発信内容を編集中です。必要な項目を変更して更新してください。");
  };

  const uploadPublishAttachment = async (file: File) => {
    const fileName = `${townId}/circulars/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("attachments").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("attachments").getPublicUrl(fileName);
    return {
      name: file.name,
      url: data.publicUrl,
      type: file.type || "application/octet-stream",
      role: publishDraft.type === "assembly" ? "assembly_notice" : "attachment",
    };
  };

  const insertCircularWithFallback = async (payload: Record<string, any>) => {
    let nextPayload = { ...payload };
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const result = await supabase.from("circulars").insert(nextPayload).select("*").single();
      if (!result.error) return { ...(result.data || {}), ...nextPayload };

      const missingColumn = missingColumnFromError(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
        delete nextPayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    throw new Error("発信内容を保存できませんでした。");
  };

  const insertRowWithFallback = async (table: string, payload: Record<string, any>, errorMessage: string) => {
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

  const updateRowWithFallback = async (table: string, id: number | string, payload: Record<string, any>, errorMessage: string) => {
    let nextPayload = { ...payload };
    for (let attempt = 0; attempt < 18; attempt += 1) {
      const result = await supabase.from(table).update(nextPayload).eq("id", id).select("*").single();
      if (!result.error) return { ...(result.data || {}), ...nextPayload, id };

      const missingColumn = missingColumnFromError(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
        delete nextPayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    throw new Error(errorMessage);
  };

  const publishWorkItem = (row: any, replies: any[] = []): WorkItem => {
    const workType: WorkItem["type"] = row.category === "assembly" ? "assembly" : row.category === "event" ? "event" : row.category === "notice" || row.category === "info" ? "notice" : "circular";
    const attachments = parseAttachmentList(row.attachments);
    const attachmentCount = attachments.length + (row.image_url ? 1 : 0) + (row.attachment_url || row.file_url || row.pdf_url ? 1 : 0);
    const replySummary = summarizeReplies(workType, replies);
    return {
      id: `circular-${row.id || Date.now()}`,
      circularId: row.id,
      type: workType,
      title: row.title || "タイトル未設定",
      date: toDisplayDate(row.event_date || row.created_at),
      detail:
        workType === "event"
          ? replySummary || "参加者の返答を確認"
          : workType === "assembly"
            ? replySummary || "出席/欠席と委任状を確認"
            : row.is_pushed
              ? "プッシュ通知済み"
              : "電子掲示板に掲示",
      status: row.is_pushed ? "通知済" : "掲示のみ",
      action: workType === "event" ? "参加返信" : workType === "assembly" ? "出欠・委任状" : "既読確認",
      tone: workType,
      attachmentCount,
      replies,
      replySummary,
      source: row,
    };
  };

  const liveSessionWorkItem = (session: any, replies: any[] = []): WorkItem => ({
    id: `live-${session.id || Date.now()}`,
    type: "live",
    title: session.title || "Web会議",
    date: toDisplayDate(session.event_date || session.starts_at || session.created_at),
    detail: `${session.provider === "youtube" ? "YouTube" : "LINE"}案内 / 申込 ${replies.length}件`,
    status: session.status || "予定",
    action: "参加者",
    tone: "live",
    replies,
  });

  const facilityWorkItem = (facility: any): WorkItem => ({
    id: `facility-${facility.id || Date.now()}`,
    type: "facility",
    title: facility.name || "施設",
    date: facility.available_hours || "施設登録",
    detail: `${facility.location || "場所未設定"} / 利用可能 ${facility.available_hours || "未設定"}`,
    status: facility.is_active === false ? "停止中" : "利用可",
    action: "施設設定",
    tone: "facility",
  });

  const handleLiveSessionDraftChange = <K extends keyof LiveSessionDraft>(field: K, value: LiveSessionDraft[K]) => {
    setLiveSessionDraft((current) => ({ ...current, [field]: value }));
    setLiveFacilityMessage("");
  };

  const handleFacilityDraftChange = <K extends keyof FacilityDraft>(field: K, value: FacilityDraft[K]) => {
    setFacilityDraft((current) => ({ ...current, [field]: value }));
    setLiveFacilityMessage("");
  };

  const cancelLiveSessionEdit = () => {
    setEditingLiveSessionId(null);
    setLiveSessionDraft(defaultLiveSessionDraft);
    setLiveFacilityMessage("");
  };

  const startLiveSessionEdit = (session: any) => {
    setEditingLiveSessionId(session.id);
    setLiveSessionDraft({
      provider: session.provider === "youtube" ? "youtube" : "line",
      title: session.title || "",
      content: session.content || session.description || "",
      eventDate: toDateInputValue(session.event_date || session.starts_at),
      eventTime: session.event_time || "",
      url: session.meeting_url || session.live_url || session.event_url || "",
      notifyEnabled: false,
    });
    setActiveLiveFacilityScreen("live");
    setLiveFacilityMessage("Web会議案内を編集中です。必要な項目を変更して更新してください。");
  };

  const cancelFacilityEdit = () => {
    setEditingFacilityId(null);
    setFacilityDraft(defaultFacilityDraft);
    setLiveFacilityMessage("");
  };

  const startFacilityEdit = (facility: any) => {
    const [fallbackStart, fallbackEnd] = String(facility.available_hours || "09:00-21:00").split("-");
    setEditingFacilityId(facility.id);
    setFacilityDraft({
      name: facility.name || "",
      location: facility.location || "",
      capacity: facility.capacity || facility.scale || "",
      availableStartTime: facility.available_start_time || fallbackStart || "09:00",
      availableEndTime: facility.available_end_time || fallbackEnd || "21:00",
      unavailableWeekdays: Array.isArray(facility.unavailable_weekdays) ? facility.unavailable_weekdays : [],
      unavailableDateInput: "",
      unavailableDates: Array.isArray(facility.unavailable_dates) ? facility.unavailable_dates : [],
    });
    setActiveLiveFacilityScreen("facility");
    setLiveFacilityMessage("施設情報を編集中です。必要な項目を変更して更新してください。");
  };

  const toggleFacilityUnavailableWeekday = (weekday: string) => {
    setFacilityDraft((current) => ({
      ...current,
      unavailableWeekdays: current.unavailableWeekdays.includes(weekday)
        ? current.unavailableWeekdays.filter((item) => item !== weekday)
        : [...current.unavailableWeekdays, weekday],
    }));
    setLiveFacilityMessage("");
  };

  const addFacilityUnavailableDate = () => {
    const nextDate = facilityDraft.unavailableDateInput;
    if (!nextDate) {
      setLiveFacilityMessage("追加する利用不可日を選択してください。");
      return;
    }
    setFacilityDraft((current) => ({
      ...current,
      unavailableDateInput: "",
      unavailableDates: current.unavailableDates.includes(nextDate) ? current.unavailableDates : [...current.unavailableDates, nextDate].sort(),
    }));
    setLiveFacilityMessage("");
  };

  const removeFacilityUnavailableDate = (targetDate: string) => {
    setFacilityDraft((current) => ({
      ...current,
      unavailableDates: current.unavailableDates.filter((item) => item !== targetDate),
    }));
    setLiveFacilityMessage("");
  };

  const handleLiveSessionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = liveSessionDraft.title.trim();
    const content = liveSessionDraft.content.trim();
    const eventDate = liveSessionDraft.eventDate;
    const eventTime = liveSessionDraft.eventTime.trim();
    const url = liveSessionDraft.url.trim();

    if (!title || !content || !eventDate || !url) {
      setLiveFacilityMessage("Web会議の表題、内容、開催日、開催URLを入力してください。");
      return;
    }

    setLiveFacilityBusy(true);
    setLiveFacilityMessage("");
    try {
      const startsAt = eventDate ? new Date(`${eventDate}T00:00:00`).toISOString() : null;
      const payload = {
        neighborhood_id: townId,
        provider: liveSessionDraft.provider,
        title,
        content,
        description: content,
        event_date: eventDate,
        event_time: eventTime || null,
        starts_at: startsAt,
        meeting_url: url,
        live_url: url,
        event_url: url,
        status: "予定",
        updated_at: new Date().toISOString(),
      };
      const saved = editingLiveSessionId
        ? await updateRowWithFallback("live_sessions", editingLiveSessionId, payload, "Web会議予定を更新できませんでした。")
        : await insertRowWithFallback("live_sessions", { ...payload, created_at: new Date().toISOString() }, "Web会議予定を保存できませんでした。");

      let notice = editingLiveSessionId ? "Web会議予定を更新しました。" : "Web会議予定を保存しました。";
      if (liveSessionDraft.notifyEnabled) {
        try {
          const response = await fetch("/api/admin/publish-line", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              townId,
              title,
              category: "live",
              content,
              targetUrl: `${window.location.origin}/resident?tab=live`,
              pushEnabled: true,
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (response.ok && result.skipped) {
            if (result.reason === "LINE channel access token is not configured") {
              notice = `${editingLiveSessionId ? "Web会議予定を更新" : "Web会議予定を保存"}しました。LINEチャネル未設定のため通知は未送信です。`;
            } else if (result.reason === "LINE user ID columns are not configured") {
              notice = `${editingLiveSessionId ? "Web会議予定を更新" : "Web会議予定を保存"}しました。LINE送信用IDの保存カラムが未設定です。docs/sql/line_push_user_id_columns_2026-07-10.sql を実行してください。`;
            } else {
              notice = `${editingLiveSessionId ? "Web会議予定を更新" : "Web会議予定を保存"}しました。LINE送信先IDが未登録です。会員が一度LINEから会員画面を開くと送信可能になります。`;
            }
          } else if (response.ok) {
            const firstError = Array.isArray(result.errors) && result.errors[0] ? ` 先頭エラー: HTTP ${result.errors[0].status}` : "";
            notice = `${editingLiveSessionId ? "Web会議予定を更新" : "Web会議予定を保存"}しました。LINEへ ${result.sent || 0}件送信しました。失敗 ${result.failed || 0}件。${firstError}`;
          } else {
            const reason = result.error || result.message || `HTTP ${response.status}`;
            notice = `${editingLiveSessionId ? "Web会議予定を更新" : "Web会議予定を保存"}しました。LINE通知送信に失敗しました（${reason}）。`;
          }
        } catch {
          notice = `${editingLiveSessionId ? "Web会議予定を更新" : "Web会議予定を保存"}しました。LINE通知は設定確認後に再実行してください。`;
        }
      }

      const replies = liveFacilityData.liveApplications.filter((reply) => String(reply.live_session_id) === String(saved.id));
      const nextWorkItem = liveSessionWorkItem(saved, replies);
      setLiveFacilityData((current) => ({
        ...current,
        liveSessions: editingLiveSessionId
          ? current.liveSessions.map((item) => String(item.id) === String(editingLiveSessionId) ? saved : item)
          : [saved, ...current.liveSessions],
      }));
      setWorkItems((current) => editingLiveSessionId
        ? current.map((item) => item.id === `live-${editingLiveSessionId}` ? nextWorkItem : item)
        : [nextWorkItem, ...current]);
      setEditingLiveSessionId(null);
      setLiveSessionDraft(defaultLiveSessionDraft);
      setLiveFacilityMessage(notice);
    } catch (error: any) {
      setLiveFacilityMessage(error?.message || "Web会議予定の保存に失敗しました。");
    } finally {
      setLiveFacilityBusy(false);
    }
  };

  const handleFacilitySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = facilityDraft.name.trim();
    const availableStartTime = facilityDraft.availableStartTime;
    const availableEndTime = facilityDraft.availableEndTime;
    if (!name) {
      setLiveFacilityMessage("施設名を入力してください。");
      return;
    }
    if (!availableStartTime || !availableEndTime) {
      setLiveFacilityMessage("利用可能時間帯の開始・終了時刻を入力してください。");
      return;
    }
    if (availableStartTime >= availableEndTime) {
      setLiveFacilityMessage("利用可能時間帯は、終了時刻を開始時刻より後にしてください。");
      return;
    }

    setLiveFacilityBusy(true);
    setLiveFacilityMessage("");
    try {
      const availableHours = `${availableStartTime}-${availableEndTime}`;
      const payload = {
        neighborhood_id: townId,
        name,
        location: facilityDraft.location.trim() || null,
        capacity: facilityDraft.capacity.trim() || null,
        scale: facilityDraft.capacity.trim() || null,
        available_start_time: availableStartTime,
        available_end_time: availableEndTime,
        available_hours: availableHours,
        unavailable_weekdays: facilityDraft.unavailableWeekdays,
        unavailable_dates: facilityDraft.unavailableDates,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      const saved = editingFacilityId
        ? await updateRowWithFallback("facilities", editingFacilityId, payload, "施設を更新できませんでした。")
        : await insertRowWithFallback("facilities", { ...payload, created_at: new Date().toISOString() }, "施設を保存できませんでした。");
      const nextWorkItem = facilityWorkItem(saved);
      setLiveFacilityData((current) => ({
        ...current,
        facilities: editingFacilityId
          ? current.facilities.map((item) => String(item.id) === String(editingFacilityId) ? saved : item)
          : [saved, ...current.facilities],
      }));
      setWorkItems((current) => editingFacilityId
        ? current.map((item) => item.id === `facility-${editingFacilityId}` ? nextWorkItem : item)
        : [nextWorkItem, ...current]);
      setEditingFacilityId(null);
      setFacilityDraft(defaultFacilityDraft);
      setLiveFacilityMessage(editingFacilityId ? "施設情報を更新しました。" : "施設を登録しました。会員側の施設予約画面から予約できます。");
    } catch (error: any) {
      setLiveFacilityMessage(error?.message || "施設の保存に失敗しました。");
    } finally {
      setLiveFacilityBusy(false);
    }
  };

  const handleReservationStatusChange = async (reservation: any, status: "approved" | "rejected" | "pending") => {
    setLiveFacilityBusy(true);
    setLiveFacilityMessage("");
    const { data, error } = await supabase
      .from("facility_reservations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", reservation.id)
      .select("*")
      .single();
    if (error) {
      setLiveFacilityMessage(error.message || "予約状態を更新できませんでした。");
    } else {
      setLiveFacilityData((current) => ({
        ...current,
        reservations: current.reservations.map((item) => item.id === reservation.id ? { ...item, ...(data || {}), status } : item),
      }));
      setLiveFacilityMessage(status === "approved" ? "施設予約を承認しました。" : status === "rejected" ? "施設予約を否認しました。" : "施設予約を承認待ちに戻しました。");
    }
    setLiveFacilityBusy(false);
  };

  const handleLiveSessionDelete = async (session: any) => {
    const replyCount = liveFacilityData.liveApplications.filter((reply) => String(reply.live_session_id) === String(session.id)).length;
    const confirmed = typeof window === "undefined" || window.confirm(`「${session.title || "Web会議"}」を削除します。${replyCount ? `参加返信 ${replyCount}件も削除される可能性があります。` : ""}よろしいですか？`);
    if (!confirmed) return;

    setLiveFacilityBusy(true);
    setLiveFacilityMessage("");
    try {
      const result = await supabase
        .from("live_sessions")
        .delete()
        .eq("id", session.id)
        .eq("neighborhood_id", townId)
        .select("id");

      if (result.error) throw result.error;
      if (!result.data || result.data.length === 0) {
        throw new Error("Web会議予定は削除されませんでした。管理者権限またはRLSポリシーを確認してください。");
      }

      setLiveFacilityData((current) => ({
        ...current,
        liveSessions: current.liveSessions.filter((item) => String(item.id) !== String(session.id)),
        liveApplications: current.liveApplications.filter((reply) => String(reply.live_session_id) !== String(session.id)),
      }));
      setWorkItems((current) => current.filter((item) => item.id !== `live-${session.id}`));
      if (String(editingLiveSessionId) === String(session.id)) cancelLiveSessionEdit();
      setLiveFacilityMessage("Web会議予定を削除しました。");
    } catch (error: any) {
      setLiveFacilityMessage(error?.message || "Web会議予定を削除できませんでした。");
    } finally {
      setLiveFacilityBusy(false);
    }
  };

  const handleFacilityDelete = async (facility: any) => {
    const reservationCount = liveFacilityData.reservations.filter((reservation) => String(reservation.facility_id) === String(facility.id)).length;
    const confirmed = typeof window === "undefined" || window.confirm(`「${facility.name || "施設"}」を削除します。${reservationCount ? `予約申込 ${reservationCount}件も削除される可能性があります。` : ""}よろしいですか？`);
    if (!confirmed) return;

    setLiveFacilityBusy(true);
    setLiveFacilityMessage("");
    try {
      const result = await supabase
        .from("facilities")
        .delete()
        .eq("id", facility.id)
        .eq("neighborhood_id", townId)
        .select("id");

      if (result.error) throw result.error;
      if (!result.data || result.data.length === 0) {
        throw new Error("施設は削除されませんでした。管理者権限またはRLSポリシーを確認してください。");
      }

      setLiveFacilityData((current) => ({
        ...current,
        facilities: current.facilities.filter((item) => String(item.id) !== String(facility.id)),
        reservations: current.reservations.filter((reservation) => String(reservation.facility_id) !== String(facility.id)),
      }));
      setWorkItems((current) => current.filter((item) => item.id !== `facility-${facility.id}` && !item.replies?.some((reply) => String(reply.facility_id) === String(facility.id))));
      if (String(editingFacilityId) === String(facility.id)) cancelFacilityEdit();
      setLiveFacilityMessage("施設を削除しました。");
    } catch (error: any) {
      setLiveFacilityMessage(error?.message || "施設を削除できませんでした。");
    } finally {
      setLiveFacilityBusy(false);
    }
  };

  const handlePublishSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = publishDraft.title.trim();
    const sender = publishDraft.sender.trim() || "役員";
    const content = publishDraft.content.trim();
    const pushEnabled = publishDraft.pushEnabled;

    if (!title) {
      setPublishMessage("表題を入力してください。");
      return;
    }
    if (!content) {
      setPublishMessage("内容を入力してください。");
      return;
    }
    if (publishDraft.type === "event" && !publishDraft.eventDate) {
      setPublishMessage("イベントの開催日を入力してください。");
      return;
    }
    if (publishDraft.type === "assembly" && !publishDraft.assemblyDate) {
      setPublishMessage("総会日を入力してください。");
      return;
    }

    setPublishBusy(true);
    setPublishMessage("");

    try {
      const existingItem = editingPublishId ? workItems.find((item) => String(item.circularId) === String(editingPublishId)) : null;
      const existingSource = existingItem?.source || {};
      const attachment = publishAttachment ? await uploadPublishAttachment(publishAttachment) : null;
      const existingAttachments = parseAttachmentList(existingSource.attachments);
      const attachments = attachment ? [attachment] : existingAttachments;
      const nowIso = new Date().toISOString();
      const category = publishDraft.type;
      const eventDate =
        category === "event"
          ? publishDraft.eventDate
          : category === "assembly"
            ? publishDraft.assemblyDate
            : null;
      const payload: Record<string, any> = {
        neighborhood_id: townId,
        title,
        content,
        body: content,
        category,
        author_name: sender,
        author: sender,
        published_at: existingSource.published_at || nowIso,
        is_pushed: pushEnabled,
        attachments,
        attachment_url: attachment?.url || existingSource.attachment_url || attachments[0]?.url || null,
        image_url: attachment ? (attachment.type?.startsWith("image/") ? attachment.url : null) : existingSource.image_url || null,
        pdf_url: attachment ? (attachment.type === "application/pdf" ? attachment.url : null) : existingSource.pdf_url || null,
        event_date: eventDate,
        event_time: category === "event" ? publishDraft.eventTime.trim() || null : category === "assembly" ? publishDraft.assemblyTime.trim() || null : null,
        meeting_at: null,
        requires_reply: category === "event" || category === "assembly",
        proxy_template_text: category === "assembly" ? publishDraft.proxyTemplateText.trim() || defaultProxyTemplateText(title) : null,
        updated_at: nowIso,
      };
      const saved = editingPublishId
        ? await updateRowWithFallback("circulars", editingPublishId, payload, "発信内容を更新できませんでした。")
        : await insertCircularWithFallback(payload);
      const lineImageUrl = firstImageAttachmentUrl(attachments, saved.image_url || payload.image_url);
      let lineNotice = editingPublishId ? "LINEプッシュ通知は送信していません。" : "電子掲示板へ保存しました。LINEプッシュ通知は送信していません。";
      if (pushEnabled) {
        lineNotice = "LINE通知用リンクとして利用できます。";
        try {
          const response = await fetch("/api/admin/publish-line", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              townId,
              circularId: saved.id,
              title,
              category,
              content,
              pushEnabled,
              imageUrl: lineImageUrl,
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (response.ok && result.skipped) {
            if (result.reason === "LINE channel access token is not configured") {
              lineNotice = `LINEチャネルアクセストークン未設定のため、${editingPublishId ? "更新" : "保存"}のみ行いました。会員画面の回覧板には表示されています。`;
            } else if (result.reason === "LINE user ID columns are not configured") {
              lineNotice = `LINE送信用IDの保存カラムが未設定のため、${editingPublishId ? "更新" : "保存"}のみ行いました。docs/sql/line_push_user_id_columns_2026-07-10.sql を実行してください。`;
            } else {
              lineNotice = `LINE送信先IDが未登録のため、${editingPublishId ? "更新" : "保存"}のみ行いました。会員が一度LINEから会員画面を開くと送信可能になります。`;
            }
          } else if (response.ok) {
            const firstError = Array.isArray(result.errors) && result.errors[0] ? ` 先頭エラー: HTTP ${result.errors[0].status}` : "";
            lineNotice = `LINEへ ${result.sent || 0}件送信しました。失敗 ${result.failed || 0}件。会員画面の回覧板にも表示されています。${firstError}`;
          } else {
            const reason = result.error || result.message || `HTTP ${response.status}`;
            lineNotice = `LINE通知送信に失敗しました（${reason}）。会員画面の回覧板には表示されています。`;
          }
        } catch {
          lineNotice = `${editingPublishId ? "更新" : "保存"}しました。LINE送信はネットワークまたは設定確認後に再実行してください。会員画面の回覧板には表示されています。`;
        }
      }
      const nextReplies = existingItem?.replies || [];
      const nextWorkItem = publishWorkItem(saved, nextReplies);
      setWorkItems((current) => editingPublishId
        ? current.map((item) => String(item.circularId) === String(editingPublishId) ? nextWorkItem : item)
        : [nextWorkItem, ...current]);
      if (pushEnabled) setSummary((current) => ({ ...current, monthlyPushes: current.monthlyPushes + 1 }));
      setEditingPublishId(null);
      setPublishDraft({ ...defaultPublishDraft, sender });
      setPublishAttachment(null);
      setPublishMessage(`${editingPublishId ? "発信内容を更新しました。" : "発信内容を保存しました。"}${lineNotice}`);
    } catch (error: any) {
      const message = String(error?.message || "");
      setPublishMessage(
        message.includes("check constraint") || message.includes("violates")
          ? "発信種別のDB制約を更新してください。docs/sql/publish_feature_columns_2026-07-08.sql をSupabase SQL Editorで実行すると保存できます。"
          : error?.message || "発信内容の保存に失敗しました。",
      );
    } finally {
      setPublishBusy(false);
    }
  };

  const handlePublishDelete = async (item: WorkItem) => {
    const circularId = item.circularId;
    if (!circularId) {
      setPublishMessage("削除対象の発信IDを確認できませんでした。");
      return;
    }

    const replyCount = item.replies?.length || 0;
    const confirmed = typeof window === "undefined" || window.confirm(`「${item.title}」を削除します。${replyCount ? `参加者・申込 ${replyCount}件も削除します。` : ""}よろしいですか？`);
    if (!confirmed) return;

    setPublishBusy(true);
    setPublishMessage("");
    try {
      const replyDelete = await supabase
        .from("event_applications")
        .delete()
        .eq("neighborhood_id", townId)
        .or(`circular_id.eq.${circularId},event_id.eq.${circularId},assembly_notice_id.eq.${circularId}`);

      if (replyDelete.error) throw replyDelete.error;

      const circularDelete = await supabase
        .from("circulars")
        .delete()
        .eq("id", circularId)
        .eq("neighborhood_id", townId);

      if (circularDelete.error) throw circularDelete.error;

      setWorkItems((current) => current.filter((workItem) => String(workItem.circularId) !== String(circularId)));
      if (String(editingPublishId) === String(circularId)) cancelPublishEdit();
      setPublishMessage("発信内容と関連する参加者・申込を削除しました。");
    } catch (error: any) {
      setPublishMessage(error?.message || "発信内容の削除に失敗しました。");
    } finally {
      setPublishBusy(false);
    }
  };

  const handleAssemblyCategoryDraftChange = <K extends keyof AssemblyCategoryDraft>(field: K, value: AssemblyCategoryDraft[K]) => {
    setAssemblyCategoryDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "type" ? { parentId: "" } : {}),
    }));
    setAssemblyMessage("");
  };

  const handleAssemblySettlementDraftChange = <K extends keyof AssemblySettlementDraft>(field: K, value: AssemblySettlementDraft[K]) => {
    setAssemblySettlementDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "type") {
        const firstCategory = assemblyData.categories
          .filter((category) => isActiveAssemblyCategory(category) && category.type === value)
          .find((category) => !isAssemblyFeeCategory(category));
        next.categoryId = firstCategory ? String(firstCategory.id) : "";
      }
      return next;
    });
    setAssemblyMessage("");
  };

  const cancelAssemblyCategoryEdit = () => {
    setEditingAssemblyCategoryId(null);
    setAssemblyCategoryDraft(defaultAssemblyCategoryDraft);
    setAssemblyMessage("");
  };

  const startAssemblyCategoryEdit = (category: any) => {
    setEditingAssemblyCategoryId(category.id);
    setAssemblyCategoryDraft({
      type: category.type === "expense" ? "expense" : "income",
      parentId: category.parent_id ? String(category.parent_id) : "",
      name: category.name || "",
      sortOrder: String(category.sort_order ?? ""),
    });
    setActiveAssemblyTab("categories");
    setAssemblyMessage("科目を編集中です。");
  };

  const handleAssemblyCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = assemblyCategoryDraft.name.trim();
    if (!name) {
      setAssemblyMessage("科目名を入力してください。");
      return;
    }
    if (assemblyCategoryDraft.parentId && String(assemblyCategoryDraft.parentId) === String(editingAssemblyCategoryId)) {
      setAssemblyMessage("自分自身を補助科目の親にはできません。");
      return;
    }

    setAssemblyBusy(true);
    setAssemblyMessage("");
    try {
      const payload = {
        neighborhood_id: townId,
        type: assemblyCategoryDraft.type,
        name,
        parent_id: assemblyCategoryDraft.parentId ? Number(assemblyCategoryDraft.parentId) : null,
        sort_order: assemblyCategoryDraft.sortOrder ? Number(assemblyCategoryDraft.sortOrder) : 0,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (editingAssemblyCategoryId) {
        await updateRowWithFallback("assembly_categories", editingAssemblyCategoryId, payload, "科目を更新できませんでした。");
      } else {
        await insertRowWithFallback("assembly_categories", { ...payload, is_standard: false, created_at: new Date().toISOString() }, "科目を追加できませんでした。");
      }
      setEditingAssemblyCategoryId(null);
      setAssemblyCategoryDraft(defaultAssemblyCategoryDraft);
      await fetchAssemblyAccounting(editingAssemblyCategoryId ? "科目を更新しました。" : "科目を追加しました。");
    } catch (error: any) {
      setAssemblyMessage(error?.message || "科目の保存に失敗しました。");
      setAssemblyBusy(false);
    }
  };

  const handleInitializeStandardAssemblyCategories = async () => {
    let standardRows = standardAssemblyCategories;
    try {
      const { data } = await supabase
        .from("assembly_standard_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) {
        standardRows = data.map((row: any) => ({
          type: row.type === "expense" ? "expense" : "income",
          name: row.name,
          sortOrder: Number(row.sort_order ?? 0),
        }));
      }
    } catch {
      standardRows = standardAssemblyCategories;
    }

    const existingKeys = new Set(
      assemblyData.categories
        .filter((category) => !category.parent_id)
        .map((category) => `${category.type}:${String(category.name || "").trim()}`),
    );
    const inserts = standardRows
      .filter((category) => !existingKeys.has(`${category.type}:${category.name}`))
      .map((category) => ({
        neighborhood_id: townId,
        type: category.type,
        name: category.name,
        parent_id: null,
        sort_order: category.sortOrder,
        is_standard: true,
        is_active: true,
      }));

    if (inserts.length === 0) {
      setAssemblyMessage("標準科目はすでに作成済みです。");
      return;
    }

    setAssemblyBusy(true);
    setAssemblyMessage("");
    try {
      const { error } = await supabase.from("assembly_categories").insert(inserts);
      if (error) throw error;
      await fetchAssemblyAccounting(`標準科目を${inserts.length}件作成しました。`);
    } catch (error: any) {
      setAssemblyMessage(error?.message || "標準科目を作成できませんでした。");
      setAssemblyBusy(false);
    }
  };

  const handleAssemblyCategoryDelete = async (category: any) => {
    const collectCategoryIds = (target: any): Array<number | string> => {
      const childIds = assemblyData.categories
        .filter((item) => String(item.parent_id) === String(target.id))
        .flatMap((item) => collectCategoryIds(item));
      return [target.id, ...childIds];
    };
    const targetCategoryIds = collectCategoryIds(category);
    const targetCategoryIdSet = new Set(targetCategoryIds.map(String));
    const childCount = targetCategoryIds.length - 1;
    const settlementCount = assemblyData.settlements.filter((item) => targetCategoryIdSet.has(String(item.category_id))).length;
    const confirmed = typeof window === "undefined" || window.confirm(
      `「${category.name || "科目"}」を削除します。${childCount ? `補助科目 ${childCount}件も対象です。` : ""}${settlementCount ? `決算明細 ${settlementCount}件は削除せず未設定項目へ移します。` : ""}よろしいですか？`,
    );
    if (!confirmed) return;

    setAssemblyBusy(true);
    setAssemblyMessage("");
    if (settlementCount > 0) {
      const settlementUpdate = await supabase
        .from("assembly_settlements")
        .update({ category_id: null, updated_at: new Date().toISOString() })
        .eq("neighborhood_id", townId)
        .in("category_id", targetCategoryIds);
      if (settlementUpdate.error) {
        setAssemblyMessage("科目削除前に docs/sql/assembly_accounting_category_delete_set_null_2026-07-09.sql をSupabase SQL Editorで実行してください。決算明細を未設定項目に移せるようにします。");
        setAssemblyBusy(false);
        return;
      }
    }

    const categoryDelete = await supabase
      .from("assembly_categories")
      .delete()
      .eq("id", category.id)
      .eq("neighborhood_id", townId);
    if (categoryDelete.error) {
      setAssemblyMessage(categoryDelete.error.message || "科目を削除できませんでした。");
      setAssemblyBusy(false);
      return;
    }
    if (String(editingAssemblyCategoryId) === String(category.id)) cancelAssemblyCategoryEdit();
    await fetchAssemblyAccounting(settlementCount > 0 ? "科目を削除し、決算明細は未設定項目へ移しました。" : "科目を削除しました。");
  };

  const handleAssemblyBudgetDraftChange = (categoryId: string | number, field: keyof AssemblyBudgetDraft, value: string) => {
    setAssemblyBudgetDrafts((current) => ({
      ...current,
      [String(categoryId)]: {
        ...(current[String(categoryId)] || { budgetAmount: "0", previousBudgetAmount: "0", note: "" }),
        [field]: value,
      },
    }));
    setAssemblyMessage("");
  };

  const handleAssemblyBudgetSave = async () => {
    const categories = assemblyData.categories.filter(isActiveAssemblyCategory);
    if (categories.length === 0) {
      setAssemblyMessage("先に科目を作成してください。");
      return;
    }

    setAssemblyBusy(true);
    setAssemblyMessage("");
    try {
      const rows = categories.map((category) => {
        const draft = assemblyBudgetDrafts[String(category.id)] || { budgetAmount: "0", previousBudgetAmount: "0", note: "" };
        return {
          neighborhood_id: townId,
          fiscal_year: assemblyFiscalYear,
          category_id: Number(category.id),
          budget_amount: amountFromInput(draft.budgetAmount),
          previous_budget_amount: amountFromInput(draft.previousBudgetAmount),
          note: draft.note.trim() || null,
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase
        .from("assembly_budgets")
        .upsert(rows, { onConflict: "neighborhood_id,fiscal_year,category_id" });
      if (error) throw error;
      await fetchAssemblyAccounting("予算を保存しました。");
    } catch (error: any) {
      setAssemblyMessage(error?.message || "予算を保存できませんでした。");
      setAssemblyBusy(false);
    }
  };

  const uploadAssemblyReceipt = async (file: File) => {
    const fileName = `${townId}/assembly-receipts/${assemblyFiscalYear}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("attachments").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("attachments").getPublicUrl(fileName);
    return { url: data.publicUrl, name: file.name };
  };

  const handleAssemblySettlementSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const category = assemblyData.categories.find((item) => String(item.id) === String(assemblySettlementDraft.categoryId));
    const amount = amountFromInput(assemblySettlementDraft.amount);
    if (!category) {
      setAssemblyMessage("決算明細の科目を選択してください。");
      return;
    }
    if (isAssemblyFeeCategory(category)) {
      setAssemblyMessage("会費科目の実績は会費管理から自動集計します。手動明細は別の収入科目へ入力してください。");
      return;
    }
    if (!assemblySettlementDraft.paidDate || amount <= 0) {
      setAssemblyMessage("日付と金額を入力してください。");
      return;
    }

    setAssemblyBusy(true);
    setAssemblyMessage("");
    try {
      const receipt = assemblyReceiptFile ? await uploadAssemblyReceipt(assemblyReceiptFile) : null;
      await insertRowWithFallback("assembly_settlements", {
        neighborhood_id: townId,
        fiscal_year: assemblyFiscalYear,
        category_id: Number(category.id),
        type: category.type === "expense" ? "expense" : "income",
        amount,
        paid_date: assemblySettlementDraft.paidDate,
        description: assemblySettlementDraft.description.trim() || null,
        receipt_url: receipt?.url || null,
        receipt_name: receipt?.name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, "決算明細を保存できませんでした。");
      setAssemblyReceiptFile(null);
      setAssemblySettlementDraft((current) => ({ ...current, amount: "", description: "" }));
      await fetchAssemblyAccounting("決算明細を追加しました。");
    } catch (error: any) {
      setAssemblyMessage(error?.message || "決算明細の保存に失敗しました。");
      setAssemblyBusy(false);
    }
  };

  const handleAssemblySettlementDelete = async (settlement: any) => {
    const confirmed = typeof window === "undefined" || window.confirm(`「${settlement.description || "決算明細"}」を削除します。よろしいですか？`);
    if (!confirmed) return;

    setAssemblyBusy(true);
    setAssemblyMessage("");
    const { error } = await supabase
      .from("assembly_settlements")
      .delete()
      .eq("id", settlement.id)
      .eq("neighborhood_id", townId);
    if (error) {
      setAssemblyMessage(error.message || "決算明細を削除できませんでした。");
      setAssemblyBusy(false);
      return;
    }
    await fetchAssemblyAccounting("決算明細を削除しました。");
  };

  const exportAssemblyBudgetCsv = () => {
    const reportRows = buildAssemblyReportRows(assemblyData.categories, assemblyData.budgets, assemblyData.settlements, assemblyFeeRevenue);
    const incomeRows = reportRows.filter((row) => row.type === "income");
    const expenseRows = reportRows.filter((row) => row.type === "expense");
    const previousIncomeBudget = incomeRows.reduce((sum, row) => sum + row.previousBudget, 0);
    const incomeBudget = incomeRows.reduce((sum, row) => sum + row.budget, 0);
    const previousExpenseBudget = expenseRows.reduce((sum, row) => sum + row.previousBudget, 0);
    const expenseBudget = expenseRows.reduce((sum, row) => sum + row.budget, 0);
    const previousBudgetBalance = previousIncomeBudget - previousExpenseBudget;
    const budgetBalance = incomeBudget - expenseBudget;
    const toBudgetCsvRow = (row: AssemblyReportRow) => [
      `${assemblyFiscalYear}年度`,
      assemblyCategoryTypeLabel[row.type],
      formatAssemblyChildName(row.name, row.isChild),
      row.previousBudget,
      row.budget,
      row.budgetDiff,
      row.note,
    ];
    const rows = [
      [`${assemblyFiscalYear}年度`, "収入", "", "", "", "", ""],
      ...incomeRows.map(toBudgetCsvRow),
      [`${assemblyFiscalYear}年度`, "収入計", "", previousIncomeBudget, incomeBudget, incomeBudget - previousIncomeBudget, ""],
      [`${assemblyFiscalYear}年度`, "支出", "", "", "", "", ""],
      ...expenseRows.map(toBudgetCsvRow),
      [`${assemblyFiscalYear}年度`, "支出計", "", previousExpenseBudget, expenseBudget, expenseBudget - previousExpenseBudget, ""],
      [`${assemblyFiscalYear}年度`, "差額", "収入計 - 支出計", previousBudgetBalance, budgetBalance, budgetBalance - previousBudgetBalance, ""],
    ];
    downloadCsv(`assembly_budget_${assemblyFiscalYear}.csv`, [["年度", "区分", "科目", "前年度予算", "本年度予算", "増減", "備考"], ...rows]);
  };

  const exportAssemblySettlementCsv = () => {
    const reportRows = buildAssemblyReportRows(assemblyData.categories, assemblyData.budgets, assemblyData.settlements, assemblyFeeRevenue);
    const incomeRows = reportRows.filter((row) => row.type === "income");
    const expenseRows = reportRows.filter((row) => row.type === "expense");
    const incomeBudget = incomeRows.reduce((sum, row) => sum + row.budget, 0);
    const incomeActual = incomeRows.reduce((sum, row) => sum + row.actual, 0);
    const expenseBudget = expenseRows.reduce((sum, row) => sum + row.budget, 0);
    const expenseActual = expenseRows.reduce((sum, row) => sum + row.actual, 0);
    const budgetBalance = incomeBudget - expenseBudget;
    const actualBalance = incomeActual - expenseActual;
    const toSettlementCsvRow = (row: AssemblyReportRow) => [
      `${assemblyFiscalYear}年度`,
      assemblyCategoryTypeLabel[row.type],
      formatAssemblyChildName(row.name, row.isChild),
      row.budget,
      row.actual,
      row.diff,
      row.note,
    ];
    const rows = [
      [`${assemblyFiscalYear}年度`, "収入", "", "", "", "", ""],
      ...incomeRows.map(toSettlementCsvRow),
      [`${assemblyFiscalYear}年度`, "収入計", "", incomeBudget, incomeActual, incomeActual - incomeBudget, ""],
      [`${assemblyFiscalYear}年度`, "支出", "", "", "", "", ""],
      ...expenseRows.map(toSettlementCsvRow),
      [`${assemblyFiscalYear}年度`, "支出計", "", expenseBudget, expenseActual, expenseActual - expenseBudget, ""],
      [`${assemblyFiscalYear}年度`, "差額", "収入計 - 支出計", budgetBalance, actualBalance, actualBalance - budgetBalance, ""],
    ];
    downloadCsv(`assembly_settlement_${assemblyFiscalYear}.csv`, [["年度", "区分", "科目", "予算額", "決算額", "差分", "備考"], ...rows]);
  };

  const printAssemblyBudget = () => {
    const rows = buildAssemblyReportRows(assemblyData.categories, assemblyData.budgets, assemblyData.settlements, assemblyFeeRevenue);
    const incomeRows = rows.filter((row) => row.type === "income");
    const expenseRows = rows.filter((row) => row.type === "expense");
    const previousIncomeBudget = incomeRows.reduce((sum, row) => sum + row.previousBudget, 0);
    const incomeBudget = incomeRows.reduce((sum, row) => sum + row.budget, 0);
    const previousExpenseBudget = expenseRows.reduce((sum, row) => sum + row.previousBudget, 0);
    const expenseBudget = expenseRows.reduce((sum, row) => sum + row.budget, 0);
    const previousBudgetBalance = previousIncomeBudget - previousExpenseBudget;
    const budgetBalance = incomeBudget - expenseBudget;
    const budgetRowHtml = (row: AssemblyReportRow) => `
      <tr>
        <td>${escapeHtml(assemblyCategoryTypeLabel[row.type])}</td>
        <td>${escapeHtml(formatAssemblyChildName(row.name, row.isChild))}</td>
        <td class="num">${escapeHtml(yen(row.previousBudget))}</td>
        <td class="num">${escapeHtml(yen(row.budget))}</td>
        <td class="num">${escapeHtml(yen(row.budgetDiff))}</td>
        <td>${escapeHtml(row.note)}</td>
      </tr>`;
    const bodyRows = `
      <tr class="section"><th colspan="6">収入</th></tr>
      ${incomeRows.map(budgetRowHtml).join("")}
      <tr class="total"><th colspan="2">収入計</th><td class="num">${escapeHtml(yen(previousIncomeBudget))}</td><td class="num">${escapeHtml(yen(incomeBudget))}</td><td class="num">${escapeHtml(yen(incomeBudget - previousIncomeBudget))}</td><td></td></tr>
      <tr class="section"><th colspan="6">支出</th></tr>
      ${expenseRows.map(budgetRowHtml).join("")}
      <tr class="total"><th colspan="2">支出計</th><td class="num">${escapeHtml(yen(previousExpenseBudget))}</td><td class="num">${escapeHtml(yen(expenseBudget))}</td><td class="num">${escapeHtml(yen(expenseBudget - previousExpenseBudget))}</td><td></td></tr>
      <tr class="total"><th colspan="2">差額</th><td class="num">${escapeHtml(yen(previousBudgetBalance))}</td><td class="num">${escapeHtml(yen(budgetBalance))}</td><td class="num">${escapeHtml(yen(budgetBalance - previousBudgetBalance))}</td><td>収入計 - 支出計</td></tr>`;
    openAccountingPrintWindow(`${assemblyFiscalYear}年度 予算書`, `
      <h1>${escapeHtml(townName)} ${assemblyFiscalYear}年度 予算書</h1>
      <p>前年度予算・本年度予算・増減</p>
      <table><thead><tr><th>区分</th><th>科目</th><th class="num">前年度予算</th><th class="num">本年度予算</th><th class="num">増減</th><th>備考</th></tr></thead><tbody>${bodyRows}</tbody></table>
    `);
  };

  const printAssemblySettlement = () => {
    const rows = buildAssemblyReportRows(assemblyData.categories, assemblyData.budgets, assemblyData.settlements, assemblyFeeRevenue);
    const incomeRows = rows.filter((row) => row.type === "income");
    const expenseRows = rows.filter((row) => row.type === "expense");
    const totals = {
      incomeBudget: incomeRows.reduce((sum, row) => sum + row.budget, 0),
      incomeActual: incomeRows.reduce((sum, row) => sum + row.actual, 0),
      expenseBudget: expenseRows.reduce((sum, row) => sum + row.budget, 0),
      expenseActual: expenseRows.reduce((sum, row) => sum + row.actual, 0),
    };
    const budgetBalance = totals.incomeBudget - totals.expenseBudget;
    const actualBalance = totals.incomeActual - totals.expenseActual;
    const settlementRowHtml = (row: AssemblyReportRow) => `
      <tr>
        <td>${escapeHtml(assemblyCategoryTypeLabel[row.type])}</td>
        <td>${escapeHtml(formatAssemblyChildName(row.name, row.isChild))}</td>
        <td class="num">${escapeHtml(yen(row.budget))}</td>
        <td class="num">${escapeHtml(yen(row.actual))}</td>
        <td class="num">${escapeHtml(yen(row.diff))}</td>
        <td>${escapeHtml(row.note)}</td>
      </tr>`;
    const bodyRows = `
      <tr class="section"><th colspan="6">収入</th></tr>
      ${incomeRows.map(settlementRowHtml).join("")}
      <tr class="total"><th colspan="2">収入計</th><td class="num">${escapeHtml(yen(totals.incomeBudget))}</td><td class="num">${escapeHtml(yen(totals.incomeActual))}</td><td class="num">${escapeHtml(yen(totals.incomeActual - totals.incomeBudget))}</td><td></td></tr>
      <tr class="section"><th colspan="6">支出</th></tr>
      ${expenseRows.map(settlementRowHtml).join("")}
      <tr class="total"><th colspan="2">支出計</th><td class="num">${escapeHtml(yen(totals.expenseBudget))}</td><td class="num">${escapeHtml(yen(totals.expenseActual))}</td><td class="num">${escapeHtml(yen(totals.expenseActual - totals.expenseBudget))}</td><td></td></tr>
      <tr class="total"><th colspan="2">差額</th><td class="num">${escapeHtml(yen(budgetBalance))}</td><td class="num">${escapeHtml(yen(actualBalance))}</td><td class="num">${escapeHtml(yen(actualBalance - budgetBalance))}</td><td>収入計 - 支出計</td></tr>`;
    openAccountingPrintWindow(`${assemblyFiscalYear}年度 決算書`, `
      <h1>${escapeHtml(townName)} ${assemblyFiscalYear}年度 決算書</h1>
      <p>予算額・決算額・差分</p>
      <table><thead><tr><th>区分</th><th>科目</th><th class="num">予算額</th><th class="num">決算額</th><th class="num">差分</th><th>備考</th></tr></thead><tbody>${bodyRows}</tbody></table>
    `);
  };

  const handleBasicInfoChange = (field: keyof BasicInfoDraft, value: string) => {
    setBasicInfoDraft((current) => ({ ...current, [field]: value }));
    setBasicInfoMessage("");
  };

  const handleBasicInfoSave = async () => {
    const name = basicInfoDraft.name.trim();
    const fiscalEndMonth = Number(basicInfoDraft.fiscalEndMonth);
    const memberScale = basicInfoDraft.memberScale;
    const postalCode = basicInfoDraft.postalCode.trim();

    if (!name) {
      setBasicInfoMessage("名称を入力してください。");
      return;
    }
    if (!Number.isFinite(fiscalEndMonth) || fiscalEndMonth < 1 || fiscalEndMonth > 12) {
      setBasicInfoMessage("決算月は1月から12月の範囲で選択してください。");
      return;
    }
    if (!memberScale) {
      setBasicInfoMessage("会員世帯数を選択してください。");
      return;
    }

    setBasicInfoSaving(true);
    setBasicInfoMessage("");
    const fallbackPayload = {
      name,
      fiscal_start_month: fiscalStartMonthFromEnd(fiscalEndMonth),
      households: memberScaleToHouseholds(memberScale),
      postal_code: postalCode || null,
    };
    const payload = {
      ...fallbackPayload,
      member_scale: memberScale,
    };

    try {
      let updatePayload: Record<string, string | number | null> = payload;
      let updateResult = await supabase
        .from("neighborhoods")
        .update(updatePayload)
        .eq("id", townId)
        .select("*")
        .maybeSingle();

      if (isMissingColumnError(updateResult.error, "member_scale")) {
        updatePayload = fallbackPayload;
        updateResult = await supabase
          .from("neighborhoods")
          .update(updatePayload)
          .eq("id", townId)
          .select("*")
          .maybeSingle();
      }

      const { data, error } = updateResult;
      if (error) throw error;

      setBasicData((current) => ({
        ...current,
        town: data
          ? { ...data, member_scale: data.member_scale ?? memberScale }
          : { ...(current.town || {}), id: townId, ...payload },
      }));
      setBasicInfoMessage("基本情報を保存しました。予算書・決算書と会費管理の期間に反映されます。");
    } catch (error: any) {
      setBasicInfoMessage(error?.message || "基本情報の保存に失敗しました。");
    } finally {
      setBasicInfoSaving(false);
    }
  };

  const handleMemberDraftChange = (field: keyof MemberDraft, value: string) => {
    setMemberDraft((current) => ({ ...current, [field]: value }));
    setMemberMessage("");
  };

  const buildRosterPayloads = (draft: MemberDraft) => {
    const fullName = draft.fullName.trim();
    if (!fullName) throw new Error("氏名を入力してください。");

    const normalizedDraft: MemberDraft = {
      fullName,
      kanaName: draft.kanaName.trim(),
      postalCode: draft.postalCode.trim(),
      addressLine2: draft.addressLine2.trim(),
      addressLine3: draft.addressLine3.trim(),
      familyName1: draft.familyName1.trim(),
      familyName2: draft.familyName2.trim(),
    };

    const basePayload = {
      neighborhood_id: townId,
      full_name: normalizedDraft.fullName,
      last_name: normalizedDraft.fullName,
    };
    const detailPayload = {
      ...basePayload,
      kana_name: normalizedDraft.kanaName || null,
      postal_code: normalizedDraft.postalCode || null,
      address2: normalizedDraft.addressLine2 || null,
      address3: normalizedDraft.addressLine3 || null,
      family_name_1: normalizedDraft.familyName1 || null,
      family_name_2: normalizedDraft.familyName2 || null,
      withdrawal_status: "active",
    };

    return { detailPayload, basePayload };
  };

  const insertRosterMember = async (draft: MemberDraft) => {
    const { detailPayload, basePayload } = buildRosterPayloads(draft);

    let insertResult = await supabase.from("resident_rosters").insert(detailPayload).select("*").single();
    let usedFallback = false;

    if (isMissingAnyColumnError(insertResult.error, rosterDetailColumns)) {
      usedFallback = true;
      insertResult = await supabase.from("resident_rosters").insert(basePayload).select("*").single();
    }

    if (insertResult.error) throw insertResult.error;

    return {
      ...(insertResult.data || {}),
      ...detailPayload,
      id: insertResult.data?.id || `local-${Date.now()}`,
      _usedFallback: usedFallback,
    };
  };

  const updateRosterMember = async (memberId: number | string, draft: MemberDraft) => {
    const { detailPayload, basePayload } = buildRosterPayloads(draft);
    const updateDetailPayload = { ...detailPayload };
    const updateBasePayload = { ...basePayload };
    delete (updateDetailPayload as any).neighborhood_id;
    delete (updateBasePayload as any).neighborhood_id;
    delete (updateDetailPayload as any).withdrawal_status;

    let updateResult = await supabase
      .from("resident_rosters")
      .update(updateDetailPayload)
      .eq("id", memberId)
      .select("*")
      .maybeSingle();
    let usedFallback = false;

    if (isMissingAnyColumnError(updateResult.error, rosterDetailColumns)) {
      usedFallback = true;
      updateResult = await supabase
        .from("resident_rosters")
        .update(updateBasePayload)
        .eq("id", memberId)
        .select("*")
        .maybeSingle();
    }

    if (updateResult.error) throw updateResult.error;
    if (!updateResult.data) {
      throw new Error("会員情報を更新できませんでした。管理者の名簿更新権限（RLS）を確認してください。");
    }

    return {
      ...(updateResult.data || {}),
      ...updateDetailPayload,
      id: memberId,
      _usedFallback: usedFallback,
    };
  };

  const handleMemberEditStart = (member: any) => {
    setEditingMemberId(member.id);
    setMemberDraft({
      fullName: getMemberFullName(member) === "氏名未設定" ? "" : getMemberFullName(member),
      kanaName: getMemberKana(member),
      postalCode: getMemberPostalCode(member),
      addressLine2: getMemberAddressLine2(member),
      addressLine3: getMemberAddressLine3(member),
      familyName1: member.family_name_1 || "",
      familyName2: member.family_name_2 || "",
    });
    setMemberMessage("会員情報を編集中です。変更後に保存してください。");
    setMemberReply("");
  };

  const handleMemberEditCancel = () => {
    setEditingMemberId(null);
    setMemberDraft(defaultMemberDraft);
    setMemberMessage("");
    setMemberReply("");
  };

  const handleMemberSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMemberBusy(true);
    setMemberMessage("");
    setMemberReply("");

    try {
      if (editingMemberId !== null) {
        const member = await updateRosterMember(editingMemberId, memberDraft);
        setBasicData((current) => ({
          ...current,
          members: current.members.map((item) => (item.id === editingMemberId ? { ...item, ...member } : item)),
        }));
        setEditingMemberId(null);
        setMemberDraft(defaultMemberDraft);
        setMemberMessage(member._usedFallback ? "会員情報を更新しました。詳細項目はDB列追加後に個別列へ保存できます。" : "会員情報を更新しました。");
      } else {
        const member = await insertRosterMember(memberDraft);
        setBasicData((current) => ({ ...current, members: [member, ...current.members] }));
        setMemberDraft(defaultMemberDraft);
        setMemberMessage(member._usedFallback ? "会員を登録しました。詳細項目はDB列追加後に個別列へ保存できます。" : "会員を登録しました。初回登録時の照合情報として利用できます。");
      }
    } catch (error: any) {
      setMemberMessage(error?.message || "会員情報の保存に失敗しました。");
    } finally {
      setMemberBusy(false);
    }
  };

  const draftFromCsvRecord = (record: Record<string, string>): MemberDraft => ({
    fullName: record["氏名"] || record["full_name"] || "",
    kanaName: record["氏名カタカナ"] || record["kana_name"] || "",
    postalCode: record["郵便番号"] || record["postal_code"] || "",
    addressLine2: record["住所２"] || record["住所2"] || record["address_line2"] || "",
    addressLine3: record["住所３"] || record["住所3"] || record["address_line3"] || "",
    familyName1: record["家族１"] || record["家族1"] || record["family_name_1"] || "",
    familyName2: record["家族２"] || record["家族2"] || record["family_name_2"] || "",
  });

  const handleMemberCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMemberBusy(true);
    setMemberMessage("");
    setMemberReply("");

    try {
      const text = await file.text();
      const rows = parseCsvRows(text);
      if (rows.length < 2) throw new Error("CSVに登録対象の会員行がありません。");

      const headers = rows[0];
      const imported: any[] = [];
      for (const row of rows.slice(1)) {
        const record = headers.reduce<Record<string, string>>((acc, header, index) => {
          acc[header] = row[index] || "";
          return acc;
        }, {});
        const draft = draftFromCsvRecord(record);
        if (!draft.fullName.trim()) continue;
        imported.push(await insertRosterMember(draft));
      }

      if (!imported.length) throw new Error("CSVから登録できる会員が見つかりませんでした。");

      setBasicData((current) => ({ ...current, members: [...imported, ...current.members] }));
      setMemberMessage(`${imported.length}件の会員をCSVから取り込みました。`);
    } catch (error: any) {
      setMemberMessage(error?.message || "CSV取り込みに失敗しました。");
    } finally {
      setMemberBusy(false);
    }
  };

  const handleMemberCsvExport = () => {
    const rows = [
      memberCsvHeaders,
      ...basicData.members.map((member) => [
        getMemberFullName(member),
        getMemberKana(member),
        getMemberPostalCode(member),
        getMemberAddressLine2(member),
        getMemberAddressLine3(member),
        member.family_name_1 || "",
        member.family_name_2 || "",
      ]),
    ];
    const csv = `\uFEFF${rows.map((row, rowIndex) => row.map((cell, cellIndex) => {
      const header = memberCsvHeaders[cellIndex];
      return escapeCsvCell(cell, rowIndex > 0 && memberCsvExcelTextHeaders.has(header));
    }).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `resident_rosters_${townId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleMemberWithdrawal = async (member: any) => {
    const fullName = getMemberFullName(member);
    const reply = `${fullName}様の退会申請を承認しました。今後、同じ町内会・自治会ではel-townをご利用いただけません。`;
    const statusValue = "withdrawn";
    const withdrawalReplyPayload: Record<string, any> = {
      withdrawal_status: statusValue,
      withdrawal_reply_message: reply,
    };
    Object.assign(withdrawalReplyPayload, {
      user_auth_id: null,
      family_user_auth_id_1: null,
      family_user_auth_id_2: null,
      line_user_id: null,
      family_line_user_id_1: null,
      family_line_user_id_2: null,
    });

    setMemberBusy(true);
    setMemberMessage("");
    setMemberReply("");

    try {
      const savedMember = await updateRowWithFallback(
        "resident_rosters",
        member.id,
        withdrawalReplyPayload,
        "退会承認とLINE連携解除に失敗しました。",
      );

      const updatedMember = {
        ...member,
        ...savedMember,
        withdrawal_status: statusValue,
        withdrawal_reply_message: reply,
      };
      setBasicData((current) => ({
        ...current,
        members: current.members.map((item) => (item.id === member.id ? updatedMember : item)),
      }));
      const linkedDelta = getMemberLinkedAccountCount(updatedMember) - getMemberLinkedAccountCount(member);
      if (linkedDelta !== 0) {
        const monthlyHouseholdPrice = basicData.setting?.monthly_household_price || 0;
        setSummary((current) => ({
          ...current,
          linkedMembers: Math.max(current.linkedMembers + linkedDelta, 0),
          systemUsageFee: Math.max(current.systemUsageFee + linkedDelta * monthlyHouseholdPrice, 0),
        }));
      }
      setMemberReply(reply);
      try {
        await navigator.clipboard?.writeText(reply);
        setMemberMessage("退会を承認しました。返信文をコピーしました。");
      } catch {
        setMemberMessage("退会を承認しました。下の返信文を送信してください。");
      }
    } catch (error: any) {
      setMemberMessage(error?.message || "会員状態の更新に失敗しました。");
    } finally {
      setMemberBusy(false);
    }
  };

  const buildAdminInviteUrl = (token: string) => {
    if (typeof window === "undefined") return `/admin?mode=invite&token=${encodeURIComponent(token)}`;
    return `${window.location.origin}/admin?mode=invite&token=${encodeURIComponent(token)}`;
  };

  const handleAdminInviteDraftChange = (field: keyof AdminInviteDraft, value: string) => {
    setAdminInviteDraft((current) => ({ ...current, [field]: value }));
    setAdminMessage("");
  };

  const saveAdminRecordWithFallback = async (payload: Record<string, any>, existingId?: number | string | null) => {
    let nextPayload = { ...payload };

    for (let attempt = 0; attempt < adminDetailColumns.length + 3; attempt += 1) {
      const result = existingId
        ? await supabase.from("neighborhood_admins").update(nextPayload).eq("id", existingId).select("*").maybeSingle()
        : await supabase.from("neighborhood_admins").insert(nextPayload).select("*").single();

      if (!result.error) return { ...(result.data || {}), ...nextPayload, id: result.data?.id || existingId };

      const missingColumn = missingColumnFromError(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
        delete nextPayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    throw new Error("役員情報の保存に失敗しました。");
  };

  const activeOrInvitedAdminCount = basicData.admins.filter((admin) => admin.status !== "retired" && admin.status !== "rejected").length;

  const handleAdminInviteCreate = async () => {
    const email = adminInviteDraft.email.trim().toLowerCase();
    const name = adminInviteDraft.name.trim();
    const role = adminInviteDraft.role.trim();
    if (!name || !email) {
      setAdminMessage("役員候補者の名前とメールアドレスを入力してください。");
      return;
    }
    if (activeOrInvitedAdminCount >= 20) {
      setAdminMessage("役員は最大20名までです。退任済み役員は人数に含めません。");
      return;
    }

    const duplicatedInTown = basicData.admins.some((admin) => {
      return String(admin.admin_email || "").toLowerCase() === email && admin.status !== "retired" && admin.status !== "rejected";
    });
    if (duplicatedInTown) {
      setAdminMessage("同じ町内会・自治会に、同じメールアドレスの有効な役員または招待中役員がいます。");
      return;
    }

    setAdminBusy(true);
    setAdminMessage("");
    try {
      const token = crypto.randomUUID();
      const payload = {
        neighborhood_id: townId,
        admin_email: email,
        admin_name: name,
        admin_role: role,
        status: "pending",
        admin_invite_token: token,
        invite_token: token,
        invited_at: new Date().toISOString(),
      };
      const saved = await saveAdminRecordWithFallback(payload);
      const url = buildAdminInviteUrl(token);
      setBasicData((current) => ({ ...current, admins: [saved, ...current.admins] }));
      setAdminInviteDraft({ name: "", email: "", role: "" });
      setAdminInviteUrl(url);
      try {
        await navigator.clipboard?.writeText(url);
        setAdminMessage("役員候補者用の招待URLを作成し、コピーしました。");
      } catch {
        setAdminMessage("役員候補者用の招待URLを作成しました。下のURLを送ってください。");
      }
    } catch (error: any) {
      setAdminMessage(error?.message || "役員招待URLの作成に失敗しました。");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleAdminStatusChange = async (admin: any, nextStatus: "retired" | "active") => {
    if (!admin?.id) return;
    const retiring = nextStatus === "retired";
    const activeAdmins = basicData.admins.filter((item) => item.status === "active");
    if (retiring && activeAdmins.length <= 1 && admin.status === "active") {
      setAdminMessage("最後の管理者は退任できません。先に別の役員を招待してください。");
      return;
    }

    setAdminBusy(true);
    setAdminMessage("");
    try {
      const payload = retiring
        ? { status: "retired", retired_at: new Date().toISOString() }
        : { status: "active", retired_at: null };
      const saved = await saveAdminRecordWithFallback(payload, admin.id);
      setBasicData((current) => ({
        ...current,
        admins: current.admins.map((item) => (String(item.id) === String(admin.id) ? { ...item, ...saved } : item)),
      }));
      setAdminMessage(retiring ? "役員を退任にしました。必要な場合は復活できます。" : "役員を復活しました。管理者としてログインできます。");
    } catch (error: any) {
      setAdminMessage(error?.message || "役員状態の更新に失敗しました。");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleAdminInviteDelete = async (admin: any) => {
    if (!admin?.id || !isDeletableAdminInvite(admin)) return;
    const name = admin.admin_name || admin.name || admin.admin_email || "この招待";
    if (typeof window !== "undefined" && !window.confirm(`${name} の招待を削除します。よろしいですか？`)) return;

    setAdminBusy(true);
    setAdminMessage("");
    try {
      const { error } = await supabase.from("neighborhood_admins").delete().eq("id", admin.id);
      if (error) throw error;

      setBasicData((current) => ({
        ...current,
        admins: current.admins.filter((item) => String(item.id) !== String(admin.id)),
      }));
      setAdminInviteUrl("");
      setAdminMessage("誤って作成した役員招待を削除しました。");
    } catch (error: any) {
      setAdminMessage(error?.message || "役員招待の削除に失敗しました。");
    } finally {
      setAdminBusy(false);
    }
  };

  const feeFiscalYear = Number(feeDraft.fiscalYear || currentFiscalYear(basicData.town?.fiscal_start_month));
  const feeRecordsForYear = basicData.fees.filter((fee) => getFeeYear(fee) === feeFiscalYear);
  const memberById = new Map(basicData.members.map((member) => [String(member.id), member]));
  const activeFeeMembers = basicData.members.filter((member) => !isWithdrawnMember(member));
  const getFeeForMember = (member: any) => feeRecordsForYear.find((fee) => String(getFeeRosterId(fee)) === String(member.id));
  const currentFeeYear = currentFiscalYear(basicData.town?.fiscal_start_month);
  const feeYearOptions = Array.from(
    new Set([
      currentFeeYear + 1,
      currentFeeYear,
      currentFeeYear - 1,
      feeFiscalYear,
      ...basicData.fees.map(getFeeYear),
    ]),
  )
    .filter((year) => Number.isFinite(year) && year >= 2000)
    .sort((a, b) => b - a);
  const feeRosterQuery = feeRosterSearch.trim().toLowerCase();
  const feeRosterMembers = activeFeeMembers.filter((member) => {
    if (!feeRosterQuery) return true;
    return [
      getMemberFullName(member),
      getMemberKana(member),
      getMemberPostalCode(member),
      getMemberAddressLine2(member),
      getMemberAddressLine3(member),
      ...getMemberFamilyNames(member),
    ]
      .join(" ")
      .toLowerCase()
      .includes(feeRosterQuery);
  });
  const summaryFeeRecords = feeRecordsForYear.filter((fee) => {
    const rosterId = getFeeRosterId(fee);
    const member = rosterId === null ? null : memberById.get(String(rosterId));
    return !member || !isWithdrawnMember(member) || getFeePaidAmount(fee) > 0;
  });
  const feeBillingTotal = summaryFeeRecords.reduce((sum, fee) => sum + getFeeBillingAmount(fee), 0);
  const feePaidTotal = summaryFeeRecords.reduce((sum, fee) => sum + getFeePaidAmount(fee), 0);
  const feeCashPaidTotal = summaryFeeRecords.reduce((sum, fee) => sum + getFeeCashPaid(fee), 0);
  const feeStripePaidTotal = summaryFeeRecords.reduce((sum, fee) => sum + getFeeStripePaid(fee), 0);
  const feeBalanceTotal = Math.max(feeBillingTotal - feePaidTotal, 0);
  const feeUnpaidCount = summaryFeeRecords.filter((fee) => getFeePaidAmount(fee) < getFeeBillingAmount(fee)).length;
  const feeSelectedCount = activeFeeMembers.filter((member) => feeSelectedMembers[String(member.id)]).length;
  const feeVisibleSelectedCount = feeRosterMembers.filter((member) => feeSelectedMembers[String(member.id)]).length;
  const feeTargetCount = feeDraft.targetMode === "all" ? activeFeeMembers.length : feeSelectedCount;

  const findExistingFeeRecord = async (payload: Record<string, any>) => {
    const rosterId = payload.roster_id ?? payload.resident_roster_id ?? payload.member_id;
    const year = payload.fiscal_year ?? payload.year;
    if (!rosterId || !year) return null;

    for (const yearColumn of ["fiscal_year", "year"]) {
      const result = await supabase
        .from("fee_records")
        .select("*")
        .eq("roster_id", rosterId)
        .eq(yearColumn, year)
        .maybeSingle();

      if (!result.error && result.data) return result.data;
      if (result.error && isMissingColumnError(result.error, yearColumn)) continue;
    }

    return null;
  };

  const saveFeeRecord = async (payload: Record<string, any>, existingId?: number | string | null) => {
    let nextPayload = { ...payload };

    for (let attempt = 0; attempt < feeDetailColumns.length + 4; attempt += 1) {
      const result = existingId
        ? await supabase.from("fee_records").update(nextPayload).eq("id", existingId).select("*").maybeSingle()
        : await supabase.from("fee_records").insert(nextPayload).select("*").single();

      if (!result.error) return { ...(result.data || {}), ...nextPayload, id: result.data?.id || existingId || `local-fee-${Date.now()}` };

      if (!existingId && isDuplicateKeyError(result.error)) {
        const existingRecord = await findExistingFeeRecord(nextPayload);
        if (existingRecord?.id) {
          return saveFeeRecord(nextPayload, existingRecord.id);
        }
      }

      const missingColumn = missingColumnFromError(result.error);
      if (missingColumn && Object.prototype.hasOwnProperty.call(nextPayload, missingColumn)) {
        delete nextPayload[missingColumn];
        continue;
      }

      throw result.error;
    }

    throw new Error("会費レコードの保存に失敗しました。");
  };

  const feePayloadForMember = (member: any, amount: number, channel: "manual" | "stripe") => {
    const existing = getFeeForMember(member);
    const paidCash = existing ? getFeeCashPaid(existing) : 0;
    const paidStripe = existing ? getFeeStripePaid(existing) : 0;
    const paidAmount = paidCash + paidStripe;
    return {
      neighborhood_id: townId,
      roster_id: member.id,
      resident_name: getMemberFullName(member),
      year: feeFiscalYear,
      fiscal_year: feeFiscalYear,
      expected_amount: amount,
      billing_amount: amount,
      amount,
      paid_amount_cash: paidCash,
      paid_amount_stripe: paidStripe,
      paid_amount: paidAmount,
      billing_channel: channel,
      billing_status: "billed",
      status: paidAmount >= amount ? "paid" : "unpaid",
      is_billed: true,
      billed_at: new Date().toISOString(),
    };
  };

  const selectedFeeTargetMembers = () => {
    if (feeDraft.targetMode === "all") return activeFeeMembers;
    return activeFeeMembers.filter((member) => feeSelectedMembers[String(member.id)]);
  };

  const handleFeeDraftChange = (field: keyof FeeDraft, value: string) => {
    setFeeDraft((current) => ({ ...current, [field]: value }));
    setFeeMessage("");
  };

  const handleFeeMemberToggle = (memberId: number | string, checked: boolean) => {
    const selectedId = String(memberId);
    setFeeSelectedMembers((current) => {
      const next =
        feeDraft.targetMode === "all"
          ? Object.fromEntries(activeFeeMembers.map((member) => [String(member.id), true]))
          : { ...current };
      if (checked) {
        next[selectedId] = true;
      } else {
        delete next[selectedId];
      }
      return next;
    });
    setFeeDraft((current) => ({ ...current, targetMode: "selected" }));
    setFeeMessage("");
  };

  const useAllFeeTargets = () => {
    setFeeDraft((current) => ({ ...current, targetMode: "all" }));
    setFeeMessage("");
  };

  const setVisibleFeeTargets = (checked: boolean) => {
    setFeeDraft((current) => ({ ...current, targetMode: "selected" }));
    setFeeSelectedMembers((current) => {
      const next = { ...current };
      for (const member of feeRosterMembers) {
        const memberId = String(member.id);
        if (checked) {
          next[memberId] = true;
        } else {
          delete next[memberId];
        }
      }
      return next;
    });
    setFeeMessage("");
  };

  const getFeeCashDraftValue = (fee: any) => {
    if (!fee?.id || fee.id === "empty") return "";
    const feeId = String(fee.id);
    return feeCashDrafts[feeId] ?? String(getFeeCashPaid(fee) || "");
  };

  const handleFeeCashDraftChange = (feeId: number | string, value: string) => {
    setFeeCashDrafts((current) => ({ ...current, [String(feeId)]: value }));
    setFeeMessage("");
  };

  const applyFeeBilling = async (channel: "manual" | "stripe") => {
    const amount = Number(feeDraft.amount);
    if (!Number.isFinite(feeFiscalYear) || feeFiscalYear < 2000) {
      setFeeMessage("会計年度を正しく入力してください。");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setFeeMessage("会費請求額を0円以上で入力してください。");
      return;
    }

    const targets = selectedFeeTargetMembers();
    if (!targets.length) {
      setFeeMessage("請求設定の対象会員を選択してください。");
      return;
    }

    setFeeBusy(true);
    setFeeMessage("");

    try {
      const savedRecords: any[] = [];
      for (const member of targets) {
        const existing = getFeeForMember(member);
        const payload = feePayloadForMember(member, amount, channel);
        savedRecords.push(await saveFeeRecord(payload, existing?.id));
      }

      setBasicData((current) => {
        const savedById = new Map(savedRecords.map((record) => [String(record.id), record]));
        const savedByRoster = new Map(savedRecords.map((record) => [`${getFeeRosterId(record)}-${getFeeYear(record)}`, record]));
        const nextFees = current.fees.map((fee) => {
          const byId = savedById.get(String(fee.id));
          if (byId) return { ...fee, ...byId };
          const byRoster = savedByRoster.get(`${getFeeRosterId(fee)}-${getFeeYear(fee)}`);
          return byRoster ? { ...fee, ...byRoster } : fee;
        });
        for (const record of savedRecords) {
          if (!nextFees.some((fee) => String(fee.id) === String(record.id) || `${getFeeRosterId(fee)}-${getFeeYear(fee)}` === `${getFeeRosterId(record)}-${getFeeYear(record)}`)) {
            nextFees.push(record);
          }
        }
        return { ...current, fees: nextFees };
      });
      setFeeMessage(channel === "stripe" ? `${targets.length}件をStripe請求対象に設定しました。` : `${targets.length}件の会費請求額を設定しました。`);
    } catch (error: any) {
      setFeeMessage(error?.message || "会費請求の保存に失敗しました。");
    } finally {
      setFeeBusy(false);
    }
  };

  const handleFeeCashPaymentSave = async (fee: any) => {
    const feeId = String(fee?.id || "");
    const amountText = getFeeCashDraftValue(fee).trim();
    const amount = Number(amountText);
    if (!feeId || feeId === "empty") {
      setFeeMessage("入金修正できる会費レコードがありません。先に請求額を設定してください。");
      return;
    }
    if (amountText === "" || !Number.isFinite(amount) || amount < 0) {
      setFeeMessage("手集金額を0円以上で入力してください。");
      return;
    }

    setFeeBusy(true);
    setFeeMessage("");

    try {
      const cash = amount;
      const stripe = getFeeStripePaid(fee);
      const paidAmount = cash + stripe;
      const billingAmount = getFeeBillingAmount(fee);
      const paymentMethod = cash > 0 && stripe > 0 ? "mixed" : stripe > 0 ? "stripe" : cash > 0 ? "cash" : null;
      const payload = {
        paid_amount_cash: cash,
        paid_amount_stripe: stripe,
        paid_amount: paidAmount,
        payment_method: paymentMethod,
        last_payment_method: cash > 0 ? "cash" : stripe > 0 ? "stripe" : null,
        status: paidAmount <= 0 ? "unpaid" : paidAmount >= billingAmount ? "paid" : "partial",
        paid_at: paidAmount > 0 ? new Date().toISOString() : null,
      };
      const saved = await saveFeeRecord(payload, fee.id);
      setBasicData((current) => ({
        ...current,
        fees: current.fees.map((item) => (String(item.id) === String(fee.id) ? { ...item, ...saved } : item)),
      }));
      setFeeCashDrafts((current) => {
        const next = { ...current };
        delete next[feeId];
        return next;
      });
      setFeeMessage("手集金額を更新しました。Stripe入金額とは別に集計します。");
    } catch (error: any) {
      setFeeMessage(error?.message || "入金情報の保存に失敗しました。");
    } finally {
      setFeeBusy(false);
    }
  };

  const totalMembers = basicData.members.length;
  const activeMembers = basicData.members.filter((member) => !isWithdrawnMember(member));
  const linkedPreviewMembers = activeMembers.reduce((sum, member) => sum + getMemberLinkedAccountCount(member), 0);
  const linkedPreviewHouseholds = activeMembers.filter(isLineLinkedMember).length;
  const unlinkedPreviewMembers = activeMembers.filter((member) => !isLineLinkedMember(member)).length;
  const withdrawalRequestMembers = basicData.members.filter(isWithdrawalRequestedMember);
  const withdrawnMembers = basicData.members.filter(isWithdrawnMember);
  const unpaidFees = summaryFeeRecords.filter((fee) => getFeePaidAmount(fee) < getFeeBillingAmount(fee));
  const rawStripeAccountId = basicData.town?.stripe_account_id || "";
  const stripeAccountId = rawStripeAccountId || "未連携";
  const stripeAccountMode = basicData.town?.stripe_account_mode || "live";
  const stripeChargesEnabled = basicData.town?.stripe_charges_enabled === true;
  const stripePayoutsEnabled = basicData.town?.stripe_payouts_enabled === true;
  const stripeDetailsSubmitted = basicData.town?.stripe_details_submitted === true;
  const stripeOnboardingStatus = basicData.town?.stripe_onboarding_status || "";
  const stripeReadyForFeeBilling = Boolean(rawStripeAccountId) && (stripeOnboardingStatus === "active" || (stripeChargesEnabled && stripePayoutsEnabled));
  const stripeRegistrationStatusLabel = !rawStripeAccountId
    ? "未連携"
    : stripeReadyForFeeBilling
      ? "本番決済受付中"
      : stripeDetailsSubmitted
        ? "Stripe審査中"
        : "本番登録の完了待ち";
  const representativeName = basicData.town?.admin_name || basicData.admins[0]?.admin_name || "未設定";
  const representativeEmail = basicData.town?.admin_email || basicData.admins[0]?.admin_email || "未設定";
  const systemConnectionUnitPrice = Number(basicData.setting?.monthly_household_price ?? 0);
  const systemFreePushLimit = Number(basicData.setting?.free_push_limit ?? 0);
  const systemPushUnitPrice = Number(basicData.setting?.push_unit_price ?? 0);
  const systemTaxRate = Number(basicData.setting?.tax_rate ?? basicData.setting?.consumption_tax_rate ?? 10);
  const systemPushOverage = Math.max(summary.monthlyPushes - systemFreePushLimit, 0);
  const systemUsageSubtotal = summary.linkedMembers * systemConnectionUnitPrice + systemPushOverage * systemPushUnitPrice;
  const systemUsageTax = Math.round(systemUsageSubtotal * (systemTaxRate / 100));
  const systemUsageTotal = systemUsageSubtotal + systemUsageTax;
  const systemSettingRows = [
    ["接続数1件あたり単価", yen(systemConnectionUnitPrice)],
    ["無料プッシュ枠", `${systemFreePushLimit.toLocaleString()}件/月`],
    ["プッシュ超過単価", yen(systemPushUnitPrice)],
    ["消費税率", `${systemTaxRate}%`],
  ];
  const systemBillings = basicData.systemBillings || [];
  const selectedSystemBilling = systemBillings.find((billing) => billing.billing_month === systemBillingMonth) || systemBillings[0] || null;
  const systemBillingStatusLabel = (billing: any) => {
    if (!billing) return "未確定";
    if (billing.status === "paid" || billing.paid_at) return "入金済み";
    if (billing.status === "cancelled") return "取消";
    return "未入金";
  };
  const systemBillingPdfHtml = (billing: any, type: "invoice" | "receipt") => {
    const isReceipt = type === "receipt";
    const issueDate = isReceipt ? billing.paid_at || new Date().toISOString() : billing.invoice_issued_at || billing.billed_at || new Date().toISOString();
    const title = isReceipt ? "領収書" : "請求書";
    const number = isReceipt
      ? billing.receipt_number || `RCPT-${billing.billing_month}-${billing.id}`
      : billing.invoice_number || `SYS-${String(billing.billing_month || "").replace("-", "")}-${billing.neighborhood_id}`;
    const dateText = new Date(issueDate).toLocaleDateString("ja-JP");
    return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 36px; font-family: "Noto Sans JP", Arial, sans-serif; color: #111827; }
    .sheet { max-width: 760px; margin: 0 auto; }
    h1 { margin: 0 0 18px; font-size: 30px; letter-spacing: 0; }
    .meta { display: grid; grid-template-columns: 1fr auto; gap: 18px; margin-bottom: 28px; }
    .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 14px; }
    .to { font-size: 20px; font-weight: 900; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { border: 1px solid #d1d5db; padding: 11px; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; }
    td.num { text-align: right; font-weight: 900; }
    .total { margin-top: 18px; display: grid; justify-content: end; }
    .total div { min-width: 280px; display: flex; justify-content: space-between; border-bottom: 1px solid #d1d5db; padding: 8px 0; font-size: 15px; }
    .total .grand { font-size: 22px; font-weight: 900; border-bottom: 3px solid #111827; }
    .note { margin-top: 24px; color: #4b5563; font-size: 12px; line-height: 1.7; }
    @media print { button { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="sheet">
    <button onclick="window.print()">PDFとして保存 / 印刷</button>
    <h1>${title}</h1>
    <div class="meta">
      <div>
        <div class="to">${townName} 御中</div>
        <div>${billing.billing_month} 利用分</div>
      </div>
      <div class="box">
        <div>番号: ${number}</div>
        <div>発行日: ${dateText}</div>
        <div>発行元: el-town</div>
      </div>
    </div>
    <table>
      <thead><tr><th>内容</th><th>数量</th><th>単価</th><th>金額</th></tr></thead>
      <tbody>
        <tr><td>接続数利用料</td><td class="num">${Number(billing.linked_account_count || 0).toLocaleString()}</td><td class="num">${yen(Number(billing.monthly_household_price || 0))}</td><td class="num">${yen(Number(billing.linked_account_count || 0) * Number(billing.monthly_household_price || 0))}</td></tr>
        <tr><td>プッシュ通知超過料</td><td class="num">${Number(billing.push_overage_count || 0).toLocaleString()}</td><td class="num">${yen(Number(billing.push_unit_price || 0))}</td><td class="num">${yen(Number(billing.push_overage_count || 0) * Number(billing.push_unit_price || 0))}</td></tr>
      </tbody>
    </table>
    <div class="total">
      <div><span>税抜</span><strong>${yen(Number(billing.subtotal_amount || 0))}</strong></div>
      <div><span>消費税 (${Number(billing.tax_rate || 0)}%)</span><strong>${yen(Number(billing.tax_amount || 0))}</strong></div>
      <div class="grand"><span>${isReceipt ? "領収額" : "請求額"}</span><strong>${yen(Number(billing.total_amount || 0))}</strong></div>
    </div>
    <p class="note">${isReceipt ? "上記金額を正に領収いたしました。" : "上記金額をStripeにてお支払いください。入金確認後、領収書を出力できます。"}</p>
  </div>
</body>
</html>`;
  };
  const openSystemBillingPdf = (billing: any, type: "invoice" | "receipt") => {
    if (!billing || typeof window === "undefined") return;
    if (type === "receipt" && !(billing.status === "paid" || billing.paid_at)) {
      setSystemBillingMessage("領収書は入金後に出力できます。");
      return;
    }
    const doc = window.open("", "_blank");
    if (!doc) {
      setSystemBillingMessage("帳票画面を開けませんでした。ポップアップブロックを確認してください。");
      return;
    }
    doc.document.write(systemBillingPdfHtml(billing, type));
    doc.document.close();
  };
  const handleSystemUsagePayment = async (billing: any) => {
    if (!billing?.id) return;
    const amount = Number(billing.total_amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSystemBillingMessage("支払い金額がありません。");
      return;
    }
    setSystemBillingBusy(true);
    setSystemBillingMessage("");
    try {
      const response = await fetch("/api/system-usage/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingId: billing.id,
          amount,
          townName,
          billingMonth: billing.billing_month,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Stripe支払い画面を作成できませんでした。");
      window.location.href = data.url;
    } catch (error: any) {
      setSystemBillingMessage(error?.message || "Stripe支払いの開始に失敗しました。");
    } finally {
      setSystemBillingBusy(false);
    }
  };

  const handleStripeOnboardingStart = async () => {
    setStripeBusy(true);
    setStripeMessage("");
    try {
      const response = await fetch("/api/admin/stripe/create-account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ townId }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Stripe本番登録画面を作成できませんでした。");
      window.location.href = data.url;
    } catch (error: any) {
      setStripeMessage(error?.message || "Stripe本番登録の開始に失敗しました。");
    } finally {
      setStripeBusy(false);
    }
  };

  const activeFeatureMeta = basicFeatures.find((feature) => feature.key === activeBasicFeature) || basicFeatures[0];
  const activePublishMeta = publishTypeOptions.find((option) => option.value === publishDraft.type) || publishTypeOptions[0];
  const activeDashboardGroup = functionGroups.find((group) => group.key === activeDashboardMenu) || functionGroups[0];
  const publishWorkItems = workItems.filter((item) => ["circular", "notice", "event", "assembly"].includes(item.type));
  const integratedWorkItems = workItems.filter((item) => ["circular", "notice", "event", "assembly", "facility", "live"].includes(item.type));
  const showIntegratedWorkView = activeDashboardMenu === "publish" || activeDashboardMenu === "live";
  const assemblyCategories = useMemo(
    () => sortAssemblyCategories(assemblyData.categories).filter(isActiveAssemblyCategory),
    [assemblyData.categories],
  );
  const assemblyReportRows = useMemo(
    () => buildAssemblyReportRows(assemblyCategories, assemblyData.budgets, assemblyData.settlements, assemblyFeeRevenue),
    [assemblyCategories, assemblyData.budgets, assemblyData.settlements, assemblyFeeRevenue],
  );
  const filteredAssemblySettlements = useMemo(
    () => filterAssemblySettlementsByMonth(assemblyData.settlements, assemblySettlementMonth),
    [assemblyData.settlements, assemblySettlementMonth],
  );
  const filteredAssemblyFeeRevenue = useMemo(() => {
    if (assemblySettlementMonth === "all") return assemblyFeeRevenue;
    return basicData.fees
      .filter((fee) => getFeeYear(fee) === assemblyFiscalYear)
      .filter((fee) => getAssemblyMonthKey(fee.paid_at || fee.payment_date || fee.updated_at || fee.created_at) === assemblySettlementMonth)
      .reduce((sum, fee) => sum + getFeePaidAmount(fee), 0);
  }, [assemblyFeeRevenue, assemblyFiscalYear, assemblySettlementMonth, basicData.fees]);
  const monthlyAssemblyReportRows = useMemo(
    () => buildAssemblyReportRows(assemblyCategories, assemblyData.budgets, filteredAssemblySettlements, filteredAssemblyFeeRevenue),
    [assemblyCategories, assemblyData.budgets, filteredAssemblySettlements, filteredAssemblyFeeRevenue],
  );
  const assemblyTotals = useMemo(() => {
    const incomeRows = assemblyReportRows.filter((row) => row.type === "income");
    const expenseRows = assemblyReportRows.filter((row) => row.type === "expense");
    const incomeBudget = incomeRows.reduce((sum, row) => sum + row.budget, 0);
    const incomeActual = incomeRows.reduce((sum, row) => sum + row.actual, 0);
    const expenseBudget = expenseRows.reduce((sum, row) => sum + row.budget, 0);
    const expenseActual = expenseRows.reduce((sum, row) => sum + row.actual, 0);
    return {
      incomeBudget,
      incomeActual,
      incomeDiff: incomeActual - incomeBudget,
      expenseBudget,
      expenseActual,
      expenseDiff: expenseActual - expenseBudget,
      balance: incomeActual - expenseActual,
    };
  }, [assemblyReportRows]);
  const assemblyParentOptions = assemblyCategories.filter((category) =>
    category.type === assemblyCategoryDraft.type &&
    !category.parent_id &&
    String(category.id) !== String(editingAssemblyCategoryId || ""),
  );
  const settlementCategoryOptions = assemblyCategories
    .filter((category) => category.type === assemblySettlementDraft.type)
    .filter((category) => !isAssemblyFeeCategory(category));

  const openBasicFeature = (feature: BasicFeature) => {
    setActiveBasicFeature(feature);
    setActiveAdminScreen("basicFeature");
  };

  const openPublishFeature = (feature: PublishFeatureLabel | PublishType) => {
    const type = feature in publishFeatureMap ? publishFeatureMap[feature as PublishFeatureLabel] : feature as PublishType;
    setPublishDraft((current) => ({ ...current, type }));
    setEditingPublishId(null);
    setPublishAttachment(null);
    setPublishMessage("");
    setActiveAdminScreen("publishFeature");
  };

  const backToAdminDashboard = () => {
    setActiveAdminScreen("dashboard");
  };

  const openProxyPdf = (options: { title: string; signer?: string; date?: string; text?: string; agent?: string }) => {
    const params = new URLSearchParams({
      title: options.title,
      signer: options.signer || "氏名",
      text: options.text || defaultProxyTemplateText(options.title),
    });
    if (options.date !== undefined) params.set("date", options.date);
    if (options.agent?.trim()) params.set("agent", options.agent.trim());
    window.open(`/resident/proxy?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const openProxyTemplatePreview = () => {
    openProxyPdf({
      title: publishDraft.title.trim() || "総会",
      date: "",
      text: publishDraft.proxyTemplateText.trim() || defaultProxyTemplateText(publishDraft.title.trim() || "総会"),
    });
  };

  const openReplyProxyPdf = (item: WorkItem, reply: any) => {
    const proxyText = reply.proxy_text || reply.proxyText;
    const proxySigner = reply.proxy_signer_name || reply.proxySignerName || reply.resident_name || reply.member_name;
    const proxyAgent = reply.proxy_agent_name || reply.proxyAgentName;
    const proxyDate = reply.proxy_signed_date || reply.proxyDate;
    openProxyPdf({
      title: item.title,
      signer: proxySigner || "氏名未設定",
      date: proxyDate ? String(proxyDate).slice(0, 10) : undefined,
      text: proxyText || defaultProxyTemplateText(item.title),
      agent: proxyAgent,
    });
  };

  const renderWorkItemCard = (item: WorkItem) => {
    const isPublishItem = ["circular", "notice", "event", "assembly"].includes(item.type);
    return (
      <article key={item.id} className={`admin-work-item ${item.tone}`}>
        <div className="admin-work-type">
          <span>{typeLabel[item.type]}</span>
          <strong>{item.date}</strong>
        </div>
        <div className="admin-work-main">
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
          {(item.attachmentCount || 0) > 0 && <small><i className="fas fa-paperclip" /> 添付 {item.attachmentCount}件</small>}
        </div>
        <div className="admin-work-status">
          <span>{item.status}</span>
          {isPublishItem ? (
            <div className="admin-work-actions">
              <button type="button" onClick={() => startPublishEdit(item)} disabled={publishBusy}>編集</button>
              <button type="button" className="delete" onClick={() => handlePublishDelete(item)} disabled={publishBusy}>削除</button>
            </div>
          ) : (
            <button type="button">{item.action}</button>
          )}
        </div>
        {(item.type === "event" || item.type === "assembly" || item.type === "live" || item.type === "facility") && (item.replies?.length || 0) > 0 && (
          <div className="admin-work-replies">
            {item.replies?.map((reply, index) => {
              const status = reply.reply_status || reply.response_status || "返信";
              const adult = Number(reply.adult_count ?? reply.adults ?? 0);
              const child = Number(reply.child_count ?? reply.children ?? 0);
              const participantCount = Number(reply.participant_count ?? 0);
              const reservationStatus = reply.status === "approved" ? "承認済" : reply.status === "rejected" ? "否認" : "承認待ち";
              const proxyUrl = reply.proxy_file_url || reply.proxy_url || reply.attachment_url;
              const proxyText = reply.proxy_text || reply.proxyText;
              return (
                <div key={reply.id || `${item.id}-${index}`}>
                  <span>
                    <strong>{reply.resident_name || reply.applicant_name || reply.member_name || `会員 ${index + 1}`}</strong>
                    {item.type === "facility" ? (
                      <small>{toDisplayDate(reply.reservation_date)} {reply.start_time || ""}{reply.end_time ? `-${reply.end_time}` : ""} / {reservationStatus}</small>
                    ) : (
                      <small>{status === "present" || status === "attend" ? "出席" : status === "absent" || status === "proxy" ? "欠席" : status}</small>
                    )}
                  </span>
                  {item.type === "event" && <em>大人 {adult} / 子供 {child}</em>}
                  {item.type === "live" && <em>参加 {participantCount || adult + child || 1}名</em>}
                  {item.type === "facility" && <em>予約 {participantCount || reply.people_count || 1}名</em>}
                  {item.type === "assembly" && proxyUrl && <a href={proxyUrl} target="_blank" rel="noreferrer">委任状PDF/画像</a>}
                  {item.type === "assembly" && proxyText && (
                    <button type="button" onClick={() => openReplyProxyPdf(item, reply)}>委任状PDF印刷</button>
                  )}
                  {item.type === "assembly" && !proxyUrl && !proxyText && <em>委任状なし</em>}
                </div>
              );
            })}
          </div>
        )}
      </article>
    );
  };

  const renderPublishFeatureContent = () => (
    <section className="admin-workspace-panel admin-publish-screen-panel" aria-label="発信機能">
      <div className="admin-workspace-header">
        <div>
          <p className="el-kicker">発信機能</p>
          <h2>{activePublishMeta.label}</h2>
        </div>
      </div>

      <form className="admin-publish-panel" onSubmit={handlePublishSubmit}>
        <div className="admin-publish-heading">
          <div>
            <p className="el-kicker">{activePublishMeta.label}</p>
            <h3>{editingPublishId ? "発信内容を編集" : "表題・送り主・内容・添付を付けて会員へ配信"}</h3>
          </div>
          <div className="admin-heading-actions">
            {editingPublishId && (
              <button type="button" className="secondary" onClick={cancelPublishEdit} disabled={publishBusy}>
                <i className="fas fa-xmark" />
                <span>新規に戻る</span>
              </button>
            )}
            <button type="submit" disabled={publishBusy}>
              <i className={`fas ${publishBusy ? "fa-spinner fa-spin" : editingPublishId ? "fa-floppy-disk" : "fa-paper-plane"}`} />
              <span>{publishBusy ? "保存中" : editingPublishId ? "発信を更新" : "発信を保存"}</span>
            </button>
          </div>
        </div>

        <div className="admin-publish-form">
          <label>
            <span>表題</span>
            <input value={publishDraft.title} onChange={(event) => handlePublishDraftChange("title", event.target.value)} placeholder="例: 5月回覧板、夏祭り参加募集、定期総会通知" />
          </label>
          <label>
            <span>送り主</span>
            <input value={publishDraft.sender} onChange={(event) => handlePublishDraftChange("sender", event.target.value)} placeholder="例: 役員、会長、総務部" />
          </label>
          {publishDraft.type === "event" && (
            <>
              <label>
                <span>開催日</span>
                <input type="date" value={publishDraft.eventDate} onChange={(event) => handlePublishDraftChange("eventDate", event.target.value)} />
              </label>
              <label>
                <span>開催時間</span>
                <input value={publishDraft.eventTime} onChange={(event) => handlePublishDraftChange("eventTime", event.target.value)} placeholder="例: 午前10時から、受付9:30／開始10:00、雨天時は午後に変更" />
              </label>
            </>
          )}
          {publishDraft.type === "assembly" && (
            <>
              <label>
                <span>総会日</span>
                <input type="date" value={publishDraft.assemblyDate} onChange={(event) => handlePublishDraftChange("assemblyDate", event.target.value)} />
              </label>
              <label>
                <span>総会時間</span>
                <input value={publishDraft.assemblyTime} onChange={(event) => handlePublishDraftChange("assemblyTime", event.target.value)} placeholder="例: 午前10時から、受付9:30／開会10:00、書面開催" />
              </label>
            </>
          )}
          <label className="admin-publish-wide">
            <span>内容</span>
            <textarea value={publishDraft.content} onChange={(event) => handlePublishDraftChange("content", event.target.value)} placeholder="会員のLINEと電子掲示板に表示する本文を入力してください。" />
          </label>
          <label className="admin-publish-file">
            <span>画像・PDF・Word・Excel添付</span>
            <input type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => setPublishAttachment(event.target.files?.[0] || null)} />
            <small>{publishAttachment ? publishAttachment.name : "PDF、画像、Word、Excelを添付できます。"}</small>
          </label>
          {publishDraft.type === "assembly" && (
            <>
              <label className="admin-publish-wide">
                <span>委任状定型文</span>
                <span className="admin-proxy-alignment-toolbar" aria-label="選択した行の文字位置">
                  <button type="button" onClick={() => alignProxyTemplateLines("left")}><i className="fas fa-align-left" />左揃え</button>
                  <button type="button" onClick={() => alignProxyTemplateLines("center")}><i className="fas fa-align-center" />中央揃え</button>
                  <button type="button" onClick={() => alignProxyTemplateLines("right")}><i className="fas fa-align-right" />右揃え</button>
                </span>
                <textarea
                  ref={proxyTemplateTextareaRef}
                  value={publishDraft.proxyTemplateText}
                  onChange={(event) => handlePublishDraftChange("proxyTemplateText", event.target.value)}
                  placeholder={defaultProxyTemplateText(publishDraft.title || "総会")}
                />
                <small>位置を変える行を選択して、左・中央・右揃えを押してください。</small>
              </label>
              <button type="button" className="admin-publish-preview-button" onClick={openProxyTemplatePreview}>
                <i className="fas fa-file-pdf" />
                <span>委任状PDFを確認</span>
              </button>
            </>
          )}
          <label className="admin-publish-toggle">
            <input
              type="checkbox"
              checked={publishDraft.pushEnabled}
              onChange={(event) => handlePublishDraftChange("pushEnabled", event.target.checked)}
            />
            <span>
              <strong>LINEへプッシュ通知する</strong>
              <small>チェックすると会員のLINEに通知メッセージを送信します。保存した内容はリッチメニューの「会員の方」から開く回覧板で確認できます。</small>
            </span>
          </label>
        </div>

        {publishMessage && (
          <div className={`admin-basic-message ${publishMessage.includes("失敗") || publishMessage.includes("入力") || publishMessage.includes("更新") ? "error" : "success"}`}>
            {publishMessage}
          </div>
        )}
      </form>

      <div className="admin-work-list">
        {publishWorkItems.map(renderWorkItemCard)}
        {!loading && publishWorkItems.length === 0 && <div className="el-empty">発信済みの電子回覧板・連絡・イベント・総会案内はまだありません。</div>}
      </div>
    </section>
  );

  const renderBasicFeatureContent = () => {
    if (activeBasicFeature === "基本情報") {
      return (
        <div className="admin-basic-screen">
          <section className="admin-basic-card admin-basic-edit-card">
            <div className="admin-basic-card-heading">
              <div>
                <h3>町内会・自治会の基本情報</h3>
                <p>予算書・決算書、会費管理の対象期間に使う基本情報を管理します。</p>
              </div>
              <button type="button" onClick={handleBasicInfoSave} disabled={basicInfoSaving}>
                {basicInfoSaving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-floppy-disk" />}
                <span>{basicInfoSaving ? "保存中" : "保存して反映"}</span>
              </button>
            </div>

            <div className="admin-basic-form">
              <label>
                <span>名称</span>
                <input
                  value={basicInfoDraft.name}
                  onChange={(event) => handleBasicInfoChange("name", event.target.value)}
                  placeholder="町内会・自治会名"
                />
              </label>

              <label>
                <span>決算月</span>
                <select
                  value={basicInfoDraft.fiscalEndMonth}
                  onChange={(event) => handleBasicInfoChange("fiscalEndMonth", event.target.value)}
                >
                  {monthOptions.map((item) => (
                    <option key={item} value={item}>{item}月</option>
                  ))}
                </select>
                <small>翌月から次年度として扱い、予算書・決算書と会費管理の期間に使用します。</small>
              </label>

              <label>
                <span>会員世帯数</span>
                <select
                  value={basicInfoDraft.memberScale}
                  onChange={(event) => handleBasicInfoChange("memberScale", event.target.value)}
                >
                  <option value="">選択してください</option>
                  {memberScaleOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>郵便番号</span>
                <input
                  value={basicInfoDraft.postalCode}
                  onChange={(event) => handleBasicInfoChange("postalCode", event.target.value)}
                  placeholder="例: 100-0001"
                  inputMode="numeric"
                />
              </label>
            </div>

            {basicInfoMessage && (
              <div className={`admin-basic-message ${basicInfoMessage.includes("失敗") || basicInfoMessage.includes("入力") || basicInfoMessage.includes("範囲") ? "error" : "success"}`}>
                {basicInfoMessage}
              </div>
            )}
          </section>

          <section className="admin-basic-card admin-basic-readonly-card">
            <h3>代表者情報</h3>
            <dl className="admin-definition-list">
              <div><dt>代表者名</dt><dd>{representativeName}</dd></div>
              <div><dt>代表者メール</dt><dd>{representativeEmail}</dd></div>
            </dl>
          </section>
        </div>
      );
    }

    if (activeBasicFeature === "会員管理") {
      return (
        <div className="admin-member-screen">
          <section className="admin-basic-card admin-member-command">
            <div className="admin-basic-card-heading">
              <div>
                <h3>{editingMemberId !== null ? "会員名簿編集" : "会員名簿登録"}</h3>
                <p>{editingMemberId !== null ? "選択した会員の照合情報と家族情報を編集します。" : "CSV取込み、CSV出力、画面入力で名簿を管理します。会員の初回LINE連携時は、この名簿情報で照合します。"}</p>
              </div>
              <div className="admin-member-actions">
                <label>
                  <i className="fas fa-file-import" />
                  <span>{memberBusy ? "処理中" : "CSV取込み"}</span>
                  <input type="file" accept=".csv,text/csv" onChange={handleMemberCsvImport} disabled={memberBusy} />
                </label>
                <button type="button" onClick={handleMemberCsvExport} disabled={memberBusy || !basicData.members.length}>
                  <i className="fas fa-file-export" />
                  <span>CSV出力</span>
                </button>
              </div>
            </div>

            <form className="admin-member-form" onSubmit={handleMemberSubmit}>
              <label>
                <span>氏名</span>
                <input value={memberDraft.fullName} onChange={(event) => handleMemberDraftChange("fullName", event.target.value)} placeholder="例: 山田 太郎" required />
              </label>
              <label>
                <span>氏名カタカナ</span>
                <input value={memberDraft.kanaName} onChange={(event) => handleMemberDraftChange("kanaName", event.target.value)} placeholder="例: ヤマダ タロウ" />
              </label>
              <label>
                <span>郵便番号</span>
                <input value={memberDraft.postalCode} onChange={(event) => handleMemberDraftChange("postalCode", event.target.value)} placeholder="例: 100-0001" inputMode="numeric" />
              </label>
              <label>
                <span>住所２</span>
                <input value={memberDraft.addressLine2} onChange={(event) => handleMemberDraftChange("addressLine2", event.target.value)} placeholder="例: 七日町1-2-3" />
              </label>
              <label>
                <span>住所３</span>
                <input value={memberDraft.addressLine3} onChange={(event) => handleMemberDraftChange("addressLine3", event.target.value)} placeholder="例: 101号 / 班名" />
              </label>
              <label>
                <span>家族１</span>
                <input value={memberDraft.familyName1} onChange={(event) => handleMemberDraftChange("familyName1", event.target.value)} placeholder="任意" />
              </label>
              <label>
                <span>家族２</span>
                <input value={memberDraft.familyName2} onChange={(event) => handleMemberDraftChange("familyName2", event.target.value)} placeholder="任意" />
              </label>
              <button type="submit" disabled={memberBusy}>
                {memberBusy ? <i className="fas fa-spinner fa-spin" /> : <i className={editingMemberId !== null ? "fas fa-floppy-disk" : "fas fa-user-plus"} />}
                <span>{memberBusy ? "保存中" : editingMemberId !== null ? "変更を保存" : "会員を登録"}</span>
              </button>
              {editingMemberId !== null && (
                <button type="button" className="secondary" onClick={handleMemberEditCancel} disabled={memberBusy}>
                  <i className="fas fa-xmark" />
                  <span>編集を解除</span>
                </button>
              )}
            </form>

            {memberMessage && (
              <div className={`admin-basic-message ${memberMessage.includes("失敗") || memberMessage.includes("ありません") || memberMessage.includes("入力") ? "error" : "success"}`}>
                {memberMessage}
              </div>
            )}
            {memberReply && (
              <div className="admin-member-reply">
                <strong>返信文</strong>
                <p>{memberReply}</p>
              </div>
            )}
          </section>

          <section className="admin-basic-card admin-member-status">
            <h3>連携と料金</h3>
            <div className="admin-mini-metrics">
              <span><strong>{totalMembers.toLocaleString()}</strong>名簿登録</span>
              <span><strong>{linkedPreviewMembers.toLocaleString()}</strong>料金対象アカウント</span>
              <span><strong>{unlinkedPreviewMembers.toLocaleString()}</strong>未連携 / 対象外</span>
            </div>
            <p className="admin-basic-note">本人または家族がLINE連携した数をシステム利用料の対象として数えます。連携済み世帯は {linkedPreviewHouseholds.toLocaleString()} 件です。</p>
          </section>

          <section className="admin-basic-card admin-member-list">
            <div className="admin-basic-card-heading">
              <div>
                <h3>会員一覧</h3>
                <p>退会承認時にすべてのLINE連携を解除します。退会済み状態は通常操作では元に戻せません。</p>
              </div>
              <span className="admin-member-count">退会申請 {withdrawalRequestMembers.length.toLocaleString()}件 / 退会済み {withdrawnMembers.length.toLocaleString()}件</span>
            </div>

            <div className="admin-member-table">
              <div className="admin-member-row admin-member-head">
                <span>氏名</span>
                <span>照合情報</span>
                <span>家族</span>
                <span>連携/料金</span>
                <span>状態</span>
                <span>操作</span>
              </div>
              {(basicData.members.length ? basicData.members : [{ id: "empty", full_name: "会員名簿は未取得です", status: "未設定" }]).map((member, index) => {
                const linked = isLineLinkedMember(member);
                const billingTargetCount = getMemberLinkedAccountCount(member);
                const withdrawn = isWithdrawnMember(member);
                const requested = isWithdrawalRequestedMember(member);
                const familyNames = getMemberFamilyNames(member);
                return (
                  <div key={member.id || index} className={`admin-member-row ${withdrawn ? "withdrawn" : requested ? "requested" : ""}`}>
                    <span>
                      <strong>{getMemberFullName(member)}</strong>
                      <small>{getMemberKana(member) || "カタカナ未設定"}</small>
                    </span>
                    <span>
                      <strong>{getMemberPostalCode(member) || "郵便番号未設定"}</strong>
                      <small>{[getMemberAddressLine2(member), getMemberAddressLine3(member)].filter(Boolean).join(" / ") || "住所未設定"}</small>
                    </span>
                    <span>{familyNames.length ? familyNames.join(" / ") : "未登録"}</span>
                    <span>
                      <em className={linked && !withdrawn ? "linked" : "unlinked"}>{billingTargetCount > 0 ? `連携済み・料金対象 ${billingTargetCount}名` : "未連携・対象外"}</em>
                    </span>
                    <span>{getMemberStatusLabel(member)}</span>
                    <span className="admin-member-row-actions">
                      <button type="button" className="edit" onClick={() => handleMemberEditStart(member)} disabled={memberBusy || member.id === "empty"}>編集</button>
                      {withdrawn ? (
                        <span className="admin-member-no-action">退会確定</span>
                      ) : requested ? (
                        <button type="button" onClick={() => handleMemberWithdrawal(member)} disabled={memberBusy || member.id === "empty"}>退会承認</button>
                      ) : (
                        <span className="admin-member-no-action">申請なし</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      );
    }

    if (activeBasicFeature === "会費管理") {
      return (
        <div className="admin-fee-screen">
          <section className="admin-basic-card admin-fee-command">
            <div className="admin-basic-card-heading">
              <div>
                <h3>会費請求設定</h3>
                <p>会計年度ごとに全会員世帯、またはチェックした会員へ請求額を設定します。退会済み会員は新規請求対象から外し、入金がある年度分だけ集計に含めます。</p>
              </div>
              <span className="admin-member-count">対象年度 {feeFiscalYear}年度</span>
            </div>

            <div className="admin-fee-form">
              <label>
                <span>会計年度</span>
                <select value={String(feeFiscalYear)} onChange={(event) => handleFeeDraftChange("fiscalYear", event.target.value)}>
                  {feeYearOptions.map((year) => (
                    <option key={year} value={year}>{year}年度</option>
                  ))}
                </select>
              </label>
              <label>
                <span>会費請求額</span>
                <input value={feeDraft.amount} onChange={(event) => handleFeeDraftChange("amount", event.target.value)} inputMode="numeric" placeholder="例: 3000" />
              </label>
              <div className="admin-fee-target-mode" role="group" aria-label="請求対象">
                <span>請求対象</span>
                <button type="button" className={feeDraft.targetMode === "all" ? "active" : ""} onClick={useAllFeeTargets}>全会員世帯</button>
                <button type="button" className={feeDraft.targetMode === "selected" ? "active" : ""} onClick={() => setFeeDraft((current) => ({ ...current, targetMode: "selected" }))}>名簿で選択</button>
                <small>対象 {feeTargetCount.toLocaleString()}件</small>
              </div>
              <div className="admin-fee-actions">
                <button type="button" onClick={() => applyFeeBilling("manual")} disabled={feeBusy}>
                  <i className="fas fa-file-invoice-yen" />
                  <span>請求額を設定</span>
                </button>
                <button type="button" onClick={() => applyFeeBilling("stripe")} disabled={feeBusy || !stripeReadyForFeeBilling}>
                  <i className="fas fa-credit-card" />
                  <span>Stripe請求に設定</span>
                </button>
              </div>
            </div>

            <div className="admin-fee-roster-tools">
              <label>
                <span>会費名簿検索</span>
                <input value={feeRosterSearch} onChange={(event) => setFeeRosterSearch(event.target.value)} placeholder="氏名・カナ・郵便番号・住所で検索" />
              </label>
              <div className="admin-fee-roster-buttons">
                <button type="button" onClick={useAllFeeTargets}>全会員を対象</button>
                <button type="button" onClick={() => setVisibleFeeTargets(true)}>表示中を選択</button>
                <button type="button" onClick={() => setVisibleFeeTargets(false)}>表示中を解除</button>
              </div>
              <small>
                表示 {feeRosterMembers.length.toLocaleString()}件 / 選択 {feeDraft.targetMode === "all" ? activeFeeMembers.length.toLocaleString() : feeSelectedCount.toLocaleString()}件
                {feeDraft.targetMode === "selected" ? `（表示中 ${feeVisibleSelectedCount.toLocaleString()}件）` : ""}
              </small>
            </div>

            <div className="admin-fee-targets admin-fee-roster">
              {(feeRosterMembers.length ? feeRosterMembers : [{ id: "empty", full_name: "該当する会員がいません" }]).map((member) => {
                const existingFee = member.id === "empty" ? null : getFeeForMember(member);
                const checked = feeDraft.targetMode === "all" || Boolean(feeSelectedMembers[String(member.id)]);
                return (
                  <label key={member.id} className={checked ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={member.id === "empty"}
                      onChange={(event) => handleFeeMemberToggle(member.id, event.target.checked)}
                    />
                    <span>
                      <strong>{getMemberFullName(member)}</strong>
                      <small>{member.id === "empty" ? "検索条件を変えてください" : [getMemberKana(member), getMemberPostalCode(member), getMemberAddressLine2(member)].filter(Boolean).join(" / ") || "照合情報未設定"}</small>
                    </span>
                    {existingFee && <em>{yen(getFeeBillingAmount(existingFee))}</em>}
                  </label>
                );
              })}
            </div>

            {feeMessage && (
              <div className={`admin-basic-message ${feeMessage.includes("失敗") || feeMessage.includes("正しく") || feeMessage.includes("選択") ? "error" : "success"}`}>
                {feeMessage}
              </div>
            )}
          </section>

          <section className="admin-basic-card admin-fee-summary">
            <h3>{feeFiscalYear}年度 集計</h3>
            <div className="admin-mini-metrics">
              <span><strong>{yen(feeBillingTotal)}</strong>請求額</span>
              <span><strong>{yen(feePaidTotal)}</strong>入金額合計</span>
              <span><strong>{yen(feeCashPaidTotal)}</strong>手集金</span>
              <span><strong>{yen(feeStripePaidTotal)}</strong>Stripe入金</span>
              <span><strong>{yen(feeBalanceTotal)}</strong>未入金額</span>
              <span><strong>{feeUnpaidCount.toLocaleString()}</strong>未納/一部</span>
            </div>
            <p className="admin-basic-note">手集金は会費一覧の金額欄で修正します。Stripe入金はWebhookで自動反映され、手集金とは別に集計します。Stripe請求は本番登録が完了してから利用できます。</p>
          </section>

          <section className="admin-basic-card admin-fee-list">
            <div className="admin-basic-card-heading">
              <div>
                <h3>会費一覧</h3>
                <p>退会済み会員の過去情報も年度ごとに残します。入金済みまたは一部入金の会費は年度集計に含めます。</p>
              </div>
            </div>

            <div className="admin-fee-table">
              <div className="admin-fee-row admin-fee-head">
                <span>対象</span>
                <span>請求額</span>
                <span>手集金</span>
                <span>Stripe入金</span>
                <span>状態</span>
                <span>修正</span>
              </div>
              {(feeRecordsForYear.length ? feeRecordsForYear : [{ id: "empty", resident_name: "会費レコードは未取得です", expected_amount: 0, paid_amount: 0 }]).map((fee, index) => {
                const rosterId = getFeeRosterId(fee);
                const member = rosterId === null ? null : memberById.get(String(rosterId));
                const name = fee.resident_name || fee.full_name || (member ? getMemberFullName(member) : `会費 #${fee.id || "-"}`);
                const withdrawnFee = Boolean(member && isWithdrawnMember(member));
                const includedInSummary = !withdrawnFee || getFeePaidAmount(fee) > 0;
                return (
                  <div key={fee.id || index} className="admin-fee-row">
                    <span>
                      <strong>{name}</strong>
                      <small>{getFeeYear(fee)}年度</small>
                      {withdrawnFee && <small>{includedInSummary ? "退会済み・集計対象" : "退会済み・集計対象外"}</small>}
                    </span>
                    <span>{yen(getFeeBillingAmount(fee))}</span>
                    <span className="admin-fee-payment-cell">
                      <input
                        value={getFeeCashDraftValue(fee)}
                        onChange={(event) => handleFeeCashDraftChange(fee.id, event.target.value)}
                        inputMode="numeric"
                        placeholder="0"
                        disabled={fee.id === "empty"}
                      />
                    </span>
                    <span>
                      <strong>{yen(getFeeStripePaid(fee))}</strong>
                      <small>{getFeeStripePaid(fee) > 0 ? "Stripe入金あり" : "Stripe未入金"}</small>
                    </span>
                    <span>
                      <em className={getFeeStatusLabel(fee) === "納入済" ? "paid" : "unpaid"}>{getFeeStatusLabel(fee)}</em>
                      <small>入金合計 {yen(getFeePaidAmount(fee))} / {getPaymentMethodLabel(fee)}</small>
                    </span>
                    <span className="admin-fee-row-actions">
                      <button type="button" onClick={() => handleFeeCashPaymentSave(fee)} disabled={feeBusy || fee.id === "empty"}>手集金を修正</button>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      );
    }

    if (activeBasicFeature === "システム利用料") {
      return (
        <div className="admin-system-billing-screen">
          <section className="admin-basic-card">
            <h3>システム利用料</h3>
            <dl className="admin-definition-list">
              {systemSettingRows.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          </section>
          <section className="admin-basic-card accent">
            <h3>{selectedSystemBilling ? `${selectedSystemBilling.billing_month} 請求` : `${month.label} 請求見込み`}</h3>
            <div className="admin-mini-metrics">
              <span><strong>{Number(selectedSystemBilling?.linked_account_count ?? summary.linkedMembers).toLocaleString()}</strong>接続数</span>
              <span><strong>{Number(selectedSystemBilling?.push_count ?? summary.monthlyPushes).toLocaleString()}</strong>プッシュ件数</span>
              <span><strong>{Number(selectedSystemBilling?.push_overage_count ?? systemPushOverage).toLocaleString()}</strong>超過プッシュ</span>
              <span><strong>{yen(Number(selectedSystemBilling?.subtotal_amount ?? systemUsageSubtotal))}</strong>税抜</span>
              <span><strong>{yen(Number(selectedSystemBilling?.tax_amount ?? systemUsageTax))}</strong>消費税</span>
              <span><strong>{yen(Number(selectedSystemBilling?.total_amount ?? systemUsageTotal))}</strong>税込請求額</span>
            </div>
            <p className="admin-basic-note">毎月1日付で請求されます。未入金の月はStripeで支払い、入金後に領収書を出力できます。</p>
            {selectedSystemBilling && (
              <div className="admin-system-billing-actions">
                <button type="button" onClick={() => openSystemBillingPdf(selectedSystemBilling, "invoice")}>請求書PDF</button>
                {(selectedSystemBilling.status === "paid" || selectedSystemBilling.paid_at) ? (
                  <button type="button" onClick={() => openSystemBillingPdf(selectedSystemBilling, "receipt")}>領収書PDF</button>
                ) : (
                  <button type="button" onClick={() => handleSystemUsagePayment(selectedSystemBilling)} disabled={systemBillingBusy}>
                    {systemBillingBusy ? "支払い準備中" : "Stripeで支払う"}
                  </button>
                )}
              </div>
            )}
            {systemBillingMessage && (
              <div className={`admin-basic-message ${systemBillingMessage.includes("失敗") || systemBillingMessage.includes("できません") || systemBillingMessage.includes("入金後") ? "error" : "success"}`}>
                {systemBillingMessage}
              </div>
            )}
          </section>
          <section className="admin-basic-card admin-system-billing-list">
            <div className="admin-basic-card-heading">
              <div>
                <h3>月別請求一覧</h3>
                <p>毎月の請求が重なるため、月ごとに請求書・支払い・領収書を管理します。</p>
              </div>
            </div>
            <div className="admin-system-billing-table">
              <div className="admin-system-billing-row admin-system-billing-head">
                <span>対象月</span>
                <span>請求日</span>
                <span>税込請求額</span>
                <span>状態</span>
                <span>操作</span>
              </div>
              {(systemBillings.length ? systemBillings : [{ id: "empty", billing_month: "請求は未確定です", total_amount: 0, status: "none" }]).map((billing) => (
                <div key={billing.id} className={`admin-system-billing-row ${selectedSystemBilling?.id === billing.id ? "selected" : ""}`}>
                  <span><strong>{billing.billing_month}</strong><small>{billing.invoice_number || "請求番号未設定"}</small></span>
                  <span>{billing.invoice_issued_at ? new Date(billing.invoice_issued_at).toLocaleDateString("ja-JP") : billing.billed_at ? new Date(billing.billed_at).toLocaleDateString("ja-JP") : "-"}</span>
                  <span>{yen(Number(billing.total_amount || 0))}</span>
                  <span><em>{systemBillingStatusLabel(billing)}</em></span>
                  <span className="admin-system-billing-actions inline">
                    {billing.id !== "empty" && <button type="button" onClick={() => setSystemBillingMonth(billing.billing_month)}>選択</button>}
                    {billing.id !== "empty" && <button type="button" onClick={() => openSystemBillingPdf(billing, "invoice")}>請求書</button>}
                    {billing.id !== "empty" && (billing.status === "paid" || billing.paid_at) && <button type="button" onClick={() => openSystemBillingPdf(billing, "receipt")}>領収書</button>}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    if (activeBasicFeature === "役員管理") {
      return (
        <div className="admin-admin-screen">
          <section className="admin-basic-card admin-admin-invite">
            <div className="admin-basic-card-heading">
              <div>
                <h3>役員候補者を招待</h3>
                <p>候補者へ送る専用URLを作成します。候補者はURLからログイン認証し、管理者として加わります。</p>
              </div>
              <span className="admin-member-count">役員 {activeOrInvitedAdminCount.toLocaleString()} / 20名</span>
            </div>
            <div className="admin-admin-form">
              <label>
                <span>役員候補者名</span>
                <input value={adminInviteDraft.name} onChange={(event) => handleAdminInviteDraftChange("name", event.target.value)} placeholder="例: 山田 太郎" />
              </label>
              <label>
                <span>メールアドレス</span>
                <input value={adminInviteDraft.email} onChange={(event) => handleAdminInviteDraftChange("email", event.target.value)} type="email" placeholder="example@example.com" />
              </label>
              <label>
                <span>役職</span>
                <input value={adminInviteDraft.role} onChange={(event) => handleAdminInviteDraftChange("role", event.target.value)} placeholder="例: 副会長、会計" />
              </label>
              <button type="button" onClick={handleAdminInviteCreate} disabled={adminBusy || activeOrInvitedAdminCount >= 20}>
                <i className={`fas ${adminBusy ? "fa-spinner fa-spin" : "fa-link"}`} />
                <span>{activeOrInvitedAdminCount >= 20 ? "上限20名" : "招待URLを作成"}</span>
              </button>
            </div>
            {adminInviteUrl && (
              <div className="admin-admin-invite-url">
                <strong>招待URL</strong>
                <input value={adminInviteUrl} readOnly />
                <button type="button" onClick={() => navigator.clipboard?.writeText(adminInviteUrl)}>コピー</button>
              </div>
            )}
            {adminMessage && (
              <div className={`admin-basic-message ${adminMessage.includes("失敗") || adminMessage.includes("入力") || adminMessage.includes("上限") || adminMessage.includes("最大") || adminMessage.includes("最後") || adminMessage.includes("同じ") ? "error" : "success"}`}>
                {adminMessage}
              </div>
            )}
          </section>

          <section className="admin-basic-card admin-admin-list">
            <div className="admin-basic-card-heading">
              <div>
                <h3>役員一覧</h3>
                <p>招待中の誤登録は削除できます。管理中の役員は削除ではなく退任にし、誤操作時は復活できます。</p>
              </div>
            </div>
            <div className="admin-admin-table">
              <div className="admin-admin-row admin-admin-head">
                <span>役員</span>
                <span>メール</span>
                <span>役職</span>
                <span>状態</span>
                <span>操作</span>
              </div>
              {(basicData.admins.length ? basicData.admins : [{ id: "empty", admin_name: "役員レコードは未取得です", status: "未設定" }]).map((admin, index) => (
                <div key={admin.id || index} className={`admin-admin-row ${admin.status === "retired" ? "retired" : admin.status === "pending" ? "pending" : ""}`}>
                  <span>
                    <strong>{admin.admin_name || admin.name || "名称未設定"}</strong>
                    <small>{admin.invited_at ? `招待: ${new Date(admin.invited_at).toLocaleDateString("ja-JP")}` : "招待日未設定"}</small>
                  </span>
                  <span>{admin.admin_email || "メール未設定"}</span>
                  <span>{admin.admin_role || "役職未設定"}</span>
                  <span><em>{getAdminStatusLabel(admin)}</em></span>
                  <span className="admin-admin-actions">
                    {isDeletableAdminInvite(admin) ? (
                      <button type="button" className="delete" onClick={() => handleAdminInviteDelete(admin)} disabled={adminBusy || admin.id === "empty"}>招待削除</button>
                    ) : admin.status === "retired" ? (
                      <button type="button" onClick={() => handleAdminStatusChange(admin, "active")} disabled={adminBusy || admin.id === "empty"}>復活</button>
                    ) : (
                      <button type="button" onClick={() => handleAdminStatusChange(admin, "retired")} disabled={adminBusy || admin.id === "empty"}>退任</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="admin-stripe-screen">
        <section className="admin-basic-card admin-stripe-status">
          <div className="admin-basic-card-heading">
            <div>
              <h3>Stripe本番連携</h3>
              <p>町内会・自治会とStripeの個別契約として、本番モードのConnect登録を行います。el-townは標準連携システムを提供します。</p>
            </div>
            <span className={stripeReadyForFeeBilling ? "admin-stripe-badge ready" : rawStripeAccountId ? "admin-stripe-badge pending" : "admin-stripe-badge"}>
              {stripeRegistrationStatusLabel}
            </span>
          </div>
          <dl className="admin-definition-list">
            <div><dt>登録モード</dt><dd>{stripeAccountMode === "test" ? "テストモード（el-town検証用）" : "本番モード"}</dd></div>
            <div><dt>Connectアカウント</dt><dd>{stripeAccountId}</dd></div>
            <div><dt>決済受付</dt><dd>{stripeChargesEnabled ? "有効" : "未確認"}</dd></div>
            <div><dt>入金/振込</dt><dd>{stripePayoutsEnabled ? "有効" : "未確認"}</dd></div>
            <div><dt>契約主体</dt><dd>町内会・自治会とStripe</dd></div>
            <div><dt>用途</dt><dd>会費決済・領収書発行</dd></div>
          </dl>
        </section>
        <section className="admin-basic-card accent admin-stripe-onboarding">
          <h3>{rawStripeAccountId ? "本番登録を再開・確認" : "本番Stripe登録を開始"}</h3>
          <p className="admin-basic-note">テストモード登録は不要です。代表者情報、本人確認書類、入金先口座をStripe画面で入力してください。登録・審査が完了すると、会員へのStripe請求を利用できます。</p>
          <div className="admin-stripe-checklist">
            <span><i className="fas fa-id-card" /> 本人確認書類</span>
            <span><i className="fas fa-building-columns" /> 入金先口座</span>
            <span><i className="fas fa-envelope" /> 代表者メール</span>
          </div>
          <button type="button" className="admin-stripe-primary" onClick={handleStripeOnboardingStart} disabled={stripeBusy}>
            <i className={`fas ${stripeBusy ? "fa-spinner fa-spin" : "fa-arrow-up-right-from-square"}`} />
            <span>{stripeBusy ? "Stripe画面を準備中" : rawStripeAccountId ? "本番登録を再開・確認" : "本番Stripe登録を開始"}</span>
          </button>
          {stripeMessage && (
            <div className={`admin-basic-message ${stripeMessage.includes("失敗") || stripeMessage.includes("できません") ? "error" : "success"}`}>
              {stripeMessage}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderLiveFacilityPanel = () => {
    const pendingReservations = liveFacilityData.reservations.filter((reservation) => reservation.status !== "approved" && reservation.status !== "rejected");
    const approvedReservations = liveFacilityData.reservations.filter((reservation) => reservation.status === "approved");
    const rejectedReservations = liveFacilityData.reservations.filter((reservation) => reservation.status === "rejected");
    const facilityName = (reservation: any) => reservation.facility_name || liveFacilityData.facilities.find((facility) => String(facility.id) === String(reservation.facility_id))?.name || "施設";

    return (
      <section className="admin-basic-panel admin-live-panel" aria-label="Web会議・施設予約">
        <div className="admin-basic-header">
          <div>
            <p className="el-kicker">Web会議・施設予約</p>
            <h2>Web会議案内と施設予約を管理します</h2>
          </div>
        </div>

        <div className="admin-live-switch" aria-label="Live・施設予約の画面切替">
          <button type="button" className={activeLiveFacilityScreen === "live" ? "active" : ""} onClick={() => setActiveLiveFacilityScreen("live")}>
            <i className="fas fa-video" />
            <span>Web会議</span>
          </button>
          <button type="button" className={activeLiveFacilityScreen === "facility" ? "active" : ""} onClick={() => setActiveLiveFacilityScreen("facility")}>
            <i className="fas fa-building" />
            <span>施設予約</span>
          </button>
        </div>

        {liveFacilityMessage && (
          <div className={`admin-basic-message ${liveFacilityMessage.includes("失敗") || liveFacilityMessage.includes("入力") || liveFacilityMessage.includes("できません") ? "error" : "success"}`}>
            {liveFacilityMessage}
          </div>
        )}

        {activeLiveFacilityScreen === "live" ? (
          <div className="admin-live-single">
            <form className="admin-basic-card admin-live-form" onSubmit={handleLiveSessionSubmit}>
              <div className="admin-basic-card-heading">
                <div>
                  <h3>{editingLiveSessionId ? "Web会議開催案内を編集" : "Web会議開催案内"}</h3>
                  <p>LINEまたはYouTubeによるWeb会議予定を登録し、会員のLiveタブへ表示します。</p>
                </div>
                <div className="admin-heading-actions">
                  {editingLiveSessionId && (
                    <button type="button" className="secondary" onClick={cancelLiveSessionEdit} disabled={liveFacilityBusy}>
                      <i className="fas fa-xmark" />
                      <span>新規に戻る</span>
                    </button>
                  )}
                  <button type="submit" disabled={liveFacilityBusy}>
                    <i className={`fas ${liveFacilityBusy ? "fa-spinner fa-spin" : editingLiveSessionId ? "fa-floppy-disk" : "fa-video"}`} />
                    <span>{editingLiveSessionId ? "案内を更新" : "案内を登録"}</span>
                  </button>
                </div>
              </div>
              <div className="admin-basic-form">
                <label>
                  <span>開催種別</span>
                  <select value={liveSessionDraft.provider} onChange={(event) => handleLiveSessionDraftChange("provider", event.target.value as LiveSessionDraft["provider"])}>
                    <option value="line">LINEによるWeb会議</option>
                    <option value="youtube">YouTubeによるWeb会議</option>
                  </select>
                </label>
                <label>
                  <span>表題</span>
                  <input value={liveSessionDraft.title} onChange={(event) => handleLiveSessionDraftChange("title", event.target.value)} placeholder="例: 役員説明会、総会ライブ配信" />
                </label>
                <label>
                  <span>開催日</span>
                  <input type="date" value={liveSessionDraft.eventDate} onChange={(event) => handleLiveSessionDraftChange("eventDate", event.target.value)} />
                </label>
                <label>
                  <span>開催時間</span>
                  <input value={liveSessionDraft.eventTime} onChange={(event) => handleLiveSessionDraftChange("eventTime", event.target.value)} placeholder="例: 19:00から、受付18:45" />
                </label>
                <label className="admin-basic-wide">
                  <span>開催URL</span>
                  <input value={liveSessionDraft.url} onChange={(event) => handleLiveSessionDraftChange("url", event.target.value)} placeholder="LINEミーティングURL または YouTube URL" />
                </label>
                <label className="admin-basic-wide">
                  <span>内容</span>
                  <textarea value={liveSessionDraft.content} onChange={(event) => handleLiveSessionDraftChange("content", event.target.value)} placeholder="会員に案内する内容を入力してください。" />
                </label>
                <label className="admin-publish-toggle">
                  <input type="checkbox" checked={liveSessionDraft.notifyEnabled} onChange={(event) => handleLiveSessionDraftChange("notifyEnabled", event.target.checked)} />
                  <span>
                    <strong>LINEへ案内通知する</strong>
                    <small>チェックすると会員のLINEにWeb会議開催案内を送信します。</small>
                  </span>
                </label>
              </div>
            </form>

            <section className="admin-basic-card">
              <div className="admin-basic-card-heading">
                <div>
                  <h3>Web会議参加者</h3>
                  <p>会員がLiveから申し込んだ参加返信を確認します。</p>
                </div>
              </div>
              <div className="admin-compact-table">
                {liveFacilityData.liveSessions.length === 0 && <div><span>Web会議予定はまだありません。</span><em>未登録</em></div>}
                {liveFacilityData.liveSessions.map((session) => {
                  const replies = liveFacilityData.liveApplications.filter((reply) => String(reply.live_session_id) === String(session.id));
                  return (
                    <div key={session.id}>
                      <span>
                        <strong>{session.title || "Web会議"}</strong>
                        <small>{session.provider === "youtube" ? "YouTube" : "LINE"} / {toDisplayDate(session.event_date || session.starts_at)} {session.event_time || ""}</small>
                        {replies.slice(0, 5).map((reply) => (
                          <small key={reply.id || `${session.id}-${reply.resident_name}`}>{reply.resident_name || reply.applicant_name || "会員"} / {reply.participant_count || reply.people_count || 1}名</small>
                        ))}
                      </span>
                      <div className="admin-list-actions">
                        <em>参加 {replies.length}件</em>
                        <button type="button" onClick={() => startLiveSessionEdit(session)} disabled={liveFacilityBusy}>編集</button>
                        <button type="button" className="delete" onClick={() => handleLiveSessionDelete(session)} disabled={liveFacilityBusy}>削除</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          <div className="admin-live-single">
            <form className="admin-basic-card admin-live-form" onSubmit={handleFacilitySubmit}>
              <div className="admin-basic-card-heading">
                <div>
                  <h3>{editingFacilityId ? "施設情報を編集" : "施設登録"}</h3>
                  <p>予約制御に使える時刻・曜日・日付で、施設の利用条件を登録します。</p>
                </div>
                <div className="admin-heading-actions">
                  {editingFacilityId && (
                    <button type="button" className="secondary" onClick={cancelFacilityEdit} disabled={liveFacilityBusy}>
                      <i className="fas fa-xmark" />
                      <span>新規に戻る</span>
                    </button>
                  )}
                  <button type="submit" disabled={liveFacilityBusy}>
                    <i className={`fas ${liveFacilityBusy ? "fa-spinner fa-spin" : editingFacilityId ? "fa-floppy-disk" : "fa-building"}`} />
                    <span>{editingFacilityId ? "施設を更新" : "施設を登録"}</span>
                  </button>
                </div>
              </div>
              <div className="admin-basic-form">
                <label>
                  <span>施設名</span>
                  <input value={facilityDraft.name} onChange={(event) => handleFacilityDraftChange("name", event.target.value)} placeholder="例: 集会所" />
                </label>
                <label>
                  <span>場所</span>
                  <input value={facilityDraft.location} onChange={(event) => handleFacilityDraftChange("location", event.target.value)} placeholder="例: 夢ヶ丘会館1階" />
                </label>
                <label>
                  <span>規模</span>
                  <input value={facilityDraft.capacity} onChange={(event) => handleFacilityDraftChange("capacity", event.target.value)} placeholder="例: 30名程度" />
                </label>
                <div className="admin-time-range">
                  <span>利用可能時間帯</span>
                  <label>
                    <small>開始</small>
                    <input type="time" value={facilityDraft.availableStartTime} onChange={(event) => handleFacilityDraftChange("availableStartTime", event.target.value)} />
                  </label>
                  <label>
                    <small>終了</small>
                    <input type="time" value={facilityDraft.availableEndTime} onChange={(event) => handleFacilityDraftChange("availableEndTime", event.target.value)} />
                  </label>
                </div>
                <div className="admin-basic-wide admin-weekday-picker">
                  <span>利用不可能な曜日</span>
                  <div>
                    {weekdayOptions.map((weekday) => (
                      <button key={weekday} type="button" className={facilityDraft.unavailableWeekdays.includes(weekday) ? "active" : ""} onClick={() => toggleFacilityUnavailableWeekday(weekday)}>
                        {weekday}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="admin-basic-wide admin-date-picker">
                  <span>利用不可能な日</span>
                  <div>
                    <input type="date" value={facilityDraft.unavailableDateInput} onChange={(event) => handleFacilityDraftChange("unavailableDateInput", event.target.value)} />
                    <button type="button" onClick={addFacilityUnavailableDate}>追加</button>
                  </div>
                  {facilityDraft.unavailableDates.length > 0 && (
                    <p>
                      {facilityDraft.unavailableDates.map((date) => (
                        <button key={date} type="button" onClick={() => removeFacilityUnavailableDate(date)}>{date} ×</button>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            </form>

            <section className="admin-basic-card">
              <div className="admin-basic-card-heading">
                <div>
                  <h3>登録施設</h3>
                  <p>施設条件の変更や、不要になった施設の削除を行います。</p>
                </div>
              </div>
              <div className="admin-live-reservations">
                {liveFacilityData.facilities.map((facility) => (
                  <div key={facility.id} className={`admin-live-reservation ${facility.is_active === false ? "rejected" : "approved"}`}>
                    <span>
                      <strong>{facility.name || "施設"}</strong>
                      <small>{facility.location || "場所未設定"} / {facility.capacity || facility.scale || "規模未設定"}</small>
                      <small>利用可能 {facility.available_hours || `${facility.available_start_time || "未設定"}-${facility.available_end_time || "未設定"}`}</small>
                      {Array.isArray(facility.unavailable_weekdays) && facility.unavailable_weekdays.length > 0 && <small>利用不可曜日: {facility.unavailable_weekdays.join("・")}</small>}
                      {Array.isArray(facility.unavailable_dates) && facility.unavailable_dates.length > 0 && <small>利用不可日: {facility.unavailable_dates.join("、")}</small>}
                    </span>
                    <em>{facility.is_active === false ? "停止中" : "利用可"}</em>
                    <div className="admin-list-actions">
                      <button type="button" onClick={() => startFacilityEdit(facility)} disabled={liveFacilityBusy}>編集</button>
                      <button type="button" className="delete" onClick={() => handleFacilityDelete(facility)} disabled={liveFacilityBusy}>削除</button>
                    </div>
                  </div>
                ))}
                {liveFacilityData.facilities.length === 0 && <div className="el-empty">登録施設はまだありません。</div>}
              </div>
            </section>

            <section className="admin-basic-card">
              <div className="admin-basic-card-heading">
                <div>
                  <h3>施設予約承認</h3>
                  <p>承認済みの時間帯は会員側で申込不可になります。承認待ちへ戻すと再度予約可能です。</p>
                </div>
              </div>
              <div className="admin-live-reservations">
                {[...pendingReservations, ...approvedReservations, ...rejectedReservations].map((reservation) => (
                  <div key={reservation.id} className={`admin-live-reservation ${reservation.status || "pending"}`}>
                    <span>
                      <strong>{facilityName(reservation)}</strong>
                      <small>{toDisplayDate(reservation.reservation_date)} {reservation.start_time || ""}{reservation.end_time ? `-${reservation.end_time}` : ""}</small>
                      <small>{reservation.applicant_name || reservation.resident_name || "申込者未設定"} / {reservation.participant_count || reservation.people_count || 1}名</small>
                    </span>
                    <em>{reservation.status === "approved" ? "承認済" : reservation.status === "rejected" ? "否認" : "承認待ち"}</em>
                    <div>
                      <button type="button" onClick={() => handleReservationStatusChange(reservation, "approved")} disabled={liveFacilityBusy}>承認</button>
                      <button type="button" onClick={() => handleReservationStatusChange(reservation, "rejected")} disabled={liveFacilityBusy}>否認</button>
                      {reservation.status === "approved" && <button type="button" onClick={() => handleReservationStatusChange(reservation, "pending")} disabled={liveFacilityBusy}>承認解除</button>}
                    </div>
                  </div>
                ))}
                {liveFacilityData.reservations.length === 0 && <div className="el-empty">施設予約の申込はまだありません。</div>}
              </div>
            </section>
          </div>
        )}
      </section>
    );
  };

  const renderAssemblyAccountingPanel = () => {
    const renderCategoryColumn = (type: AssemblyCategoryType) => {
      const roots = assemblyCategories.filter((category) => category.type === type && !category.parent_id);
      return (
        <section className="admin-accounting-card">
          <div className="admin-accounting-card-heading">
            <h3>{assemblyCategoryTypeLabel[type]}</h3>
            <span>{roots.length}科目</span>
          </div>
          <div className="admin-accounting-category-list">
            {roots.map((category) => {
              const children = assemblyCategories.filter((item) => String(item.parent_id) === String(category.id));
              return (
                <div key={category.id} className="admin-accounting-category">
                  <div>
                    <span>
                      <strong>{category.name || "科目未設定"}</strong>
                      <small>{category.is_standard ? "標準科目" : "追加科目"} / 表示順 {category.sort_order ?? 0}</small>
                    </span>
                    <div className="admin-list-actions">
                      <button type="button" onClick={() => startAssemblyCategoryEdit(category)} disabled={assemblyBusy}>編集</button>
                      <button type="button" className="delete" onClick={() => handleAssemblyCategoryDelete(category)} disabled={assemblyBusy}>削除</button>
                    </div>
                  </div>
                  {children.map((child) => (
                    <div key={child.id} className="child">
                      <span>
                        <strong>{child.name || "補助科目未設定"}</strong>
                        <small>補助科目 / 表示順 {child.sort_order ?? 0}</small>
                      </span>
                      <div className="admin-list-actions">
                        <button type="button" onClick={() => startAssemblyCategoryEdit(child)} disabled={assemblyBusy}>編集</button>
                        <button type="button" className="delete" onClick={() => handleAssemblyCategoryDelete(child)} disabled={assemblyBusy}>削除</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {roots.length === 0 && <div className="el-empty">{assemblyCategoryTypeLabel[type]}科目はまだありません。</div>}
          </div>
        </section>
      );
    };

    const categoryName = (categoryId?: number | string | null) => {
      if (!categoryId) return "未設定項目";
      return assemblyCategories.find((category) => String(category.id) === String(categoryId))?.name || "未設定項目";
    };
    const assemblyMonthOptions = [
      { value: "all", label: `${assemblyFiscalYear}年度 全期間` },
      ...Array.from({ length: 12 }, (_, index) => {
        const monthNumber = index + 1;
        return {
          value: `${assemblyFiscalYear}-${String(monthNumber).padStart(2, "0")}`,
          label: `${assemblyFiscalYear}年${monthNumber}月`,
        };
      }),
    ];
    const monthlySettlementCount = (row: AssemblyReportRow) => {
      if (row.isUnassigned) {
        const categoryIds = new Set(assemblyCategories.map((category) => String(category.id)));
        return filteredAssemblySettlements.filter((settlement) => {
          const categoryId = settlement.category_id;
          return settlement.type === row.type && (!categoryId || !categoryIds.has(String(categoryId)));
        }).length;
      }
      return filteredAssemblySettlements.filter((settlement) => String(settlement.category_id) === row.id).length;
    };

    return (
      <section className="admin-workspace-panel admin-accounting-panel" aria-label="総会会計">
        <div className="admin-workspace-header">
          <div>
            <p className="el-kicker">総会会計</p>
            <h2>予算書・決算書</h2>
          </div>
          <div className="admin-accounting-year">
            <label>
              <span>会計年度</span>
              <input
                type="number"
                min="2000"
                max="2100"
                value={assemblyFiscalYear}
                onChange={(event) => setAssemblyFiscalYear(Number(event.target.value) || new Date().getFullYear())}
              />
            </label>
            <button type="button" onClick={() => fetchAssemblyAccounting()} disabled={assemblyBusy}>
              <i className={`fas ${assemblyBusy ? "fa-spinner fa-spin" : "fa-rotate"}`} />
              <span>再読込</span>
            </button>
          </div>
        </div>

        <div className="admin-view-tabs admin-accounting-tabs">
          {assemblyTabs.map((tab) => (
            <button key={tab.key} type="button" className={activeAssemblyTab === tab.key ? "active" : ""} onClick={() => setActiveAssemblyTab(tab.key)}>
              <i className={`fas ${tab.icon}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {assemblyMessage && (
          <div className={`admin-basic-message ${assemblyMessage.includes("失敗") || assemblyMessage.includes("入力") || assemblyMessage.includes("できません") || assemblyMessage.includes("未作成") ? "error" : "success"}`}>
            {assemblyMessage}
          </div>
        )}

        {activeAssemblyTab === "categories" && (
          <div className="admin-accounting-stack">
            <form className="admin-basic-card admin-accounting-form-card" onSubmit={handleAssemblyCategorySubmit}>
              <div className="admin-basic-card-heading">
                <div>
                  <h3>{editingAssemblyCategoryId ? "科目を編集" : "科目を追加"}</h3>
                  <p>親科目または補助科目として登録します。</p>
                </div>
                <div className="admin-heading-actions">
                  <button type="button" className="secondary" onClick={handleInitializeStandardAssemblyCategories} disabled={assemblyBusy}>
                    <i className="fas fa-wand-magic-sparkles" />
                    <span>標準科目を作成</span>
                  </button>
                  {editingAssemblyCategoryId && (
                    <button type="button" className="secondary" onClick={cancelAssemblyCategoryEdit} disabled={assemblyBusy}>
                      <i className="fas fa-xmark" />
                      <span>新規に戻る</span>
                    </button>
                  )}
                  <button type="submit" disabled={assemblyBusy}>
                    <i className={`fas ${assemblyBusy ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} />
                    <span>{editingAssemblyCategoryId ? "更新" : "追加"}</span>
                  </button>
                </div>
              </div>
              <div className="admin-basic-form">
                <label>
                  <span>区分</span>
                  <select value={assemblyCategoryDraft.type} onChange={(event) => handleAssemblyCategoryDraftChange("type", event.target.value as AssemblyCategoryType)}>
                    <option value="income">収入</option>
                    <option value="expense">支出</option>
                  </select>
                </label>
                <label>
                  <span>親科目</span>
                  <select value={assemblyCategoryDraft.parentId} onChange={(event) => handleAssemblyCategoryDraftChange("parentId", event.target.value)}>
                    <option value="">親科目として登録</option>
                    {assemblyParentOptions.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>科目名</span>
                  <input value={assemblyCategoryDraft.name} onChange={(event) => handleAssemblyCategoryDraftChange("name", event.target.value)} placeholder="例: 会費、事務費、印刷費" />
                </label>
                <label>
                  <span>表示順</span>
                  <input type="number" value={assemblyCategoryDraft.sortOrder} onChange={(event) => handleAssemblyCategoryDraftChange("sortOrder", event.target.value)} placeholder="例: 10" />
                </label>
              </div>
            </form>
            <div className="admin-accounting-split">
              {renderCategoryColumn("income")}
              {renderCategoryColumn("expense")}
            </div>
          </div>
        )}

        {activeAssemblyTab === "budget" && (
          <div className="admin-accounting-stack">
            <section className="admin-accounting-card">
              <div className="admin-accounting-card-heading">
                <h3>{assemblyFiscalYear}年度 予算入力</h3>
                <div className="admin-heading-actions">
                  <button type="button" className="secondary" onClick={exportAssemblyBudgetCsv} disabled={assemblyCategories.length === 0}>CSV</button>
                  <button type="button" className="secondary" onClick={printAssemblyBudget} disabled={assemblyCategories.length === 0}>PDF/印刷</button>
                  <button type="button" onClick={handleAssemblyBudgetSave} disabled={assemblyBusy || assemblyCategories.length === 0}>
                    <i className={`fas ${assemblyBusy ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} />
                    <span>予算を保存</span>
                  </button>
                </div>
              </div>
              <div className="admin-accounting-table-wrap">
                <table className="admin-accounting-table">
                  <thead>
                    <tr>
                      <th>区分</th>
                      <th>科目</th>
                      <th>前年度予算</th>
                      <th>本年度予算</th>
                      <th>増減</th>
                      <th>備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assemblyCategories.map((category) => {
                      const draft = assemblyBudgetDrafts[String(category.id)] || { budgetAmount: "0", previousBudgetAmount: "0", note: "" };
                      const previousBudget = amountFromInput(draft.previousBudgetAmount);
                      const budget = amountFromInput(draft.budgetAmount);
                      return (
                        <tr key={category.id}>
                          <td>{assemblyCategoryTypeLabel[category.type === "expense" ? "expense" : "income"]}</td>
                          <td>{formatAssemblyChildName(category.name || "科目未設定", Boolean(category.parent_id))}</td>
                          <td><input type="number" value={draft.previousBudgetAmount} onChange={(event) => handleAssemblyBudgetDraftChange(category.id, "previousBudgetAmount", event.target.value)} /></td>
                          <td><input type="number" value={draft.budgetAmount} onChange={(event) => handleAssemblyBudgetDraftChange(category.id, "budgetAmount", event.target.value)} /></td>
                          <td className={`num ${budget - previousBudget < 0 ? "minus" : "plus"}`}>{yen(budget - previousBudget)}</td>
                          <td><input value={draft.note} onChange={(event) => handleAssemblyBudgetDraftChange(category.id, "note", event.target.value)} /></td>
                        </tr>
                      );
                    })}
                    {assemblyCategories.length === 0 && (
                      <tr><td colSpan={6}>科目を作成すると予算を入力できます。</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeAssemblyTab === "settlement" && (
          <div className="admin-accounting-stack">
            <div className="admin-accounting-metrics">
              <span>
                <small>会費実績</small>
                <strong>{yen(assemblyFeeRevenue)}</strong>
              </span>
              <span>
                <small>収入実績</small>
                <strong>{yen(assemblyTotals.incomeActual)}</strong>
              </span>
              <span>
                <small>支出実績</small>
                <strong>{yen(assemblyTotals.expenseActual)}</strong>
              </span>
              <span>
                <small>収支差額</small>
                <strong>{yen(assemblyTotals.balance)}</strong>
              </span>
            </div>

            <div className="admin-accounting-filter">
              <label>
                <span>表示月</span>
                <select value={assemblySettlementMonth} onChange={(event) => setAssemblySettlementMonth(event.target.value)}>
                  {assemblyMonthOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <form className="admin-basic-card admin-accounting-form-card" onSubmit={handleAssemblySettlementSubmit}>
              <div className="admin-basic-card-heading">
                <div>
                  <h3>決算明細入力</h3>
                  <p>{assemblyFiscalYear}年度の領収書・明細を登録します。</p>
                </div>
                <button type="submit" disabled={assemblyBusy || settlementCategoryOptions.length === 0}>
                  <i className={`fas ${assemblyBusy ? "fa-spinner fa-spin" : "fa-receipt"}`} />
                  <span>明細を追加</span>
                </button>
              </div>
              <div className="admin-basic-form">
                <label>
                  <span>区分</span>
                  <select value={assemblySettlementDraft.type} onChange={(event) => handleAssemblySettlementDraftChange("type", event.target.value as AssemblyCategoryType)}>
                    <option value="income">収入</option>
                    <option value="expense">支出</option>
                  </select>
                </label>
                <label>
                  <span>科目</span>
                  <select value={assemblySettlementDraft.categoryId} onChange={(event) => handleAssemblySettlementDraftChange("categoryId", event.target.value)}>
                    <option value="">選択してください</option>
                    {settlementCategoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>{formatAssemblyChildName(category.name || "科目未設定", Boolean(category.parent_id))}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>日付</span>
                  <input type="date" value={assemblySettlementDraft.paidDate} onChange={(event) => handleAssemblySettlementDraftChange("paidDate", event.target.value)} />
                </label>
                <label>
                  <span>金額</span>
                  <input type="number" value={assemblySettlementDraft.amount} onChange={(event) => handleAssemblySettlementDraftChange("amount", event.target.value)} placeholder="0" />
                </label>
                <label className="admin-basic-wide">
                  <span>摘要</span>
                  <input value={assemblySettlementDraft.description} onChange={(event) => handleAssemblySettlementDraftChange("description", event.target.value)} placeholder="例: コピー用紙購入、会場使用料" />
                </label>
                <label className="admin-basic-wide">
                  <span>領収書画像/PDF</span>
                  <input type="file" accept="image/*,application/pdf" onChange={(event) => setAssemblyReceiptFile(event.target.files?.[0] || null)} />
                </label>
              </div>
            </form>

            <section className="admin-accounting-card">
              <div className="admin-accounting-card-heading">
                <h3>月別 科目別集計</h3>
                <span>{assemblyMonthOptions.find((option) => option.value === assemblySettlementMonth)?.label || "全期間"}</span>
              </div>
              <div className="admin-accounting-table-wrap">
                <table className="admin-accounting-table">
                  <thead>
                    <tr>
                      <th>区分</th>
                      <th>科目</th>
                      <th>決算額</th>
                      <th>明細件数</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="section"><th colSpan={4}>収入</th></tr>
                    {monthlyAssemblyReportRows.filter((row) => row.type === "income").map((row) => (
                      <tr key={`monthly-${row.id}`}>
                        <td>{assemblyCategoryTypeLabel[row.type]}</td>
                        <td>{formatAssemblyChildName(row.name, row.isChild)}</td>
                        <td className="num">{yen(row.actual)}</td>
                        <td className="num">{monthlySettlementCount(row)}</td>
                      </tr>
                    ))}
                    <tr className="section"><th colSpan={4}>支出</th></tr>
                    {monthlyAssemblyReportRows.filter((row) => row.type === "expense").map((row) => (
                      <tr key={`monthly-${row.id}`}>
                        <td>{assemblyCategoryTypeLabel[row.type]}</td>
                        <td>{formatAssemblyChildName(row.name, row.isChild)}</td>
                        <td className="num">{yen(row.actual)}</td>
                        <td className="num">{monthlySettlementCount(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-accounting-card">
              <div className="admin-accounting-card-heading">
                <h3>{assemblyFiscalYear}年度 明細</h3>
                <span>{filteredAssemblySettlements.length}件 / 全{assemblyData.settlements.length}件</span>
              </div>
              <div className="admin-accounting-table-wrap">
                <table className="admin-accounting-table">
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>区分</th>
                      <th>科目</th>
                      <th>摘要</th>
                      <th>金額</th>
                      <th>領収書</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssemblySettlements.map((settlement) => (
                      <tr key={settlement.id}>
                        <td>{settlement.paid_date || "-"}</td>
                        <td>{assemblyCategoryTypeLabel[settlement.type === "expense" ? "expense" : "income"]}</td>
                        <td>{categoryName(settlement.category_id)}</td>
                        <td>{settlement.description || "-"}</td>
                        <td className="num">{yen(Number(settlement.amount || 0))}</td>
                        <td>{settlement.receipt_url ? <a href={settlement.receipt_url} target="_blank" rel="noreferrer">表示</a> : "-"}</td>
                        <td><button type="button" className="danger-text" onClick={() => handleAssemblySettlementDelete(settlement)} disabled={assemblyBusy}>削除</button></td>
                      </tr>
                    ))}
                    {filteredAssemblySettlements.length === 0 && (
                      <tr><td colSpan={7}>指定月の決算明細はありません。</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activeAssemblyTab === "report" && (
          <div className="admin-accounting-stack">
            <div className="admin-accounting-metrics">
              <span>
                <small>収入計</small>
                <strong>{yen(assemblyTotals.incomeActual)}</strong>
                <em>差分 {yen(assemblyTotals.incomeDiff)}</em>
              </span>
              <span>
                <small>支出計</small>
                <strong>{yen(assemblyTotals.expenseActual)}</strong>
                <em>差分 {yen(assemblyTotals.expenseDiff)}</em>
              </span>
              <span>
                <small>収支差額</small>
                <strong>{yen(assemblyTotals.balance)}</strong>
              </span>
              <span>
                <small>会費連携</small>
                <strong>{yen(assemblyFeeRevenue)}</strong>
              </span>
            </div>
            <section className="admin-accounting-card">
              <div className="admin-accounting-card-heading">
                <h3>{assemblyFiscalYear}年度 集計</h3>
                <div className="admin-heading-actions">
                  <button type="button" className="secondary" onClick={exportAssemblyBudgetCsv}>予算CSV</button>
                  <button type="button" className="secondary" onClick={exportAssemblySettlementCsv}>決算CSV</button>
                  <button type="button" className="secondary" onClick={printAssemblyBudget}>予算PDF/印刷</button>
                  <button type="button" onClick={printAssemblySettlement}>決算PDF/印刷</button>
                </div>
              </div>
              <div className="admin-accounting-table-wrap">
                <table className="admin-accounting-table">
                  <thead>
                    <tr>
                      <th>区分</th>
                      <th>科目</th>
                      <th>予算額</th>
                      <th>決算額</th>
                      <th>差分</th>
                      <th>備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="section">
                      <th colSpan={6}>収入</th>
                    </tr>
                    {assemblyReportRows.filter((row) => row.type === "income").map((row) => (
                      <tr key={row.id}>
                        <td>{assemblyCategoryTypeLabel[row.type]}</td>
                        <td>{formatAssemblyChildName(row.name, row.isChild)}</td>
                        <td className="num">{yen(row.budget)}</td>
                        <td className="num">{yen(row.actual)}</td>
                        <td className={`num ${row.diff < 0 ? "minus" : "plus"}`}>{yen(row.diff)}</td>
                        <td>{row.note || "-"}</td>
                      </tr>
                    ))}
                    <tr className="total">
                      <th colSpan={2}>収入計</th>
                      <td className="num">{yen(assemblyTotals.incomeBudget)}</td>
                      <td className="num">{yen(assemblyTotals.incomeActual)}</td>
                      <td className="num">{yen(assemblyTotals.incomeDiff)}</td>
                      <td />
                    </tr>
                    <tr className="section">
                      <th colSpan={6}>支出</th>
                    </tr>
                    {assemblyReportRows.filter((row) => row.type === "expense").map((row) => (
                      <tr key={row.id}>
                        <td>{assemblyCategoryTypeLabel[row.type]}</td>
                        <td>{formatAssemblyChildName(row.name, row.isChild)}</td>
                        <td className="num">{yen(row.budget)}</td>
                        <td className="num">{yen(row.actual)}</td>
                        <td className={`num ${row.diff < 0 ? "minus" : "plus"}`}>{yen(row.diff)}</td>
                        <td>{row.note || "-"}</td>
                      </tr>
                    ))}
                    <tr className="total">
                      <th colSpan={2}>支出計</th>
                      <td className="num">{yen(assemblyTotals.expenseBudget)}</td>
                      <td className="num">{yen(assemblyTotals.expenseActual)}</td>
                      <td className="num">{yen(assemblyTotals.expenseDiff)}</td>
                      <td />
                    </tr>
                    <tr className="total">
                      <th colSpan={2}>差額</th>
                      <td className="num">{yen(assemblyTotals.incomeBudget - assemblyTotals.expenseBudget)}</td>
                      <td className="num">{yen(assemblyTotals.balance)}</td>
                      <td className="num">{yen(assemblyTotals.balance - (assemblyTotals.incomeBudget - assemblyTotals.expenseBudget))}</td>
                      <td>収入計 - 支出計</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </section>
    );
  };

  const renderDashboardMenuPanel = () => {
    if (activeDashboardMenu === "basic") {
      return (
        <section className="admin-basic-panel admin-basic-menu-panel" aria-label="基本機能メニュー">
          <div className="admin-basic-header">
            <div>
              <p className="el-kicker">基本機能</p>
              <h2>操作する画面を選んでください</h2>
            </div>
          </div>
          <div className="admin-basic-menu-grid">
            {basicFeatures.map((feature) => (
              <button key={feature.key} type="button" onClick={() => openBasicFeature(feature.key)}>
                <i className={`fas ${feature.icon}`} />
                <span>
                  <strong>{feature.key}</strong>
                  <small>{feature.desc}</small>
                </span>
                <em>開く</em>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (activeDashboardMenu === "publish") {
      return (
        <section className="admin-basic-panel admin-basic-menu-panel" aria-label="発信機能メニュー">
          <div className="admin-basic-header">
            <div>
              <p className="el-kicker">発信機能</p>
              <h2>発信する画面を選んでください</h2>
            </div>
          </div>
          <div className="admin-basic-menu-grid">
            {publishTypeOptions.map((option) => (
              <button key={option.value} type="button" onClick={() => openPublishFeature(option.value)}>
                <i className={`fas ${option.value === "event" ? "fa-calendar-days" : option.value === "assembly" ? "fa-users-viewfinder" : option.value === "notice" ? "fa-circle-info" : "fa-clipboard-list"}`} />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
                <em>開く</em>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (activeDashboardMenu === "live") {
      return renderLiveFacilityPanel();
    }

    if (activeDashboardMenu === "accounting") {
      return renderAssemblyAccountingPanel();
    }

    const inactiveMenuIcons = ["fa-file-invoice", "fa-chart-line", "fa-list-check", "fa-print"];

    return (
      <section className="admin-basic-panel admin-basic-menu-panel" aria-label={`${activeDashboardGroup.title}メニュー`}>
        <div className="admin-basic-header">
          <div>
            <p className="el-kicker">{activeDashboardGroup.title}</p>
            <h2>{activeDashboardGroup.title}の画面を選んでください</h2>
          </div>
        </div>
        <div className="admin-basic-menu-grid">
          {activeDashboardGroup.items.map((item, index) => (
            <button key={item} type="button" disabled>
              <i className={`fas ${inactiveMenuIcons[index] || "fa-circle-dot"}`} />
              <span>
                <strong>{item}</strong>
                <small>{activeDashboardGroup.desc}</small>
              </span>
              <em>準備中</em>
            </button>
          ))}
        </div>
      </section>
    );
  };

  if (activeAdminScreen === "basicFeature") {
    return (
      <main className="admin-dashboard admin-dashboard-v2 admin-feature-screen">
        <section className="admin-feature-hero">
          <button type="button" className="admin-back-button" onClick={backToAdminDashboard}>
            <i className="fas fa-arrow-left" />
            <span>管理トップへ戻る</span>
          </button>
          <div>
            <p className="el-kicker">基本機能</p>
            <h1>{activeBasicFeature}</h1>
            <p>{activeFeatureMeta.desc}</p>
          </div>
        </section>

        <section className="admin-feature-nav" aria-label="基本機能の切り替え">
          {basicFeatures.map((feature) => (
            <button
              key={feature.key}
              type="button"
              className={activeBasicFeature === feature.key ? "active" : ""}
              onClick={() => openBasicFeature(feature.key)}
              title={feature.desc}
            >
              <i className={`fas ${feature.icon}`} />
              <span>{feature.key}</span>
            </button>
          ))}
        </section>

        <section className="admin-feature-content" aria-label={`${activeBasicFeature}画面`}>
          {renderBasicFeatureContent()}
        </section>
      </main>
    );
  }

  if (activeAdminScreen === "publishFeature") {
    return (
      <main className="admin-dashboard admin-dashboard-v2 admin-feature-screen">
        <section className="admin-feature-hero">
          <button type="button" className="admin-back-button" onClick={backToAdminDashboard}>
            <i className="fas fa-arrow-left" />
            <span>管理トップへ戻る</span>
          </button>
          <div>
            <p className="el-kicker">発信機能</p>
            <h1>{activePublishMeta.label}</h1>
            <p>{activePublishMeta.hint}</p>
          </div>
        </section>

        <section className="admin-feature-nav" aria-label="発信機能の切り替え">
          {publishTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={publishDraft.type === option.value ? "active" : ""}
              onClick={() => openPublishFeature(option.value)}
              title={option.hint}
            >
              <i className={`fas ${option.value === "event" ? "fa-calendar-days" : option.value === "assembly" ? "fa-users-viewfinder" : option.value === "notice" ? "fa-circle-info" : "fa-clipboard-list"}`} />
              <span>{option.label}</span>
            </button>
          ))}
        </section>

        <section className="admin-feature-content" aria-label={`${activePublishMeta.label}画面`}>
          {renderPublishFeatureContent()}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-dashboard admin-dashboard-v2">
      <section className="admin-hero admin-hero-compact">
        <div>
          <p className="el-kicker">el-town 管理</p>
          <h1>{townName}</h1>
          <p>機能メニューから操作画面を選び、必要な画面へ切り替えて管理します。</p>
        </div>
        <img className="admin-hero-logo-wide" src="/assets/logo_horizontal_final.png" alt="el-town" />
      </section>

      <section className="admin-function-groups" aria-label="機能集合体">
        {functionGroups.map((group) => (
          <button
            key={group.key}
            type="button"
            className={`admin-function-group ${group.tone} ${activeDashboardMenu === group.key ? "active" : ""}`}
            onClick={() => setActiveDashboardMenu(group.key)}
            aria-pressed={activeDashboardMenu === group.key}
          >
            <span className="admin-function-icon"><i className={`fas ${group.icon}`} /></span>
            <span className="admin-function-body">
              <strong>{group.title}</strong>
              <small>{group.desc}</small>
              <span className="admin-function-chips">
                {group.items.map((item) => <em key={item}>{item}</em>)}
              </span>
            </span>
          </button>
        ))}
      </section>

      {renderDashboardMenuPanel()}

      <section className="admin-metric-strip" aria-label="運営指標">
        <div className="admin-metric-card">
          <span>連携会員数</span>
          <strong>{loading ? "-" : summary.linkedMembers.toLocaleString()}</strong>
          <small>LINE連携済み</small>
        </div>
        <div className="admin-metric-card">
          <span>{month.label} プッシュ件数</span>
          <strong>{loading ? "-" : summary.monthlyPushes.toLocaleString()}</strong>
          <small>月別通知</small>
        </div>
        <div className="admin-metric-card warning">
          <span>システム利用料</span>
          <strong>{loading ? "-" : yen(summary.systemUsageFee)}</strong>
          <small>月額・超過配信</small>
        </div>
        <div className="admin-metric-card">
          <span>年間会費請求額</span>
          <strong>{loading ? "-" : yen(summary.annualFeeBilling)}</strong>
          <small>請求予定合計</small>
        </div>
        <div className="admin-metric-card success">
          <span>納入額</span>
          <strong>{loading ? "-" : yen(summary.paidTotal)}</strong>
          <small>現金・Stripe合計</small>
        </div>
      </section>

      {showIntegratedWorkView && (
        <section className="admin-workspace-panel" aria-label="統合ビュー">
          <div className="admin-workspace-header">
            <div>
              <p className="el-kicker">総合ビュー</p>
              <h2>発信機能・Live・施設予約</h2>
            </div>
            <div className="admin-view-tabs" aria-label="ビュー種別">
              {["発信機能", "Live・施設予約"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
          <div className="admin-work-list">
            {integratedWorkItems.map(renderWorkItemCard)}
            {!loading && integratedWorkItems.length === 0 && <div className="el-empty">発信機能とLive・施設予約の表示項目はまだありません。</div>}
          </div>
        </section>
      )}

    </main>
  );
}
