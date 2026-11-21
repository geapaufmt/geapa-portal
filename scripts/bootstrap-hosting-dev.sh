#!/usr/bin/env bash
# Run once in an authenticated Google Cloud Shell, or any operator shell with gcloud.
set -euo pipefail
set +x
project=geapa-convergencia-dev
number=520248492623
region=southamerica-east1
pool=geapa-portal-dev
provider=github
sa_name=portal-hosting-ci
sa="$sa_name@$project.iam.gserviceaccount.com"
repo_id=1225560111
owner_id=263039260
workflow=geapaufmt/geapa-portal/.github/workflows/hosting-dev.yml@refs/heads/main
g() { gcloud --quiet --project="$project" "$@"; }
[[ "$(g projects describe "$project" --format='value(projectNumber)')" == "$number" ]] || exit 1
mode=${1:---inspect}
if [[ "$mode" == --inspect ]]; then
  g iam workload-identity-pools list --location=global --format='table(name,state)'
  g iam service-accounts list --format='table(email,disabled)'
  # Regional triggers are separate. Include any other regions used by the operator.
  if [[ "$(g services list --enabled --filter='name:cloudbuild.googleapis.com' --format='value(config.name)')" == cloudbuild.googleapis.com ]]; then
    for r in global "$region" "${@:2}"; do
      g builds triggers list --region="$r" --format='table(name,disabled,serviceAccount)'
    done
  else
    echo 'Cloud Build API inativa neste projeto.'
  fi
  exit
fi
if [[ "$mode" != --provision || $# != 3 ]]; then
  echo 'Usage: --inspect [extra-region ...] | --provision private-overlay.json diferencial-portal.json' >&2
  exit 2
fi
overlay=$2; candidate=$3
[[ -s "$overlay" && -s "$candidate" ]]
# Verify input types before creating any cloud resources. Never print their contents.
node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(x.schemaVersion!==1||!x.values||!Object.keys(x.values).length)process.exit(1)' "$overlay"
node -e 'const x=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));require(require("path").resolve(process.argv[2])).checkPlan(x)' "$candidate" "$(dirname "$0")/hosting-dev.cjs"
g services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com secretmanager.googleapis.com firebasehosting.googleapis.com run.googleapis.com
if ! g iam service-accounts describe "$sa" >/dev/null 2>&1; then
  g iam service-accounts create "$sa_name" --display-name='GEAPA DEV Hosting CI'
fi
[[ "$(g iam service-accounts describe "$sa" --format='value(disabled)')" != True ]]
policy=$(g projects get-iam-policy "$project" --format=json)
node -e 'const x=JSON.parse(require("fs").readFileSync(0));if(x.bindings.some(b=>b.members.includes(process.argv[1])&&b.role!==process.argv[2]))process.exit(1)' "serviceAccount:$sa" "projects/$project/roles/geapaHostingPublisher" <<<"$policy"
[[ -z "$(g iam service-accounts keys list --iam-account="$sa" --managed-by=user --format='value(name)')" ]]
pool_args=(--location=global --workload-identity-pool="$pool")
if ! g iam workload-identity-pools describe "$pool" --location=global >/dev/null 2>&1; then
  g iam workload-identity-pools create "$pool" --location=global --display-name='GEAPA Portal DEV'
fi
condition="assertion.repository_owner_id=='$owner_id' && assertion.repository_id=='$repo_id' && assertion.ref=='refs/heads/main' && assertion.workflow_ref=='$workflow' && assertion.sub=='repo:geapaufmt/geapa-portal:environment:geapa-dev' && assertion.event_name in ['workflow_dispatch','push']"
mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id'
issuer=https://token.actions.githubusercontent.com
if ! g iam workload-identity-pools providers describe "$provider" "${pool_args[@]}" >/dev/null 2>&1; then
  g iam workload-identity-pools providers create-oidc "$provider" "${pool_args[@]}" --issuer-uri="$issuer" --attribute-mapping="$mapping" --attribute-condition="$condition"
fi
# Refuse to reuse a pool with another trust root, a broader provider, or custom audiences.
providers=$(g iam workload-identity-pools providers list "${pool_args[@]}" --format=json)
node -e 'const [v,...other]=JSON.parse(require("fs").readFileSync(0)), a=require("assert/strict");
a.ok(v&&!other.length&&v.name.endsWith("/providers/github")&&v.state==="ACTIVE"&&!v.disabled);
a.equal(v.oidc.issuerUri,process.argv[2]);a.equal(v.oidc.allowedAudiences?.length||0,0);a.equal(v.attributeCondition,process.argv[1]);
a.deepEqual(v.attributeMapping,{"google.subject":"assertion.sub","attribute.repository_id":"assertion.repository_id"})' "$condition" "$issuer" <<<"$providers"
principal="principalSet://iam.googleapis.com/projects/$number/locations/global/workloadIdentityPools/$pool/attribute.repository_id/$repo_id"
g iam service-accounts add-iam-policy-binding "$sa" --member="$principal" --role=roles/iam.workloadIdentityUser >/dev/null
custom_role() {
  local id=$1 permissions=$2 actual
  if ! g iam roles describe "$id" >/dev/null 2>&1; then
    g iam roles create "$id" --title="$id" --permissions="$permissions" --stage=GA
  fi
  actual=$(g iam roles describe "$id" --format=json)
  node -e 'const r=JSON.parse(require("fs").readFileSync(0)), a=require("assert/strict");a.ok(!r.deleted&&r.stage!=="DISABLED");a.deepEqual(r.includedPermissions.sort(),process.argv[1].split(",").sort())' "$permissions" <<<"$actual"
}
member="serviceAccount:$sa"
custom_role geapaHostingPublisher 'firebasehosting.sites.get,firebasehosting.sites.update'
g projects add-iam-policy-binding "$project" --member="$member" --role="projects/$project/roles/geapaHostingPublisher" --condition=None >/dev/null
custom_role geapaHostingCoreReader 'run.services.get'
g run services add-iam-policy-binding geapacommanddevpilot --region="$region" --member="$member" --role="projects/$project/roles/geapaHostingCoreReader" >/dev/null
for key in overlay candidate acceptance; do
  name="geapa-portal-dev-$key"
  if ! g secrets describe "$name" >/dev/null 2>&1; then
    g secrets create "$name" --replication-policy=automatic
  fi
  g secrets add-iam-policy-binding "$name" --member="$member" --role=roles/secretmanager.secretAccessor >/dev/null
  if [[ "$key" == acceptance ]]; then continue; fi
  versions=$(g secrets versions list "$name" --format='value(name)' --limit=1)
  if [[ -z "$versions" ]]; then
    file="$candidate"; if [[ "$key" == overlay ]]; then file="$overlay"; fi
    g secrets versions add "$name" --data-file="$file" >/dev/null
  fi
done
echo 'DEV federation configured. Run Hosting DEV / inspect on main. Acceptance evidence is managed independently.'
