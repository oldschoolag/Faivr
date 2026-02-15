"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "DeFi", "Security", "Data", "Trading"] as const;
type Category = (typeof CATEGORIES)[number];

interface AgentSearchProps {
  onSearch: (query: string) => void;
  onFilter: (category: Category) => void;
  activeFilter: string;
}

export function AgentSearch({ onSearch, onFilter, activeFilter }: AgentSearchProps) {
  const [query, setQuery] = useState("");

  // Debounce
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
      <div className="relative group max-w-md w-full">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 transition-colors group-focus-within:text-emerald-500"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search agents…"
          aria-label="Search agents"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleFilter(cat)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
              activeFilter === cat
                ? "bg-white text-black"
                : "border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
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
