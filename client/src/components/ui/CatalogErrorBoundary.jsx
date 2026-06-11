import { Component } from "react";
import MaterialIcon from "./MaterialIcon.jsx";

/**
 * Catches render errors under the catalog tree and shows them on the page
 * instead of a blank screen (mirrors the React devtools console message).
 */
export default class CatalogErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("CatalogProvider error:", error, info);
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message ?? String(this.state.error);
      const stack = this.state.error?.stack ?? "";

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
            <div className="flex items-start gap-3">
              <MaterialIcon name="error" className="text-2xl shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <h2 className="font-headline font-bold text-lg">
                  Catalog failed to load
                </h2>
                <p className="mt-2 text-sm">
                  An error occurred in the catalog. Details below (same as the
                  browser console):
                </p>
                <pre className="mt-4 p-3 rounded-lg bg-red-100/80 text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  {message}
                  {stack ? `\n\n${stack}` : ""}
                </pre>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 rounded-full bg-red-700 text-white text-sm font-bold hover:bg-red-800"
                >
                  Reload page
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
