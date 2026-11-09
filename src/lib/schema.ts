// Every statement is idempotent, so the schema is applied on each cold start.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS team (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT 'Kilowattchaos',
  team_code text NOT NULL,
  checkin_secret text NOT NULL,
  chat_enabled boolean NOT NULL DEFAULT false,
  second_adult text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  name_key text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('mentor', 'student')),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'disabled')),
  color text NOT NULL,
  password_hash text NOT NULL,
  title text NOT NULL DEFAULT '',
  subs text NOT NULL DEFAULT '',
  parent_email text,
  consent_token text UNIQUE,
  consent_name text,
  consent_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  id text PRIMARY KEY,
  kind text NOT NULL,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS records_kind_idx ON records (kind, created_at DESC);
CREATE TABLE IF NOT EXISTS checkins (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day date NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS audit (
  id bigserial PRIMARY KEY,
  user_id text,
  action text NOT NULL,
  detail text NOT NULL DEFAULT '',
  at timestamptz NOT NULL DEFAULT now()
);
`;
