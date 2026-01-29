"use client";

import { hasUsers, login } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { OrbitLoader } from "@/components/auth/orbit-loader";
import { PinInput } from "@/components/auth/pin-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PIN_LENGTH } from "@/lib/config";
import { Loader2, LogIn, ShieldCheck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingUsers, setCheckingUsers] = useState(true);

  useEffect(() => {
    // Check if users exist, redirect to setup if not
    hasUsers().then((exists) => {
      if (!exists) {
        router.push("/setup");
      } else {
        setCheckingUsers(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(username, pin);
      console.log("Login result:", result);
      if (result.success) {
        // Use full page reload to ensure cookie is sent with next request
        window.location.href = "/";
      } else {
        setError(result.error || "Login failed");
        setPin(""); // Clear PIN on error
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (checkingUsers) {
    return (
      <AuthShell
        badge="Login"
        title="LiveOS"
        subtitle="Preparing sign-in…"
        icon={<LogIn className="h-5 w-5 text-white/80" />}
      >
        <div className="flex justify-center py-12">
          <OrbitLoader />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="Login"
      title="Welcome back"
      subtitle="Sign in to LiveOS"
      icon={<LogIn className="h-5 w-5 text-white/80" />}
      widthClass="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/25">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/80">Username</p>
              <p className="text-xs text-white/50">Your LiveOS account id</p>
            </div>
          </div>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            required
            autoComplete="username"
            autoFocus
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/40"
            disabled={loading}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/25">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-white/80">
                Enter your {PIN_LENGTH}-digit PIN
              </p>
              <p className="text-xs text-white/50">Secure authentication code</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <PinInput value={pin} onChange={setPin} disabled={loading} center />
            {error && <p className="text-sm text-red-300">{error}</p>}
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !username || pin.length !== PIN_LENGTH}
          className="w-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Sign In
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
