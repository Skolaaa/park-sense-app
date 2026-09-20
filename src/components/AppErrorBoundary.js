// src/components/AppErrorBoundary.js
// Top-level error boundary. React only supports error boundaries as class
// components, so this stays a class even though the rest of the app is hooks.
//
// Wired in src/index.js around the root <App />. Without it, any render error
// unmounts the whole tree and the user is left staring at a white screen with
// no way back other than a manual browser refresh.

import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Screen, ScreenActions } from './Screen';
import { Button } from './ui/button';
import { ErrorReporting } from '../services/errorReporting';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: 0 };
    this.handleReload = this.handleReload.bind(this);
    this.handleTryAgain = this.handleTryAgain.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ParkSense] Render error caught by AppErrorBoundary:', error, errorInfo);
    ErrorReporting.report(error, { source: 'AppErrorBoundary', componentStack: errorInfo?.componentStack?.slice(0, 1000) });
  }

  handleReload() {
    window.location.reload();
  }

  // Non-destructive recovery: drop the error and remount the subtree with a
  // fresh key so children rebuild from their initial state. Nothing persisted
  // (e.g. a running parking timer) is cleared.
  handleTryAgain() {
    this.setState((prev) => ({ error: null, resetKey: prev.resetKey + 1 }));
  }

  render() {
    const { error, resetKey } = this.state;

    if (!error) {
      return <React.Fragment key={resetKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertOctagon className="h-6 w-6 text-destructive" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-muted-foreground">
            ParkSense could not finish rendering. A running parking timer is unaffected — it is
            stored on this device and will still be counting down.
          </p>

          {error.message && (
            <details className="mt-6 w-full text-left">
              <summary className="cursor-pointer text-center text-xs font-medium text-muted-foreground">
                Error details
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-card p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                {error.message}
              </pre>
            </details>
          )}
        </div>

        <ScreenActions>
          <Button size="lg" onClick={this.handleReload}>
            Reload
          </Button>
          <Button variant="outline" onClick={this.handleTryAgain}>
            Back to start
          </Button>
        </ScreenActions>
      </Screen>
    );
  }
}

export default AppErrorBoundary;
