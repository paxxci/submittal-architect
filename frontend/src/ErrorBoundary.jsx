import React from 'react';

// Error Boundary for UI Safety
class ErrorBoundary extends React.Component {
    constructor(props) { 
        super(props); 
        this.state = { hasError: false, error: null }; 
    }
    
    static getDerivedStateFromError(error) { 
        return { hasError: true, error }; 
    }
    
    componentDidCatch(error, info) { 
        console.error("CRASH_LOG:", error, info); 
    }
    
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 40, background: "#0a0b0e", color: "#ff4d4d", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                    <div style={{ fontSize: 64, marginBottom: 20 }}>⚠</div>
                    <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 10 }}>CRASH DETECTED</h1>
                    <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 30 }}>Submittal Architect encountered a rendering error. Our AI is tracking the stack trace.</p>
                    <pre style={{ background: "rgba(0,0,0,0.5)", padding: 20, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", textAlign: "left", fontSize: 12, maxWidth: "80%", overflow: "auto", color: "#fff" }}>
                        {this.state.error?.stack}
                    </pre>
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{ marginTop: 40, padding: "12px 24px", background: "#ff6b00", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, cursor: "pointer" }}
                    >
                        Reload Interface
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
