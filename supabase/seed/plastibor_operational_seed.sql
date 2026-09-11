-- Seed operacional de homologação Plastibor.
-- Produz dados reais de banco para validação de telas, relatórios e indicadores.
-- Não contém credenciais nem usuários de autenticação.

insert into public.erp_empresas(razao_social,nome_fantasia,cnpj,email,ativo,plano,plano_status,codigo)
select 'PLASTIBOR COMERCIO E FERRAMENTARIA LTDA - ME','PLASTIBOR','39.580.235/0001-35','vanda@transforbater.com.br',true,'Profissional','teste','PLASTIBOR-2026'
where not exists(select 1 from public.erp_empresas where cnpj='39.580.235/0001-35');

insert into public.erp_setores(empresa_id,codigo,nome)
select e.id,v.codigo,v.nome
from public.erp_empresas e
cross join (values
('ADM','Administrativo'),('COM','Comercial / Vendas'),('COMPRAS','Compras'),('CQ','Controle de Qualidade'),('EST','Estoque / Almoxarifado'),('EXP','Expedição / Logística'),('FIN','Financeiro'),('FISCAL','Fiscal / Faturamento'),('MAN','Manutenção'),('PCP','PCP / Planejamento'),('PROD','Produção'),('RH','Recursos Humanos')
) v(codigo,nome)
where e.cnpj='39.580.235/0001-35'
and not exists(select 1 from public.erp_setores s where s.empresa_id=e.id and s.codigo=v.codigo);

insert into public.erp_produtos(empresa_id,codigo,nome,unidade,tipo,estoque_minimo,custo_medio,preco_venda)
select e.id,v.codigo,v.nome,v.unidade,v.tipo,v.minimo,v.custo,v.preco
from public.erp_empresas e
cross join (values
('INJ-ANEL-001','Anel de Vedação de Borracha NBR','UN','produto',200,2.40,5.90),
('INJ-ARR-001','Arruela de Borracha NBR','UN','produto',250,1.80,4.50),
('INJ-BUCHA-001','Bucha de Borracha 40x60x50','UN','produto',120,4.70,10.90),
('INJ-SUP-001','Suporte Plástico Industrial','UN','produto',100,6.20,14.90),
('INJ-TAM-001','Tampa Plástica Técnica','UN','produto',150,3.10,8.90),
('INJ-GUIA-001','Guia Lateral Plástico','UN','produto',80,5.40,12.50),
('INJ-COX-001','Coxim Industrial de Borracha','UN','produto',100,7.30,16.90),
('INJ-PINO-001','Pino Injetado Base','UN','produto',100,2.90,7.50),
('MP-BOR-NBR','Borracha NBR para Moldagem','KG','materia_prima',300,18.50,0),
('MP-EPDM','Composto EPDM','KG','materia_prima',250,22.80,0),
('MP-PP','Polipropileno PP','KG','materia_prima',500,9.70,0),
('MP-PA66','Poliamida PA66','KG','materia_prima',180,28.40,0),
('MP-MASTER','Masterbatch Preto','KG','materia_prima',80,31.20,0),
('MP-ADITIVO','Aditivo Desmoldante','KG','materia_prima',50,42.00,0)
) v(codigo,nome,unidade,tipo,minimo,custo,preco)
where e.cnpj='39.580.235/0001-35'
and not exists(select 1 from public.erp_produtos p where p.empresa_id=e.id and p.codigo=v.codigo);

-- Para homologação completa, execute também as migrações plastibor_operational_seed_data_v4 já aplicadas no projeto.
