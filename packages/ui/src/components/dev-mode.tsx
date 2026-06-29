"use client";

import * as React from "react";
import { SlidersHorizontal, X, RotateCcw, Check } from "lucide-react";
import { Button } from "./button";
import { cn } from "../lib/cn";

/**
 * Demo / dev-mode variant switcher.
 *
 * Each variantized page renders a client "host" that calls `useVariant(key, label, options, initial)`
 * and switches between alternative presentational components that all receive the SAME props.
 * The floating <DevToolbar/> (mounted once by <DevModeProvider/>) lets a salesperson flip between
 * versions live. Selections persist in localStorage and can be deep-linked via `?<key>=<n>`.
 */

const LS_KEY = "dentalos:devmode";
const HIDDEN = process.env.NEXT_PUBLIC_DEV_MODE === "false";

interface Group {
  label: string;
  options: string[];
  initial: number;
}

interface DevModeCtx {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  selections: Record<string, number>;
  select: (key: string, index: number) => void;
  reset: () => void;
  groups: Record<string, Group>;
  register: (key: string, g: Group) => void;
  unregister: (key: string) => void;
}

const Ctx = React.createContext<DevModeCtx | null>(null);

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState(true);
  const [selections, setSelections] = React.useState<Record<string, number>>({});
  const [groups, setGroups] = React.useState<Record<string, Group>>({});
  const hydrated = React.useRef(false);

  // Hydrate from localStorage + URL deep-links once on mount (client only).
  React.useEffect(() => {
    let stored: { enabled?: boolean; selections?: Record<string, number> } = {};
    try {
      stored = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch {
      /* ignore */
    }
    const fromUrl: Record<string, number> = {};
    try {
      new URLSearchParams(window.location.search).forEach((v, k) => {
        if (/^\d+$/.test(v)) fromUrl[k] = Number(v);
      });
    } catch {
      /* ignore */
    }
    setEnabled(stored.enabled ?? true);
    setSelections({ ...(stored.selections ?? {}), ...fromUrl });
    hydrated.current = true;
  }, []);

  // Persist after the initial hydrate.
  React.useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ enabled, selections }));
    } catch {
      /* ignore */
    }
  }, [enabled, selections]);

  const select = React.useCallback((key: string, index: number) => {
    setSelections((s) => ({ ...s, [key]: index }));
  }, []);
  const reset = React.useCallback(() => setSelections({}), []);
  const register = React.useCallback((key: string, g: Group) => {
    setGroups((gs) => {
      const cur = gs[key];
      if (cur && cur.label === g.label && cur.initial === g.initial && cur.options.join("|") === g.options.join("|")) return gs;
      return { ...gs, [key]: g };
    });
  }, []);
  const unregister = React.useCallback((key: string) => {
    setGroups((gs) => {
      if (!(key in gs)) return gs;
      const next = { ...gs };
      delete next[key];
      return next;
    });
  }, []);

  const value = React.useMemo<DevModeCtx>(
    () => ({ enabled, setEnabled, selections, select, reset, groups, register, unregister }),
    [enabled, selections, groups, select, reset, register, unregister],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {!HIDDEN && <DevToolbar />}
    </Ctx.Provider>
  );
}

/** Register a switchable group for the current page and return the active variant index. */
export function useVariant(key: string, label: string, options: string[], initial = 0): number {
  const ctx = React.useContext(Ctx);
  const optionsKey = options.join("|");
  React.useEffect(() => {
    if (!ctx) return;
    ctx.register(key, { label, options, initial });
    return () => ctx.unregister(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, label, initial, optionsKey]);
  if (!ctx || !ctx.enabled) return initial;
  return ctx.selections[key] ?? initial;
}

function DevToolbar() {
  const ctx = React.useContext(Ctx)!;
  const [open, setOpen] = React.useState(false);
  const groupKeys = Object.keys(ctx.groups);

  return (
    <div className="fixed bottom-4 left-4 z-[60] flex flex-col items-start gap-2 print:hidden">
      {open && (
        <div className="w-72 animate-fade-in-up rounded-xl border border-border/70 bg-card p-3 text-card-foreground shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Demo switcher</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-3 flex cursor-pointer items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm">
            <span className="font-medium">Enable variants</span>
            <input type="checkbox" checked={ctx.enabled} onChange={(e) => ctx.setEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />
          </label>

          {groupKeys.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">No switchable sections on this page.</p>
          )}

          <div className="space-y-3">
            {groupKeys.map((key) => {
              const g = ctx.groups[key]!;
              const current = ctx.enabled ? ctx.selections[key] ?? g.initial : g.initial;
              return (
                <div key={key}>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</div>
                  <div className="flex flex-wrap gap-1">
                    {g.options.map((opt, i) => (
                      <button
                        key={opt}
                        disabled={!ctx.enabled}
                        onClick={() => ctx.select(key, i)}
                        className={cn(
                          "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                          current === i
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/70 text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        {current === i && <Check className="mr-1 h-3 w-3" />}
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {groupKeys.length > 0 && (
            <button onClick={ctx.reset} className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3 w-3" /> Reset to defaults
            </button>
          )}
        </div>
      )}

      <Button
        size="icon"
        onClick={() => setOpen((o) => !o)}
        className="h-11 w-11 rounded-full shadow-lg"
        aria-label="Demo switcher"
        title="Demo switcher"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </Button>
    </div>
  );
}
