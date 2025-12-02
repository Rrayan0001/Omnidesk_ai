import React from 'react';
import { Button } from "@/components/ui/button";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center space-y-6">
                    <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-destructive/20">
                        ⚠️
                    </div>
                    <div className="space-y-2 max-w-md">
                        <h2 className="text-2xl font-serif font-bold text-foreground">
                            Something went wrong
                        </h2>
                        <p className="text-muted-foreground font-serif">
                            The council has encountered an unexpected error.
                        </p>
                    </div>

                    <div className="bg-secondary/50 p-4 rounded-lg text-left w-full max-w-lg overflow-auto max-h-[200px] border border-border/50">
                        <p className="text-xs font-mono text-destructive break-all">
                            {this.state.error && this.state.error.toString()}
                        </p>
                        {this.state.errorInfo && (
                            <pre className="text-[10px] font-mono text-muted-foreground mt-2 whitespace-pre-wrap">
                                {this.state.errorInfo.componentStack}
                            </pre>
                        )}
                    </div>

                    <Button
                        onClick={this.handleReload}
                        variant="default"
                        className="font-sans"
                    >
                        Reload Application
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
