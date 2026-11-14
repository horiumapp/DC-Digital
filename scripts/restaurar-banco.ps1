<#
.SYNOPSIS
  Restaura um backup do DC Digital em um banco DESTINO (somente sob demanda).

.DESCRIPTION
  NAO use o projeto de produção no primeiro teste.
  Crie um segundo projeto Free no Supabase, defina DC_DIGITAL_DB_URL_RESTORE
  com o Session pooler desse projeto e libere o seu IP em Network Restrictions.

  Restaura o schema public a partir de public-completo.dump (pg_restore).
  O schema auth do Supabase é gerenciado pela plataforma: logins (auth.users)
  NAO sao restaurados por este script. Depois do teste, compare contagens
  de alunos/notas/frequencias.

.EXAMPLE
  .\scripts\restaurar-banco.ps1 -PastaBackup "C:\Backups-DC-Digital\backup-2026-11-14_1734"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$PastaBackup,
  [switch]$ConfirmarProducao
)

$ErrorActionPreference = 'Stop'

$dbUrl = [Environment]::GetEnvironmentVariable('DC_DIGITAL_DB_URL_RESTORE', 'User')
if (-not $dbUrl) { $dbUrl = $env:DC_DIGITAL_DB_URL_RESTORE }
if (-not $dbUrl) {
  throw @'
Defina DC_DIGITAL_DB_URL_RESTORE com a connection string do projeto DESTINO
(Session pooler). Exemplo:
  [Environment]::SetEnvironmentVariable(
    "DC_DIGITAL_DB_URL_RESTORE",
    "postgresql://postgres.REF_DESTINO:SENHA@aws-0-....pooler.supabase.com:5432/postgres",
    "User")
'@
}

$prodUrl = [Environment]::GetEnvironmentVariable('DC_DIGITAL_DB_URL', 'User')
if ($prodUrl -and ($dbUrl -eq $prodUrl) -and -not $ConfirmarProducao) {
  throw 'O destino e o mesmo da PRODUCAO. Para forcar, passe -ConfirmarProducao (risco alto).'
}

$dump = Join-Path $PastaBackup 'public-completo.dump'
if (-not (Test-Path $dump)) {
  throw "Arquivo nao encontrado: $dump"
}

$pgRestore = (Get-Command pg_restore -ErrorAction SilentlyContinue).Source
if (-not $pgRestore) {
  $pgRestore = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_restore.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $pgRestore) { throw 'pg_restore nao encontrado.' }

$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
  $psql = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}

Write-Host "Destino: $($dbUrl -replace ':[^:@/]+@', ':***@')"
Write-Host "Backup:  $dump"
Write-Host ''
Write-Host 'Isto APAGA e recria as tabelas do schema public no destino.'
$ok = Read-Host 'Digite RESTAURAR para continuar'
if ($ok -ne 'RESTAURAR') { throw 'Cancelado.' }

Write-Host 'Restaurando schema public...'
& $pgRestore --clean --if-exists --no-owner --no-privileges --dbname=$dbUrl $dump
# pg_restore pode retornar 1 com avisos nao fatais
if ($LASTEXITCODE -gt 1) { throw "pg_restore falhou com codigo $LASTEXITCODE" }

if ($psql) {
  Write-Host ''
  Write-Host 'Contagens no destino:'
  & $psql $dbUrl -c "select 'alunos' as tabela, count(*) from public.alunos union all select 'avaliacoes', count(*) from public.avaliacoes union all select 'notas', count(*) from public.notas union all select 'frequencias', count(*) from public.frequencias order by 1;"
}

Write-Host ''
Write-Host 'OK: schema public restaurado.'
Write-Host 'Logins (auth.users) NAO foram restaurados neste passo.'
Write-Host 'Compare as contagens com a producao. Se baterem, o backup e valido.'
