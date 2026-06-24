"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/context/workspace-context";
import { apiBase } from "@/lib/api-base";
import { loadAccessToken, saveAuthTokens } from "@/lib/utils";

export function ForceChangePassword() {
  const { username, email, setToken, logout } = useWorkspace();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (newPassword.length < 8) return "Password must be at least 8 characters.";
    if (newPassword !== confirm) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError(null);
    try {
      const token = loadAccessToken();
      const res = await fetch(`${apiBase()}/api/v1/user/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message ?? "Failed to change password.");
        return;
      }

      // Backend returns a fresh JWT with must_change_password cleared
      const { access_token, refresh_token } = data.data as { access_token: string; refresh_token: string };
      saveAuthTokens({ accessToken: access_token, refreshToken: refresh_token });
      setToken(access_token);
      // Page will re-render with mustChangePassword = false — overlay disappears
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-zinc-900/95 p-8 shadow-2xl ring-1 ring-white/5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Set Your Password</h2>
            <p className="text-xs text-zinc-500">You must set a new password before continuing.</p>
          </div>
        </div>

        {/* User info */}
        {(username || email) && (
          <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-white/5 border border-white/8">
            <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
              {(username ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              {username && <p className="text-sm font-medium text-zinc-200">{username}</p>}
              {email && <p className="text-xs text-zinc-500">{email}</p>}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-400">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                placeholder="At least 8 characters"
                className="pr-10 bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 h-10"
                autoFocus
                required
              />
              <button type="button" onClick={() => setShowNew(s => !s)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-400">Confirm Password</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                placeholder="Repeat new password"
                className="pr-10 bg-black/40 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 h-10"
                required
              />
              <button type="button" onClick={() => setShowConfirm(s => !s)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => void logout()}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Sign out
            </Button>
            <Button
              type="submit"
              disabled={loading || !newPassword || !confirm}
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white h-10"
            >
              {loading ? "Saving…" : "Set Password & Continue"}
            </Button>
          </div>
        </form>

        <div className="mt-5 flex items-center gap-2 text-xs text-zinc-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/60" />
          Your password is hashed with PBKDF2-SHA256 (480k iterations). It is never stored in plain text.
        </div>
      </div>
    </div>
  );
}
