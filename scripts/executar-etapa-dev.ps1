param([Parameter(Mandatory=$true)][ValidateSet('Core','ConcluirCore','Portal','Conferir')][string]$Etapa, [Parameter(Mandatory=$true)][string]$Campanha)
$ErrorActionPreference = 'Stop'
$spec = Get-Content -Raw -LiteralPath (Join-Path $Campanha 'campanha-dev.json') | ConvertFrom-Json
$project = 'geapa-convergencia-dev'
$regionPath = "projects/$project/locations/southamerica-east1"
$portal = Join-Path $Campanha 'src-portal'
$compare = Join-Path $PSScriptRoot 'conferir-ambiente.ps1'
$functionsApi = 'https://cloudfunctions.googleapis.com/v2'
$n = 'C:\GEAPA-NOVO\repos\geapa-core\backend\functions-node\node_modules\node-win-x64\bin\node.exe'
$firebase = 'C:\GEAPA-NOVO\repos\geapa-core\backend\functions-node\node_modules\firebase-tools\lib\bin\firebase.js'
$receipt = Join-Path $Campanha 'core-dev-publicado.json'
$intent = Join-Path $Campanha 'core-dev-operacao.json'
$zip = Join-Path $Campanha $spec.coreZip
$portalManifest = Join-Path $portal 'build/dev-manifest.json'
function Service($snapshot, $name) {
    $found = @($snapshot.services | Where-Object { $_.entryPoint -ceq $name })
    if ($found.Count -ne 1 -or $found[0].state -ne 'ACTIVE' -or $found[0].runtime -ne 'nodejs22') { throw "Funcao inesperada: $name" }
    $s = $found[0]
    if ($s.traffic.Count -ne 1 -or $s.traffic[0].percent -ne 100) { throw "Revisar divisao de trafego: $name" }
    return $s
}
function Save-Json($value, $dest) { $value | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $dest -Encoding UTF8 }
function TokenHeaders {
    $t = & gcloud.cmd auth print-access-token --account $spec.account
    if ($LASTEXITCODE -or !$t) { throw 'Autenticacao Google Cloud indisponivel.' }
    return @{Authorization="Bearer $t"}
}
function Read-SourceZip($service, $destination) {
    $src = $service.resolvedSource
    if (!$src.generation) { $src = $service.source }
    if (!$src.bucket -or !$src.object -or !$src.generation) { throw 'Fonte versionada do executor indisponivel.' }
    $object = [uri]::EscapeDataString($src.object)
    $uri = "https://storage.googleapis.com/download/storage/v1/b/$($src.bucket)/o/${object}?alt=media&generation=$($src.generation)"
    Invoke-WebRequest -UseBasicParsing -Uri $uri -Headers (TokenHeaders) -OutFile $destination
}
function Compare-SourceZip($download, $expected) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    function EntryHashes($file) {
        $a = [IO.Compression.ZipFile]::OpenRead($file)
        $sha = [Security.Cryptography.SHA256]::Create()
        try {
            $entries = @{}
            foreach ($item in $a.Entries) {
                if (!$item.Name) { continue }
                if ($entries.ContainsKey($item.FullName)) { throw 'Entrada ZIP duplicada.' }
                $s = $item.Open()
                try { $entries[$item.FullName]=[BitConverter]::ToString($sha.ComputeHash($s)) } finally { $s.Dispose() }
            }
            return $entries
        } finally { $sha.Dispose(); $a.Dispose() }
    }
    $a = EntryHashes $download
    $b = EntryHashes $expected
    if ($a.Count -ne $b.Count) { throw 'Inventario da fonte publicada divergiu.' }
    foreach ($k in $b.Keys) { if ($a[$k] -ne $b[$k]) { throw "Fonte publicada divergiu em $k" } }
}
function Check-Hosting($snapshot, $mode) {
    $snapshot | ConvertTo-Json -Depth 16 -Compress | & $n (Join-Path $PSScriptRoot 'comparar-hosting-dev.cjs') $mode $Campanha
    if ($LASTEXITCODE) { throw "Hosting divergiu: $mode" }
}
function Check-Worker($snapshot) {
    $worker = Service $snapshot 'geapaCommandDevPilotBoardConsequences'
    if ($worker.traffic[0].revision -ne $spec.workerRevision -or $worker.traffic[0].imageDigest -notlike ('*' + $spec.workerImage)) { throw 'Revisar worker DEV ativo.' }
    if ($snapshot.scheduler.Count -ne 1 -or $snapshot.scheduler[0].state -ne 'PAUSED') { throw 'Revisar estado atual do job DEV. O roteiro apenas consulta o Scheduler.' }
}
$before = & $compare -Ambiente dev -PassThru -DiretorioEvidencias $Campanha -Conta $spec.account
Check-Worker $before
$svc = Service $before 'geapaCommandDevPilot'
if ($svc.function -cne "$regionPath/functions/geapaCommandDevPilot" -and $svc.function -cne "$regionPath/functions/geapacommanddevpilot") { throw 'Destino Gen2 inesperado.' }
if ($Etapa -eq 'Core') {
    if ((Test-Path $receipt) -or (Test-Path $intent)) { throw 'Existe recibo ou operacao anterior. Consultar seu estado antes de repetir.' }
    Check-Hosting $before 'anterior'
    if ($svc.traffic[0].revision -ne $spec.corePrevious -or $svc.traffic[0].imageDigest -notlike ('*' + $spec.corePreviousImage)) { throw 'Baseline diferente do recibo. Reconciliar antes da atualizacao.' }
    $rollback = Join-Path $Campanha $spec.rollbackZip
    Read-SourceZip $svc $rollback
    if ((Get-FileHash $rollback).Hash -ne $spec.rollbackSha) { throw 'Fonte de retorno divergiu do ZIP reconciliado.' }
    if ((Get-FileHash $zip).Hash -ne $spec.zipSha) { throw 'ZIP DEV alterado.' }
    if (!$env:GEAPA_OVERLAY_DEV) { throw 'Defina GEAPA_OVERLAY_DEV com o caminho do overlay DEV aprovado.' }
    $overlay = (Resolve-Path -LiteralPath $env:GEAPA_OVERLAY_DEV).ProviderPath
    & $n -e "const fs=require('fs'),p=require('path'),cp=require('child_process');const r=cp.spawnSync('git',['rev-parse','--is-inside-work-tree'],{cwd:p.dirname(fs.realpathSync(process.argv[1])),stdio:'ignore'});process.exit(r.status===128?0:1)" $overlay
    if ($LASTEXITCODE) { throw 'O overlay deve ficar fora de uma worktree Git.' }
    if ((& git -C $portal rev-parse HEAD) -ne $spec.portalCommit -or (& git -C $portal status --porcelain)) { throw 'Checkout Portal divergente.' }
    $env:NODE_PATH = 'C:\GEAPA-NOVO\repos\geapa-portal\node_modules'
    & $n (Join-Path $portal 'scripts/build.cjs') --env dev --overlay $overlay
    if ($LASTEXITCODE) { throw 'Build privado DEV falhou.' }
    Check-Hosting $before 'local'
    Push-Location $Campanha
    try {
        & $n $firebase hosting:channel:list --account $spec.account --site $project --project $project --config (Join-Path $portal 'config/dev.firebase.json') --json --non-interactive | Out-Null
        if ($LASTEXITCODE) { throw 'Renove o login Firebase antes de atualizar o Core.' }
    } finally { Pop-Location }
    $manifestHash = (Get-FileHash $portalManifest).Hash
    $auth = TokenHeaders
    $uploadSpec = @{environment='GEN_2'}
    if ($svc.kmsKeyName) { $uploadSpec.kmsKeyName=$svc.kmsKeyName }
    $upload = Invoke-RestMethod -Method Post -Uri "${functionsApi}/${regionPath}/functions:generateUploadUrl" -Headers $auth -ContentType 'application/json' -Body ($uploadSpec | ConvertTo-Json -Compress)
    if (!$upload.storageSource.bucket -or !$upload.storageSource.object -or !$upload.uploadUrl) { throw 'Upload URL incompleta.' }
    try { Invoke-WebRequest -UseBasicParsing -Method Put -Uri $upload.uploadUrl -InFile $zip -ContentType 'application/zip' | Out-Null } catch { throw 'Falha no upload do ZIP DEV.' }
    $body = @{name=$svc.function;buildConfig=@{source=@{storageSource=$upload.storageSource}}} | ConvertTo-Json -Depth 8
    $change = [ordered]@{previous=$svc;source=$upload.storageSource;portalManifestSha256=$manifestHash;function=$svc.function;operation=$null}
    Save-Json $change $intent
    $op = Invoke-RestMethod -Method Patch -Uri "$functionsApi/$($svc.function)?updateMask=buildConfig.source" -Headers $auth -ContentType 'application/json' -Body $body
    if (!$op.name) { throw 'Consultar a funcao antes de qualquer repeticao.' }
    $change.operation = $op.name
    Save-Json $change $intent
}
if ($Etapa -in 'Core','ConcluirCore') {
    $change = Get-Content -Raw -LiteralPath $intent | ConvertFrom-Json
    if (!$change.operation -or $change.function -ne $svc.function) { throw 'Identificar a operacao do executor DEV no provedor antes de retomar.' }
    $op=Invoke-RestMethod -Uri "$functionsApi/$($change.operation)" -Headers (TokenHeaders)
    for ($i=0; !$op.done -and $i -lt 160; $i++) { Start-Sleep -Seconds 10; $op=Invoke-RestMethod -Uri "$functionsApi/$($change.operation)" -Headers (TokenHeaders) }
    if (!$op.done -or $op.error) { throw "Conferir operacao $($change.operation). O Hosting continua na versao anterior." }
    $after = & $compare -Ambiente dev -PassThru -DiretorioEvidencias $Campanha -Conta $spec.account
    Check-Worker $after
    $new = Service $after 'geapaCommandDevPilot'
    if ($new.traffic[0].revision -eq $change.previous.traffic[0].revision -or $new.settingsHash -ne $change.previous.settingsHash) { throw 'Revisar configuracao e trafego da nova revisao antes do Portal.' }
    if ((Get-FileHash $zip).Hash -ne $spec.zipSha) { throw 'ZIP candidato alterado.' }
    $actual = Join-Path $Campanha 'fonte-core-dev-publicada.zip'
    Read-SourceZip $new $actual
    Compare-SourceZip $actual $zip
    Save-Json @{revision=$new.traffic[0].revision;image=$new.traffic[0].imageDigest;source=$new.resolvedSource;settingsHash=$new.settingsHash;portalManifestSha256=$change.portalManifestSha256} $receipt
    Write-Output 'Core DEV atualizado. Validar leitor autorizado, recusas e recuperacao antes da etapa Portal.'
    return
}
$proven = Get-Content -Raw -LiteralPath $receipt | ConvertFrom-Json
if ($svc.traffic[0].revision -ne $proven.revision -or $svc.traffic[0].imageDigest -ne $proven.image -or $svc.settingsHash -ne $proven.settingsHash -or (Get-FileHash $portalManifest).Hash -ne $proven.portalManifestSha256) { throw 'Core ou artefato do Portal divergente do recibo.' }
if ($Etapa -eq 'Portal' -and $before.version.Split('/')[-1] -eq $spec.previousVersion) {
    Check-Hosting $before 'anterior'
    Check-Hosting $before 'local'
    $config = Get-Content -Raw -LiteralPath (Join-Path $portal 'config/dev.firebase.json') | ConvertFrom-Json
    & $n (Join-Path $PSScriptRoot 'verificar-aceite-core-dev.cjs') $Campanha $before.release
    if ($LASTEXITCODE) { throw 'Publicacao do Hosting exige aceite intermediario desta revisao do Core.' }
    if ($config.hosting.public -cne '../dist/dev') { throw 'Raiz DEV inesperada.' }
    $config.hosting.public = 'dist/dev'
    $tempConfig = Join-Path $portal ('firebase-dev-' + [guid]::NewGuid() + '.json')
    Push-Location $portal
    try {
        [IO.File]::WriteAllText($tempConfig, ($config | ConvertTo-Json -Depth 50), (New-Object Text.UTF8Encoding($false)))
        & $n $firebase deploy --only hosting --project $project --account $spec.account --config $tempConfig --non-interactive
        if ($LASTEXITCODE) { throw 'Conferir canal live antes de repetir a publicacao.' }
    } finally {
        Pop-Location
        if (Test-Path -LiteralPath $tempConfig) { Remove-Item -LiteralPath $tempConfig }
    }
    $before = & $compare -Ambiente dev -PassThru -DiretorioEvidencias $Campanha -Conta $spec.account
    Check-Worker $before
    $served = Service $before 'geapaCommandDevPilot'
    if ($served.traffic[0].revision -ne $proven.revision -or $served.traffic[0].imageDigest -ne $proven.image) {throw 'Revisao do executor mudou durante a publicacao do Hosting.'}
}
Check-Hosting $before 'publicado'
if ($Etapa -eq 'Conferir') {
    [ordered]@{release=$before.release;version=$before.version;core=$proven.revision;activeFiles=$before.activeFileCount;declaredFiles=$before.declaredFileCount;manifestSha256=$proven.portalManifestSha256}
}
Write-Output "Hosting DEV conferido: release=$($before.release) | versao=$($before.version) | Core $($proven.revision). Executar o aceite funcional com as identidades sinteticas."
