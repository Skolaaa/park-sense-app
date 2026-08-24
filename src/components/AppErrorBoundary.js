// src/components/AppErrorBoundary.js
// Top-level error boundary. React only supports error boundaries as class
// components, so this stays a class even though the rest of the app is hooks.
//
// Wired in src/index.js around the root <App />. Without it, any render error
// unmounts the whole tree and the user is left staring at a white screen with
// no way back other than a manual browser refresh.
//
// Styled with the app's own theme tokens. An earlier version used stock
// Tailwind on the theory that it would survive "the theme layer breaking", but
// both compile into the same stylesheet — there is no failure mode where one
// resolves and the other does not.

import React from 'react';

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
      <div className="flex min-h-screen flex-col bg-ground">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5">
          <div className="flex flex-1 flex-col justify-center py-12">
            <div className="border-l-4 border-deny pl-4">
              <p className="kicker text-deny">Unexpected error</p>
              <h1 className="mt-2 font-display text-verdict-sm uppercase">
                Something{' '}
                <br />
                went wrong
              </h1>
            </div>
            <p className="mt-5 max-w-[34ch] text-[13px] leading-relaxed text-dim">
              ParkSense could not finish rendering. A running parking timer is
              unaffected — it is stored on this device and will still be counting
              down.
            </p>

            {error.message && (
              <details className="mt-6">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.17em] text-faint">
                  Error details
                </summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words border border-rule bg-panel p-3 font-mono text-[11px] leading-relaxed text-dim">
                  {error.message}
                </pre>
              </details>
            )}
          </div>

          <div className="pb-safe grid gap-2.5 pb-6">
            <button type="button" onClick={this.handleReload} className="btn-signal h-[52px]">
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleTryAgain}
              className="btn-quiet h-[46px] text-[13px]"
            >
              Back to start
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
