import type { VerticalConfig } from '@/lib/types';

export const windVertical: VerticalConfig = {
  id: 'wind',
  label: 'Wind',
  icon: 'Wind',
  description: 'Onshore wind farm project siting',
  capacityUnit: 'MW',
  capacityLabel: 'Target MW',
  pipelineStages: [
    { value: 'prospect', label: 'Prospect', color: '#8B95A5' },
    { value: 'due_diligence', label: 'Due Diligence', color: '#3B82F6' },
    { value: 'loi', label: 'LOI', color: '#8A00FF' },
    { value: 'under_contract', label: 'Under Contract', color: '#F59E0B' },
    { value: 'closed', label: 'Permitted', color: '#22C55E' },
  ],
  scoreDimensions: [
    { key: 'wind_speed_score', label: 'Wind Speed', color: '#3B82F6', weight: 0.3 },
    { key: 'grid_score', label: 'Grid Access', color: '#F59E0B', weight: 0.2 },
    { key: 'land_score', label: 'Land', color: '#22C55E', weight: 0.2 },
    { key: 'setback_score', label: 'Setbacks', color: '#8A00FF', weight: 0.15 },
    { key: 'risk_score', label: 'Risk', color: '#EF4444', weight: 0.15 },
  ],
  defaultLayers: ['substations', 'gridLines', 'wetlands', 'floodZones'],
};
