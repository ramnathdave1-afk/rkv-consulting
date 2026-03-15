-- Enable PostGIS for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
