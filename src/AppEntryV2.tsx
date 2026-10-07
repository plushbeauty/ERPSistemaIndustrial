import { Component, type ComponentType, type ReactNode, lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from './lib/supabaseClient'



type LazyModule<P extends object> = { default?: ComponentType<P>; [key: string]: unknown }

function lazyPage<P extends object>(
  loader: () => Promise<LazyModule<P>>,
  exportName: string,
) {
  return lazy(async () => {
    const module = await loader()
    const component = module.default ?? module[exportName]
    if (typeof component !== 'function' && typeof component !== 'object') {
      throw new Error('LAZY_EXPORT_MISSING: ' + exportName)
    }
    return { default: component as ComponentType<P> }
  })
}
import './styles/industrial-login.css'
import './styles/forms-premium.css'
import './styles/manual-usuario-2026.css'