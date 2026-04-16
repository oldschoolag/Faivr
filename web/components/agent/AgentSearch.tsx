"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_FILTERS = ["All", "DeFi", "Security", "Data", "Trading", "Marketing", "Other"] as const;

type Category = string;

interface AgentSearchProps {
  onSearch: (query: string) => void;
  onFilter: (category: Category) => void;
  activeFilter: string;
  filters?: string[];
}

export function AgentSearch({ onSearch, onFilter, activeFilter, filters }: AgentSearchProps) {
  const [query, setQuery] = useState("");
  const categories = filters && filters.length > 0 ? filters : [...DEFAULT_FILTERS];

  useEffect(() => {
    const timer = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleFilter = useCallback(
    (cat: Category) => {
      onFilter(cat);
    },
    [onFilter]
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-md w-full group">
        <Search
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-600"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search live agents…"
          aria-label="Search agents"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleFilter(cat)}
            className={cn(
              "rounded-full px-3.5 py-2 text-xs font-medium transition-all",
              activeFilter === cat
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            )}
            aria-pressed={activeFilter === cat}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
