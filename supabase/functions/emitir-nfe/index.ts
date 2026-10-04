/**
 * =========================================================================
 * REVISÃO DE ENGENHARIA DE SOFTWARE INDUSTRIAL
 * Data/Hora: 24/09/2026 - 12:00 BRT
 * Desenvolvedor: Homologado por Fernando
 * ID da Revisão: REV-006
 * Alterações: Integração fiscal real da NF-e com a API Notaas, autenticação server-side, polling do invoiceId e persistência do retorno fiscal no Supabase.
 * Status do Build Local: Passou com Sucesso (GREEN)
 * =========================================================================
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type FiscalConfig = {
  empresa_id: string;
  ambiente: string | null;
  provedor: string | null;
  api_token_ciphertext: string | null;
  token_configurado: boolean | null;
  habilitado_nfe: boolean | null;
};
type ItemRow = {
  item_numero: number | null;
  codigo_produto: string | null;
  descricao_produto: string | null;
  ncm: string | null;
  cfop: string | null;
  quantidade: number | null;
  valor_unitario: number | null;
  valor_total: number | null;
  unidade: string | null;
  cst_csosn: string | null;
  icms_aliquota: number | null;
  pis_aliquota: number | null;
  cofins_aliquota: number | null;
  pis_cst: string | null;
  cofins_cst: string | null;
  lote: string | null;
};
type ClientRow = {
  nome: string | null;
  documento: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
};

const BASE = "https://platform.notaas.com.br/api/v1";
const BUCKET = "erp-documentos";
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
function numberValue(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function splitAddress(raw: string | null): { logradouro: string; numero: string; bairro: string } {
  const value = text(raw);
  const match = value.match(/^(.*?)(?:,\s*(\d+[A-Za-z0-9-]*))?(?:\s*-\s*(.*))?$/);
  return {
    logradouro: text(match?.[1]) || "Não informado",
    numero: text(match?.[2]) || "SN",
    bairro: text(match?.[3]) || "Não informado",
  };
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
async function resolveApiKey(config: FiscalConfig): Promise<string> {
  const serverKey = text(Deno.env.get("NOTAAS_API_KEY"));
  if (serverKey.startsWith("ntaas_")) return serverKey;
  const stored = text(config.api_token_ciphertext);
  if (stored.startsWith("ntaas_")) return stored;
  throw new Error("api_token_ciphertext está protegido e o mecanismo de descriptografia não está configurado. Configure NOTAAS_API_KEY como segredo da Edge Function.");
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

    const { data: perfil, error: perfilError } = await admin.from("erp_usuarios")
      .select("empresa_id,is_master,ativo,deleted_at").eq("auth_user_id", authData.user.id).maybeSingle();
    if (perfilError) throw perfilError;
    if (!perfil?.ativo || perfil.deleted_at) return response({ error: "Usuário ERP inativo." }, 403);

    const { data: doc, error: docError } = await admin.from("erp_documentos_fiscais").select("*").eq("id", documentoId).single();
    if (docError || !doc) return response({ error: "Documento fiscal não encontrado." }, 404);
    if (perfil.empresa_id && perfil.empresa_id !== doc.empresa_id) return response({ error: "Acesso fora do tenant." }, 403);
    if (String(doc.modelo) !== "55") return response({ error: "Somente NF-e modelo 55 é aceita." }, 422);

    const { data: config, error: configError } = await admin.from("erp_config_fiscal")
      .select("empresa_id,ambiente,provedor,api_token_ciphertext,token_configurado,habilitado_nfe")
      .eq("empresa_id", doc.empresa_id).single() as {data:FiscalConfig|null;error:{message:string}|null};
    if (configError || !config) return response({ error: "Configuração fiscal não encontrada." }, 422);
    if (!config.habilitado_nfe) return response({ error: "NF-e não está habilitada para a empresa." }, 422);
    const apiKey = await resolveApiKey(config);

    const { data: itens, error: itensError } = await admin.from("erp_documentos_fiscais_itens")
      .select("item_numero,codigo_produto,descricao_produto,ncm,cfop,quantidade,valor_unitario,valor_total,unidade,cst_csosn,icms_aliquota,pis_aliquota,cofins_aliquota,pis_cst,cofins_cst,lote")
      .eq("documento_id", documentoId).eq("empresa_id", doc.empresa_id).order("item_numero") as {data:ItemRow[]|null;error:{message:string}|null};
    if (itensError) throw itensError;
    if (!itens?.length) return response({ error: "A NF-e precisa de pelo menos um item." }, 422);

    const documento = digits(doc.destinatario_documento);
    const { data: cliente } = await admin.from("erp_clientes")
      .select("nome,documento,email,endereco,cidade,estado").eq("empresa_id", doc.empresa_id)
      .eq("documento", documento).maybeSingle() as {data:ClientRow|null};
    const endereco = splitAddress(cliente?.endereco ?? null);
    const uf = text(cliente?.estado);
    if (!cliente?.nome || !documento || !uf || !cliente?.cidade || !cliente?.endereco) {
      return response({ error: "Destinatário sem endereço fiscal completo. Cadastre endereço, cidade, UF e documento antes da emissão." }, 422);
    }

    const apiItems: JsonRecord[] = itens.map((item) => {
      const value: JsonRecord = {
        codigo: text(item.codigo_produto) || "PRD001",
        descricao: text(item.descricao_produto) || "Produto",
        ncm: digits(item.ncm).slice(0, 8),
        cfop: digits(item.cfop).slice(0, 4),
        quantidade: numberValue(item.quantidade),
        valorUnitario: numberValue(item.valor_unitario),
        valorTotal: numberValue(item.valor_total),
        unidade: text(item.unidade) || "UN",
      };
      const tax = text(item.cst_csosn);
      if (tax) { if (tax.length <= 2) value.cst = tax; else value.csosn = tax; }
      if (item.icms_aliquota !== null) value.aliquotaIcms = numberValue(item.icms_aliquota);
      if (item.pis_cst) value.cstPis = text(item.pis_cst);
      if (item.cofins_cst) value.cstCofins = text(item.cofins_cst);
      if (item.pis_aliquota !== null) value.aliquotaPis = numberValue(item.pis_aliquota);
      if (item.cofins_aliquota !== null) value.aliquotaCofins = numberValue(item.cofins_aliquota);
      return value;
    });

    const total = numberValue(doc.valor_total ?? doc.valor_liquido);
    const payload: JsonRecord = {
      modelo: 55,
      naturezaOperacao: text(doc.natureza_operacao) || "Venda de mercadoria",
      dataEmissao: doc.data_emissao ?? new Date().toISOString(),
      dest: {
        ...(documento.length === 14 ? { cnpj: documento } : { cpf: documento }),
        nome: text(cliente.nome),
        ...(cliente.email ? { email: text(cliente.email) } : {}),
        endereco: { logradouro: endereco.logradouro, numero: endereco.numero, bairro: endereco.bairro, cidade: text(cliente.cidade), uf },
      },
      items: apiItems,
      pagamentos: [{ tipoPagamento: "99", valor: total, descricaoPagamento: "Outros" }],
      valorFrete: numberValue(doc.valor_frete),
      presencaComprador: 1,
    };

    await admin.from("erp_documentos_fiscais").update({
      status: "Processando",
      ambiente: config.ambiente === "homologacao" ? "homologacao" : "producao",
      mensagem_retorno: "NF-e enviada à Notaas para processamento assíncrono.",
      updated_at: new Date().toISOString(),
    }).eq("id", documentoId);

    const emitted = await notasRequest(apiKey, "/nfe/emitir", { method: "POST", body: JSON.stringify(payload) });
    if (emitted.status !== 202) {
      const message = text(emitted.body.message ?? emitted.body.error ?? emitted.body.xMotivo ?? "Notaas recusou a emissão.");
      await admin.from("erp_documentos_fiscais").update({ status: "Rejeitada", mensagem_retorno: message, updated_at: new Date().toISOString() }).eq("id", documentoId);
      return response({ ok:false, error:message, status:emitted.status, provider:emitted.body }, emitted.status >= 400 ? emitted.status : 422);
    }

    const invoiceId = text(emitted.body.invoiceId ?? emitted.body.id);
    if (!invoiceId) throw new Error("Notaas respondeu 202 sem invoiceId.");

    await admin.from("erp_notas_fiscais").upsert({
      empresa_id: doc.empresa_id, documento_id: documentoId, modelo:"55", serie:Number(doc.serie ?? 1),
      numero:doc.numero ?? null, ambiente:config.ambiente === "homologacao" ? "homologacao" : "producao",
      status:"Processando", referencia_externa:invoiceId, focus_response:emitted.body,
      transmitted_at:new Date().toISOString(), updated_at:new Date().toISOString(),
    }, {onConflict:"documento_id"});

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
      let xmlPath:string|null=null, pdfPath:string|null=null;
      const xmlRes=await fetch(BASE+"/nfe/invoices/"+encodeURIComponent(invoiceId)+"/xml",{headers:{"x-api-key":apiKey}});
      if(xmlRes.ok){xmlPath="fiscal/"+doc.empresa_id+"/"+documentoId+"/nfe-"+(chave||invoiceId)+".xml";await saveDocument(admin,xmlPath,new Uint8Array(await xmlRes.arrayBuffer()),"application/xml");}
      const pdfRes=await fetch(BASE+"/nfe/invoices/"+encodeURIComponent(invoiceId)+"/danfe",{headers:{"x-api-key":apiKey}});
      if(pdfRes.ok){pdfPath="fiscal/"+doc.empresa_id+"/"+documentoId+"/danfe-"+(chave||invoiceId)+".pdf";await saveDocument(admin,pdfPath,new Uint8Array(await pdfRes.arrayBuffer()),"application/pdf");}

      await admin.from("erp_notas_fiscais").update({
        status:"Autorizada", chave_acesso:chave||null, protocolo_autorizacao:protocolo||null,
        mensagem_sefaz:motivo||"Autorizado o uso da NF-e.", xml_autorizado_path:xmlPath, danfe_pdf_path:pdfPath,
        authorized_at:last.dhRecbto ?? new Date().toISOString(), focus_response:last, updated_at:new Date().toISOString(),
      }).eq("documento_id",documentoId);
      await admin.from("erp_documentos_fiscais").update({
        status:"Autorizada", ambiente:config.ambiente === "homologacao" ? "homologacao" : "producao",
        chave_acesso:chave||null, mensagem_retorno:motivo||"Autorizado o uso da NF-e.",
        xml_storage_path:xmlPath, pdf_storage_path:pdfPath, updated_at:new Date().toISOString(),
      }).eq("id",documentoId);
      return response({ok:true,status:"Autorizada",invoiceId,chave_acesso:chave,protocolo_autorizacao:protocolo,xml_storage_path:xmlPath,pdf_storage_path:pdfPath,provider:last});
    }
    if(current==="error") {
      await admin.from("erp_notas_fiscais").update({status:"Rejeitada",mensagem_sefaz:motivo||"Rejeição retornada pela Notaas/SEFAZ.",focus_response:last,updated_at:new Date().toISOString()}).eq("documento_id",documentoId);
      await admin.from("erp_documentos_fiscais").update({status:"Rejeitada",mensagem_retorno:motivo||"Rejeição retornada pela Notaas/SEFAZ.",updated_at:new Date().toISOString()}).eq("id",documentoId);
      return response({ok:false,status:"Rejeitada",invoiceId,error:motivo,provider:last},422);
    }
    await admin.from("erp_notas_fiscais").update({status:"Processando",focus_response:last,updated_at:new Date().toISOString()}).eq("documento_id",documentoId);
    return response({ok:true,status:"Processando",invoiceId,provider:last});
  } catch (error: unknown) {
    return response({ok:false,error:error instanceof Error ? error.message : "Falha na emissão NF-e."},500);
  }
});
