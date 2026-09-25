# OpenMES → SGQ ERP Industrial

## Diretriz executiva
O OpenMES será a referência operacional do núcleo MES/PCP deste ERP. A implementação usa padrões e comportamentos observados no projeto aberto, sem copiar arquivos AGPL para este repositório.

## Padrões incorporados
- Planner mensal, semanal e diário.
- Backlog de OPs não programadas.
- Máquina/linha como eixo principal.
- OP como unidade de programação.
- Conflitos de máquina e molde.
- Manutenção dentro do planejamento.
- Status distintos para produção, setup, parada, manutenção e risco.
- Atualização operacional LIVE.
- PWA e operação em tablet.
- Rastreabilidade/auditoria das alterações.
- Dashboard operacional com KPIs e gráficos.
- Qualidade ligada à OP/lote/processo.

## Melhorias próprias
- Supabase/PostgreSQL + RLS multiempresa.
- Auth real.
- Engenharia/Ficha de Processo/BOM/Roteiro.
- MRP e compras.
- Estoque/almoxarifado.
- Comercial/pedidos.
- Qualidade/FMEA/NC/RPNC/CAPA.
- Fiscal/NF-e.
- RH e usuários.
- Integrações de chão de fábrica quando infraestrutura real estiver disponível.

## Direção visual
Industrial Blue: azul petróleo para navegação, azul de ação para interação, superfícies claras, tipografia compacta e cores semânticas para estados de fábrica.

## Licenciamento
O core do OpenMES é AGPL-3.0. Por isso, este ERP adota arquitetura, UX e padrões funcionais como referência e não incorpora código AGPL diretamente.