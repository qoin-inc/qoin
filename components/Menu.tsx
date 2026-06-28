"use client";

import React from 'react';
import Link from 'next/link';

// Define menu items – you can adjust names, URLs, and colors here.
const menuItems = [
  { name: 'ホーム', href: '/', icon: 'fas fa-home', bg: 'var(--color-primary)', subLink: 'ホームの詳細はこちら' },
  { name: 'ポータル', href: '/portal', icon: 'fas fa-th', bg: '#6366f1', subLink: 'ポータルの利用方法はこちら' },
  { name: 'マニュアル', href: '/manual', icon: 'fas fa-book', bg: '#10b981', subLink: '会員の登録はこちら' },
  { name: '設定', href: '/admin', icon: 'fas fa-cog', bg: '#f59e0b', subLink: '役員の登録はこちら' },
];

export default function Menu() {
  return (
    <nav className="menu-container">
      {menuItems.map((item) => (
        <React.Fragment key={item.name}>
          <Link href={item.href} className="menu-btn" style={{ background: item.bg }}>
            <i className={item.icon + ' menu-icon'}></i>
            {item.name}
          </Link>
          <p className="sub-link">{item.subLink}</p>
        </React.Fragment>
      ))}
    </nav>
  );
}
