import React from 'react';

/**
 * Placeholder MapComponent used to satisfy import '@/components/MapComponent'.
 * Accepts props for towns, selectedTownId, and onMarkerClick but renders a simple placeholder.
 */
interface MapComponentProps {
  towns?: any[];
  selectedTownId?: number;
  onMarkerClick?: (id: any) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ towns, selectedTownId, onMarkerClick }) => {
  // For now we ignore the props and just show a placeholder.
  return (
    <div style={{ width: '100%', height: '300px', backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span>Map placeholder</span>
    </div>
  );
};

export default MapComponent;
