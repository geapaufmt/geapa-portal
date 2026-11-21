@echo off
setlocal
set "PATH=%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin;%PATH%"
set "BASH=%ProgramFiles%\Git\bin\bash.exe"
set "WORK=C:/GEAPA-NOVO/verificacoes-locais"
set "CLOUDSDK_CORE_ACCOUNT=geapadev@gmail.com"
if not exist "%BASH%" exit /b 1
where gcloud.cmd >nul 2>nul || exit /b 1
where node.exe >nul 2>nul || exit /b 1
pushd "%~dp0.." || exit /b 1
"%BASH%" scripts/bootstrap-hosting-dev.sh --inspect
if errorlevel 1 goto failed
echo Use um executor existente se o inventario mostrar um compativel.
choice /M "Criar ou conferir o executor dedicado Hosting DEV neste projeto"
if errorlevel 2 goto failed
"%BASH%" scripts/bootstrap-hosting-dev.sh --provision "%WORK%/admissao-dev-20261121/overlay-dev.private.json" "%WORK%/admissao-4c3aa9b-dev/diferencial-portal.json"
if errorlevel 1 goto failed
popd
exit /b 0
:failed
popd
exit /b 1
