"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full rounded-lg border border-red-800 bg-red-900/20 p-6">
            <div className="flex items-start gap-4">
              <svg 
                className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-red-400 mb-2">
                  Simulation Crashed
                </h2>
                <p className="text-sm text-red-300 mb-4">
                  The simulation encountered a runtime error, likely due to memory constraints or browser limitations.
                </p>
                <div className="bg-red-950/50 rounded p-3 mb-4">
                  <p className="text-xs font-mono text-red-200 break-all">
                    {this.state.error?.message || "Unknown error"}
                  </p>
                </div>
                <div className="space-y-2 text-sm text-red-200">
                  <p className="font-medium">Recommendations:</p>
                  <ul className="list-disc list-inside space-y-1 text-red-300">
                    <li>Reduce the number of runs (recommended: 5-20)</li>
                    <li>Reduce timesteps (recommended: 12-52 weeks)</li>
                    <li>Keep total computations under 1000 (runs × timesteps)</li>
                    <li>Refresh the page to try again</li>
                  </ul>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

