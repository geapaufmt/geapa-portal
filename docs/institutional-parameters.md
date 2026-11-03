# Institutional parameter interface

The TypeScript component `src/components/institutional-parameters.mts` reuses
the institutional directory, Design System modal, preview and recovery client.
Normative parameters remain inside Norms and documents; operational parameters
have their own horizontal navigation entry. Security settings are not exposed.

Cards and actions come from the Core consultation. Filtering the safe catalog
does not authorize writes. The same authenticated client and Enterprise App
Check flow serves contact, documentary visibility and parameter operations,
with independent journal namespaces and environment endpoints.

The parameter changes only the existing featured agenda section. All normal
rows use the unchanged filtering and rendering path. Authenticated context
supplies versioned preferences; session clearing discards the rendered snapshot.
No token or institutional permission is stored manually.

`tests/institutional-client-bootstrap.test.cjs` constructs both environment
variants and catches undefined configuration references before publication.
`tests/institutional-parameters.test.cjs` verifies masks in the presentation,
proposal revision display, read-only normative evidence and preservation of
the complete agenda when the featured section is disabled.

Build: `npm ci`, `npm run verify`, `node scripts/check-reproducible.cjs`.
Publication must preserve current private overlays and use a verified source
checkpoint. Never enable a control or expand a policy from frontend code.
