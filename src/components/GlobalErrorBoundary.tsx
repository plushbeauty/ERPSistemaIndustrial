import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string }

export default class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Erro inesperado ao abrir o sistema.' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ERP render error', error, info.componentStack)
  }

  private retry = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="error-screen" role="alert">
        <section className="error-screen-card">
          <strong>Não foi possível abrir esta tela.</strong>
          <p>{this.state.message}</p>
          <div className="error-screen-actions">
            <button className="primary" type="button" onClick={this.retry}>Tentar novamente</button>
            <button className="secondary" type="button" onClick={() => location.reload()}>Recarregar sistema</button>
          </div>
        </section>
      </main>
    )
  }
}
