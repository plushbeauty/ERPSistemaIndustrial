import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type FiscalConfig = {
  empresa_id: string;
  ambiente: string | null;
  provedor: string | null;
  regime_tributario: string | null;
  habilitado_nfe: boolean | null;
};
type ItemRow = {
  item_numero: number | null;
  codigo_produto: string | null;
  descricao_produto: string | null;
  ncm: string | null;
  cfop: string | null;
  origem: string | null;
  quantidade: number | null;
  valor_unitario: number | null;
  valor_total: number | null;
  valor_desconto: number | null;
  unidade: string | null;
  cst_csosn: string | null;
  icms_aliquota: number | null;
  ipi_aliquota: number | null;
  pis_aliquota: number | null;
  cofins_aliquota: number | null;
  pis_cst: string | null;
  cofins_cst: string | null;
  lote: string | null;
};
type TaxRule = {
  id: string;
  ncm: string | null;
  cfop: string | null;
  regime_empresa: string | null;
  uf_destino: string | null;
  icms_aliquota: number;
  cst_csosn_icms: string | null;
  ipi_aliquota: number;
  cst_ipi: string | null;
  pis_aliquota: number;
  pis_cst: string | null;
  cofins_aliquota: number;
  cofins_cst: string | null;
};

const BASE = "https://platform.notaas.com.br/api/v1";
const BUCKET = "documentos-erp";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function text(value: unknown): string { return String(value ?? "").trim(); }
function digits(value: unknown): string { return text(value).replace(/\D/g, ""); }
function normalizedDocument(value: unknown): string {
  const raw = text(value).toUpperCase();
  return /^[A-Z0-9./()\s-]+$/.test(raw) ? raw.replace(/[./()\s-]/g, "") : "";
}
function validCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const digit = (length: number): number => {
    const sum = value.slice(0, length).split("").reduce(
      (total, current, index) => total + Number(current) * (length + 1 - index),
      0,
    );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(value[9]) && digit(10) === Number(value[10]);
}
function cnpjCheckDigit(base: string): number {
  const weights = base.length === 12
    ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const sum = base.split("").reduce(
    (total, current, index) => total + (current.charCodeAt(0) - 48) * weights[index],
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}
function validCnpj(value: string): boolean {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(value) || /^([A-Z0-9])\1{13}$/.test(value)) return false;
  return cnpjCheckDigit(value.slice(0, 12)) === Number(value[12]) &&
    cnpjCheckDigit(value.slice(0, 13)) === Number(value[13]);
}
function validFiscalDocument(value: string): boolean {
  return value.length === 11 ? validCpf(value) : value.length === 14 && validCnpj(value);
}
function numberValue(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function xmlElement(xml: string, name: string): string {
  const match = xml.match(new RegExp(`<(?:(?:[\\w.-]+):)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${name}\\s*>`, "i"));
  return text(match?.[1]);
}
async function readJson(res: Response): Promise<JsonRecord> {
  const raw = await res.text();
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as JsonRecord : { raw };
  } catch { return { raw }; }
}
async function notasRequest(apiKey: string, path: string, init: RequestInit = {}): Promise<{status:number;body:JsonRecord}> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, ...(init.headers ?? {}) },
  });
  return { status: res.status, body: await readJson(res) };
}
function resolveApiKey(): string {
  const serverKey = text(Deno.env.get("NOTAAS_API_KEY"));
  if (serverKey.startsWith("ntaas_")) return serverKey;
  throw new Error("INTEGRAÇÃO EXTERNA PENDENTE: configure NOTAAS_API_KEY somente como segredo da Edge Function.");
}
async function saveDocument(admin: ReturnType<typeof createClient>, path: string, data: Uint8Array, contentType: string): Promise<void> {
  const result = await admin.storage.from(BUCKET).upload(path, data, { contentType, upsert: true });
  if (result.error) throw result.error;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método não permitido." }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRole) throw new Error("Segredos Supabase não configurados.");

    const authHeader = req.headers.get("Authorization") ?? "";
    const publishable = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(supabaseUrl, publishable, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceRole);
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return response({ error: "Não autenticado." }, 401);

    const body = await req.json() as JsonRecord;
    const documentoId = text(body.documento_id);
    if (!documentoId) return response({ error: "documento_id é obrigatório." }, 400);

    const permission = await userClient.rpc("erp_has_permission", {
      p_modulo: "fiscal",
      p_acao: "emitir",
    });
    if (permission.error) throw permission.error;
    if (permission.data !== true) return response({ error: "Usuário sem permissão fiscal para emitir NF-e." }, 403);

    const { data: perfil, error: perfilError } = await admin.from("erp_usuarios")
      .select("id,empresa_id,is_master,ativo,deleted_at").eq("auth_user_id", authData.user.id).maybeSingle();
    if (perfilError) throw perfilError;
    if (!perfil?.ativo || perfil.deleted_at) return response({ error: "Usuário ERP inativo." }, 403);

    const { data: doc, error: docError } = await admin.from("erp_documentos_fiscais").select("*").eq("id", documentoId).single();
    if (docError || !doc) return response({ error: "Documento fiscal não encontrado." }, 404);
    if (!perfil.is_master && perfil.empresa_id !== doc.empresa_id) return response({ error: "Acesso fora do tenant." }, 403);
    if (String(doc.modelo) !== "55") return response({ error: "Somente NF-e modelo 55 é aceita." }, 422);
    if (String(doc.tipo) !== "NF-e") {
      return response({ error: "Este integrador transmite somente NF-e de saída; documentos de entrada devem seguir o fluxo de importação e recebimento de XML." }, 422);
    }
    if (doc.status !== "Rascunho") return response({ error: "Somente rascunhos podem ser enviados; confira o status atual antes de tentar novamente." }, 409);
    if (!doc.numero || !doc.serie) return response({ error: "Série e número fiscal reservados são obrigatórios." }, 422);
    if (!["homologacao", "producao"].includes(text(doc.ambiente).toLowerCase())) {
      return response({ error: "Ambiente fiscal deve ser configurado explicitamente como homologação ou produção." }, 422);
    }

    const { data: config, error: configError } = await admin.from("erp_config_fiscal")
      .select("empresa_id,ambiente,provedor,regime_tributario,habilitado_nfe")
      .eq("empresa_id", doc.empresa_id).single() as {data:FiscalConfig|null;error:{message:string}|null};
    if (configError || !config) return response({ error: "Configuração fiscal não encontrada." }, 422);
    if (!config.habilitado_nfe) return response({ error: "NF-e não está habilitada para a empresa." }, 422);
    if (!config.regime_tributario) return response({ error: "CONFIGURAÇÃO FISCAL PENDENTE: informe o regime tributário do emitente na configuração fiscal." }, 422);
    const ambiente = text(config.ambiente).toLowerCase();
    if (!["homologacao", "producao"].includes(ambiente) || text(doc.ambiente).toLowerCase() !== ambiente) {
      return response({ error: "O ambiente do rascunho deve corresponder exatamente ao ambiente fiscal configurado para a empresa." }, 422);
    }
    if (text(config.provedor).toLowerCase() !== "notaas") {
      return response({ error: "INTEGRAÇÃO EXTERNA PENDENTE: o provedor fiscal configurado não corresponde ao adaptador Notaas disponível." }, 422);
    }
    const apiKey = resolveApiKey();

    const { data: itens, error: itensError } = await admin.from("erp_documentos_fiscais_itens")
      .select("item_numero,codigo_produto,descricao_produto,ncm,cfop,origem,quantidade,valor_unitario,valor_total,valor_desconto,unidade,cst_csosn,icms_aliquota,ipi_aliquota,pis_aliquota,cofins_aliquota,pis_cst,cofins_cst,lote")
      .eq("documento_id", documentoId).eq("empresa_id", doc.empresa_id).order("item_numero") as {data:ItemRow[]|null;error:{message:string}|null};
    if (itensError) throw itensError;
    if (!itens?.length) return response({ error: "A NF-e precisa de pelo menos um item." }, 422);

    const documento = normalizedDocument(doc.destinatario_documento);
    const isCpf = documento.length === 11;
    const isCnpj = documento.length === 14;
    const uf = text(doc.destinatario_uf).toUpperCase();
    const destinatarioNome = text(doc.destinatario_nome);
    const destinatarioEndereco = text(doc.destinatario_endereco);
    const destinatarioCidade = text(doc.destinatario_cidade);
    const destinatarioBairro = text(doc.destinatario_bairro);
    const destinatarioCep = digits(doc.destinatario_cep);
    if (!destinatarioNome || !validFiscalDocument(documento) || !destinatarioEndereco || !destinatarioBairro ||
        destinatarioCep.length !== 8 || !destinatarioCidade || !/^[A-Z]{2}$/.test(uf)) {
      return response({ error: "Destinatário sem CPF/CNPJ com dígitos verificadores válidos ou endereço fiscal completo. Confira documento, logradouro, bairro, CEP, município e UF." }, 422);
    }
    if (isCnpj && /[A-Z]/.test(documento)) {
      return response({ error: "INTEGRAÇÃO EXTERNA PENDENTE: o suporte do provedor Notaas a CNPJ alfanumérico ainda não foi confirmado." }, 422);
    }
    if (!text(doc.natureza_operacao) || !/^\d{4}$/.test(digits(doc.cfop)) ||
        !doc.data_emissao || !Number.isFinite(new Date(String(doc.data_emissao)).getTime()) ||
        doc.valor_total === null || doc.valor_total === undefined || !Number.isFinite(Number(doc.valor_total))) {
      return response({ error: "Dados de operação fiscal incompletos no rascunho." }, 422);
    }

    const { data: rules, error: rulesError } = await admin.from("erp_regras_fiscais")
      .select("id,ncm,cfop,regime_empresa,uf_destino,icms_aliquota,cst_csosn_icms,ipi_aliquota,cst_ipi,pis_aliquota,pis_cst,cofins_aliquota,cofins_cst")
      .eq("empresa_id", doc.empresa_id).eq("ativo", true).limit(2000) as {data:TaxRule[]|null;error:{message:string}|null};
    if (rulesError) throw rulesError;
    if (!rules?.length) return response({ error: "CONFIGURAÇÃO FISCAL PENDENTE: cadastre regras tributárias para os itens antes da transmissão." }, 422);

    const apiItems: JsonRecord[] = [];
    for (const item of itens) {
      const ncm = digits(item.ncm);
      const cfop = digits(item.cfop);
      const codigo = text(item.codigo_produto);
      const descricao = text(item.descricao_produto);
      const unidade = text(item.unidade);
      const origem = digits(item.origem);
      const quantity = Number(item.quantidade);
      const unitValue = Number(item.valor_unitario);
      const lineTotal = Number(item.valor_total);
      if (!codigo || !descricao || ncm.length !== 8 || cfop.length !== 4 ||
          !/^[0-8]$/.test(origem) || !unidade || !Number.isFinite(quantity) || quantity <= 0 ||
          !Number.isFinite(unitValue) || unitValue < 0 || !Number.isFinite(lineTotal) || lineTotal < 0) {
        return response({ error: `Item ${item.item_numero ?? ""} sem código, descrição, NCM, CFOP, origem ou valores válidos.` }, 422);
      }
      const candidates = rules.filter((rule) =>
        (!rule.ncm || digits(rule.ncm) === ncm) &&
        (!rule.cfop || digits(rule.cfop) === cfop) &&
        (!rule.regime_empresa || rule.regime_empresa.toUpperCase() === config.regime_tributario?.toUpperCase()) &&
        (!rule.uf_destino || rule.uf_destino.toUpperCase() === uf)
      );
      const specificity = candidates.map((rule) =>
        Number(Boolean(rule.ncm)) + Number(Boolean(rule.cfop)) + Number(Boolean(rule.regime_empresa)) + Number(Boolean(rule.uf_destino))
      );
      const best = Math.max(...specificity);
      const matched = candidates.filter((_, index) => specificity[index] === best);
      if (matched.length !== 1) {
        return response({ error: `CONFIGURAÇÃO FISCAL PENDENTE: não existe uma regra única para NCM ${ncm}, CFOP ${cfop} e UF ${uf}. Regras por regime tributário exigem parametrização do emitente.` }, 422);
      }
      const rule = matched[0];
      if (!text(rule.cst_csosn_icms) || !text(rule.cst_ipi) || !text(rule.pis_cst) || !text(rule.cofins_cst)) {
        return response({ error: `CONFIGURAÇÃO FISCAL INCOMPLETA: informe CST/CSOSN de ICMS, IPI, PIS e COFINS na regra para NCM ${ncm} e CFOP ${cfop}.` }, 422);
      }
      if ([rule.icms_aliquota, rule.ipi_aliquota, rule.pis_aliquota, rule.cofins_aliquota]
        .some((rate) => !Number.isFinite(Number(rate)) || Number(rate) < 0 || Number(rate) > 100)) {
        return response({ error: `CONFIGURAÇÃO FISCAL INVÁLIDA: uma ou mais alíquotas da regra para NCM ${ncm} e CFOP ${cfop} estão fora do intervalo aceito.` }, 422);
      }
      const value: JsonRecord = {
        codigo,
        descricao,
        ncm,
        cfop,
        origem,
        quantidade: quantity,
        valorUnitario: unitValue,
        valorTotal: lineTotal,
        valorDesconto: numberValue(item.valor_desconto),
        unidade,
        cstIpi: rule.cst_ipi,
        cstPis: rule.pis_cst,
        cstCofins: rule.cofins_cst,
        aliquotaIcms: numberValue(rule.icms_aliquota),
        aliquotaIpi: numberValue(rule.ipi_aliquota),
        aliquotaPis: numberValue(rule.pis_aliquota),
        aliquotaCofins: numberValue(rule.cofins_aliquota),
      };
      value[config.regime_tributario?.toUpperCase() === "SIMPLES_NACIONAL" ? "csosn" : "cst"] = rule.cst_csosn_icms;
      apiItems.push(value);
    }

    const payload: JsonRecord = {
      modelo: 55,
      naturezaOperacao: text(doc.natureza_operacao),
      dataEmissao: doc.data_emissao,
      dest: {
        ...(isCnpj ? { cnpj: documento } : { cpf: documento }),
        nome: destinatarioNome,
        ...(text(doc.destinatario_ie) ? { inscricaoEstadual: text(doc.destinatario_ie) } : {}),
        ...(text(doc.destinatario_email) ? { email: text(doc.destinatario_email) } : {}),
        endereco: {
          logradouro: destinatarioEndereco,
          bairro: destinatarioBairro,
          cep: destinatarioCep,
          cidade: destinatarioCidade,
          uf,
        },
      },
      items: apiItems,
      valorFrete: numberValue(doc.valor_frete),
    };

    const claim = await userClient.rpc("erp_iniciar_emissao_nfe", { p_documento_id: documentoId });
    if (claim.error || claim.data !== true) {
      return response({ error: claim.error?.message ?? "Não foi possível reservar o documento para transmissão." }, 409);
    }

    const emitted = await notasRequest(apiKey, "/nfe/emitir", { method: "POST", body: JSON.stringify(payload) });
    if (emitted.status !== 202) {
      const detail = text(emitted.body.message ?? emitted.body.error ?? emitted.body.xMotivo);
      const message = `O integrador respondeu HTTP ${emitted.status} sem confirmação fiscal verificável. O documento permanece em processamento; confirme a situação no integrador antes de qualquer reenvio.${detail ? ` Retorno: ${detail}` : ""}`;
      return response({ ok: false, status: "Processando", error: message, integrator_http_status: emitted.status }, 202);
    }

    const invoiceId = text(emitted.body.invoiceId ?? emitted.body.id);
    if (!invoiceId) {
      return response({ ok: false, status: "Processando", error: "O integrador aceitou a solicitação, mas não forneceu invoiceId. O documento permanece em processamento para evitar duplicar a emissão." }, 202);
    }

    const invoiceWrite = await admin.from("erp_notas_fiscais").upsert({
      empresa_id: doc.empresa_id, documento_id: documentoId, modelo:"55", serie:Number(doc.serie),
      numero:doc.numero, ambiente,
      status:"Processando", referencia_externa:invoiceId, focus_response:emitted.body,
      transmitted_at:new Date().toISOString(), updated_at:new Date().toISOString(),
    }, {onConflict:"documento_id"});
    if (invoiceWrite.error) throw invoiceWrite.error;

    let last: JsonRecord = emitted.body;
    for (const delay of [1000,2000,4000,8000]) {
      await new Promise((resolve)=>setTimeout(resolve,delay));
      const poll=await notasRequest(apiKey,"/nfe/invoices/"+encodeURIComponent(invoiceId)+"/status",{method:"GET"});
      last=poll.body;
      const current=text(last.status);
      if(current==="issued" || current==="error" || current==="cancelled") break;
    }

    const current=text(last.status);
    const chave=digits(last.chaveAcesso ?? last.chave_acesso);
    const protocolo=text(last.nProt ?? last.protocolo);
    const motivo=text(last.xMotivo ?? last.motivo ?? last.errorMessage);
    if(current==="issued") {
      const xmlRes=await fetch(BASE+"/nfe/invoices/"+encodeURIComponent(invoiceId)+"/xml",{headers:{"x-api-key":apiKey}});
      if (!xmlRes.ok || chave.length !== 44 || !protocolo) {
        const message = "O provedor informou emissão, mas não retornou chave, protocolo e XML; a NF-e permanece em processamento sem indicação de autorização.";
        const [noteUpdate, documentUpdate] = await Promise.all([
          admin.from("erp_notas_fiscais").update({status:"Processando",mensagem_sefaz:message,focus_response:last,updated_at:new Date().toISOString()}).eq("documento_id",documentoId),
          admin.from("erp_documentos_fiscais").update({status:"Processando",mensagem_retorno:message,updated_at:new Date().toISOString()}).eq("id",documentoId),
        ]);
        if (noteUpdate.error) throw noteUpdate.error;
        if (documentUpdate.error) throw documentUpdate.error;
        return response({ok:false,status:"Processando",error:message},202);
      }
      const xml = await xmlRes.text();
      const xmlKey = xmlElement(xml, "chNFe");
      const xmlProtocol = xmlElement(xml, "nProt");
      const xmlStatus = xmlElement(xml, "cStat");
      if (!xml.trim() || xmlKey !== chave || xmlProtocol !== protocolo || !["100", "150"].includes(xmlStatus)) {
        const message = "O XML retornado não contém protocolo de autorização compatível com a chave e o código cStat 100/150; status mantido em processamento.";
        const [noteUpdate, documentUpdate] = await Promise.all([
          admin.from("erp_notas_fiscais").update({status:"Processando",mensagem_sefaz:message,focus_response:last,updated_at:new Date().toISOString()}).eq("documento_id",documentoId),
          admin.from("erp_documentos_fiscais").update({status:"Processando",mensagem_retorno:message,updated_at:new Date().toISOString()}).eq("id",documentoId),
        ]);
        if (noteUpdate.error) throw noteUpdate.error;
        if (documentUpdate.error) throw documentUpdate.error;
        return response({ok:false,status:"Processando",error:message},202);
      }
      const xmlPath=doc.empresa_id+"/fiscal/"+documentoId+"/nfe-"+chave+".xml";
      await saveDocument(admin,xmlPath,new TextEncoder().encode(xml),"application/xml");
      let pdfPath:string|null=null;
      const pdfRes=await fetch(BASE+"/nfe/invoices/"+encodeURIComponent(invoiceId)+"/danfe",{headers:{"x-api-key":apiKey}});
      if(pdfRes.ok){pdfPath=doc.empresa_id+"/fiscal/"+documentoId+"/danfe-"+chave+".pdf";await saveDocument(admin,pdfPath,new Uint8Array(await pdfRes.arrayBuffer()),"application/pdf");}

      const authorizationTime = text(last.dhRecbto);
      const authorizationMessage = text(last.xMotivo) || xmlElement(xml, "xMotivo");
      const [noteUpdate, documentUpdate, audit] = await Promise.all([
        admin.from("erp_notas_fiscais").update({
          status:"Autorizada", chave_acesso:chave, protocolo_autorizacao:protocolo,
          mensagem_sefaz:authorizationMessage || null, xml_autorizado_path:xmlPath, danfe_pdf_path:pdfPath,
          authorized_at:authorizationTime || null, focus_response:last, updated_at:new Date().toISOString(),
        }).eq("documento_id",documentoId),
        admin.from("erp_documentos_fiscais").update({
          status:"Autorizada", ambiente,
          chave_acesso:chave, mensagem_retorno:authorizationMessage || "Protocolo de autorização comprovado no XML retornado pelo integrador.",
          xml_storage_path:xmlPath, pdf_storage_path:pdfPath, updated_at:new Date().toISOString(),
        }).eq("id",documentoId),
        admin.from("erp_logs_sistema").insert({
          empresa_id:doc.empresa_id,usuario_id:perfil.id,modulo:"Fiscal",acao:"NFE_AUTORIZADA",
          entidade:"erp_documentos_fiscais",entidade_id:documentoId,
          dados:{chave_acesso:chave,protocolo_autorizacao:protocolo,cStat:xmlStatus},
        }),
      ]);
      if (noteUpdate.error) throw noteUpdate.error;
      if (documentUpdate.error) throw documentUpdate.error;
      if (audit.error) throw audit.error;
      return response({ok:true,status:"Autorizada",invoiceId,chave_acesso:chave,protocolo_autorizacao:protocolo,xml_storage_path:xmlPath,pdf_storage_path:pdfPath,danfe_disponivel:Boolean(pdfPath)});
    }
    const processMessage = current === "error"
      ? "O integrador retornou falha sem confirmação SEFAZ verificável; documento mantido em processamento para reconciliação."
      : "Aguardando confirmação final do integrador fiscal.";
    const [noteUpdate, documentUpdate] = await Promise.all([
      admin.from("erp_notas_fiscais").update({status:"Processando",mensagem_sefaz:processMessage,focus_response:last,updated_at:new Date().toISOString()}).eq("documento_id",documentoId),
      admin.from("erp_documentos_fiscais").update({status:"Processando",mensagem_retorno:processMessage,updated_at:new Date().toISOString()}).eq("id",documentoId),
    ]);
    if (noteUpdate.error) throw noteUpdate.error;
    if (documentUpdate.error) throw documentUpdate.error;
    return response({ok:true,status:"Processando",invoiceId,error:current === "error" ? processMessage : undefined});
  } catch (error: unknown) {
    return response({ok:false,error:error instanceof Error ? error.message : "Falha na emissão NF-e."},500);
  }
});
