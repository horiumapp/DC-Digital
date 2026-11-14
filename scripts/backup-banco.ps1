<#
.SYNOPSIS
  Backup diário do banco Supabase (somente leitura no banco).

.DESCRIPTION
  Gera três arquivos por execução numa pasta com a data:
    schema.sql       - estrutura do schema public (tabelas, funções, policies)
    auth-schema.sql  - estrutura do schema auth (referência)
    dados.sql        - dados de public e auth (CPF, logins: LGPD)
    public-completo.dump - estrutura + dados de public (restaurar com pg_restore)
  Apaga pastas de backup com mais de -DiasRetencao dias.

  Pré-requisitos:
    - pg_dump 17 (PostgreSQL command line tools) instalado.
    - Variável de ambiente de usuário DC_DIGITAL_DB_URL com a connection
      string do Session pooler (Supabase > Connect > Session pooler).
      A senha fica só nessa variável, nunca neste arquivo.

.EXAMPLE
  .\scripts\backup-banco.ps1 -Destino "G:\Meu Drive\Backups-DC-Digital"

.EXAMPLE
  # Vários destinos: gera no primeiro e copia para os demais.
  .\scripts\backup-banco.ps1 -Destino "C:\Backups-DC-Digital","$env:OneDrive\Backups-DC-Digital","G:\Meu Drive\Backups-DC-Digital"
#>
param(
  [Parameter(Mandatory = $true)]
  [string[]]$Destino,
  [int]$DiasRetencao = 30
)

$ErrorActionPreference = 'Stop'

# Via "powershell -File" a lista chega como uma string só, separada por vírgula.
$Destino = @($Destino | ForEach-Object { $_ -split '[,;]' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })

$dbUrl = [Environment]::GetEnvironmentVariable('DC_DIGITAL_DB_URL', 'User')
if (-not $dbUrl) { $dbUrl = $env:DC_DIGITAL_DB_URL }
if (-not $dbUrl) {
  throw 'Defina a variável de ambiente DC_DIGITAL_DB_URL (connection string do Session pooler).'
}

$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
  $pgDump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $pgDump) {
  throw 'pg_dump não encontrado. Instale as PostgreSQL command line tools (versão 17).'
}

$nomePasta = "backup-" + (Get-Date -Format 'yyyy-MM-dd_HHmm')
$principal = $Destino[0]
$pasta = Join-Path $principal $nomePasta
New-Item -ItemType Directory -Path $pasta -Force | Out-Null

function Escrever-Log([string]$destinoLog, [string]$msg) {
  $linha = "$(Get-Date -Format 's')  $msg"
  Add-Content -Path (Join-Path $destinoLog 'backup.log') -Value $linha
  Write-Host $linha
}

# Schemas internos do Supabase ficam de fora: são recriados pela plataforma.
$excluir = @('--exclude-schema=auth', '--exclude-schema=storage', '--exclude-schema=realtime',
  '--exclude-schema=supabase_functions', '--exclude-schema=extensions', '--exclude-schema=graphql',
  '--exclude-schema=graphql_public', '--exclude-schema=pgbouncer', '--exclude-schema=vault',
  '--exclude-schema=pgsodium', '--exclude-schema=pgsodium_masks', '--exclude-schema=_realtime',
  '--exclude-schema=supabase_migrations', '--exclude-schema=net', '--exclude-schema=cron')

try {
  & $pgDump $dbUrl --schema-only --no-owner --no-privileges @excluir -f (Join-Path $pasta 'schema.sql')
  if ($LASTEXITCODE -ne 0) { throw "pg_dump (schema) falhou com código $LASTEXITCODE" }

  # auth.users entra nos dados: sem ele os logins de alunos e professores não voltam.
  & $pgDump $dbUrl --data-only --no-owner --schema=public --schema=auth -f (Join-Path $pasta 'dados.sql')
  if ($LASTEXITCODE -ne 0) { throw "pg_dump (dados) falhou com código $LASTEXITCODE" }

  & $pgDump $dbUrl --schema-only --schema=auth --no-owner -f (Join-Path $pasta 'auth-schema.sql')
  if ($LASTEXITCODE -ne 0) { throw "pg_dump (auth) falhou com código $LASTEXITCODE" }

  # Estrutura + dados juntos: avaliacoes tem FK circular, e o dump só de dados pode falhar ao restaurar.
  & $pgDump $dbUrl --format=custom --no-owner --no-privileges --schema=public -f (Join-Path $pasta 'public-completo.dump')
  if ($LASTEXITCODE -ne 0) { throw "pg_dump (completo) falhou com código $LASTEXITCODE" }

  $tamanho = [math]::Round(((Get-ChildItem $pasta | Measure-Object Length -Sum).Sum / 1MB), 2)
  Escrever-Log $principal "OK  $pasta  ($tamanho MB)"
}
catch {
  Escrever-Log $principal "ERRO  $($_.Exception.Message)"
  Remove-Item $pasta -Recurse -Force -ErrorAction SilentlyContinue
  exit 1
}

# Falha em uma cópia não invalida as outras; o código de saída sinaliza no fim.
$falhouCopia = $false
foreach ($extra in ($Destino | Select-Object -Skip 1)) {
  try {
    New-Item -ItemType Directory -Path $extra -Force | Out-Null
    Copy-Item -Path $pasta -Destination (Join-Path $extra $nomePasta) -Recurse -Force
    Escrever-Log $extra "OK  cópia de $pasta"
  }
  catch {
    $falhouCopia = $true
    Write-Host "ERRO ao copiar para ${extra}: $($_.Exception.Message)"
    Escrever-Log $principal "ERRO  cópia para ${extra}: $($_.Exception.Message)"
  }
}

foreach ($d in $Destino) {
  if (-not (Test-Path $d)) { continue }
  Get-ChildItem $d -Directory -Filter 'backup-*' |
    Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$DiasRetencao) } |
    ForEach-Object {
      Remove-Item $_.FullName -Recurse -Force
      Escrever-Log $d "Removido backup antigo $($_.Name)"
    }
}

if ($falhouCopia) { exit 1 }
