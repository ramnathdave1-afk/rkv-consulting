import type { VerticalConfig } from '@/lib/types';

export const dataCenterVertical: VerticalConfig = {
  id: 'data_center',
  label: 'Data Centers',
  icon: 'Server',
  description: 'Hyperscale and edge data center site selection',
  capacityUnit: 'MW',
  capacityLabel: 'Target MW',
  pipelineStages: [
    { value: 'prospect', label: 'Prospect', color: '#8B95A5' },
    { value: 'due_diligence', label: 'Due Diligence', color: '#3B82F6' },
    { value: 'loi', label: 'LOI', color: '#8A00FF' },
    { value: 'under_contract', label: 'Under Contract', color: '#F59E0B' },
    { value: 'closed', label: 'Closed', color: '#22C55E' },
  ],
  scoreDimensions: [
    { key: 'grid_score', label: 'Grid', color: '#3B82F6', weight: 0.3 },
    { key: 'land_score', label: 'Land', color: '#22C55E', weight: 0.2 },
    { key: 'risk_score', label: 'Risk', color: '#EF4444', weight: 0.15 },
    { key: 'market_score', label: 'Market', color: '#F59E0B', weight: 0.15 },
    { key: 'connectivity_score', label: 'Connectivity', color: '#8A00FF', weight: 0.2 },
  ],
  defaultLayers: ['substations', 'gridLines', 'congestionHeatmap', 'fiberRoutes', 'fiberHubs'],
};
