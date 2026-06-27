import Link from 'next/link';
import React from 'react';

// 初期メニューコンポーネント – スクリーンショットに基づくデザイン
// Glassmorphism カード内に 3 つの主要メニューを配置します
// ルート: /resident/ , /admin/ , /portal/

const menuItems = [
  { href: '/resident/', label: '住民ポータル', icon: '/icons/resident.svg' },
  { href: '/admin/', label: '管理者ページ', icon: '/icons/admin.svg' },
  { href: '/portal/', label: 'ポータル', icon: '/icons/portal.svg' },
];

export default function InitialMenu() {
  return (
    <div className="glass-card menu-container">
      {menuItems.map((item) => (
        <Link key={item.href} href={item.href} className="menu-btn">
          <img src={item.icon} alt="" className="menu-icon" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </div>
  );
}
