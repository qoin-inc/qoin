import React, { ReactNode } from 'react';
import NavMenu from '@/components/NavMenu';
import Image from 'next/image';

/**
 * Layout component – wraps the entire application.
 * Includes header with logo, navigation menu, and a footer.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="layout-root">
      {/* Header */}
      <header className="header">
        <div className="logo-wrapper" style={{ display: 'flex', alignItems: 'center' }}>
          <Image src="/icon_el_town.png" alt="el-town ロゴ" width={48} height={48} priority />
          <h1 style={{ marginLeft: '0.75rem', color: '#fff', fontSize: '1.5rem' }}>el-town</h1>
        </div>
        <NavMenu />
      </header>

      {/* Main content */}
      <main className="main-content" style={{ padding: '1rem' }}>
        {children}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} el-town. All rights reserved.</p>
      </footer>
    </div>
  );
}
