import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
                    <div className="card" style={{ borderColor: 'var(--danger)' }}>
                        <h1 style={{ color: 'var(--danger)' }}>Ops! Algo deu errado.</h1>
                        <p>Ocorreu um erro inesperado nesta parte da aplicação.</p>
                        <pre style={{
                            textAlign: 'left',
                            background: 'rgba(0,0,0,0.1)',
                            padding: '1rem',
                            overflow: 'auto',
                            maxHeight: '300px',
                            fontSize: '0.8rem'
                        }}>
                            {this.state.error?.toString()}
                        </pre>
                        <button
                            className="btn btn-primary"
                            onClick={() => window.location.reload()}
                            style={{ marginTop: '1rem' }}
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
