"use client";

import { hasUsers, registerUser } from "@/app/actions/auth";
import { WallpaperLayout } from "@/components/layout/wallpaper-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { VERSION } from "@/lib/config";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateSettings } from "../actions/settings";

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingUsers, setCheckingUsers] = useState(true);
   const [step, setStep] = useState<"register" | "next">("register");
   const [locationStatus, setLocationStatus] = useState<string>("");
   const [locationError, setLocationError] = useState<string | null>(null);
   const [tailscaleIntent, setTailscaleIntent] = useState<"pending" | "skip" | "go">("pending");

  useEffect(() => {
    // Check if users already exist, redirect to login if they do
    hasUsers().then((exists) => {
      if (exists) {
        router.push("/login");
      } else {
        setCheckingUsers(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate
    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    if (pin.length !== 4) {
      setError("PIN must be exactly 4 digits");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    setLoading(true);

    const res = await registerUser(username, pin, { skipRedirect: true });

    if (res?.success === false) {
      setError(res.error || "An unknown error occurred");
      setLoading(false);
    } else {
      setStep("next");
      setLoading(false);
    }
  };

  const handleUseLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation not supported in this browser");
      return;
    }
    setLocationStatus("Requesting location...");
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus("Saving location...");
        try {
          await updateSettings({
            userLatitude: latitude,
            userLongitude: longitude,
          });
          setLocationStatus("Location saved for widgets and weather.");
        } catch (err) {
          setLocationError((err as Error)?.message || "Failed to save location");
          setLocationStatus("");
        }
      },
      (err) => {
        setLocationError(err.message || "Failed to get location");
        setLocationStatus("");
      },
      { timeout: 10000, maximumAge: 600000 }
    );
  };

  const handleFinish = () => {
    router.push("/login");
  };

  if (step === "next") {
    return (
      <WallpaperLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-6 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-8 shadow-2xl">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white drop-shadow">Account created</h2>
              <p className="text-zinc-300">Set these optional preferences now or adjust later in Settings.</p>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold">Location (optional)</div>
                    <div className="text-sm text-white/70">
                      Improves weather and widget defaults. Uses browser geolocation one time.
                    </div>
                  </div>
                  <Button variant="ghost" onClick={handleUseLocation} className="border border-white/15 text-white">
                    Use my location
                  </Button>
                </div>
                {locationStatus && <p className="text-xs text-emerald-300 mt-2">{locationStatus}</p>}
                {locationError && <p className="text-xs text-red-400 mt-2">{locationError}</p>}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold">Tailscale (optional)</div>
                    <div className="text-sm text-white/70">
                      Secure remote access. You can install the internal Tailscale app after login.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={tailscaleIntent === "go" ? "default" : "ghost"}
                      className="border border-white/15 text-white"
                      onClick={() => {
                        setTailscaleIntent("go");
                        router.push("/"); // open home after login; install via App Store/internal apps
                      }}
                    >
                      Install later
                    </Button>
                    <Button
                      variant="ghost"
                      className="border border-white/15 text-white"
                      onClick={() => {
                        setTailscaleIntent("skip");
                      }}
                    >
                      Skip
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-white/60 mt-2">
                  After logging in, open the App Store or run the internal Tailscale compose under `internal-apps/tailscale`.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleFinish} className="bg-blue-600 hover:bg-blue-700 text-white">
                Go to login
              </Button>
            </div>
          </div>
        </div>
      </WallpaperLayout>
    );
  }

  if (checkingUsers) {
    return (
      <WallpaperLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </WallpaperLayout>
    );
  }

  const pinMatch = pin.length === 4 && pin === confirmPin;

  return (
    <WallpaperLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
              Welcome to LiveOS
            </h1>
            <p className="text-zinc-200 drop-shadow-md">
              Create your admin account to get started
            </p>
          </div>

          {/* Setup Form */}
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  This will be your admin account with full system access.
                  Choose a memorable username and 4-digit PIN.
                </p>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-zinc-200">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  minLength={3}
                  autoComplete="username"
                  className="bg-zinc-800/90 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                />
                <p className="text-xs text-zinc-400">At least 3 characters</p>
              </div>

              {/* PIN */}
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-zinc-200">
                  Create PIN
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={pin}
                    onChange={setPin}
                    disabled={loading}
                    pattern="[0-9]*"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot
                        mask
                        index={0}
                        className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl"
                      />
                      <InputOTPSlot
                        mask
                        index={1}
                        className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl"
                      />
                      <InputOTPSlot
                        mask
                        index={2}
                        className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl"
                      />
                      <InputOTPSlot
                        mask
                        index={3}
                        className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* Confirm PIN */}
              <div className="space-y-2">
                <Label htmlFor="confirmPin" className="text-zinc-200">
                  Confirm PIN
                </Label>
                <div className="flex justify-center">
                  <div className="relative">
                    <InputOTP
                      maxLength={4}
                      value={confirmPin}
                      onChange={setConfirmPin}
                      disabled={loading}
                      pattern="[0-9]*"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot
                          mask
                          index={0}
                          className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl"
                        />
                        <InputOTPSlot
                          mask
                          index={1}
                          className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl"
                        />
                        <InputOTPSlot
                          mask
                          index={2}
                          className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl"
                        />
                        <InputOTPSlot
                          mask
                          index={3}
                          className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                    {pinMatch && (
                      <CheckCircle2 className="absolute -right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
                {confirmPin.length === 4 && !pinMatch && (
                  <p className="text-xs text-red-400 text-center">
                    PINs do not match
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !username || !pinMatch}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Admin Account"
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-zinc-200 drop-shadow-md">
            LiveOS - Self-hosted infrastructure management
          </p>
          <span className="block text-center text-xs text-zinc-400">
            Version {VERSION}
          </span>
        </div>
      </div>
    </WallpaperLayout>
  );
}
