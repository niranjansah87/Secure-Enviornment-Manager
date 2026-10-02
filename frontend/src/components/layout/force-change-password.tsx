"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    if (!currentPassword) return "Enter your current (temporary) password.";
    if (newPassword.length < 8) return "New password must be at least 8 characters.";
    if (newPassword === currentPassword) return "New password must differ from the current one.";
    if (newPassword !== confirm) return "Passwords do not match.";
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
      toast.success("Password updated. Other sessions were signed out.");
      // mustChangePassword is cleared in context → overlay disappears.
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-zinc-900/95 p-8 shadow-2xl ring-1 ring-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Set a new password</h2>
            <p className="text-xs text-zinc-500">You must change your password before continuing.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white/5 border border-white/8">
          <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <p className="text-sm font-medium text-zinc-200">{displayName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordField
            label="Current (temporary) password"
            value={currentPassword}
            onChange={(v) => {
              setCurrentPassword(v);
              setError(null);
            }}
            show={showCurrent}
            onToggle={() => setShowCurrent((s) => !s)}
            placeholder="The password you just signed in with"
            autoFocus
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={(v) => {
              setNewPassword(v);
              setError(null);
            }}
            show={showNew}
            onToggle={() => setShowNew((s) => !s)}
            placeholder="At least 8 characters"
          />
          <PasswordField
            label="Confirm new password"
            value={confirm}
            onChange={(v) => {
              setConfirm(v);
              setError(null);
            }}
            show={showNew}
            onToggle={() => setShowNew((s) => !s)}
            placeholder="Repeat new password"
          />

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => void logout()} className="text-zinc-500 hover:text-zinc-300 text-sm">
              Sign out
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white h-10">
              {loading ? "Saving…" : "Set password & continue"}
            </Button>
          </div>
        </form>

        <div className="mt-5 flex items-center gap-2 text-xs text-zinc-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/60" />
          Passwords are hashed with Argon2id. They are never stored in plain text.
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-zinc-400">{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10 bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 h-10"
          autoFocus={autoFocus}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
