# SYSNQRA File Manager Industrial — instalação Windows
# Executar em PowerShell elevado, a partir da pasta deste pacote.
$ErrorActionPreference = 'Stop'
$serviceName = 'SYSNQRAFileManagerIndustrial'
$installRoot = Join-Path $env:ProgramData 'SYSNQRA\FileManager'
$storageRoot = 'C:\SYSNQRA\Arquivos'
$tokenFile = Join-Path $installRoot 'agent.token'
$configFile = Join-Path $installRoot 'sysnqra-agent-config.json'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Abra o PowerShell como Administrador para instalar o serviço.'
}
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js 20+ não encontrado. Instale Node.js LTS e execute novamente.' }
$nodeMajor = [int]((& node -p "process.versions.node.split('.')[0]").Trim())
if ($nodeMajor -lt 20) { throw 'O agente requer Node.js 20 ou superior.' }

New-Item -ItemType Directory -Force -Path $installRoot, $dataRoot, $storageRoot | Out-Null
Copy-Item (Join-Path $PSScriptRoot 'sysnqra-agent.cjs') $installRoot -Force
Copy-Item (Join-Path $PSScriptRoot 'install-service.cjs') $installRoot -Force
Copy-Item (Join-Path $PSScriptRoot 'package.json') $installRoot -Force

Push-Location $installRoot
try { & npm install --omit=dev --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar as dependências do serviço.' } }
finally { Pop-Location }

$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$token = [Convert]::ToHexString($bytes)
[IO.File]::WriteAllText($tokenFile, $token, [Text.Encoding]::ASCII)

Write-Host ''
Write-Host 'Escolha a conta do serviço:'
Write-Host '  1 - Serviço local (PC individual)'
Write-Host '  2 - Conta de domínio/servidor com acesso ao compartilhamento de rede'
$mode = Read-Host 'Digite 1 ou 2'
if ($mode -eq '2') {
  $serviceAccount = Read-Host 'Conta de serviço (ex.: DOMINIO\svc_sysnqra)'
  $securePassword = Read-Host 'Senha da conta de serviço' -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try { $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
} else {
  $serviceAccount = 'NT AUTHORITY\LocalService'
  $plainPassword = ''
}

$env:SYSNQRA_TOKEN_FILE = $tokenFile
$env:SYSNQRA_HOST = '127.0.0.1'
$env:SYSNQRA_PORT = '8970'
$env:SYSNQRA_PRIMARY_PATH = $storageRoot
$env:SYSNQRA_CONFIG = $configFile
$env:SYSNQRA_CORS_ORIGINS = 'https://erp-sistema-industrial.vercel.app'
Push-Location $installRoot
try {
  & node (Join-Path $installRoot 'install-service.cjs')
  if ($LASTEXITCODE -ne 0) { throw 'A instalação do wrapper do serviço falhou. Se o serviço já existir, remova-o com suporte de TI antes de repetir.' }
} finally { Pop-Location }

# Aguarda a criação do serviço pelo wrapper antes de configurar conta e ACLs.
$deadline = (Get-Date).AddSeconds(30)
while (-not (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
if (-not (Get-Service -Name $serviceName -ErrorAction SilentlyContinue)) { throw 'O serviço não apareceu no Windows Services. Consulte o log do instalador.' }

if ($mode -eq '2') {
  & sc.exe config $serviceName start= auto obj= $serviceAccount password= $plainPassword | Out-Null
} else {
  & sc.exe config $serviceName start= auto obj= $serviceAccount | Out-Null
}
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível configurar a conta de execução do serviço.' }

# O serviço lê o token de um arquivo protegido, não de um script versionado.
& icacls.exe $installRoot /inheritance:r /grant:r 'SYSTEM:(OI)(CI)F' 'BUILTIN\Administrators:(OI)(CI)F' "$($serviceAccount):(OI)(CI)RX" | Out-Null
& icacls.exe $dataRoot /inheritance:r /grant:r 'SYSTEM:(OI)(CI)F' 'BUILTIN\\Administrators:(OI)(CI)F' "$($serviceAccount):(OI)(CI)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível proteger a configuração persistente do agente.' }
& icacls.exe $storageRoot /grant:r "$($serviceAccount):(OI)(CI)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível aplicar as permissões mínimas ao armazenamento.' }

try { Start-Service -Name $serviceName } catch { throw "Serviço instalado, mas não iniciou: $($_.Exception.Message)" }
Write-Host ''
Write-Host 'SERVIÇO INSTALADO E INICIADO.'
Write-Host "Armazenamento local: $storageRoot"
Write-Host "Token para colar na tela Configurações > Instalar Sistema (copie agora): $token"
Write-Host 'O token também fica no arquivo protegido do serviço. Não o envie por e-mail nem o inclua em chamados.'
Write-Host 'Depois, entre no ERP com a empresa correta, cole o token e clique em Testar conexão.'
