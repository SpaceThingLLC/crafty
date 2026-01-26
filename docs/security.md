# Security Model

## Overview
PriceMyCraft supports optional cloud sync via Supabase. Access is controlled through:

- A high-entropy share token for view-only access (bearer token)
- A passphrase for edit access (hashed in the database)
- RPC-only data access with Row Level Security (RLS) locked down

## Threat Model

### Protected
- Workspace data (materials, projects, settings)
- Passphrases (stored as bcrypt hashes)

### Assumed
- The share link is treated like a password. Anyone with the link can view the data.
- Users choose a passphrase with reasonable entropy.

## Access Control

- Direct table access is blocked by RLS (no public SELECT/INSERT/UPDATE/DELETE).
- Read access is provided by a `fetch_workspace_data` RPC that validates the share token.
- Write access is provided by a `sync_workspace_data` RPC that verifies the passphrase.

## Client Storage

- Workspace metadata is stored in localStorage (ID, short name, share token).
- Passphrases are stored in sessionStorage by default and are not persisted across browser restarts.
- Users can opt in to remembering the passphrase on the device (localStorage).

## Security Considerations

- Share links are bearer tokens. If a link is exposed, its data is exposed.
- The `?n=` URL parameter is a display hint only and does not grant access.
- Passphrases should be long and unique.
- If you suspect a link is leaked, rotate the share link in the app to invalidate old URLs.

## Recommendations

- Use HTTPS for all deployments.
- Use a strong passphrase (12+ characters).
- Do not share the edit passphrase over insecure channels.
