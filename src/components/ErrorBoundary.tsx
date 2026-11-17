import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.'
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NIGERIA CAMPUS MARKET ErrorBoundary]:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F8F5] flex items-center justify-center p-4 text-[#10251D]">
          <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF8DB] border-2 border-[#D4A62A] flex items-center justify-center mx-auto text-[#087443]">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-black text-[#10251D]">
                NIGERIA CAMPUS MARKET Encountered an Issue
              </h1>
              <p className="text-xs text-[#555555] leading-relaxed break-words">
                {this.state.errorMessage}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-[#087443] hover:bg-[#065D36] text-white text-xs font-black rounded-xl flex items-center gap-2 transition"
              >
                <RefreshCw className="w-4 h-4 text-[#D4A62A]" />
                <span>Reload NIGERIA CAMPUS MARKET</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
