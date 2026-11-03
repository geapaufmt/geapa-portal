# Source synchronization — 2026-11-03

The official frontend contains the modern Design System, incremental
TypeScript, authentication/session clients, institutional navigation and
parameter consultation/proposal UI. JavaScript services and canonical Core
authorization contracts remain in use; this synchronization adds no framework.

DEV Hosting version: `2e566f78953ffa16`. Its one-file attestation diagnostic
uses source `80f30dce56ee32bf91fbd916ae0e01c8e259424d`, layered over Hosting
`061a39ba8e27b1fc` and its three session assets from
`91d8754f7fea5e09a2aca90feb9a1a9b2c1e69c5`. All other remote asset hashes and
Hosting configuration were preserved and read back. Preserve these individual
release manifests when reproducing the deployed composition.

Institutional-only context now restores only the authorized institutional
section and does not attach private Members observers. No ACT or Members
permission is inferred. The legacy tenure reader also retains its proper
fallback when the Node route is unavailable. DEV attestation diagnostics log
only an allowlisted error code, stage and bounded HTTP status, never tokens,
response bodies or credentials; they are silent outside the DEV project.

PROD remains on Hosting version `c8eb23b963ad806d`; this Git synchronization
does not deploy the DEV parameter UI or open production parameter editing.
Source readiness, deployed version and institutional activation are distinct.

Clean-install validation: `npm ci`, `npm run verify` (199 passing tests),
TypeScript checks and `node scripts/check-reproducible.cjs` passed. Repeated
DEV and PROD builds produced identical hashes (131 and 130 assets respectively).
Nominal overlays, credentials, private evidence and institutional records stay
outside Git. Public builds retain placeholders requiring the approved release
configuration; do not substitute a private overlay into the repository.

GitHub Actions only verifies sources and reproducibility. There is no automatic
Hosting deployment. Future publication requires the approved environment,
identified artifact, manifest, preconditions and rollback package. Historical
PRs are not a source of truth for replacing this modern frontend.

Physical DEV proof completed proposal, acknowledgement by a distinct person,
activation and the reverse proposal. The reverse acknowledgement/activation
are pending, not simulated. App Check failed in the second actor's browser at
`RECAPTCHA_EXECUTE`; browser control subsequently stopped because it could not
verify the active origin. Temporary controls were closed safely; the synthetic
value remains false at revision 2. Production parameter activation stays NO-GO.
