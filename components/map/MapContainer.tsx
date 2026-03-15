'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import MapGL, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import { MAP_CONFIG } from '@/lib/constants';
import type { SiteMapData, Substation } from '@/lib/types';
import { PIPELINE_STAGES } from '@/lib/constants';
import { Building2, Zap } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapContainerProps {
  sites: SiteMapData[];
  substations: Substation[];
  onSiteClick?: (siteId: string) => void;
  onSubstationClick?: (substationId: string) => void;
}

export function MapContainer({ sites, substations, onSiteClick, onSubstationClick }: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Add terrain source
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });

    map.setTerrain({
      source: 'mapbox-dem',
      exaggeration: MAP_CONFIG.terrain.exaggeration,
    });

    // Add 3D buildings layer
    const layers = map.getStyle().layers;
    const labelLayer = layers?.find(
      (l) => l.type === 'symbol' && (l.layout as Record<string, unknown>)?.['text-field']
    );

    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: MAP_CONFIG.buildingsMinZoom,
        paint: {
          'fill-extrusion-color': '#1A2030',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.7,
        },
      },
      labelLayer?.id,
    );

    // Add sky
    map.addLayer({
      id: 'sky',
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 90.0],
        'sky-atmosphere-sun-intensity': 15,
      },
    });

    setMapLoaded(true);
  }, []);

  function getSiteColor(stage: string) {
    return PIPELINE_STAGES.find((s) => s.value === stage)?.color || '#8B95A5';
  }

  return (
    <MapGL
      ref={mapRef}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      initialViewState={MAP_CONFIG.initialViewState}
      mapStyle={MAP_CONFIG.style}
      onLoad={handleLoad}
      style={{ width: '100%', height: '100%' }}
      terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
      antialias
    >
      <NavigationControl position="top-right" />

      {/* Site markers */}
      {sites.map((site) => (
        <Marker
          key={site.id}
          longitude={site.lng}
          latitude={site.lat}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onSiteClick?.(site.id);
          }}
        >
          <div
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: `${getSiteColor(site.pipeline_stage)}20`,
              borderColor: getSiteColor(site.pipeline_stage),
            }}
            title={`${site.name} · ${site.target_mw || '?'}MW · Score: ${site.composite_score || 'N/A'}`}
          >
            <Building2 size={12} style={{ color: getSiteColor(site.pipeline_stage) }} />
          </div>
        </Marker>
      ))}

      {/* Substation markers */}
      {substations.map((sub) => (
        <Marker
          key={sub.id}
          longitude={sub.lng}
          latitude={sub.lat}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onSubstationClick?.(sub.id);
          }}
        >
          <div
            className="flex cursor-pointer items-center justify-center rounded-full bg-blue-muted border border-blue/30 transition-transform hover:scale-110"
            style={{
              width: Math.max(20, Math.min(36, (sub.capacity_mw || 100) / 30 + 16)),
              height: Math.max(20, Math.min(36, (sub.capacity_mw || 100) / 30 + 16)),
            }}
            title={`${sub.name} · ${sub.capacity_mw || '?'}MW capacity · ${sub.available_mw || '?'}MW available`}
          >
            <Zap size={12} className="text-blue" />
          </div>
        </Marker>
      ))}
    </MapGL>
  );
}
