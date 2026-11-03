# Source synchronization — 2026-11-03

The official frontend contains the modern Design System, incremental
TypeScript, authentication/session clients, institutional navigation and
parameter consultation/proposal UI. JavaScript services and canonical Core
authorization contracts remain in use; this synchronization adds no framework.

DEV Hosting version: `e36d0b3a74973a48`, including the functional frontend
checkpoint `f9d67635f1241e2125f901a6f6bed3768c69100c`. The Hosting release applied
a one-file compatible hotfix over `897957e329b0511a`; preserve the individual
release manifests when reproducing the deployed composition. Documentation
checkpoint `aa86df383cf2026cfa1641668e8490fb70ac724d` contains the latest sources.

PROD remains on Hosting version `c8eb23b963ad806d`; this Git synchronization
does not deploy the DEV parameter UI or open production parameter editing.
Source readiness, deployed version and institutional activation are distinct.

Clean-install validation: `npm ci`, `npm run verify` (194 passing tests),
TypeScript checks and `node scripts/check-reproducible.cjs` passed. Repeated
DEV and PROD builds produced identical hashes (131 and 130 assets respectively).
Nominal overlays, credentials, private evidence and institutional records stay
outside Git. Public builds retain placeholders requiring the approved release
configuration; do not substitute a private overlay into the repository.

GitHub Actions only verifies sources and reproducibility. There is no automatic
Hosting deployment. Future publication requires the approved environment,
identified artifact, manifest, preconditions and rollback package. Historical
PRs are not a source of truth for replacing this modern frontend.
