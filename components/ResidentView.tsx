import React from 'react';
import Card from '@/components/Card';

/**
 * Placeholder ResidentView component used to satisfy import '@/components/ResidentView'.
 * Accepts props used in the real component but renders a simple placeholder UI.
 */
interface ResidentViewProps {
  townId?: number;
  townName?: string;
  residentName?: any;
  userId?: any;
  openTargetId?: string;
  initialTab?: string;
}

const ResidentView: React.FC<ResidentViewProps> = ({ townId, townName, residentName, userId, openTargetId, initialTab }) => {
  // Log props for debugging during development
  console.log('ResidentView placeholder props', { townId, townName, residentName, userId, openTargetId, initialTab });
  return (
    <>
      <header className="header" style={{ backgroundColor: 'var(--color-qoin-main)', padding: '1rem', display: 'flex', alignItems: 'center' }}>
        <img src="/icon_el_town.png" alt="el-town ロゴ" style={{ height: '40px', marginRight: '1rem' }} />
        <h1 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>el-town</h1>
      </header>
      <main className="main-content" style={{ padding: '1rem' }}>
        <Card>
          <section className="map-section" style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>マップ</h2>
            {/* MapComponent が存在すれば表示 */}
          </section>
        </Card>
        <Card>
          <section className="resident-list-section">
            <h2 style={{ marginBottom: '0.5rem' }}>住民一覧</h2>
            {/* 簡易リスト表示 */}
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>サンプル住民 1</li>
              <li>サンプル住民 2</li>
            </ul>
          </section>
        </Card>
      </main>
    </>
  );
};

export default ResidentView;
