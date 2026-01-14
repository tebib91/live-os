"use client";

import { hasUsers, login } from "@/app/actions/auth";
import { WallpaperLayout } from "@/components/layout/wallpaper-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
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

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);
  };

  if (checkingUsers) {
    return (
      <WallpaperLayout>
        <div className="min-h-screen flex items-center justify-center bg-zinc-950/60 backdrop-blur-3xl">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </WallpaperLayout>
    );
  }

  return (
    <WallpaperLayout>
      <div className="min-h-screen flex items-center justify-center bg-zinc-950/60 backdrop-blur-3xl px-4">
        <div className="w-full max-w-lg space-y-8 rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/40">
          {/* Header with Icon */}
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10">
              <LogIn className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-300">
                Welcome Back
              </p>
              <p className="text-2xl font-semibold text-white leading-tight">
                LiveOS
              </p>
              <p className="text-sm text-zinc-400">
                Sign in to access your dashboard
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Card */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-inner shadow-black/30">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-zinc-300">Enter your username</p>
                  <p className="text-xs text-zinc-500">
                    Your LiveOS account identifier
                  </p>
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
                className="bg-white/5 border-white/20 text-white placeholder:text-zinc-500 focus-visible:ring-white/30 backdrop-blur"
                disabled={loading}
              />
            </div>

            {/* PIN Card */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-inner shadow-black/30">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-zinc-300">
                    Enter your 4-digit PIN
                  </p>
                  <p className="text-xs text-zinc-500">
                    Secure authentication code
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={4}
                  value={pin}
                  onChange={setPin}
                  disabled={loading}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot
                      index={0}
                      className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur"
                    />
                    <InputOTPSlot
                      index={1}
                      className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur"
                    />
                    <InputOTPSlot
                      index={2}
                      className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur"
                    />
                    <InputOTPSlot
                      index={3}
                      className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur"
                    />
                  </InputOTPGroup>
                </InputOTP>

                {error && <p className="text-sm text-red-300">{error}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !username || pin.length !== 4}
              className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/20"
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
        </div>
      </div>
    </WallpaperLayout>
  );
}
