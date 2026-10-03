import { useCallback, useState } from 'react'

export function useDialogState(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(value => !value), [])

  return { open, setOpen, close, toggle }
}
