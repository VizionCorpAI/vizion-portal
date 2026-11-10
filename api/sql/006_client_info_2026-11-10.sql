-- 2026-11-10 client facts: VisionCorp parent + subsidiaries, sites moved to the business that
-- owns them, Kieaira's Kitchen domain state, and the Meta logins meta_sync.py fills in Infisical.
-- Only Infisical locations are stored here, never values. Idempotent.
begin;

update portal_client set notes = 'Parent company. VizionAI, VisionClouds and Vision Motos are its subsidiaries and share the VisionCorp Facebook page (id 387310934469949). One Meta System User (VizionAI Automation) covers every page.', updated_at = now() where slug = 'visioncorp';
update portal_client set notes = 'VisionCorp subsidiary: AI platform (portal, n8n, agents). Holds the VizionAI Automation System User token; uses the VisionCorp Facebook page.', updated_at = now() where slug = 'vizionai';
update portal_client set notes = 'VisionCorp subsidiary: technology services; contracts and grants applicant. Uses the VisionCorp Facebook page; own Instagram (not linked to the API yet).', updated_at = now() where slug = 'visionclouds';
update portal_client set notes = 'VisionCorp subsidiary. Uses the VisionCorp Facebook page; own Instagram (not linked to the API yet).', updated_at = now() where slug = 'visionmotos';
update portal_client set notes = 'Partner client: shares its Facebook page to the VisionCorp business (FB/IG via VizionAI Automation, HubSpot). Threads needs its own OAuth.', updated_at = now() where slug = 'diamondreamers';
update portal_client set notes = 'Owner as an applicant (jobs, grants). Own workspace (vizion-personal); mailbox and calendar captured by IO.', updated_at = now() where slug = 'sahrjohnii';
update portal_client set notes = 'Facebook page and Instagram are linked to VizionAI Automation. Domain is at GoDaddy with DNS on Cloudflare (since 2026-09-15) and currently redirects to a spam site; not under Hostinger control. Confirm it is a client.', updated_at = now() where slug = 'kieairaskitchen';

-- sites belong to the business that owns them
update portal_client_site s set client_id = c.id, is_primary = true from portal_client c
 where c.slug = 'vizionai' and s.url = 'https://vizionai.iamvisioncorp.org';
update portal_client_site s set client_id = c.id, is_primary = true from portal_client c
 where c.slug = 'sahrjohnii' and s.url = 'https://sjohn.iamvisioncorp.org';
update portal_client_site s set client_id = c.id, is_primary = true from portal_client c
 where c.slug = 'visionmotos' and s.url = 'https://visionmotos.org';
update portal_client_site s set client_id = c.id, is_primary = true from portal_client c
 where c.slug = 'visionclouds' and s.url = 'https://visionclouds.org';
update portal_client_site set hosting_ref = 'GoDaddy domain, Cloudflare DNS', platform = 'unknown',
       notes = 'Redirects to a spam site (2026-11-10). Hostinger Builder copy is not served.'
 where url = 'https://kieairaskitchen.com';

-- Meta logins (Infisical locations only)
insert into portal_client_login (client_id, label, service, kind, secret_path, secret_key, status, notes)
select c.id, v.label, v.service, 'token', v.path, v.key, v.status, v.notes
  from (values
    ('vizionai',        'Meta System User (VizionAI Automation)', 'facebook',  '/marketting/clients/vizionai/socials/facebook',        'META_SYSTEM_USER_TOKEN', 'ok',      'Never expires. meta_sync.py writes every page token from it.'),
    ('visioncorp',      'Facebook page token',                    'facebook',  '/marketting/clients/visioncorp/socials/facebook',      'FACEBOOK_PAGE_TOKEN',    'ok',      'VisionCorp page, shared by the subsidiaries.'),
    ('visioncorp',      'Instagram token',                        'instagram', '/marketting/clients/visioncorp/socials/instagram',     'INSTAGRAM_PAGE_TOKEN',   'ok',      null),
    ('vizionai',        'Facebook page token (shared)',           'facebook',  '/marketting/clients/vizionai/socials/facebook',        'FACEBOOK_PAGE_TOKEN',    'ok',      'VisionCorp page (FACEBOOK_SHARED_FROM=visioncorp).'),
    ('visionclouds',    'Facebook page token (shared)',           'facebook',  '/marketting/clients/visionclouds/socials/facebook',    'FACEBOOK_PAGE_TOKEN',    'ok',      'VisionCorp page (FACEBOOK_SHARED_FROM=visioncorp).'),
    ('visionclouds',    'Instagram token',                        'instagram', '/marketting/clients/visionclouds/socials/instagram',   'INSTAGRAM_PAGE_TOKEN',   'missing', 'Own Instagram needs a Facebook page of its own to be API-driven.'),
    ('visionmotos',     'Facebook page token (shared)',           'facebook',  '/marketting/clients/visionmotos/socials/facebook',     'FACEBOOK_PAGE_TOKEN',    'ok',      'VisionCorp page (FACEBOOK_SHARED_FROM=visioncorp).'),
    ('visionmotos',     'Instagram token',                        'instagram', '/marketting/clients/visionmotos/socials/instagram',    'INSTAGRAM_PAGE_TOKEN',   'missing', 'Own Instagram needs a Facebook page of its own to be API-driven.'),
    ('kieairaskitchen', 'Facebook page token',                    'facebook',  '/marketting/clients/kieairaskitchen/socials/facebook', 'FACEBOOK_PAGE_TOKEN',    'ok',      'Via VizionAI Automation.'),
    ('kieairaskitchen', 'Instagram token',                        'instagram', '/marketting/clients/kieairaskitchen/socials/instagram','INSTAGRAM_PAGE_TOKEN',   'ok',      'Via VizionAI Automation.')
  ) v(slug, label, service, path, key, status, notes)
  join portal_client c on c.slug = v.slug
on conflict (client_id, label) do update set secret_path = excluded.secret_path, secret_key = excluded.secret_key,
                                             status = excluded.status, notes = excluded.notes;

update portal_client_login l set notes = 'Written by meta_sync.py from the VizionAI Automation System User.'
  from portal_client c where c.id = l.client_id and c.slug = 'diamondreamers' and l.service in ('facebook', 'instagram');
update portal_client_login l set notes = 'Expired 2026-11-02. The System User token does not work for Threads: re-authorize with Threads OAuth.'
  from portal_client c where c.id = l.client_id and c.slug = 'diamondreamers' and l.service = 'threads';

commit;
