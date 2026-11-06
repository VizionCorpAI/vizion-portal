-- 2026-11-06: each client now has Infisical folders
--   vizion-business / marketting/clients/<slug>/{profile, sites/<site>, Integrations/*, socials/*}
-- Point the website-admin logins at sites/<site>/SITE_ADMIN_PASSWORD (status stays
-- 'missing' until the password is added in Infisical).
UPDATE portal_client_login l SET
  secret_path = '/marketting/clients/diamondreamers/sites/diamondreamers-org',
  secret_key  = 'SITE_ADMIN_PASSWORD',
  notes       = 'Add SITE_ADMIN_USERNAME / SITE_ADMIN_PASSWORD in Infisical (folder below), then set status ok.'
  FROM portal_client c WHERE c.id = l.client_id AND c.slug = 'diamondreamers' AND l.label = 'Website admin';
UPDATE portal_client_login l SET
  secret_path = '/marketting/clients/kieairaskitchen/sites/kieairaskitchen-com',
  secret_key  = 'SITE_ADMIN_PASSWORD',
  notes       = 'Add SITE_ADMIN_USERNAME / SITE_ADMIN_PASSWORD in Infisical (folder below), then set status ok.'
  FROM portal_client c WHERE c.id = l.client_id AND c.slug = 'kieairaskitchen' AND l.label = 'Website admin';
