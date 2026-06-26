'use client';

import React from 'react';
import Link from 'next/link';
import Card from '@/components/Card';

interface ManualCard {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  bgColor: string;
  badge?: string;
}

const manuals: ManualCard[] = [
  {
    title: '会員向け操作マニュアル',
    subtitle: '入会から日々の利用まで',
    description: 'QRコード読み取り、LINE連携、電子掲示板の閲覧、イベント参加申込などの基本操作',
    href: '/manual/member',
    icon: 'fa-mobile-alt',
    color: '#4F95D3',
    bgColor: 'bg-blue-50',
  },
  {
    title: '役員管理画面 操作マニュアル',
    subtitle: '管理画面の基本操作ガイド',
    description: 'ダッシュボード、回覧板の作成・配信、名簿管理、会費管理などの管理機能',
    href: '/manual/admin',
    icon: 'fa-user-cog',
    color: '#4F95D3',
    bgColor: 'bg-indigo-50',
  },
  {
    title: 'Stripe連携 操作マニュアル',
    subtitle: 'テスト接続から本番登録まで',
    description: 'オンライン集金のためのStripeアカウント登録、テスト決済、本番切替の手順',
    href: '/manual/stripe',
    icon: 'fa-credit-card',
    color: '#635BFF',
    bgColor: 'bg-purple-50',
  },
];

export default function ManualHubPage() {
  return (
    <div className="bg-background min-h-screen font-sans flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-lg">

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-md mb-4">
            <i className="fas fa-book-open text-3xl text-blue-500"></i>
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">el-town 操作マニュアル</h1>
          <p className="text-gray-500 font-bold text-sm mt-2">操作ガイドで<br />使い方を確認できます</p>
        </div>

        {/* マニュアルカード一覧 */}
        <div className="space-y-4">
          {manuals.map((m, i) => (
            <Card key={i} className={m.bgColor}>
              <Link href={m.href} className="card-link">
                <div className="card-icon" style={{ backgroundColor: m.color }}>
                  <i className={`fas ${m.icon}`} />
                </div>
                <div className="card-text">
                  <h2 className="card-title">{m.title}</h2>
                  {m.badge && <span className="badge">{m.badge}</span>}
                  <p className="card-subtitle" style={{ color: m.color }}>{m.subtitle}</p>
                  <p className="card-description">{m.description}</p>
                </div>
                <div className="card-arrow">
                  <i className="fas fa-chevron-right" />
                </div>
              </Link>
            </Card>
          ))}
        </div>

        {/* フッター */}
        <div className="text-center mt-8">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            ※マニュアルは随時追加・更新されます<br />
            ご不明な点は管理者にお問い合わせください
          </p>
        </div>

      </div>
    </div>
  );
}
