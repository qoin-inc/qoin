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
      <header className="card-header">
          <h1 className="text-2xl font-bold mb-4">el-town</h1>
        </header>
        <main class="card-body">
        <Card>
          <section class="map-section">
            <h2 class="section-title">マップ</h2>
            <!-- MapComponent が存在すれば表示 -->
          </section>
        </Card>
        <Card>
          <section class="resident-list-section">
            <h2 class="section-title">住民一覧</h2>
            <!-- 簡易リスト表示 -->
            <ul class="resident-list">
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
