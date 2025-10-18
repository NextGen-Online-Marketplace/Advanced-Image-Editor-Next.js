"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  options: string[];
  value: string;
  onChangeAction: (val: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  width?: number | string;
  autoFocus?: boolean;
};

// A lightweight, dependency-free combobox with type-ahead filtering and keyboard navigation
export default function LocationSearch({
  options,
  value,
  onChangeAction,
  placeholder = "Select location…",
  allowCustom = true,
  width = 180,
  autoFocus = false,
}: Props) {
  const [query, setQuery] = useState<string>(value || "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? options.filter(o => o.toLowerCase().includes(q)) : options;
    return base.slice(0, 100); // safety cap
  }, [options, query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const commit = (val: string) => {
    onChangeAction(val);
    setOpen(false);
    setHighlight(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered.length > 0) {
        commit(filtered[highlight]);
      } else if (allowCustom) {
        commit(query.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: typeof width === "number" ? `${width}px` : (width || "100%"),
            padding: "0.5rem 2rem 0.5rem 0.5rem",
            fontSize: "0.75rem",
            borderRadius: "0.25rem",
            border: "1px solid #d1d5db",
            outline: "none",
            backgroundColor: "white",
          }}
          onBlur={(e) => {
            // Keep dropdown open while clicking inside the list
            // Delay to allow option click to register
            setTimeout(() => {
              if (!containerRef.current?.contains(document.activeElement)) {
                setOpen(false);
              }
            }, 120);
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => commit("")}
            aria-label="Clear"
            style={{
              position: "absolute",
              right: 4,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              fontSize: 14,
              padding: 2,
            }}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 30,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 220,
            overflowY: "auto",
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "8px 10px", fontSize: 12, color: "#6b7280" }}>
              {allowCustom ? "Press Enter to use custom value" : "No results"}
            </div>
          ) : (
            filtered.map((opt, i) => (
              <div
                key={`${opt}-${i}`}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(opt)}
                role="option"
                aria-selected={i === highlight}
                style={{
                  padding: "8px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  background: i === highlight ? "#eff6ff" : "white",
                  color: "#111827",
                }}
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
