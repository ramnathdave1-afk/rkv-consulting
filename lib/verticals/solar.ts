import type { VerticalConfig } from '@/lib/types';

export const solarVertical: VerticalConfig = {
  id: 'solar',
  label: 'Solar',
  icon: 'Sun',
  description: 'Utility-scale and distributed solar project siting',
  capacityUnit: 'MW-AC',
  capacityLabel: 'Target MW-AC',
  pipelineStages: [
    { value: 'prospect', label: 'Prospect', color: '#8B95A5' },
    { value: 'due_diligence', label: 'Due Diligence', color: '#3B82F6' },
    { value: 'loi', label: 'LOI', color: '#8A00FF' },
    { value: 'under_contract', label: 'Under Contract', color: '#F59E0B' },
    { value: 'closed', label: 'Permitted', color: '#22C55E' },
  ],
  scoreDimensions: [
    { key: 'irradiance_score', label: 'Irradiance', color: '#F59E0B', weight: 0.25 },
    { key: 'grid_score', label: 'Grid Access', color: '#3B82F6', weight: 0.25 },
    { key: 'land_score', label: 'Land', color: '#22C55E', weight: 0.2 },
    { key: 'terrain_score', label: 'Terrain', color: '#8A00FF', weight: 0.15 },
    { key: 'risk_score', label: 'Risk', color: '#EF4444', weight: 0.15 },
  ],
  defaultLayers: ['substations', 'gridLines', 'wetlands', 'floodZones'],
};
