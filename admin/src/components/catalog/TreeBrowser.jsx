import { useCallback, useEffect, useState } from "react";
import MaterialIcon from "../ui/MaterialIcon.jsx";
import Spinner from "../ui/Spinner.jsx";
import PermissionGate from "../auth/PermissionGate.jsx";
import { PERMISSIONS } from "../../constants/permissions.js";

/**
 * Generic Miller-columns tree browser used for both categories and locations.
 *
 * Props:
 *   rootKey        any        changing this resets the browser (e.g. listingType)
 *   loadChildren   (parentNode|null) => Promise<node[]>
 *   canAddChild    (parentNode|null) => boolean
 *   renderAddForm  ({ parent, onDone }) => JSX  (form to create a child)
 *   onToggleActive (node) => Promise   (toggle isActive)
 *   maxColumns     number     visual cap
 */
export default function TreeBrowser({
  rootKey,
  loadChildren,
  canAddChild,
  renderAddForm,
  onToggleActive,
}) {
  // columns: [{ parent, items, loading, addOpen }]
  const [columns, setColumns] = useState([]);

  const loadColumn = useCallback(
    async (parent) => {
      const items = await loadChildren(parent);
      return { parent, items, addOpen: false };
    },
    [loadChildren]
  );

  // Reset to a single root column whenever rootKey changes.
  useEffect(() => {
    let active = true;
    (async () => {
      const col = await loadColumn(null);
      if (active) setColumns([col]);
    })().catch(() => {
      if (active) setColumns([{ parent: null, items: [], addOpen: false }]);
    });
    return () => {
      active = false;
    };
  }, [rootKey, loadColumn]);

  const handleSelect = async (colIndex, node) => {
    // Trim columns to the right, mark selection, then load its children.
    setColumns((prev) => {
      const next = prev.slice(0, colIndex + 1);
      next[colIndex] = { ...next[colIndex], selectedId: node.id };
      return next;
    });
    if (!canAddChild(node)) return; // leaf — no deeper column
    try {
      const col = await loadColumn(node);
      setColumns((prev) => {
        const next = prev.slice(0, colIndex + 1);
        return [...next, col];
      });
    } catch {
      /* ignore */
    }
  };

  const reloadColumn = async (colIndex) => {
    const parent = columns[colIndex]?.parent ?? null;
    try {
      const col = await loadColumn(parent);
      setColumns((prev) => {
        const next = [...prev];
        next[colIndex] = { ...col, selectedId: prev[colIndex]?.selectedId };
        return next;
      });
    } catch {
      /* ignore */
    }
  };

  const toggleAdd = (colIndex) => {
    setColumns((prev) => {
      const next = [...prev];
      next[colIndex] = {
        ...next[colIndex],
        addOpen: !next[colIndex].addOpen,
      };
      return next;
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 thin-scroll">
      {columns.map((col, colIndex) => (
        <div
          key={colIndex}
          className="flex w-64 shrink-0 flex-col rounded-xl border border-surface-border bg-surface"
        >
          <div className="flex items-center justify-between border-b border-surface-border px-3 py-2">
            <span className="truncate text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {col.parent ? col.parent.name : "Top level"}
            </span>
            <PermissionGate permission={PERMISSIONS.CATALOG_WRITE}>
              {canAddChild(col.parent) ? (
                <button
                  type="button"
                  onClick={() => toggleAdd(colIndex)}
                  className="rounded p-1 text-primary-600 hover:bg-primary-50"
                  title="Add item"
                >
                  <MaterialIcon
                    name={col.addOpen ? "close" : "add"}
                    className="text-[18px]"
                  />
                </button>
              ) : null}
            </PermissionGate>
          </div>

          {col.addOpen ? (
            <div className="border-b border-surface-border bg-surface-muted/60 p-3">
              {renderAddForm({
                parent: col.parent,
                onDone: () => {
                  toggleAdd(colIndex);
                  reloadColumn(colIndex);
                },
              })}
            </div>
          ) : null}

          <ul className="max-h-[420px] flex-1 overflow-y-auto p-1 thin-scroll">
            {col.items.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-ink-faint">
                Empty
              </li>
            ) : (
              col.items.map((node) => (
                <li key={node.id}>
                  <div
                    className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition ${
                      col.selectedId === node.id
                        ? "bg-primary-50 text-primary-700"
                        : "hover:bg-surface-muted"
                    } ${node.isActive ? "" : "opacity-50"}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(colIndex, node)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="truncate font-medium">{node.name}</span>
                      {!node.isActive ? (
                        <span className="rounded bg-ink-faint/20 px-1 text-[10px] font-semibold uppercase text-ink-soft">
                          off
                        </span>
                      ) : null}
                    </button>
                    <PermissionGate permission={PERMISSIONS.CATALOG_WRITE}>
                      <button
                        type="button"
                        onClick={async () => {
                          await onToggleActive(node);
                          reloadColumn(colIndex);
                        }}
                        className="shrink-0 rounded p-1 text-ink-faint opacity-0 transition group-hover:opacity-100 hover:text-ink"
                        title={node.isActive ? "Deactivate" : "Activate"}
                      >
                        <MaterialIcon
                          name={node.isActive ? "toggle_on" : "toggle_off"}
                          className="text-[18px]"
                        />
                      </button>
                    </PermissionGate>
                    {canAddChild(node) ? (
                      <MaterialIcon
                        name="chevron_right"
                        className="shrink-0 text-[16px] text-ink-faint"
                      />
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ))}
      {columns.length === 0 ? (
        <div className="flex w-64 items-center justify-center py-10">
          <Spinner className="text-primary" />
        </div>
      ) : null}
    </div>
  );
}
