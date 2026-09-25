import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

type LookupRecord = Record<string, unknown>;

export type LookupFieldProps = {
  table: string;
  value: string;
  onChange: (value: string, row: LookupRecord | null) => void;
  columns: string;
  labelKey: string;
  codeKey?: string;
  placeholder?: string;
  disabled?: boolean;
};

function isLookupRecord(value: unknown): value is LookupRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function LookupField({
  table,
  value,
  onChange,
  columns,
  labelKey,
  codeKey,
  placeholder = 'Pesquisar...',
  disabled = false,
}: LookupFieldProps) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<LookupRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedLabel = useMemo(() => {
    const row = rows.find((item) => String(item.id ?? '') === value);
    if (!row) return '';
    return String(row[labelKey] ?? row[codeKey ?? ''] ?? '');
  }, [rows, value, labelKey, codeKey]);

  useEffect(() => {
    if (!open || disabled) return;
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const result = await supabase.from(table).select(columns).limit(50);
        if (result.error) throw result.error;

        const rawData: unknown = result.data;
        const normalized: LookupRecord[] = [];

        if (Array.isArray(rawData)) {
          for (const item of rawData) {
            if (isLookupRecord(item)) normalized.push(item);
          }
        }

        const needle = query.trim().toLocaleLowerCase('pt-BR');
        const filtered: LookupRecord[] = needle
          ? normalized.filter((row) =>
              Object.values(row).some((item) =>
                String(item ?? '').toLocaleLowerCase('pt-BR').includes(needle),
              ),
            )
          : normalized;

        if (!cancelled) setRows(filtered);
      } catch (cause) {
        if (!cancelled) {
          setRows([]);
          setError(cause instanceof Error ? cause.message : 'Falha ao pesquisar.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, disabled, query, table, columns]);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          value={open ? query : selectedLabel}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {value && (
          <button type="button" className="erp-btn-secondary" onClick={() => {
            setQuery('');
            onChange('', null);
            setOpen(false);
          }} aria-label="Limpar seleção">
            <X />
          </button>
        )}
        <button
          type="button"
          className="erp-btn-secondary"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          aria-label="Abrir pesquisa"
        >
          <Search />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border bg-white p-2 shadow-xl">
          {loading && <div className="p-3 text-sm">Pesquisando...</div>}
          {error && <div className="p-3 text-sm text-red-700">{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div className="p-3 text-sm text-slate-500">Nenhum registro encontrado.</div>
          )}
          {!loading && !error && rows.map((row) => {
            const id = String(row.id ?? '');
            const label = String(row[labelKey] ?? row[codeKey ?? ''] ?? id);
            const code = codeKey ? String(row[codeKey] ?? '') : '';

            return (
              <button
                type="button"
                key={id}
                className="block w-full rounded-lg p-3 text-left hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                onClick={() => {
                  onChange(id, row);
                  setQuery('');
                  setOpen(false);
                }}
              >
                <strong>{code ? code + ' • ' : ''}{label}</strong>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LookupField;
