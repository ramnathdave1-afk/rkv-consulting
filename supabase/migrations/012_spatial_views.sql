-- Materialized view for map data (pre-computed for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS site_map_data AS
SELECT
  gs.id,
  gs.name,
  gs.lat,
  gs.lng,
  gs.state,
  gs.pipeline_stage,
  gs.target_mw,
  gs.acreage,
  gs.org_id,
  ss.composite_score,
  sub.name AS nearest_substation_name,
  gs.distance_to_substation_mi
FROM ghost_sites gs
LEFT JOIN LATERAL (
  SELECT composite_score
  FROM site_scores
  WHERE site_id = gs.id
  ORDER BY scored_at DESC
  LIMIT 1
) ss ON true
LEFT JOIN substations sub ON sub.id = gs.nearest_substation_id;

CREATE UNIQUE INDEX idx_site_map_data_id ON site_map_data(id);

-- PostGIS function: find golden sites
CREATE OR REPLACE FUNCTION find_golden_sites(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 25,
  min_acres DOUBLE PRECISION DEFAULT 40,
  min_available_mw DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  substation_id UUID,
  substation_name TEXT,
  substation_lat DOUBLE PRECISION,
  substation_lng DOUBLE PRECISION,
  available_mw DOUBLE PRECISION,
  parcel_id UUID,
  parcel_acreage DOUBLE PRECISION,
  parcel_zoning TEXT,
  parcel_lat DOUBLE PRECISION,
  parcel_lng DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS substation_id,
    s.name AS substation_name,
    s.lat AS substation_lat,
    s.lng AS substation_lng,
    s.available_mw,
    p.id AS parcel_id,
    p.acreage AS parcel_acreage,
    p.zoning AS parcel_zoning,
    p.lat AS parcel_lat,
    p.lng AS parcel_lng,
    ST_Distance(
      s.geom::geography,
      p.geom::geography
    ) / 1609.34 AS distance_miles
  FROM substations s
  CROSS JOIN LATERAL (
    SELECT *
    FROM parcels p2
    WHERE p2.acreage >= min_acres
      AND ST_DWithin(
        s.geom::geography,
        p2.geom::geography,
        radius_miles * 1609.34
      )
    ORDER BY ST_Distance(s.geom::geography, p2.geom::geography)
    LIMIT 5
  ) p
  WHERE s.available_mw >= min_available_mw
    AND ST_DWithin(
      s.geom::geography,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
      radius_miles * 1609.34 * 4
    )
  ORDER BY s.available_mw DESC, distance_miles ASC;
END;
$$ LANGUAGE plpgsql;
