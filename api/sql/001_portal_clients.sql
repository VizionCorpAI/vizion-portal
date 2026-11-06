-- VizionAI Portal: clients, their sites and their logins (2026-11-06).
-- Secrets are NEVER stored here: a login row only points at an Infisical key
-- (project, path, key). The portal reveals it on click, owner only, and logs each reveal.
-- Run as the stack superuser against AIDB. Idempotent.

CREATE TABLE IF NOT EXISTS portal_client (
  id            serial PRIMARY KEY,
  slug          text UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  name          text NOT NULL,
  kind          text NOT NULL DEFAULT 'client' CHECK (kind IN ('internal', 'client')),
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'prospect', 'unconfirmed', 'former')),
  client_key    text,            -- key used in marketing tables (mkt_*, social_*), e.g. DIAMONDREAMERS
  contact_name  text,
  contact_email text,
  contact_phone text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portal_client_site (
  id          serial PRIMARY KEY,
  client_id   int NOT NULL REFERENCES portal_client(id) ON DELETE CASCADE,
  url         text NOT NULL,
  label       text,
  platform    text,              -- hostinger-builder | horizons | nodejs | wordpress | static | other
  hosting_ref text,              -- e.g. Hostinger account/order
  is_primary  boolean NOT NULL DEFAULT false,
  notes       text,
  UNIQUE (client_id, url)
);

CREATE TABLE IF NOT EXISTS portal_client_login (
  id             serial PRIMARY KEY,
  client_id      int NOT NULL REFERENCES portal_client(id) ON DELETE CASCADE,
  label          text NOT NULL,           -- "Facebook page token", "Website admin"
  service        text,                    -- facebook | instagram | hostinger | wordpress | ...
  kind           text NOT NULL DEFAULT 'password' CHECK (kind IN ('password', 'token', 'key', 'other')),
  login_url      text,
  username       text,
  secret_project text NOT NULL DEFAULT 'f67a6490-4cc1-489d-a6eb-98fe995b0539',  -- vizion-business
  secret_env     text NOT NULL DEFAULT 'prod',
  secret_path    text,                    -- null = no secret stored yet
  secret_key     text,
  status         text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'expired', 'missing', 'unknown')),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, label)
);

CREATE TABLE IF NOT EXISTS portal_reveal_log (
  id          bigserial PRIMARY KEY,
  login_id    int REFERENCES portal_client_login(id) ON DELETE SET NULL,
  revealed_by text NOT NULL,
  ok          boolean NOT NULL,
  revealed_at timestamptz NOT NULL DEFAULT now()
);

-- portal_ro stays read-only everywhere except appending reveal audit rows.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_ro') THEN
    GRANT SELECT ON portal_client, portal_client_site, portal_client_login, portal_reveal_log TO portal_ro;
    GRANT INSERT ON portal_reveal_log TO portal_ro;
    GRANT USAGE ON SEQUENCE portal_reveal_log_id_seq TO portal_ro;
  END IF;
END $$;

