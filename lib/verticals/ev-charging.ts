import type { VerticalConfig } from '@/lib/types';

export const evChargingVertical: VerticalConfig = {
  id: 'ev_charging',
  label: 'EV Charging',
  icon: 'BatteryCharging',
  description: 'EV charging station siting and deployment',
  capacityUnit: 'kW',
  capacityLabel: 'Target kW',
  pipelineStages: [
    { value: 'prospect', label: 'Prospect', color: '#8B95A5' },
    { value: 'due_diligence', label: 'Due Diligence', color: '#3B82F6' },
    { value: 'loi', label: 'LOI', color: '#8A00FF' },
    { value: 'under_contract', label: 'Under Contract', color: '#F59E0B' },
    { value: 'closed', label: 'Deployed', color: '#22C55E' },
  ],
  scoreDimensions: [
    { key: 'traffic_score', label: 'Traffic', color: '#3B82F6', weight: 0.3 },
    { key: 'grid_score', label: 'Grid Access', color: '#F59E0B', weight: 0.25 },
    { key: 'visibility_score', label: 'Visibility', color: '#22C55E', weight: 0.2 },
    { key: 'competition_score', label: 'Competition', color: '#EF4444', weight: 0.15 },
    { key: 'market_score', label: 'Market', color: '#8A00FF', weight: 0.1 },
  ],
  defaultLayers: ['substations', 'gridLines'],
};
