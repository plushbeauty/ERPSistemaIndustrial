/**
 * Repositório de persistência da NF-e.
 *
 * Usa somente a RPC de rascunho e a tabela já referenciadas pelo módulo fiscal.
 * A RPC valida autenticação, empresa e estado do documento no banco. Este
 * arquivo não cria schema nem concede permissões e não transmite documentos.
 */

import { supabase } from '../supabaseClient';
import type {
  NFeEnvironment,
  NFeRepositoryResult,
  NFeStoredDocument,
} from './nfe-types';

interface NFeDocumentRow {
  id: string;
  empresa_id: string;
  modelo: string | null;
  tipo: string | null;
  ambiente: string | null;
  serie: number | null;
  numero: number | null;
  status: string | null;
  data_emissao: string | null;
  valor_total: number | string | null;
  chave_acesso: string | null;
  protocolo: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NFeDraftPersistenceInput {
  documentId: string | null;
  document: Record<string, unknown> & {
    empresa_id: string;
    modelo: '55';
    ambiente: NFeEnvironment;
    status: 'Rascunho';
  };
  items: ReadonlyArray<Record<string, unknown>>;
}

export interface NFeDocumentQuery {
  companyId: string;
  environment?: NFeEnvironment;
  status?: string;
  limit?: number;
}

function normalizeError(error: unknown): { code: string; message: string } {
  if (typeof error === 'object' && error !== null) {
    const record = error as { code?: unknown; message?: unknown };
    return {
      code: typeof record.code === 'string' ? record.code : 'NFE_REPOSITORY_ERROR',
      message: typeof record.message === 'string' ? record.message : 'Falha ao acessar os dados fiscais.',
    };
  }

  return {
    code: 'NFE_REPOSITORY_ERROR',
    message: typeof error === 'string' ? error : 'Falha ao acessar os dados fiscais.',
  };
}

function mapEnvironment(value: string | null): NFeEnvironment {
  switch (value?.toLowerCase()) {
    case 'producao':
    case 'produção':
      return 'producao';
    case 'homologacao':
    case 'homologação':
      return 'homologacao';
    default:
      throw new Error(`Ambiente fiscal não reconhecido: ${value ?? '(nulo)'}.`);
  }
}

function mapDirection(value: string | null): 'entrada' | 'saida' {
  switch (value?.toLowerCase()) {
    case 'entrada':
      return 'entrada';
    case 'saida':
    case 'saída':
      return 'saida';
    default:
      throw new Error(`Direção fiscal não reconhecida: ${value ?? '(nulo)'}.`);
  }
}

function mapDocument(row: NFeDocumentRow): NFeStoredDocument {
  return {
    id: row.id,
    companyId: row.empresa_id,
    environment: mapEnvironment(row.ambiente),
    direction: mapDirection(row.tipo),
    status: mapStatus(row.status),
    accessKey: row.chave_acesso,
    series: String(row.serie ?? ''),
    number: row.numero === null ? null : String(row.numero),
    protocol: row.protocolo,
    issueDate: row.data_emissao ?? '',
    invoiceAmount: String(row.valor_total ?? '0'),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

function mapStatus(value: string | null): NFeStoredDocument['status'] {
  switch (value?.toLowerCase()) {
    case 'rascunho':
      return 'rascunho';
    case 'processando':
    case 'transmitindo':
      return 'transmitindo';
    case 'autorizada':
    case 'autorizado':
      return 'autorizada';
    case 'rejeitada':
    case 'rejeitado':
      return 'rejeitada';
    case 'denegada':
    case 'denegado':
      return 'denegada';
    case 'cancelamento pendente':
    case 'cancelamento_pendente':
      return 'cancelamento_pendente';
    case 'cancelada':
    case 'cancelado':
      return 'cancelada';
    case 'inutilizada':
      return 'inutilizada';
    case 'contingencia':
    case 'contingência':
      return 'contingencia';
    case 'validando':
      return 'validando';
    case 'pendente_transmissao':
      return 'pendente_transmissao';
    case 'erro':
      return 'erro';
    default:
      throw new Error(`Status fiscal não reconhecido: ${value ?? '(nulo)'}.`);
  }
}

export async function saveNFeDraft(
  input: NFeDraftPersistenceInput,
): Promise<NFeRepositoryResult<string>> {
  try {
    const { data, error } = await supabase.rpc('erp_salvar_rascunho_nfe', {
      p_documento_id: input.documentId,
      p_documento: input.document,
      p_itens: [...input.items],
    });

    if (error) {
      return { data: null, error: normalizeError(error) };
    }

    if (typeof data !== 'string' || data.length === 0) {
      return {
        data: null,
        error: {
          code: 'NFE_DRAFT_ID_MISSING',
          message: 'A RPC não retornou o identificador do rascunho salvo.',
        },
      };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}

export async function listNFeDocuments(
  query: NFeDocumentQuery,
): Promise<NFeRepositoryResult<ReadonlyArray<NFeStoredDocument>>> {
  if (!query.companyId.trim()) {
    return {
      data: null,
      error: {
        code: 'NFE_COMPANY_REQUIRED',
        message: 'Informe a empresa para consultar os documentos fiscais.',
      },
    };
  }

  const limit = Math.max(1, Math.min(Math.trunc(query.limit ?? 50), 200));

  try {
    let request = supabase
      .from('erp_documentos_fiscais')
      .select(
        'id,empresa_id,modelo,tipo,ambiente,serie,numero,status,data_emissao,valor_total,chave_acesso,protocolo,created_at,updated_at',
      )
      .eq('empresa_id', query.companyId)
      .eq('modelo', '55')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (query.environment) request = request.eq('ambiente', query.environment);
    if (query.status) request = request.eq('status', query.status);

    const { data, error } = await request.returns<NFeDocumentRow[]>();

    if (error) return { data: null, error: normalizeError(error) };

    return {
      data: (data ?? []).map(mapDocument),
      error: null,
    };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}

export async function getNFeDocument(
  companyId: string,
  documentId: string,
): Promise<NFeRepositoryResult<NFeStoredDocument>> {
  if (!companyId.trim() || !documentId.trim()) {
    return {
      data: null,
      error: {
        code: 'NFE_DOCUMENT_LOOKUP_REQUIRED',
        message: 'Empresa e documento são obrigatórios para a consulta.',
      },
    };
  }

  try {
    const { data, error } = await supabase
      .from('erp_documentos_fiscais')
      .select(
        'id,empresa_id,modelo,tipo,ambiente,serie,numero,status,data_emissao,valor_total,chave_acesso,protocolo,created_at,updated_at',
      )
      .eq('empresa_id', companyId)
      .eq('modelo', '55')
      .eq('id', documentId)
      .maybeSingle()
      .returns<NFeDocumentRow>();

    if (error) return { data: null, error: normalizeError(error) };

    if (!data) {
      return {
        data: null,
        error: {
          code: 'NFE_DOCUMENT_NOT_FOUND',
          message: 'Documento fiscal não encontrado para a empresa informada.',
        },
      };
    }

    return { data: mapDocument(data), error: null };
  } catch (error) {
    return { data: null, error: normalizeError(error) };
  }
}
