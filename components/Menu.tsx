"use client";

import React from 'react';
import Link from 'next/link';

// Define menu items – you can adjust names, URLs, and colors here.
const menuItems = [
  { name: 'ホーム', href: '/', icon: 'fas fa-home', bg: 'var(--color-primary)' },
  { name: 'ポータル', href: '/portal', icon: 'fas fa-th', bg: '#6366f1' },
  { name: 'マニュアル', href: '/manual', icon: 'fas fa-book', bg: '#10b981' },
  { name: '設定', href: '/admin', icon: 'fas fa-cog', bg: '#f59e0b' },
];

export default function Menu() {
  return (
    <nav className="menu-container">
      {menuItems.map((item) => (
        <Link key={item.name} href={item.href} className="menu-btn" style={{ background: item.bg }}>
          <i className={item.icon + ' menu-icon'}></i>
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
