import type { Vertical, VerticalConfig } from '@/lib/types';
import { dataCenterVertical } from './data-center';
import { solarVertical } from './solar';
import { windVertical } from './wind';
import { evChargingVertical } from './ev-charging';

export const VERTICALS: Record<Vertical, VerticalConfig> = {
  data_center: dataCenterVertical,
  solar: solarVertical,
  wind: windVertical,
  ev_charging: evChargingVertical,
  industrial: {
    id: 'industrial',
    label: 'Industrial',
    icon: 'Factory',
    description: 'Industrial and manufacturing site selection',
    capacityUnit: 'sqft',
    capacityLabel: 'Target Sqft',
    pipelineStages: dataCenterVertical.pipelineStages,
    scoreDimensions: [
      { key: 'land_score', label: 'Land', color: '#22C55E', weight: 0.25 },
      { key: 'grid_score', label: 'Grid Access', color: '#3B82F6', weight: 0.2 },
      { key: 'labor_score', label: 'Labor', color: '#F59E0B', weight: 0.2 },
      { key: 'logistics_score', label: 'Logistics', color: '#8A00FF', weight: 0.2 },
      { key: 'risk_score', label: 'Risk', color: '#EF4444', weight: 0.15 },
    ],
    defaultLayers: ['substations', 'gridLines', 'wetlands', 'floodZones'],
  },
  residential: {
    id: 'residential',
    label: 'Residential',
    icon: 'Home',
    description: 'Residential land development site selection',
    capacityUnit: 'units',
    capacityLabel: 'Target Units',
    pipelineStages: [
      { value: 'prospect', label: 'Prospect', color: '#8B95A5' },
      { value: 'due_diligence', label: 'Due Diligence', color: '#3B82F6' },
      { value: 'loi', label: 'LOI', color: '#8A00FF' },
      { value: 'under_contract', label: 'Under Contract', color: '#F59E0B' },
      { value: 'closed', label: 'Entitled', color: '#22C55E' },
    ],
    scoreDimensions: [
      { key: 'land_score', label: 'Land', color: '#22C55E', weight: 0.25 },
      { key: 'market_score', label: 'Market', color: '#F59E0B', weight: 0.25 },
      { key: 'zoning_score', label: 'Zoning', color: '#3B82F6', weight: 0.2 },
      { key: 'infrastructure_score', label: 'Infrastructure', color: '#8A00FF', weight: 0.15 },
      { key: 'risk_score', label: 'Risk', color: '#EF4444', weight: 0.15 },
    ],
    defaultLayers: ['wetlands', 'floodZones'],
  },
  mixed_use: {
    id: 'mixed_use',
    label: 'Mixed Use',
    icon: 'Building2',
    description: 'Mixed-use development site selection',
    capacityUnit: 'sqft',
    capacityLabel: 'Target Sqft',
    pipelineStages: dataCenterVertical.pipelineStages,
    scoreDimensions: [
      { key: 'land_score', label: 'Land', color: '#22C55E', weight: 0.2 },
      { key: 'market_score', label: 'Market', color: '#F59E0B', weight: 0.25 },
      { key: 'zoning_score', label: 'Zoning', color: '#3B82F6', weight: 0.2 },
      { key: 'infrastructure_score', label: 'Infrastructure', color: '#8A00FF', weight: 0.2 },
      { key: 'risk_score', label: 'Risk', color: '#EF4444', weight: 0.15 },
    ],
    defaultLayers: ['substations', 'wetlands', 'floodZones'],
  },
};

export function getVerticalConfig(vertical: Vertical): VerticalConfig {
  return VERTICALS[vertical] ?? VERTICALS.data_center;
}

export function getVerticalLabel(vertical: Vertical): string {
  return VERTICALS[vertical]?.label ?? vertical;
}

export const ALL_VERTICALS = Object.values(VERTICALS);
