'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import MapGL, { Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import { MAP_CONFIG } from '@/lib/constants';
import type { SiteMapData, Substation, LayerTreeVisibility } from '@/lib/types';
import { PIPELINE_STAGES } from '@/lib/constants';
import { DigitalTwinPopup } from './DigitalTwinPopup';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapContainerProps {
  sites: SiteMapData[];
  substations: Substation[];
  layers: LayerTreeVisibility;
  onSiteClick?: (siteId: string) => void;
  onSubstationClick?: (substationId: string) => void;
}

const HEATMAP_LAYER_ID = 'congestion-heatmap';
const HEATMAP_SOURCE_ID = 'grid-congestion';

export function MapContainer({ sites, substations, layers, onSiteClick, onSubstationClick }: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [popupSite, setPopupSite] = useState<SiteMapData | null>(null);

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
    const mapLayers = map.getStyle().layers;
    const labelLayer = mapLayers?.find(
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

    // Add congestion heatmap source + layer
    map.addSource(HEATMAP_SOURCE_ID, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: substations.map((sub) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [sub.lng, sub.lat] },
          properties: {
            utilization:
              sub.capacity_mw && sub.available_mw
                ? (sub.capacity_mw - sub.available_mw) / sub.capacity_mw
                : 0.5,
          },
        })),
      },
    });

    map.addLayer(
      {
        id: HEATMAP_LAYER_ID,
        type: 'heatmap',
        source: HEATMAP_SOURCE_ID,
        paint: {
          'heatmap-weight': ['get', 'utilization'],
          'heatmap-intensity': 1.5,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#22C55E',
            0.5, '#F59E0B',
            0.8, '#EF4444',
            1.0, '#FF0000',
          ],
          'heatmap-radius': 40,
          'heatmap-opacity': 0.6,
        },
      },
      '3d-buildings',
    );

    setMapLoaded(true);
  }, [substations]);

  // Toggle layer visibility
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    // Congestion heatmap
    try {
      const heatmapLayer = map.getLayer(HEATMAP_LAYER_ID);
      if (heatmapLayer) {
        map.setLayoutProperty(
          HEATMAP_LAYER_ID,
          'visibility',
          layers.congestionHeatmap ? 'visible' : 'none',
        );
      }
    } catch {
      // Layer may not exist yet
    }
  }, [layers, mapLoaded]);

  // Resize map when container changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function getSiteColor(stage: string) {
    return PIPELINE_STAGES.find((s) => s.value === stage)?.color || '#8B95A5';
  }

  return (
    <div ref={containerRef} className="w-full h-full">
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

        {/* Site markers — custom SVG with neon glow */}
        {sites.map((site) => {
          const color = getSiteColor(site.pipeline_stage);
          return (
            <Marker
              key={site.id}
              longitude={site.lng}
              latitude={site.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupSite(site);
              }}
            >
              <div
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border transition-transform hover:scale-125"
                style={{
                  backgroundColor: `${color}15`,
                  borderColor: `${color}80`,
                  filter: `drop-shadow(0 0 4px ${color}60)`,
                }}
                title={`${site.name} · ${site.target_capacity || '?'}MW · Score: ${site.composite_score || 'N/A'}`}
              >
                {/* Data center icon SVG */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="8" y1="10" x2="16" y2="10" />
                  <line x1="8" y1="14" x2="16" y2="14" />
                  <circle cx="9" cy="18" r="1" fill={color} />
                  <circle cx="15" cy="18" r="1" fill={color} />
                </svg>
              </div>
            </Marker>
          );
        })}

        {/* Substation markers — lightning bolt SVG with blue neon glow */}
        {layers.substations &&
          substations.map((sub) => {
            const size = Math.max(22, Math.min(36, (sub.capacity_mw || 100) / 30 + 18));
            return (
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
                  className="flex cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-125"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.4)',
                    filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))',
                  }}
                  title={`${sub.name} · ${sub.capacity_mw || '?'}MW · ${sub.available_mw || '?'}MW avail`}
                >
                  {/* Lightning bolt SVG */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
              </Marker>
            );
          })}

        {/* Digital Twin Popup */}
        {popupSite && (
          <Popup
            longitude={popupSite.lng}
            latitude={popupSite.lat}
            onClose={() => setPopupSite(null)}
            closeButton={false}
            maxWidth="300px"
            className="digital-twin-popup"
            anchor="bottom"
            offset={20}
          >
            <DigitalTwinPopup
              site={popupSite}
              onViewReport={() => {
                onSiteClick?.(popupSite.id);
                setPopupSite(null);
              }}
            />
          </Popup>
        )}
      </MapGL>
    </div>
  );
}
