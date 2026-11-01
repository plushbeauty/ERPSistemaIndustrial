/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-MODULO-PREMIUM-20261101-01 — rail lateral compartilhado das telas operacionais
 * @STATUS_APROVACAO: APLICACAO A TODOS OS MODULOS AUTORIZADA PELO PROPRIETARIO EM 2026-11-01
 *
 * O rail é montado dentro da área de trabalho compartilhada: a shell horizontal
 * global e a barra Windows 11 continuam sendo a única navegação entre módulos.
 */
import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { ModuleNav } from '../../config/moduleNav'
import '../../styles/sysnqra-module-premium-20261101.css'

function normalize(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function ModuleRail({ nav }: { nav: ModuleNav }) {
  const { pathname } = useLocation()
  const atual = normalize(pathname)
  const renderLink = ({ label, route, icon: Icon }: ModuleNav['items'][number]) => (
    <Link
      key={route}
      to={route}
      aria-current={atual === route ? 'page' : undefined}
      className={atual === route ? 'smp-rail-item is-active' : 'smp-rail-item'}
    >
      <Icon size={16} aria-hidden />
      {label}
    </Link>
  )
  return (
    <nav className="smp-rail" aria-label={`Rotinas do módulo ${nav.title}`}>
      <div className="smp-rail-brand">
        <strong>{nav.title}</strong>
        <span>{nav.subtitle}</span>
      </div>
      {nav.items.map(renderLink)}
      <div className="smp-rail-foot">
        <div className="smp-rail-group">Sistema</div>
        {nav.footItems.map(renderLink)}
      </div>
    </nav>
  )
}

export default function ModuleWorkspace({ nav, children }: { nav: ModuleNav; children: ReactNode }) {
  return (
    <div className="smp-shell">
      <ModuleRail nav={nav} />
      <div className="smp-body">{children}</div>
    </div>
  )
}
