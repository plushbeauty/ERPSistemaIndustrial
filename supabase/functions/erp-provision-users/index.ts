const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://erp-sistema-industrial.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      error: "ENDPOINT_RETIRED",
      message: "O provisionamento legado de usuários foi desativado. O ERP deve provisionar usuários por fluxo administrativo autenticado e sem credenciais embutidas no código.",
    }),
    {
      status: 410,
      headers: corsHeaders,
    },
  );
});
