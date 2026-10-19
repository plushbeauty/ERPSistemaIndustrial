/**
 * @DATA_REVISAO_APROVACAO: 2026-10-19
 * @DESENVOLVEDOR: FernandoSch
 * @NOME_SISTEMA: SYSNQRA ERP & SGQ INDUSTRIAL
 * @REVISAO: Análise assistida de imagem/laudo para Ishikawa 6M e 5 Porquês
 * @SEGURANCA: JWT obrigatório, usuário ativo, segredo OpenAI somente no servidor
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type Ishikawa6M = {
  MAO_DE_OBRA: string[];
  MATERIA_PRIMA: string[];
  METODO: string[];
  MAQUINA: string[];
  MEDICAO: string[];
  AMBIENTE: string[];
};
type FiveWhys = { p1: string; p2: string; p3: string; p4: string; p5: string };
type Analysis = { ishikawa_6m: Ishikawa6M; porques_analise: FiveWhys };

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ERP_ALLOWED_ORIGIN") || "https://erp-sistema-industrial.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const record = (value: unknown): JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : {};
const text = (value: unknown, max = 6000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const getOutputText = (value: unknown): string => {
  const root = record(value);
  if (typeof root.output_text === "string") return root.output_text;
  const output = Array.isArray(root.output) ? root.output : [];
  for (const entry of output) {
    for (const part of Array.isArray(record(entry).content) ? record(entry).content as unknown[] : []) {
      const item = record(part);
      if (item.type === "output_text" && typeof item.text === "string") return item.text;
    }
  }
  throw new Error("O provedor não retornou o JSON da análise.");
};
const validDataUrl = (value: string, allowed: RegExp, maxLength: number) =>
  value.length <= maxLength && allowed.test(value);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST para enviar a análise." }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "Autenticação obrigatória." }, 401);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      return json({ error: "Configuração de autenticação do Supabase incompleta." }, 500);
    }
    if (!openAiKey) return json({ error: "Provedor de IA não configurado neste ambiente." }, 503);

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Sessão inválida ou expirada." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile, error: profileError } = await admin
      .from("erp_usuarios")
      .select("id,empresa_id,ativo,auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Falha ao validar perfil industrial:", profileError.message);
      return json({ error: "Não foi possível validar o perfil industrial." }, 500);
    }
    if (!profile?.ativo || !profile.empresa_id) {
      return json({ error: "Usuário industrial ativo e vinculado a uma empresa é obrigatório." }, 403);
    }

    const body = record(await req.json());
    const category = text(body.category, 120);
    const description = text(body.description, 6000);
    const imageBase64 = text(body.image_base64, 8_500_000);
    const fileBase64 = text(body.file_base64, 12_000_000);
    const fileName = text(body.file_name, 180) || "laudo.pdf";
    const mimeType = text(body.mime_type, 80).toLowerCase();

    const imageOk = !imageBase64 || validDataUrl(imageBase64, /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\r\n]+$/i, 8_500_000);
    const pdfOk = !fileBase64 || (mimeType === "application/pdf" &&
      validDataUrl(fileBase64, /^data:application\/pdf;base64,[a-z0-9+/=\r\n]+$/i, 12_000_000));
    if (!imageOk || !pdfOk) return json({ error: "Arquivo inválido. Envie PNG/JPG/WEBP ou PDF dentro do limite permitido." }, 400);
    if (!description && !imageBase64 && !fileBase64) {
      return json({ error: "Informe a descrição do desvio, uma imagem ou um laudo PDF." }, 400);
    }
    if (imageBase64 && fileBase64) return json({ error: "Envie uma imagem ou um PDF por solicitação, não ambos." }, 400);

    const instructions = `Você é um especialista de engenharia de qualidade do SYSNQRA ERP & SGQ INDUSTRIAL. Analise apenas evidências fornecidas; não invente medições, lotes, máquinas, causas ou fatos. Separe hipóteses de fatos comprovados, use linguagem técnica em português e evite atribuir culpa sem evidência. Gere até 4 causas concisas por categoria, podendo deixar listas vazias quando não houver evidência. Os cinco porquês devem formar uma cadeia causal coerente; use "Hipótese a validar" quando faltarem dados. Retorne somente JSON com este formato: {"ishikawa_6m":{"MAO_DE_OBRA":[],"MATERIA_PRIMA":[],"METODO":[],"MAQUINA":[],"MEDICAO":[],"AMBIENTE":[]},"porques_analise":{"p1":"","p2":"","p3":"","p4":"","p5":""}}.`;
    const content: JsonRecord[] = [{
      type: "input_text",
      text: `Categoria/origem informada: ${category || "não informada"}\nDescrição do desvio: ${description || "não informada"}\n\nAnalise o conteúdo anexado e proponha Ishikawa 6M e 5 Porquês. Não considere exemplos genéricos como fatos desta ocorrência.`,
    }];
    if (imageBase64) content.push({ type: "input_image", image_url: imageBase64 });
    if (fileBase64) content.push({
      type: "input_file",
      filename: fileName.toLowerCase().endsWith(".pdf") ? fileName : "laudo.pdf",
      file_data: fileBase64,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-5.6-luna",
        temperature: 0.1,
        max_output_tokens: 1800,
        text: { format: { type: "json_object" } },
        input: [
          { role: "system", content: [{ type: "input_text", text: instructions }] },
          { role: "user", content },
        ],
      }),
    });
    if (!response.ok) {
      const providerStatus = response.status;
      console.error("Falha no provedor de IA:", providerStatus, (await response.text()).slice(0, 1200));
      return json({ error: "O serviço de análise visual está indisponível. Tente novamente mais tarde." }, 502);
    }

    const responseBody: unknown = await response.json();
    let parsed: unknown;
    try { parsed = JSON.parse(getOutputText(responseBody)); }
    catch (error) {
      console.error("Resposta estruturada inválida:", error instanceof Error ? error.message : "JSON inválido");
      return json({ error: "A IA não retornou uma análise estruturada válida." }, 502);
    }
    const source = record(parsed);
    const rawIshikawa = record(source.ishikawa_6m);
    const rawWhys = record(source.porques_analise);
    const categories = ["MAO_DE_OBRA", "MATERIA_PRIMA", "METODO", "MAQUINA", "MEDICAO", "AMBIENTE"] as const;
    const ishikawa = Object.fromEntries(categories.map((key) => [
      key,
      Array.isArray(rawIshikawa[key]) ? (rawIshikawa[key] as unknown[]).filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 4) : [],
    ])) as Ishikawa6M;
    const whys: FiveWhys = {
      p1: text(rawWhys.p1, 1200),
      p2: text(rawWhys.p2, 1200),
      p3: text(rawWhys.p3, 1200),
      p4: text(rawWhys.p4, 1200),
      p5: text(rawWhys.p5, 1200),
    };
    const analysis: Analysis = { ishikawa_6m: ishikawa, porques_analise: whys };
    return json({ parameters: analysis, ...analysis, empresa_validada: true });
  } catch (error) {
    console.error("Falha no processamento de laudo:", error instanceof Error ? error.message : "erro desconhecido");
    return json({ error: "Falha ao processar a solicitação de análise." }, 500);
  }
});
