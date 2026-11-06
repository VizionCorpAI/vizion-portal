-- 2026-11-06: client sites are public, so they have no admin logins to track.
-- The only logins are this portal and n8n (both VisionCorp, both in vizion-infrastructure).
DELETE FROM portal_client_login l
  USING portal_client c
 WHERE c.id = l.client_id AND l.label = 'Website admin'
   AND c.slug IN ('diamondreamers', 'kieairaskitchen');

UPDATE portal_client_login l SET
  secret_project = 'vizion-infrastructure',
  secret_path    = '/platform/portal',
  secret_key     = 'PORTAL_OWNER_PASSWORD',
  username       = 'admin@iamvisioncorp.org',
  status         = 'ok',
  notes          = 'vizion-infrastructure /platform/portal'
  FROM portal_client c WHERE c.id = l.client_id AND c.slug = 'visioncorp' AND l.label = 'Portal owner login';

INSERT INTO portal_client_login (client_id, label, service, kind, login_url, username, secret_project, secret_path, secret_key, status, notes)
SELECT c.id, 'n8n admin', 'n8n', 'password', 'https://n8n.iamvisioncorp.org', 'admin@iamvisioncorp.org',
       'vizion-infrastructure', '/platform/n8n', 'N8N_ADMIN_PASSWORD', 'ok', 'vizion-infrastructure /platform/n8n'
  FROM portal_client c WHERE c.slug = 'visioncorp'
ON CONFLICT (client_id, label) DO NOTHING;
