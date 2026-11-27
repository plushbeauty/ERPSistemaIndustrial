export type ThermalLanguage = 'PPLA' | 'PPLB' | 'ZPL' | 'TSPL'
export type LabelOrientation = 'portrait' | 'landscape'
export type ThermalLabelConfig = {
  language: ThermalLanguage
  printer: string
  printerMaxWidthMm: 104 | 108
  widthMm: number
  heightMm: number
  columns?: 1 | 2
  columnGapMm?: number
  orientation: LabelOrientation
  copies?: number
  company?: string
  cnpj?: string
  customer?: string
  customerDocument?: string
  productCode: string
  description: string
  lot: string
  expiry?: string
  quantity?: string
  unit?: string
  physicalAddress?: string
  order?: string
  invoice?: string
  traceability: string
}
export type ThermalLabelResult = { content: string; totalWidthMm: number; dotsWidth: number; dotsHeight: number }

const mmToDots = (mm: number, dpi = 203) => Math.round(mm * dpi / 25.4)
const clean = (value: string | undefined) => (value ?? '').replace(/[\^~\\]/g, ' ').replace(/[\r\n]+/g, ' ').trim()
const safe = (value: string | undefined) => clean(value).slice(0, 120)

export function validateThermalLabel(config: ThermalLabelConfig) {
  const columns = config.columns ?? 1
  const gap = config.columnGapMm ?? 0
  const totalWidthMm = columns === 2 ? config.widthMm * 2 + gap : config.widthMm
  const errors: string[] = []
  if (!Number.isFinite(config.widthMm) || config.widthMm < 20 || config.widthMm > 110) errors.push('A largura deve estar entre 20 e 110 mm.')
  if (!Number.isFinite(config.heightMm) || config.heightMm < 20 || config.heightMm > 200) errors.push('A altura deve estar entre 20 e 200 mm.')
  if (![1,2].includes(columns)) errors.push('A quantidade de colunas deve ser 1 ou 2.')
  if (gap < 0) errors.push('O espaçamento não pode ser negativo.')
  if (totalWidthMm > config.printerMaxWidthMm) errors.push(`Largura total ${totalWidthMm.toFixed(2)} mm excede o limite de ${config.printerMaxWidthMm} mm da impressora.`)
  return { valid: errors.length === 0, errors, totalWidthMm }
}

function fields(c: ThermalLabelConfig) {
  return [
    safe(c.company), safe(c.cnpj), safe(c.customer), safe(c.customerDocument),
    `COD: ${safe(c.productCode)}`, safe(c.description), `LOTE: ${safe(c.lot)}`,
    c.expiry ? `VALID: ${safe(c.expiry)}` : '', c.quantity ? `QTD: ${safe(c.quantity)} ${safe(c.unit)}` : '',
    c.physicalAddress ? `END: ${safe(c.physicalAddress)}` : '',
    c.order ? `PED: ${safe(c.order)}` : '', c.invoice ? `NF: ${safe(c.invoice)}` : '',
  ].filter(Boolean)
}

function zpl(c: ThermalLabelConfig, w: number, h: number) {
  const rotation = c.orientation === 'landscape' ? '^FWR' : '^FWN'
  const text = fields(c).map((line, i) => `^FO24,${24+i*28}${rotation}^A0,22,22^FD${line}^FS`).join('\n')
  return ['^XA','^CI28',`^PW${w}`,`^LL${h}`,'^LH0,0',text,
    `^FO24,${Math.max(24,h-115)}^BY2,2,65^BCN,65,Y,N,N^FD${safe(c.productCode)}^FS`,
    `^FO${Math.max(24,w-110)},${Math.max(24,h-110)}^BQN,2,4^FDLA,${safe(c.traceability)}^FS`,'^XZ'].join('\n')
}

function tspl(c: ThermalLabelConfig, w: number, h: number) {
  const direction = c.orientation === 'landscape' ? 'DIRECTION 1' : 'DIRECTION 0'
  const text = fields(c).map((line,i)=>`TEXT 20,${20+i*24},"0",0,1,1,"${line.replace(/"/g,"'")}"`).join('\n')
  return ['SIZE '+c.widthMm+' mm,'+c.heightMm+' mm','GAP 2 mm,0',direction,'CLS',text,
    `BARCODE 20,${Math.max(20,h-150)},"128",70,1,0,2,2,"${safe(c.productCode)}"`,
    `QRCODE ${Math.max(20,w-105)},${Math.max(20,h-105)},L,4,A,0,"${safe(c.traceability)}"`,
    'PRINT 1,'+(c.copies ?? 1)].join('\n')
}

function pplb(c: ThermalLabelConfig, w: number, h: number) {
  const rotation = c.orientation === 'landscape' ? 'ZB' : 'ZT'
  const text = fields(c).map((line,i)=>`A${20},${20+i*24},0,3,1,1,N,"${line.replace(/"/g,"'")}"`).join('\n')
  return ['N',rotation,`q${w}`,`Q${h},24`,text,
    `B20,${Math.max(20,h-100)},0,1,2,4,60,B,"${safe(c.productCode)}"`,'P'+(c.copies ?? 1)].join('\n')
}

function ppla(c: ThermalLabelConfig, w: number, h: number) {
  const rotation = c.orientation === 'landscape' ? '2' : '1'
  const text = fields(c).map((line,i)=>`1911A${rotation}000${20+i*24}0003${line}`).join('\n')
  return ['<STX>L','D11',`H${h}`,`Q${w},24`,text,
    `1${rotation}000${Math.max(20,h-100)}0003B${safe(c.productCode)}`,'E'+(c.copies ?? 1)].join('\n')
}

export function generateThermalLabel(config: ThermalLabelConfig): ThermalLabelResult {
  const validation = validateThermalLabel(config)
  if (!validation.valid) throw new Error(validation.errors.join(' '))
  const dpi = 203
  const landscape = config.orientation === 'landscape'
  const physicalWidth = landscape ? config.heightMm : config.widthMm
  const physicalHeight = landscape ? config.widthMm : config.heightMm
  const dotsWidth = mmToDots(physicalWidth,dpi)
  const dotsHeight = mmToDots(physicalHeight,dpi)
  const content = config.language === 'PPLA' ? ppla(config,dotsWidth,dotsHeight)
    : config.language === 'PPLB' ? pplb(config,dotsWidth,dotsHeight)
    : config.language === 'ZPL' ? zpl(config,dotsWidth,dotsHeight)
    : tspl(config,dotsWidth,dotsHeight)
  return { content, totalWidthMm: validation.totalWidthMm, dotsWidth, dotsHeight }
}
