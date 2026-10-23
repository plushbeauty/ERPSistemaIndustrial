# SYSNQRA File Manager Industrial — agente local

Este agente permite que o SYSNQRA ERP leia, liste e grave arquivos em pastas autorizadas do PC ou do servidor do cliente. O código fica em `tools/sysnqra-file-manager/sysnqra-agent.cjs`.

## Requisitos

- Windows 10/11 ou Windows Server com Node.js 20 ou superior.
- Uma conta Windows dedicada ao serviço, com permissão somente nas pastas necessárias.
- Token aleatório com pelo menos 32 caracteres.
- Para uso pela rede, HTTPS confiável na frente do agente (reverse proxy/VPN) e firewall restrito. Não exponha a porta 8970 diretamente à Internet.

## Instalação de teste no Windows

1. Crie `C:\\SYSNQRA\\Agent` e copie para lá `sysnqra-agent.cjs`.
2. Abra PowerShell como administrador apenas para instalar o serviço.
3. Gere um token forte e guarde-o no gerenciador de segredos da empresa. Exemplo para gerar (não reutilize um token publicado em documentação):

   ```powershell
   $token = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   $token
   ```

4. Defina a variável de ambiente `SYSNQRA_TOKEN` para a conta/serviço que executará o agente. Para um teste na sessão atual:

   ```powershell
   $env:SYSNQRA_TOKEN = $token
   node C:\\SYSNQRA\\Agent\\sysnqra-agent.cjs --host=127.0.0.1 --port=8970
   ```

5. Deixe o processo em execução e, na tela do ERP, informe `http://127.0.0.1:8970`, cole o mesmo token e selecione **Testar conexão**.
6. Escolha o diretório principal e selecione **Validar e criar pastas**. O agente grava a configuração em `sysnqra-agent-config.json` ao lado do arquivo de configuração definido na inicialização.

> O comando acima é somente para teste interativo. Para produção, instale como serviço do Windows (por exemplo, com NSSM), configure o token em ambiente protegido do serviço, use uma conta de serviço sem privilégios administrativos e configure reinicialização/monitoramento. Não coloque o token em scripts versionados.

## Servidor de rede

- Instale o agente no servidor que tem acesso ao compartilhamento.
- Configure a conta de serviço com permissões NTFS e de compartilhamento estritamente necessárias.
- Selecione o modo rede na tela do ERP e informe o caminho UNC, por exemplo `\\\\SERVIDOR\\SYSNQRA\\Arquivos`.
- Para permitir origem adicional do navegador, defina `SYSNQRA_CORS_ORIGINS` como uma lista separada por vírgulas de origens exatas. Não use `*`.
- Use HTTPS confiável para o endpoint do servidor. Não altere o host para `0.0.0.0` sem firewall, proxy seguro e revisão de rede.

## Endpoints

- `GET /health` — estado do agente (requer Bearer token).
- `POST /validate-paths` — valida/configura diretórios e cria a estrutura padrão.
- `GET /file?path=pcp/exemplo.pdf` — lê um arquivo do disco principal, com fallback para a rede configurada.
- `POST /upload?folder=pcp&filename=exemplo.pdf` — grava o corpo binário da requisição no disco principal.
- `GET /list?folder=pcp` — lista o conteúdo da pasta principal.

O agente é um serviço local. A tela do ERP não consegue instalar um serviço Windows silenciosamente pelo navegador. Antes de distribuir a clientes, o instalador de produção deve ser empacotado, assinado, testado em Windows limpo e documentado pelo time de implantação.