-- ---------- seed (2026-11-06, from Hostinger + Infisical registry) ----------
INSERT INTO portal_client (slug, name, kind, status, client_key, contact_email, notes) VALUES
  ('visioncorp',      'VisionCorp',       'internal', 'active',      NULL,             'admin@iamvisioncorp.org', 'Our own company and sites.'),
  ('diamondreamers',  'DiamonDreamers',   'client',   'active',      'DIAMONDREAMERS', NULL, 'Marketing automation client (FB/IG/Threads, HubSpot).'),
  ('kieairaskitchen', 'Kieaira''s Kitchen','client',  'unconfirmed', NULL,             NULL, 'Found on Hostinger (Builder site). Confirm it is a client.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO portal_client_site (client_id, url, label, platform, hosting_ref, is_primary, notes)
SELECT c.id, s.url, s.label, s.platform, 'Hostinger u950720602', s.is_primary, s.notes
  FROM (VALUES
    ('visioncorp',      'https://iamvisioncorp.org',                 'VisionCorp main site',   'hostinger-builder', true,  NULL),
    ('visioncorp',      'https://vizionai.iamvisioncorp.org',        'VizionAI Portal',        'nodejs',            false, 'This portal (repo VizionCorpAI/vizion-portal).'),
    ('visioncorp',      'https://sjohn.iamvisioncorp.org',           'Sahr John II portfolio', 'nodejs',            false, '3D portfolio (repo VizionCorpAI/sj-ii).'),
    ('visioncorp',      'https://visionclouds.org',                  'Vision Clouds',          'hostinger-builder', false, NULL),
    ('visioncorp',      'https://visionmotos.org',                   'Vision Motos',           'hostinger-builder', false, NULL),
    ('visioncorp',      'https://bisque-chimpanzee-802265.hostingersite.com', 'Horizons temp site', 'horizons', false, 'Temporary Hostinger domain; confirm what it is.'),
    ('diamondreamers',  'https://diamondreamers.org',                'DiamonDreamers site',    'horizons',          true,  NULL),
    ('diamondreamers',  'https://diamonddreamers-builder-q1ccyiom4kdecjhx.hostingersite.com', 'Old Builder site', 'hostinger-builder', false, 'Older Builder version; retire?'),
    ('kieairaskitchen', 'https://kieairaskitchen.com',               'Kieaira''s Kitchen',     'hostinger-builder', true,  NULL)
  ) AS s(slug, url, label, platform, is_primary, notes)
  JOIN portal_client c ON c.slug = s.slug
ON CONFLICT (client_id, url) DO NOTHING;

INSERT INTO portal_client_login (client_id, label, service, kind, login_url, secret_path, secret_key, status, notes)
SELECT c.id, l.label, l.service, l.kind, l.login_url, l.path, l.key, l.status, l.notes
  FROM (VALUES
    ('diamondreamers', 'Facebook page token', 'facebook',  'token', 'https://business.facebook.com', '/marketting/clients/diamondreamers/socials/facebook',  'FACEBOOK_PAGE_TOKEN',  'ok',      'Never-expiring system user vizionai-dd-automation.'),
    ('diamondreamers', 'Instagram token',     'instagram', 'token', 'https://business.facebook.com', '/marketting/clients/diamondreamers/socials/instagram', 'INSTAGRAM_PAGE_TOKEN', 'ok',      NULL),
    ('diamondreamers', 'Threads token',       'threads',   'token', 'https://developers.facebook.com', '/marketting/clients/diamondreamers/socials/threads', 'THREADS_USER_TOKEN',   'expired', 'Expired 2026-11-02: re-issue in Meta.'),
    ('diamondreamers', 'HubSpot private app', 'hubspot',   'token', 'https://app.hubspot.com',       '/marketting/clients/diamondreamers/Integrations/hubspot', 'HUBSPOT_PRIVATE_APP_PAT', 'ok', NULL),
    ('diamondreamers', 'Website admin',       'hostinger', 'password', 'https://hpanel.hostinger.com', NULL, NULL, 'missing', 'Add the site login to Infisical, then link it here.'),
    ('visioncorp',     'Telegram bot (@VizionCorpAIBot)', 'telegram', 'token', 'https://t.me/BotFather', '/marketting/social/telegram', 'TELEGRAM_MAIN_BOT_TOKEN', 'ok', NULL),
    ('visioncorp',     'Portal owner login',  'portal',    'password', 'https://vizionai.iamvisioncorp.org/login', NULL, NULL, 'missing', 'Lives in vizion-infrastructure /platform/portal (not shown here on purpose).'),
    ('kieairaskitchen','Website admin',       'hostinger', 'password', 'https://hpanel.hostinger.com', NULL, NULL, 'missing', 'Add when confirmed.')
  ) AS l(slug, label, service, kind, login_url, path, key, status, notes)
  JOIN portal_client c ON c.slug = l.slug
ON CONFLICT (client_id, label) DO NOTHING;
