import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[Dataism] Runtime error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
            color: '#fff',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            textAlign: 'center',
            padding: '0 32px',
          }}
        >
          <div style={{ fontSize: 20, letterSpacing: '0.06em', marginBottom: 12 }}>
            Dataism — 17
          </div>
          <div style={{ fontSize: 13, opacity: 0.7, maxWidth: 420, lineHeight: 1.6 }}>
            Your browser may not support WebGL, or an unexpected error occurred.
            Try Chrome, Safari, or Firefox on a desktop computer.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}