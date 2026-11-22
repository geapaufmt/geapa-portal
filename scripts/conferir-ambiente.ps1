param([Parameter(Mandatory=$true)][ValidateSet('dev','prod')][string]$Ambiente, [switch]$PassThru, [string]$Conta, [string]$DiretorioEvidencias = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
$project = @{dev='geapa-convergencia-dev'; prod='portal-geapa'}[$Ambiente]
$entry = @{dev='geapaCommandDevPilot'; prod='geapaCommand'}[$Ambiente]
$region = 'southamerica-east1'
$identityArgs = @()
if ($Conta) { $identityArgs = @("--account=$Conta") }
$token = & gcloud.cmd auth print-access-token @identityArgs
if ($LASTEXITCODE -or !$token) { throw 'O gcloud nao conseguiu emitir o token nesta sessao. Nenhuma API foi consultada.' }
$headers = @{ Authorization="Bearer $token" }
function Read-Cloud($url) {
    $resource = ([uri]$url).GetLeftPart([UriPartial]::Path)
    while ($true) {
        try { return (Invoke-RestMethod -Method Get -Uri $url -Headers $headers -ErrorAction Stop) }
        catch {
            $response = $_.Exception.Response
            $status = if ($response) { [int]$response.StatusCode } else { 'sem resposta HTTP' }
            $raw = $_.ErrorDetails.Message
            if (!$raw -and $response -and $response.PSObject.Methods['GetResponseStream']) {
                try { $reader = New-Object IO.StreamReader($response.GetResponseStream()); try { $raw=$reader.ReadToEnd() } finally { $reader.Dispose() } } catch {}
            }
            if ($status -eq 403 -and !$headers.ContainsKey('x-goog-user-project') -and
                $raw -match 'requires a quota project|quota project (is )?not set|no quota project') {
                $headers['x-goog-user-project'] = $project
                continue
            }
            $info = $null
            try { $info = ($raw | ConvertFrom-Json).error } catch {}
            $reason = @($info.details | ForEach-Object { $_.reason } | Where-Object { $_ -cmatch '^[A-Z_]{2,80}$' }) -join ','
            $permission = @($info.details | ForEach-Object { $_.metadata.permission } | Where-Object { $_ -cmatch '^[a-z][a-z0-9]+\.[A-Za-z0-9.]+$' }) -join ','
            if (!$permission -and $info.message -match "Permission ['`"]([a-z][a-z0-9]+\.[A-Za-z0-9.]+)['`"]") { $permission=$Matches[1] }
            throw "GET $resource | HTTP $status | projeto=$project | motivo=$reason | permissao=$permission"
        }
    }
}
function List-Cloud($url, $field) {
    $next = ''
    $tokens = @{}
    do {
        $filter = if ($field -eq 'files') { '&status=ACTIVE' } else { '' }
        $page = Read-Cloud ($url + '?pageSize=100' + $filter + $next)
        foreach ($row in $page.$field) { $row }
        $next = if ($page.nextPageToken) { '&pageToken=' + [uri]::EscapeDataString($page.nextPageToken) } else { '' }
        if ($next -and $tokens.ContainsKey($next)) { throw 'Token de paginacao repetido.' }
        $tokens[$next] = $true
    } while ($next)
}
$api = 'https://firebasehosting.googleapis.com/v1beta1'
$channel = Read-Cloud "$api/sites/$project/channels/live"
$version = $channel.release.version.name
if (!$version -or $version -notmatch ('(^|/)sites/' + [regex]::Escape($project) + '/versions/[^/]+$')) { throw 'Canal live sem versao identificada.' }
$ver = Read-Cloud "$api/$version"
$files = [ordered]@{}
foreach ($f in (List-Cloud "$api/$version/files" 'files')) {
    if (!$f.path -or !$f.hash -or $files.Contains($f.path)) { throw 'Inventario Hosting invalido.' }
    $files[$f.path] = $f.hash
}
if (!$files.Count -or $ver.status -ne 'FINALIZED') { throw "Versao Hosting sem inventario ativo finalizado: $version" }
# fileCount is aggregate metadata. The release verifier checks every listed
# path against the approved manifest and verifies each application file hash.
$declaredCount = $ver.fileCount
$base = "projects/$project/locations/$region"
$allFunctions = @(List-Cloud "https://cloudfunctions.googleapis.com/v2/$base/functions" 'functions')
$services = foreach ($target in @($entry, ($entry + 'BoardConsequences'))) {
    $match = @($allFunctions | Where-Object { $_.name.Split('/')[-1] -ieq $target })
    if ($match.Count -ne 1) { throw "Funcao Gen2 nao identificada: $target" }
    $fn = $match[0]
    $svc = $fn.serviceConfig.service
    if (!$svc -or $fn.environment -ne 'GEN_2') { throw "Servico inesperado: $target" }
    $run = Read-Cloud "https://run.googleapis.com/v2/$svc"
    $traffic = foreach ($t in $run.trafficStatuses) {
        $rid = $t.revision
        if (!$rid -and $t.type -eq 'TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST') { $rid = $run.latestReadyRevision }
        if (!$rid) { throw "Trafego sem revisao identificada: $target" }
        $rid = $rid.Split('/')[-1]
        $img = & gcloud.cmd run revisions describe $rid @identityArgs --project $project --region $region '--format=value(status.imageDigest)'
        if ($LASTEXITCODE -or !$img) { throw "Digest indisponivel: $rid" }
        [ordered]@{revision=$rid;percent=$t.percent;tag=$t.tag;imageDigest=$img}
    }
    if (!@($traffic).Count) { throw "Sem trafego legivel: $target" }
    $settings = [ordered]@{}
    foreach ($k in 'availableMemory','availableCpu','timeoutSeconds','minInstanceCount','maxInstanceCount','maxInstanceRequestConcurrency','serviceAccountEmail','ingressSettings','vpcConnector','vpcConnectorEgressSettings','allTrafficOnLatestRevision','secretEnvironmentVariables','secretVolumes') {
        $settings[$k] = $fn.serviceConfig.$k
    }
    $settings.env = [ordered]@{}
    foreach ($v in ($fn.serviceConfig.environmentVariables.psobject.Properties | Sort-Object Name)) { if ($v.Name) { $settings.env[$v.Name]=$v.Value } }
    $digest = [security.cryptography.sha256]::Create()
    try { $settingsHash = [BitConverter]::ToString($digest.ComputeHash([Text.Encoding]::UTF8.GetBytes(($settings | ConvertTo-Json -Depth 12 -Compress)))).Replace('-','') } finally { $digest.Dispose() }
    [ordered]@{function=$fn.name; service=$svc; entryPoint=$fn.buildConfig.entryPoint; state=$fn.state; runtime=$fn.buildConfig.runtime; settingsHash=$settingsHash;
        memory=$fn.serviceConfig.availableMemory; concurrency=$fn.serviceConfig.maxInstanceRequestConcurrency;
        maxInstances=$fn.serviceConfig.maxInstanceCount; timeout=$fn.serviceConfig.timeoutSeconds;
        variableNames=@($fn.serviceConfig.environmentVariables.psobject.Properties.Name | Where-Object {$_});
        source=$fn.buildConfig.source.storageSource; resolvedSource=$fn.buildConfig.sourceProvenance.resolvedStorageSource; kmsKeyName=$fn.kmsKeyName;
        latestReady=$run.latestReadyRevision; traffic=@($traffic)}
}
$jobs = @(List-Cloud "https://cloudscheduler.googleapis.com/v1/$base/jobs" 'jobs' | Where-Object {
    $_.name -match 'BoardConsequences' -or $_.httpTarget.uri -match 'BoardConsequences'
} | Select-Object name,state,schedule,timeZone)
$evidence = [ordered]@{observedUtc=[datetime]::UtcNow.ToString('o');project=$project;release=$channel.release.name;version=$version;
    declaredFileCount=$declaredCount;activeFileCount=$files.Count;config=$ver.config;files=$files;services=@($services);scheduler=$jobs}
$dest = Join-Path $DiretorioEvidencias ("live-{0}-{1}.json" -f $Ambiente,[datetime]::UtcNow.ToString('yyyyMMddTHHmmssffffZ'))
$evidence | ConvertTo-Json -Depth 16 | Set-Content -LiteralPath $dest -Encoding UTF8
if ($PassThru) { $evidence; return }
Write-Output "$project | $version | $($files.Count) arquivos | $dest"
foreach ($s in $services) { foreach ($t in $s.traffic) { Write-Output "$($s.entryPoint) | $($t.revision) | $($t.percent)%" } }
if (!$jobs.Count) { Write-Warning 'Job nao identificado pelo nome ou destino. Conferir no console em modo de leitura.' }
