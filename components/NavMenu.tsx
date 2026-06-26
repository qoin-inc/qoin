import React, { useState } from 'react';
import Link from 'next/link';
import styles from './NavMenu.module.css'; // optional CSS module for extra styling

/**
 * Navigation menu used in the header.
 * Shows links to main sections. On mobile the menu toggles via a hamburger.
 */
export default function NavMenu() {
  const [open, setOpen] = useState(false);

  const toggleMenu = () => setOpen(!open);

  const navItems = [
    { href: '/resident', label: '住民' },
    { href: '/manual', label: 'マニュアル' },
    { href: '/admin', label: '管理' },
    { href: '/portal', label: 'ポータル' },
  ];

  return (
    <nav>
      {/* Hamburger for mobile */}
      <div className="hamburger" onClick={toggleMenu} aria-label="メニューを開閉">
        <span />
        <span />
        <span />
      </div>

      <ul className={`nav-menu ${open ? 'open' : ''}`}>
        {navItems.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="nav-link">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
