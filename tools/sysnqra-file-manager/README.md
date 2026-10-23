# SYSNQRA File Manager Industrial — agente local

O agente conecta o ERP às pastas autorizadas do PC do cliente ou a um compartilhamento de rede. A instalação fica vinculada a **uma única empresa SYSNQRA**; uma instância separada é necessária para cada empresa/tenant.

## Requisitos

- Windows 10/11 ou Windows Server e Node.js 20+.
- PowerShell executado como Administrador durante a instalação.
- Conta de serviço sem privilégios administrativos e com acesso apenas às pastas necessárias.
- Acesso HTTPS confiável ao endpoint do agente quando usado por outros computadores. Não exponha a porta 8970 diretamente à Internet.

## Instalar como serviço Windows

1. Baixe o pacote do repositório e abra a pasta `tools/sysnqra-file-manager`.
2. Execute PowerShell como Administrador nessa pasta e rode:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\install-windows.ps1
   ```

3. O instalador verifica Node.js, instala as dependências, registra o serviço automático `SYSNQRAFileManagerIndustrial`, gera token aleatório e restringe as ACLs do token, configuração e armazenamento.
4. Escolha a conta local para um PC individual. Para servidor que acessa UNC, informe uma conta dedicada de domínio com permissão de leitura/gravação apenas no compartilhamento necessário.
5. Copie o token mostrado ao final; ele é exibido para cadastro no ERP e não deve ser incluído em e-mail, chamados ou código-fonte.

O instalador mantém o agente em `127.0.0.1:8970`. Em servidor/rede, publique-o atrás de um proxy HTTPS confiável que encaminhe Authorization e o cabeçalho `X-SYSNQRA-Company-ID` para `127.0.0.1:8970`. Restrinja o proxy e o firewall à rede corporativa. Não altere o host do agente para `0.0.0.0` nem publique a porta 8970 diretamente.

## Configurar no ERP

1. Entre no SYSNQRA com um usuário ativo vinculado à empresa correta.
2. Abra **Configurações → Instalar Sistema · File Manager Industrial**.
3. Informe `http://127.0.0.1:8970` para PC local, ou a URL HTTPS do proxy no servidor.
4. Cole o token do instalador e selecione **Testar conexão**.
5. Escolha PC ou servidor/rede, informe a pasta principal e, no modo rede, o caminho UNC. Clique **Validar e criar pastas**.

A configuração do ERP fica disponível somente na aba/sessão atual do navegador. A instalação do agente grava a empresa vinculada localmente; ele recusa requisições com outro identificador de empresa. A tela também exige sessão Supabase, perfil ERP ativo, empresa corrente correspondente e permissão de leitura do módulo Vendas antes de buscar fotos de produtos. Nenhuma chave `service_role` é usada no navegador.

## Pastas padrão

O agente cria a estrutura solicitada em armazenamento local e, se configurada, na pasta de rede:

- `fotos` e `imagens`
- `desenhos-tecnicos`
- `documentos` e `documentos-gerais`
- `produtos`, `fichas-processo`, `moldes`, `pcp`, `qualidade`, `engenharia`, `compras`, `clientes` e `fornecedores`

O catálogo de Vendas tenta carregar a foto cadastrada em `erp_produtos.foto_url`; se estiver vazia ou falhar, procura arquivos de imagem com o código do produto em `produtos/`. A ficha do PCP procura desenho técnico pelo código do produto em `desenhos-tecnicos/`. Os cadastros e consultas continuam usando registros reais do Supabase.

## Testes locais do agente

No repositório, com Node.js 20+:

```powershell
npm run test:file-manager
```

ou

```powershell
cd tools/sysnqra-file-manager
npm test
```

## Endpoints

- `GET /health` — estado do agente; requer Bearer token.
- `POST /validate-paths` — valida e configura caminhos e cria pastas; vincula a instância ao tenant informado na primeira configuração.
- `GET /file?path=produtos/ABC123.jpg` — lê um arquivo da raiz local e tenta a raiz de rede como fallback.
- `POST /upload?folder=fotos&filename=arquivo.jpg` — grava arquivo na pasta principal.
- `GET /list?folder=desenhos-tecnicos` — lista uma pasta do armazenamento local.

## Limites operacionais

- O navegador não instala um serviço Windows por conta própria; o script PowerShell precisa ser executado pelo instalador/administrador do cliente.
- A integração de imagem fallback está conectada ao catálogo de Vendas e à ficha PCP. Outros cadastros precisam adotar o componente `IndustrialFileImage` para habilitar o mesmo fallback.
- Não foi aplicado nenhum schema/migration no Supabase remoto; a integração utiliza os contratos existentes e falha fechada quando não consegue confirmar sessão, empresa ou permissão.
- A instalação em servidor precisa de proxy HTTPS, revisão de firewall e teste na rede real do cliente antes de produção.
