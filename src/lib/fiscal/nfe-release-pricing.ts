/**
 * Allocates an order-line discount across the quantities being invoiced from
 * one or more stock lots. The last line receives the cent remainder so the
 * allocated amounts add up exactly to the prorated discount.
 */
export function allocateReleaseDiscounts(
  discountTotal: number,
  orderedQuantity: number,
  releaseQuantities: number[],
): number[] {
  if (releaseQuantities.length === 0) return []
  const validDiscount = Number.isFinite(discountTotal) ? Math.max(0, discountTotal) : 0
  const validOrdered = Number.isFinite(orderedQuantity) ? Math.max(0, orderedQuantity) : 0
  const quantities = releaseQuantities.map(value => Number.isFinite(value) ? Math.max(0, value) : 0)
  const totalReleased = quantities.reduce((sum, value) => sum + value, 0)
  if (validOrdered === 0 || totalReleased === 0 || validDiscount === 0) return quantities.map(() => 0)

  const prorated = Math.round(validDiscount * Math.min(totalReleased, validOrdered) / validOrdered * 100) / 100
  let allocated = 0
  return quantities.map((quantity, index) => {
    if (index === quantities.length - 1) return Math.round((prorated - allocated) * 100) / 100
    const amount = Math.round(prorated * quantity / totalReleased * 100) / 100
    allocated += amount
    return amount
  })
}
