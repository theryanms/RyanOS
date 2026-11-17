"use client";
import { Component, useEffect, type ReactNode } from "react";
import { deviceBackup, recordError } from "../lib/diagnostics";

function ErrorRecorder() {
  useEffect(() => {
    const error = (event: ErrorEvent) =>
      recordError(event.error ?? event.message);
    const rejection = (event: PromiseRejectionEvent) =>
      recordError(event.reason);
    window.addEventListener("error", error);
    window.addEventListener("unhandledrejection", rejection);
    return () => {
      window.removeEventListener("error", error);
      window.removeEventListener("unhandledrejection", rejection);
    };
  }, []);
  return null;
}
export default class RecoveryBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; message: string }
> {
  state = { failed: false, message: "" };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    recordError(error);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="mx-auto max-w-xl space-y-4 p-8">
          <h1 className="text-2xl font-bold">RyanOS hit a problem</h1>
          <p>Your device save is available for backup and recovery.</p>
          <div className="flex flex-wrap gap-3">
            <button
              className="action"
              onClick={() => {
                try {
                  deviceBackup();
                } catch {
                  this.setState({
                    message:
                      "Browser storage could not be read. Check this browser’s site-storage settings before retrying.",
                  });
                }
              }}
            >
              Download device data
            </button>
            <button
              className="action"
              onClick={() => window.location.assign("/?safe=1")}
            >
              Open safe mode
            </button>
            <button className="action" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
          {this.state.message && <p role="alert">{this.state.message}</p>}
        </main>
      );
    return (
      <>
        <ErrorRecorder />
        {this.props.children}
      </>
    );
  }
}
