"use client";

import { useState, useEffect } from "react";

interface FeedbackEntry {
  id: string;
  question: string;
  answer: string;
  helpful: boolean;
  timestamp: number;
  sessionId: string;
}

export default function SupportAdminPage() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"feedback" | "frequent" | "add">("feedback");

  useEffect(() => {
    fetch("/api/support/feedback")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const frequentQuestions = (() => {
    const map = new Map<string, { count: number; helpful: number; unhelpful: number }>();
    for (const e of entries) {
      const key = e.question.toLowerCase().trim();
      const existing = map.get(key) || { count: 0, helpful: 0, unhelpful: 0 };
      existing.count++;
      if (e.helpful) existing.helpful++;
      else existing.unhelpful++;
      map.set(key, existing);
    }
    return Array.from(map.entries())
      .map(([q, stats]) => ({ question: q, ...stats }))
      .sort((a, b) => b.count - a.count);
  })();

  const addQA = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    try {
      await fetch("/api/support/admin/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQ, answer: newA }),
      });
      setNewQ("");
      setNewA("");
      alert("Added!");
    } catch {
      alert("Failed to add");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Support Admin</h1>

        <div className="flex gap-2 mb-6">
          {(["feedback", "frequent", "add"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                tab === t
                  ? "bg-violet-600 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {t === "feedback" ? "All Feedback" : t === "frequent" ? "Frequent Questions" : "Add Q&A"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-white/40">Loading...</div>
        ) : tab === "feedback" ? (
          <div className="space-y-3">
            {entries.length === 0 && (
              <div className="text-white/40">No feedback yet.</div>
            )}
            {entries
              .slice()
              .reverse()
              .map((e, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        e.helpful
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {e.helpful ? "👍 Helpful" : "👎 Unhelpful"}
                    </span>
                    <span className="text-xs text-white/30">
                      {new Date(e.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-white/80 mb-1">
                    Q: {e.question}
                  </div>
                  <div className="text-sm text-white/50 line-clamp-3">
                    A: {e.answer}
                  </div>
                </div>
              ))}
          </div>
        ) : tab === "frequent" ? (
          <div className="space-y-3">
            {frequentQuestions.length === 0 && (
              <div className="text-white/40">No data yet.</div>
            )}
            {frequentQuestions.map((q, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between"
              >
                <div className="text-sm text-white/80">{q.question}</div>
                <div className="flex gap-3 text-xs text-white/40 shrink-0 ml-4">
                  <span>×{q.count}</span>
                  <span className="text-green-400">👍{q.helpful}</span>
                  <span className="text-red-400">👎{q.unhelpful}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="text-sm text-white/60 mb-1 block">Question</label>
              <input
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                placeholder="e.g. How do I update my agent metadata?"
              />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1 block">Answer</label>
              <textarea
                value={newA}
                onChange={(e) => setNewA(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 resize-none"
                placeholder="The detailed answer..."
              />
            </div>
            <button
              onClick={addQA}
              className="px-6 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-500 transition-colors"
            >
              Add to Knowledge Base
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
