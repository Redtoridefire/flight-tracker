create table if not exists fare_searches (
  id uuid primary key default gen_random_uuid(),
  origin text not null,
  destination text not null,
  departure_date date not null,
  return_date date,
  adults integer not null default 1,
  cabin_class text not null default 'economy',
  trip_type text not null default 'round-trip',
  nonstop_only boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists fare_observations (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references fare_searches(id) on delete cascade,
  provider text not null,
  airline text not null,
  price numeric(10, 2) not null,
  currency text not null default 'USD',
  stops integer not null default 0,
  duration_minutes integer not null,
  departure_time timestamptz not null,
  arrival_time timestamptz not null,
  baggage_included boolean not null default false,
  refundable boolean not null default false,
  deeplink text,
  observed_at timestamptz not null default now()
);

create index if not exists fare_observations_route_date_idx on fare_observations(provider, observed_at);
create index if not exists fare_searches_route_idx on fare_searches(origin, destination, departure_date, return_date);
