import { createClient } from 'npm:@supabase/supabase-js@2'

type Alert = {
  treinamento_id: string
  empresa_id: string
  nome_treinamento: string
  data_validade: string
  funcionario_nome: string
  funcionario_cargo: string | null
  setor_industrial: string | null
}
const env = (key: string) => Deno.env.get(key) ?? ''
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] ?? char))

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405)
  const cronSecret = env('RH_ALERT_CRON_SECRET')
  if (!cronSecret || request.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return json({ erro: 'Não autorizado.' }, 401)
  }
  const supabaseUrl = env('SUPABASE_URL')
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = env('RESEND_API_KEY')
  const recipients = env('RH_ALERT_EMAIL_TO').split(',').map(value => value.trim()).filter(Boolean)
  const from = env('RH_ALERT_EMAIL_FROM')
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !from || recipients.length === 0) {
    return json({ erro: 'Configuração ausente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RH_ALERT_EMAIL_FROM ou RH_ALERT_EMAIL_TO.' }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase.from('vw_treinamentos_criticos_30_dias').select('*')
  if (error) return json({ erro: 'Falha ao consultar treinamentos críticos.', detalhe: error.message }, 500)
  const alerts = (data ?? []) as Alert[]
  let enviados = 0
  let ignorados = 0
  const falhas: string[] = []

  for (const alert of alerts) {
    const { data: existing, error: lookupError } = await supabase.from('log_alertas_treinamentos')
      .select('id').eq('empresa_id', alert.empresa_id).eq('treinamento_id', alert.treinamento_id)
      .eq('tipo_alerta', '30_DIAS').eq('data_validade', alert.data_validade).maybeSingle()
    if (lookupError) { falhas.push(`${alert.treinamento_id}: consulta do log falhou`); continue }
    if (existing) { ignorados++; continue }

    const employee = escapeHtml(alert.funcionario_nome)
    const course = escapeHtml(alert.nome_treinamento)
    const role = escapeHtml(alert.funcionario_cargo)
    const sector = escapeHtml(alert.setor_industrial)
    const date = new Date(`${alert.data_validade}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    const html = `<div style="font-family:Arial,sans-serif;color:#0f172a;padding:24px"><h2 style="color:#b45309">Alerta SYSNQRA — treinamento vence em 30 dias</h2><table style="border-collapse:collapse;width:100%"><tr><td><b>Colaborador</b></td><td>${employee}</td></tr><tr><td><b>Cargo / setor</b></td><td>${role} / ${sector}</td></tr><tr><td><b>Treinamento</b></td><td>${course}</td></tr><tr><td><b>Validade</b></td><td>${date}</td></tr></table><p>Agende a reciclagem regulamentar antes do vencimento.</p></div>`
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({
        from, to: recipients,
        subject: `SYSNQRA: treinamento ${alert.nome_treinamento} vence em 30 dias`,
        html,
      }),
    })
    if (!emailResponse.ok) {
      falhas.push(`${alert.treinamento_id}: provedor de e-mail retornou HTTP ${emailResponse.status}`)
      continue
    }
    const { error: logError } = await supabase.from('log_alertas_treinamentos').insert({
      empresa_id: alert.empresa_id, treinamento_id: alert.treinamento_id,
      tipo_alerta: '30_DIAS', data_validade: alert.data_validade,
    })
    if (logError) {
      // Do not claim this alert is deduplicated if persistence failed.
      falhas.push(`${alert.treinamento_id}: e-mail enviado, mas o log falhou; verifique antes de reenviar`)
      continue
    }
    enviados++
  }
  return json({ sucesso: falhas.length === 0, encontrados: alerts.length, enviados, ignorados, falhas }, falhas.length ? 207 : 200)
})
