"use client";

import React, { useEffect, useRef, useState } from "react";

type Town = {
  id: number;
  name?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  latestPost?: { title?: string | null } | null;
};

type MapComponentProps = {
  towns?: Town[];
  selectedTownId?: number | null;
  onMarkerClick?: (id: number) => void;
};

export default function MapComponent({ towns = [], selectedTownId, onMarkerClick }: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      if (!containerRef.current || mapRef.current) return;
      const leafletModule: any = await import("leaflet");
      if (!active || !containerRef.current) return;
      const L = leafletModule.default || leafletModule;

      const map = L.map(containerRef.current, {
        center: [36.2, 138.2],
        zoom: 5,
        minZoom: 4,
        maxZoom: 18,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 0);
    };

    initialize();
    return () => {
      active = false;
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    import("leaflet").then((leafletModule: any) => {
      const L = leafletModule.default || leafletModule;
      layer.clearLayers();
      towns.forEach((town) => {
        const lat = Number(town.lat);
        const lng = Number(town.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const selected = selectedTownId === town.id;
        const icon = L.divIcon({
          className: "el-town-map-marker-shell",
          html: `<span class="el-town-map-marker${selected ? " selected" : ""}"><i class="fas fa-house"></i></span>`,
          iconSize: [38, 46],
          iconAnchor: [19, 43],
        });
        const marker = L.marker([lat, lng], { icon, title: town.name || "町内会・自治会" }).addTo(layer);
        marker.bindTooltip(town.name || "町内会・自治会", { direction: "top", offset: [0, -36] });
        marker.on("click", () => onMarkerClick?.(town.id));
      });
    });
  }, [mapReady, towns, selectedTownId, onMarkerClick]);

  useEffect(() => {
    const selected = towns.find((town) => town.id === selectedTownId);
    if (!selected || !mapRef.current) return;
    const lat = Number(selected.lat);
    const lng = Number(selected.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) mapRef.current.flyTo([lat, lng], 12, { duration: 0.7 });
  }, [selectedTownId, towns]);

  const positionedCount = towns.filter((town) => Number.isFinite(Number(town.lat)) && Number.isFinite(Number(town.lng))).length;

  return (
    <div className="el-town-map-wrap">
      <div ref={containerRef} className="el-town-map" aria-label="町内会・自治会の日本地図" />
      <div className="el-town-map-count"><i className="fas fa-location-dot" /> {positionedCount}自治会</div>
      {positionedCount === 0 && <div className="el-town-map-empty">位置情報が登録された町内会・自治会はまだありません。</div>}
    </div>
  );
}
