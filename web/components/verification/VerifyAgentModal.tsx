"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, FileText, Twitter, CheckCircle, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { VerifiedBadge } from "./VerifiedBadge";

type Method = "dns" | "file" | "twitter";
type Step = "choose" | "challenge" | "checking" | "success" | "error";

interface VerifyAgentModalProps {
  agentId: number;
  agentName: string;
  isOpen: boolean;
  onClose: () => void;
  onVerified?: () => void;
}

const methods: { id: Method; label: string; icon: typeof Globe; description: string }[] = [
  { id: "dns", label: "DNS TXT Record", icon: Globe, description: "Add a TXT record to your domain's DNS" },
  { id: "file", label: ".well-known File", icon: FileText, description: "Host a verification file on your domain" },
  { id: "twitter", label: "Twitter / X", icon: Twitter, description: "Post a verification tweet from your account" },
];

export function VerifyAgentModal({ agentId, agentName, isOpen, onClose, onVerified }: VerifyAgentModalProps) {
  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<Method>("dns");
  const [domain, setDomain] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setStep("choose");
    setMethod("dns");
    setDomain("");
    setChallengeToken("");
    setInstructions("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const generateChallenge = async () => {
    if (!domain.trim()) {
      setError("Please enter a domain");
      return;
    }

    try {
      const res = await fetch("/api/verify/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, domain: domain.trim(), method }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate challenge");
        return;
      }

      setChallengeToken(data.challengeToken);
      setInstructions(data.instructions);
      setStep("challenge");
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const checkVerification = async () => {
    setStep("checking");
    try {
      const res = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, challengeToken, method }),
      });
      const data = await res.json();

      if (data.verified) {
        setStep("success");
        onVerified?.();
      } else {
        setError(data.message || "Verification not detected yet. Please try again.");
        setStep("challenge");
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("challenge");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Verify {agentName}
            </h2>
            <button onClick={handleClose} className="rounded-lg p-1 text-zinc-400 hover:bg-white/5 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step: Choose Method */}
          {step === "choose" && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Domain</label>
                <input
                  type="text"
                  placeholder="example.com"
                  value={domain}
                  onChange={(e) => { setDomain(e.target.value); setError(""); }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">Verification Method</label>
                <div className="space-y-2">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                        method === m.id
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <m.icon className={`h-5 w-5 ${method === m.id ? "text-emerald-400" : "text-zinc-500"}`} />
                      <div>
                        <div className={`text-sm font-medium ${method === m.id ? "text-emerald-300" : "text-zinc-300"}`}>
                          {m.label}
                        </div>
                        <div className="text-xs text-zinc-500">{m.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <Button onClick={generateChallenge} className="w-full">
                Generate Challenge
              </Button>
            </div>
          )}

          {/* Step: Show Challenge */}
          {step === "challenge" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <p className="mb-3 text-sm text-zinc-300">Follow these instructions:</p>
                <div className="relative rounded-lg bg-black/40 p-3">
                  <pre className="whitespace-pre-wrap text-xs text-emerald-300">{instructions}</pre>
                  <button
                    onClick={() => copyToClipboard(challengeToken)}
                    className="absolute right-2 top-2 rounded p-1 text-zinc-500 hover:text-white"
                    title="Copy token"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setStep("choose"); setError(""); }} className="flex-1">
                  Back
                </Button>
                <Button onClick={checkVerification} className="flex-1">
                  Check Verification
                </Button>
              </div>
            </div>
          )}

          {/* Step: Checking */}
          {step === "checking" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-sm text-zinc-400">Checking verification...</p>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
                <VerifiedBadge size="lg" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Agent Verified!</h3>
              <p className="mb-6 text-center text-sm text-zinc-400">
                {agentName} is now verified for {domain}. A soulbound verification NFT will be minted to your wallet.
              </p>
              <Button onClick={handleClose}>Done</Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
