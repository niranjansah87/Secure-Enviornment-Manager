"use client";

import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Terminal, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/context/workspace-context";
import { ApiError } from "@/lib/sem-api";

export function ForceChangePassword() {
  const { displayName, changePassword, logout } = useWorkspace();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!currentPassword) return "ERR_EMPTY_FIELD: Enter your current temporary password.";
    if (newPassword.length < 8) return "ERR_POLICY_VIOLATION: New password must be at least 8 characters.";
    if (newPassword === currentPassword) return "ERR_REUSE: New password must differ from the current one.";
    if (newPassword !== confirm) return "ERR_MISMATCH: Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password updated. All sessions rotated.");
    } catch (e2) {
      setError(e2 instanceof ApiError ? `ERR_${e2.status || 400}: ${e2.message}` : "ERR_FAILED: Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      {/* Terminal Window */}
      <div className="w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#090d16]/95 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden font-mono select-none">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d121f] border-b border-white/[0.08]">
          {/* 3 macOS / Linux Dots */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]/90 border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]/90 border border-[#dea123]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]/90 border border-[#1aab29]" />
          </div>

          {/* Session Title */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span>sem passwd --update</span>
          </div>

          {/* Status Chip */}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>policy: required</span>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Boot & Security Notice */}
          <div className="space-y-1 pb-3 border-b border-white/[0.06] text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-200 font-bold">Password Rotation Policy</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">tty1</span>
            </div>
            <p className="text-zinc-400 leading-normal">
              First-time login detected. You must set a permanent password before unlocking your workspace.
            </p>
          </div>

          {/* Target Identity Pill */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-black/50 border border-white/[0.08] text-[11px]">
            <span className="text-zinc-500">identity:</span>
            <span className="text-white font-semibold">{displayName}</span>
            <span className="ml-auto text-[10px] text-zinc-500">[unprivileged]</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <TerminalPasswordField
              prompt="auth@sem:~$ enter current_password:"
              value={currentPassword}
              onChange={(v) => {
                setCurrentPassword(v);
                setError(null);
              }}
              show={showCurrent}
              onToggle={() => setShowCurrent((s) => !s)}
              placeholder="temporary password..."
              autoFocus
            />

            <TerminalPasswordField
              prompt="vault@sem:~$ enter new_password (min 8 chars):"
              value={newPassword}
              onChange={(v) => {
                setNewPassword(v);
                setError(null);
              }}
              show={showNew}
              onToggle={() => setShowNew((s) => !s)}
              placeholder="at least 8 characters..."
            />

            <TerminalPasswordField
              prompt="vault@sem:~$ confirm new_password:"
              value={confirm}
              onChange={(v) => {
                setConfirm(v);
                setError(null);
              }}
              show={showNew}
              onToggle={() => setShowNew((s) => !s)}
              placeholder="repeat new password..."
            />

            {/* Error Message */}
            {error && (
              <div className="p-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300 leading-relaxed font-mono">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void logout()}
                className="h-10 px-4 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] font-mono text-xs transition-colors"
              >
                $ exit
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-10 bg-white hover:bg-zinc-200 text-zinc-950 font-mono font-bold rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-zinc-950 animate-ping" />
                    <span>hashing & rotating...</span>
                  </span>
                ) : (
                  <>
                    <span>$ sem passwd --commit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Terminal Footer */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10.5px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>cipher: Argon2id (zero-knowledge)</span>
            </span>
            <span>secure session</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminalPasswordField({
  prompt,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  autoFocus,
}: {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
        <span className="text-zinc-500">{prompt}</span>
      </div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 bg-black/60 border border-white/[0.12] rounded-xl pl-3.5 pr-10 text-xs text-white placeholder:text-zinc-600 focus:border-white/40 focus:outline-none font-mono"
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
