-- ============================================================
-- Meridian Node Seed Data — PJM Interconnection Territory
-- ============================================================

-- Create a demo organization
INSERT INTO organizations (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Meridian Demo', 'meridian-demo');

-- ============================================================
-- PJM Substations (real locations, synthetic capacity data)
-- ============================================================
INSERT INTO substations (name, lat, lng, voltage_kv, capacity_mw, available_mw, utility, state, pjm_zone) VALUES
  -- Virginia (Data Center Alley)
  ('Loudoun Substation', 39.0766, -77.5636, 500, 2400, 450, 'Dominion Energy', 'VA', 'DOM'),
  ('Ashburn Substation', 39.0437, -77.4875, 230, 1800, 320, 'Dominion Energy', 'VA', 'DOM'),
  ('Haymarket Substation', 38.8120, -77.6369, 500, 2000, 580, 'Dominion Energy', 'VA', 'DOM'),
  ('Gainesville Substation', 38.7959, -77.6131, 230, 1200, 290, 'Dominion Energy', 'VA', 'DOM'),
  ('Manassas Substation', 38.7509, -77.4753, 138, 800, 150, 'Dominion Energy', 'VA', 'DOM'),
  ('Warrenton Substation', 38.7132, -77.7953, 230, 1400, 620, 'Dominion Energy', 'VA', 'DOM'),
  ('Culpeper Substation', 38.4729, -77.9966, 500, 1600, 780, 'Dominion Energy', 'VA', 'DOM'),
  ('Fredericksburg Substation', 38.3032, -77.4607, 230, 1100, 430, 'Dominion Energy', 'VA', 'DOM'),
  ('Richmond West Substation', 37.5407, -77.5369, 500, 2200, 890, 'Dominion Energy', 'VA', 'DOM'),
  ('Chester Substation', 37.3567, -77.4340, 230, 900, 340, 'Dominion Energy', 'VA', 'DOM'),

  -- Maryland
  ('Elmont Substation', 39.2847, -76.6531, 500, 2800, 520, 'BGE', 'MD', 'BGE'),
  ('Bowie Substation', 38.9427, -76.7302, 230, 1500, 380, 'PEPCO', 'MD', 'PEPCO'),
  ('Frederick Substation', 39.4143, -77.4105, 230, 1200, 510, 'FirstEnergy', 'MD', 'APS'),
  ('Hagerstown Substation', 39.6418, -77.7200, 138, 800, 340, 'FirstEnergy', 'MD', 'APS'),
  ('Waldorf Substation', 38.6246, -76.9382, 230, 1000, 420, 'SMECO', 'MD', 'PEPCO'),

  -- Pennsylvania
  ('Limerick Substation', 40.2301, -75.5224, 500, 3200, 680, 'PECO', 'PA', 'PECO'),
  ('Whitpain Substation', 40.1562, -75.2879, 230, 1800, 290, 'PECO', 'PA', 'PECO'),
  ('Lancaster Substation', 40.0379, -76.3055, 230, 1400, 560, 'PPL', 'PA', 'PPL'),
  ('Harrisburg Substation', 40.2732, -76.8867, 500, 2600, 720, 'PPL', 'PA', 'PPL'),
  ('York Substation', 39.9626, -76.7277, 138, 900, 380, 'Met-Ed', 'PA', 'METED'),
  ('Allentown Substation', 40.6084, -75.4902, 230, 1600, 490, 'PPL', 'PA', 'PPL'),
  ('Scranton Substation', 41.4090, -75.6624, 230, 1100, 540, 'PPL', 'PA', 'PPL'),
  ('Wilkes-Barre Substation', 41.2459, -75.8813, 138, 800, 350, 'PPL', 'PA', 'PPL'),

  -- New Jersey
  ('Edison Substation', 40.5187, -74.4121, 500, 3000, 420, 'PSE&G', 'NJ', 'PSEG'),
  ('Newark Substation', 40.7357, -74.1724, 345, 2400, 180, 'PSE&G', 'NJ', 'PSEG'),
  ('Trenton Substation', 40.2171, -74.7429, 230, 1200, 390, 'PSE&G', 'NJ', 'PSEG'),

  -- Ohio
  ('Columbus East Substation', 39.9612, -82.9988, 345, 2200, 640, 'AEP Ohio', 'OH', 'AEP'),
  ('Cleveland South Substation', 41.4993, -81.6944, 345, 2800, 520, 'FirstEnergy', 'OH', 'ATSI'),
  ('Akron Substation', 41.0814, -81.5190, 230, 1400, 580, 'FirstEnergy', 'OH', 'ATSI'),
  ('Dayton Substation', 39.7589, -84.1916, 345, 1800, 710, 'AES Ohio', 'OH', 'DAYTON'),

  -- West Virginia
  ('Charleston Substation', 38.3498, -81.6326, 345, 1600, 820, 'AEP Appalachian', 'WV', 'AEP'),
  ('Morgantown Substation', 39.6295, -79.9559, 138, 700, 410, 'Mon Power', 'WV', 'APS'),

  -- Delaware
  ('Dover Substation', 39.1582, -75.5244, 230, 900, 380, 'Delmarva Power', 'DE', 'DPL'),

  -- Indiana
  ('Indianapolis East Substation', 39.7684, -86.1581, 345, 2400, 680, 'AES Indiana', 'IN', 'AEP'),

  -- Illinois
  ('Chicago South Substation', 41.8781, -87.6298, 345, 3400, 540, 'ComEd', 'IL', 'COMED');

-- ============================================================
-- Ghost Sites (mock data center prospects)
-- ============================================================
INSERT INTO ghost_sites (org_id, name, lat, lng, state, county, acreage, zoning, pipeline_stage, target_mw, notes) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Ashburn Campus Alpha', 39.0398, -77.4918, 'VA', 'Loudoun', 120, 'M-1 Industrial', 'under_contract', 200, 'Prime location in Data Center Alley. Adjacent to existing fiber corridors.'),
  ('a0000000-0000-0000-0000-000000000001', 'Haymarket Data Park', 38.8189, -77.6280, 'VA', 'Prince William', 85, 'I-2 Heavy Industrial', 'due_diligence', 150, 'Near Haymarket substation with 580MW available.'),
  ('a0000000-0000-0000-0000-000000000001', 'Culpeper Green Site', 38.4612, -78.0105, 'VA', 'Culpeper', 200, 'Agricultural', 'ghost_site', 300, 'Large parcel near Culpeper substation. Zoning change needed.'),
  ('a0000000-0000-0000-0000-000000000001', 'Richmond West Campus', 37.5523, -77.5512, 'VA', 'Henrico', 95, 'M-2 Industrial', 'loi', 180, 'Strong grid access via Richmond West 500kV substation.'),
  ('a0000000-0000-0000-0000-000000000001', 'Warrenton Prospect', 38.7200, -77.7800, 'VA', 'Fauquier', 65, 'C-3 Commercial', 'ghost_site', 100, 'Secondary site near Warrenton substation.'),
  ('a0000000-0000-0000-0000-000000000001', 'Elmont Grid Hub', 39.2900, -76.6480, 'MD', 'Baltimore', 75, 'I-1 Industrial', 'due_diligence', 250, 'Near BGE 500kV substation with 520MW available headroom.'),
  ('a0000000-0000-0000-0000-000000000001', 'Frederick Data Center', 39.4200, -77.4050, 'MD', 'Frederick', 110, 'M-1 Industrial', 'ghost_site', 175, 'Competitive land costs with good grid access.'),
  ('a0000000-0000-0000-0000-000000000001', 'Bowie Campus', 38.9500, -76.7350, 'MD', 'Prince George', 55, 'I-2 Industrial', 'ghost_site', 120, 'Near PEPCO infrastructure. Fiber connectivity via DC metro.'),
  ('a0000000-0000-0000-0000-000000000001', 'Limerick Power Site', 40.2350, -75.5180, 'PA', 'Montgomery', 90, 'HI Heavy Industrial', 'loi', 280, 'Adjacent to Limerick nuclear plant. 3200MW grid capacity.'),
  ('a0000000-0000-0000-0000-000000000001', 'Lancaster East', 40.0420, -76.2980, 'PA', 'Lancaster', 140, 'Agricultural', 'ghost_site', 200, 'Large affordable parcel. Zoning variance may be required.'),
  ('a0000000-0000-0000-0000-000000000001', 'Harrisburg Tech Park', 40.2780, -76.8800, 'PA', 'Dauphin', 70, 'LI Light Industrial', 'due_diligence', 160, 'State capital proximity. Tax incentive potential.'),
  ('a0000000-0000-0000-0000-000000000001', 'Edison NJ Data Hub', 40.5230, -74.4080, 'NJ', 'Middlesex', 45, 'I-3 Industrial', 'under_contract', 220, 'Premium NJ location near PSE&G 500kV. High land cost.'),
  ('a0000000-0000-0000-0000-000000000001', 'Columbus Campus', 39.9650, -83.0050, 'OH', 'Franklin', 160, 'M-2 Industrial', 'ghost_site', 350, 'Midwest hub play. Very competitive power and land costs.'),
  ('a0000000-0000-0000-0000-000000000001', 'Cleveland Data Center', 41.5050, -81.6900, 'OH', 'Cuyahoga', 60, 'I-1 Industrial', 'ghost_site', 140, 'Lake Erie cooling potential. FirstEnergy grid.'),
  ('a0000000-0000-0000-0000-000000000001', 'Dayton Innovation Park', 39.7630, -84.1880, 'OH', 'Montgomery', 100, 'M-1 Industrial', 'ghost_site', 200, 'Near Wright-Patterson AFB. Defense sector demand.'),
  ('a0000000-0000-0000-0000-000000000001', 'Charleston WV Site', 38.3550, -81.6280, 'WV', 'Kanawha', 180, 'I-2 Industrial', 'ghost_site', 250, 'Very low land costs. Abundant power from coal transition.'),
  ('a0000000-0000-0000-0000-000000000001', 'Indianapolis Campus', 39.7720, -86.1550, 'IN', 'Marion', 130, 'I-1 Industrial', 'ghost_site', 280, 'Central US latency play. Growing data center market.'),
  ('a0000000-0000-0000-0000-000000000001', 'Chicago Southside', 41.8810, -87.6250, 'IL', 'Cook', 40, 'PMD Planned Manufacturing', 'due_diligence', 180, 'Tier 1 metro. Limited land but massive demand.'),
  ('a0000000-0000-0000-0000-000000000001', 'Dover DE Campus', 39.1620, -75.5200, 'DE', 'Kent', 95, 'M-1 Industrial', 'ghost_site', 130, 'Delaware tax advantages. Delmarva Power grid.'),
  ('a0000000-0000-0000-0000-000000000001', 'Allentown Tech Center', 40.6120, -75.4850, 'PA', 'Lehigh', 80, 'I-1 Industrial', 'ghost_site', 150, 'Lehigh Valley growth corridor. PPL infrastructure.');

-- ============================================================
-- Site Scores
-- ============================================================
INSERT INTO site_scores (site_id, composite_score, grid_score, land_score, risk_score, market_score, connectivity_score, scored_by)
SELECT id,
  CASE
    WHEN pipeline_stage = 'under_contract' THEN 82 + (random() * 10)::int
    WHEN pipeline_stage = 'loi' THEN 75 + (random() * 12)::int
    WHEN pipeline_stage = 'due_diligence' THEN 68 + (random() * 15)::int
    ELSE 50 + (random() * 30)::int
  END,
  50 + (random() * 45)::int,
  45 + (random() * 50)::int,
  40 + (random() * 55)::int,
  50 + (random() * 40)::int,
  35 + (random() * 60)::int,
  'gamma'
FROM ghost_sites;

-- ============================================================
-- Sample Agent Activity
-- ============================================================
INSERT INTO agent_activity_log (agent_name, action, details, org_id) VALUES
  ('alpha', 'Scanned PJM substations in Virginia — found 10 with >100MW available', '{"substations_found": 10, "region": "VA"}', 'a0000000-0000-0000-0000-000000000001'),
  ('alpha', 'Scanned PJM substations in Pennsylvania — found 7 with >100MW available', '{"substations_found": 7, "region": "PA"}', 'a0000000-0000-0000-0000-000000000001'),
  ('beta', 'Analyzed 45 parcels near Loudoun substations — 8 meet criteria (>40 acres, industrial zoning)', '{"parcels_analyzed": 45, "qualifying": 8}', 'a0000000-0000-0000-0000-000000000001'),
  ('beta', 'Found 3 new parcels near Haymarket substation', '{"parcels_found": 3, "near": "Haymarket"}', 'a0000000-0000-0000-0000-000000000001'),
  ('gamma', 'Scored 20 ghost sites — average composite: 72', '{"sites_scored": 20, "avg_score": 72}', 'a0000000-0000-0000-0000-000000000001'),
  ('gamma', 'Re-scored Ashburn Campus Alpha: 87 (↑5 from grid improvements)', '{"site": "Ashburn Campus Alpha", "score": 87, "change": 5}', 'a0000000-0000-0000-0000-000000000001'),
  ('delta', 'Collected market data for VA — avg power: $0.068/kWh, avg land: $45K/acre', '{"state": "VA", "power_kwh": 0.068, "land_acre": 45000}', 'a0000000-0000-0000-0000-000000000001'),
  ('delta', 'Collected market data for OH — avg power: $0.052/kWh, avg land: $18K/acre', '{"state": "OH", "power_kwh": 0.052, "land_acre": 18000}', 'a0000000-0000-0000-0000-000000000001'),
  ('alpha', 'Identified 820MW available headroom at Charleston WV substation', '{"substation": "Charleston", "available_mw": 820}', 'a0000000-0000-0000-0000-000000000001'),
  ('beta', 'Parcel analysis complete for Frederick MD region — 5 qualifying parcels', '{"region": "Frederick MD", "qualifying": 5}', 'a0000000-0000-0000-0000-000000000001');

-- ============================================================
-- Market Intelligence
-- ============================================================
INSERT INTO market_intelligence (region, state, avg_power_cost_kwh, avg_land_cost_acre, tax_incentive_score, fiber_density_score, data) VALUES
  ('Northern Virginia', 'VA', 0.068, 85000, 72, 95, '{"notes": "Data Center Alley — highest density in US"}'),
  ('Central Virginia', 'VA', 0.062, 35000, 68, 65, '{"notes": "Growing market, competitive costs"}'),
  ('Baltimore Metro', 'MD', 0.071, 62000, 65, 82, '{"notes": "BGE territory, strong grid"}'),
  ('Western Maryland', 'MD', 0.065, 28000, 70, 55, '{"notes": "Lower costs, emerging market"}'),
  ('Philadelphia Metro', 'PA', 0.073, 78000, 60, 88, '{"notes": "PECO territory, dense fiber"}'),
  ('Central Pennsylvania', 'PA', 0.058, 22000, 75, 45, '{"notes": "PPL territory, tax incentive programs"}'),
  ('Northern New Jersey', 'NJ', 0.082, 120000, 55, 92, '{"notes": "Premium pricing, tier 1 connectivity"}'),
  ('Central Ohio', 'OH', 0.052, 18000, 80, 70, '{"notes": "Lowest costs in PJM, growing fast"}'),
  ('Northern Ohio', 'OH', 0.055, 22000, 75, 65, '{"notes": "FirstEnergy territory, lake cooling"}'),
  ('West Virginia', 'WV', 0.048, 8000, 85, 35, '{"notes": "Lowest power costs, coal transition incentives"}'),
  ('Delaware', 'DE', 0.065, 32000, 88, 60, '{"notes": "No sales tax, strong state incentives"}'),
  ('Indiana', 'IN', 0.055, 15000, 78, 55, '{"notes": "Central US latency, growing market"}'),
  ('Northern Illinois', 'IL', 0.068, 45000, 62, 90, '{"notes": "Chicago metro, tier 1 connectivity"}');
