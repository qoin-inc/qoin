import Link from 'next/link';
import React from 'react';

// 初期メニューコンポーネント – スクリーンショットに基づくデザイン
// Glassmorphism カード内に 3 つの主要メニューを配置します
// ルート: /resident/ , /admin/ , /portal/

const menuItems = [
  { href: '/resident/', label: '会員の方', icon: '/icons/resident.svg' },
  { href: '/admin/', label: '役員の方', icon: '/icons/admin.svg' },
  { href: '/portal/', label: '操作方法', icon: '/icons/portal.svg' },
];

export default function InitialMenu() {
  return (
    <div className="glass-card menu-container">
      <p className="subtitle">町内会・自治会DXアプリ</p>
      {menuItems.map((item) => (
        <React.Fragment key={item.href}>
          <Link href={item.href} className="menu-btn">
            <img src={item.icon} alt="" className="menu-icon" aria-hidden="true" />
            {item.label}
          </Link>
          {item.label === '会員の方' && (
            <a href="/resident/register" className="sub-link">会員の登録はこちら</a>
          )}
          {item.label === '役員の方' && (
            <a href="/admin/register" className="sub-link">役員の登録はこちら</a>
          )}
          {item.label === '操作方法' && (
            <a href="/portal/guide" className="sub-link">使い方はこちら</a>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
