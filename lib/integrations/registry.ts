/**
 * Integration Registry
 * Maps platform names to their connector implementations.
 * Add new connectors here as they're built.
 */

import type { PMConnector } from './base-connector';
import { AppFolioConnector } from './appfolio';
import { BuildiumConnector } from './buildium';
import { YardiConnector } from './yardi';
import { RentManagerConnector } from './rent-manager';
import { DoorLoopConnector } from './doorloop';
import { RealPageConnector } from './realpage';
import { EntrataConnector } from './entrata';
import { PropertywareConnector } from './propertyware';
import { ResManConnector } from './resman';

export interface IntegrationInfo {
  id: string;
  label: string;
  description: string;
  authType: 'api_key' | 'oauth2';
  status: 'available' | 'coming_soon';
  credentialFields: { key: string; label: string; type: 'text' | 'password' }[];
}

export const INTEGRATION_REGISTRY: IntegrationInfo[] = [
  {
    id: 'appfolio',
    label: 'AppFolio',
    description: 'Sync properties, tenants, leases, and work orders from AppFolio',
    authType: 'oauth2',
    status: 'coming_soon',
    credentialFields: [
      { key: 'client_id', label: 'Client ID', type: 'text' },
      { key: 'client_secret', label: 'Client Secret', type: 'password' },
    ],
  },
  {
    id: 'buildium',
    label: 'Buildium',
    description: 'Connect to Buildium for property management data sync',
    authType: 'api_key',
    status: 'coming_soon',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'yardi',
    label: 'Yardi Voyager',
    description: 'Import data from Yardi Voyager',
    authType: 'oauth2',
    status: 'coming_soon',
    credentialFields: [
      { key: 'client_id', label: 'Client ID', type: 'text' },
      { key: 'client_secret', label: 'Client Secret', type: 'password' },
    ],
  },
  {
    id: 'rent_manager',
    label: 'Rent Manager',
    description: 'Sync from Rent Manager',
    authType: 'api_key',
    status: 'coming_soon',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'doorloop',
    label: 'DoorLoop',
    description: 'Connect to DoorLoop property management',
    authType: 'api_key',
    status: 'coming_soon',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'realpage',
    label: 'RealPage',
    description: 'Enterprise PM platform integration',
    authType: 'api_key',
    status: 'coming_soon',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'entrata',
    label: 'Entrata',
    description: 'Multifamily property management platform',
    authType: 'api_key',
    status: 'coming_soon',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'propertyware',
    label: 'Propertyware',
    description: 'Single-family and HOA property management',
    authType: 'api_key',
    status: 'coming_soon',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'resman',
    label: 'ResMan',
    description: 'Multifamily property management and accounting',
    authType: 'api_key',
    status: 'coming_soon',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password' },
    ],
  },
];

export function getConnector(platform: string): PMConnector {
  const connectors: Record<string, () => PMConnector> = {
    appfolio: () => new AppFolioConnector(),
    buildium: () => new BuildiumConnector(),
    yardi: () => new YardiConnector(),
    rent_manager: () => new RentManagerConnector(),
    doorloop: () => new DoorLoopConnector(),
    realpage: () => new RealPageConnector(),
    entrata: () => new EntrataConnector(),
    propertyware: () => new PropertywareConnector(),
    resman: () => new ResManConnector(),
  };

  const factory = connectors[platform];
  if (!factory) throw new Error(`Unknown platform: ${platform}`);
  return factory();
}
