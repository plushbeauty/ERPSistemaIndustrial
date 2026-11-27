import { useMemo } from 'react'
import { BarcodeFormat, EncodeHintType, MultiFormatWriter } from '@zxing/library'

export default function Code128Preview({ value, className = '', caption = '' }: { value: string; className?: string; caption?: string }) {
  const matrix = useMemo(() => {
    const text = value.trim()
    if (!text) return null
    try {
      const hints = new Map<EncodeHintType, any>([[EncodeHintType.MARGIN, 8]])
      return new MultiFormatWriter().encode(text, BarcodeFormat.CODE_128, 560, 120, hints)
    } catch {
      return null
    }
  }, [value])
  if (!matrix) return <div className={className + ' flex items-center justify-center text-[10px] text-slate-500'}>Informe um código válido para gerar Code 128.</div>
  const bars: string[] = []
  const row = Math.floor(matrix.getHeight() / 2)
  for (let x = 0; x < matrix.getWidth(); x++) if (matrix.get(x, row)) bars.push('M' + x + ' 0v' + matrix.getHeight() + 'h1v-' + matrix.getHeight() + 'z')
  return <svg className={className} viewBox={'0 0 ' + matrix.getWidth() + ' ' + matrix.getHeight()} role="img" aria-label={'Código de barras Code 128 ' + (caption || value)} preserveAspectRatio="none"><path d={bars.join(' ')} fill="currentColor"/></svg>
}
