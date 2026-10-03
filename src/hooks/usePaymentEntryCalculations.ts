import { useMemo } from 'react'
export function usePaymentEntryCalculations(amount:number,discount:number,deduction:number){return useMemo(()=>{const gross=Math.max(0,amount);const discounts=Math.max(0,discount);const deductions=Math.max(0,deduction);return {gross,discount:discounts,deduction:deductions,net:Math.max(0,gross-discounts-deductions)}},[amount,discount,deduction])}
