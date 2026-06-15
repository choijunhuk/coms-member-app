import { Component } from 'react'
import { AlertCircle, RotateCw } from 'lucide-react'
import { captureError } from '../services/observability.js'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    void captureError(error, { boundary: this.props.label || 'unknown', componentStack: info?.componentStack })
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <section className="empty-panel">
        <AlertCircle size={24} aria-hidden="true" />
        <p>화면을 표시하는 중 문제가 발생했습니다.</p>
        <p className="muted">{this.state.error?.message || '알 수 없는 오류'}</p>
        <button type="button" className="button secondary" onClick={this.reset}>
          <RotateCw size={16} aria-hidden="true" /> 다시 시도
        </button>
      </section>
    )
  }
}
