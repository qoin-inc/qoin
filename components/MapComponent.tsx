import React from 'react';

type MapComponentProps = {
  towns?: any[];
  selectedTownId?: number | null;
  onMarkerClick?: (id: any) => void;
};

export default function MapComponent({ towns = [], selectedTownId, onMarkerClick }: MapComponentProps) {
  return (
    <div className="map-placeholder">
      <div>
        <i className="fas fa-map-location-dot" />
        <strong>地域マップ</strong>
        <span>{towns.length > 0 ? `${towns.length}件の自治会を表示できます` : '表示できる地域情報はまだありません'}</span>
      </div>
      {towns.length > 0 && (
        <div className="map-town-list">
          {towns.slice(0, 6).map((town: any) => (
            <button
              key={town.id}
              type="button"
              className={selectedTownId === town.id ? 'active' : ''}
              onClick={() => onMarkerClick?.(town.id)}
            >
              {town.name || '名称未設定'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
