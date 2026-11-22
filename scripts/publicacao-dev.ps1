param([Parameter(Mandatory=$true)][string]$Campanha, [switch]$SomenteConferir)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $Campanha).ProviderPath
$runtime = Join-Path $PSScriptRoot 'executar-etapa-dev.ps1'
$receipt = Join-Path $root 'core-dev-publicado.json'
$intent = Join-Path $root 'core-dev-operacao.json'
$manifest = Join-Path $root 'src-portal/build/dev-manifest.json'
$result = [ordered]@{utc=[datetime]::UtcNow.ToString('o');environment='DEV';status='PENDENTE';functional='PENDENTE: sessao sintetica autorizada';phase='Core'}
try {
if (!$SomenteConferir -and !(Test-Path -LiteralPath $receipt)) {
    $step = if (Test-Path -LiteralPath $intent) {'ConcluirCore'} else {'Core'}
    & $runtime $step $root
}
$result.phase='Hosting'
if (!$SomenteConferir) { & $runtime Portal $root }
$observed = & $runtime Conferir $root | Where-Object { $_ -is [System.Collections.IDictionary] }
if (!$observed.release -or !$observed.version) { throw 'Recibo do canal live ausente.' }
foreach ($key in $observed.Keys) { $result[$key]=$observed[$key] }
$result.phase='HTTP'
& node (Join-Path $PSScriptRoot 'verificar-entrega-dev.cjs') $manifest
if ($LASTEXITCODE) { throw 'Entrega HTTP DEV pendente.' }
$result.status='PUBLICACAO_VERIFICADA'
$result.phase='Aceite funcional'
Write-Output "$($result.status) | release=$($result.release) | versao=$($result.version) | Core=$($result.core)"
} finally {
    $result | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $root ('resultado-dev-'+[datetime]::UtcNow.ToString('yyyyMMddTHHmmssffffZ')+'.json'))
}
