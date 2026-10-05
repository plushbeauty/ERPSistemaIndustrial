import { createContext, useContext, type ReactNode } from 'react'

const SynqraLayoutContext = createContext(false)

export function SynqraLayoutProvider({ children }: { children: ReactNode }) {
  return <SynqraLayoutContext.Provider value>{children}</SynqraLayoutContext.Provider>
}

export function useSynqraLayout() {
  return useContext(SynqraLayoutContext)
}
