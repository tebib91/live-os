"use client";

import { hasUsers, registerUser } from "@/app/actions/auth";
import { installInternalApp } from "@/app/actions/internal-apps";
import { updateSettings } from "@/app/actions/settings";
import { AuthShell } from "@/components/auth/auth-shell";
import { OrbitLoader } from "@/components/auth/orbit-loader";
import { PostSetup } from "@/components/auth/post-setup";
import { RegisterStep } from "@/components/auth/register-step";
import { PIN_LENGTH, VERSION } from "@/lib/config";
import { CheckCircle2, Rocket, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Step, TailscaleIntent, TailscaleStatus } from "@/types/setup";

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingUsers, setCheckingUsers] = useState(true);
  const [step, setStep] = useState<Step>("register");
  const [locationStatus, setLocationStatus] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tailscaleIntent, setTailscaleIntent] =
    useState<TailscaleIntent>("pending");
  const [tailscaleStatus, setTailscaleStatus] =
    useState<TailscaleStatus>("idle");
  const [tailscaleError, setTailscaleError] = useState<string | null>(null);

  useEffect(() => {
    hasUsers().then((exists) => {
      if (exists) {
        router.push("/login");
      } else {
        setCheckingUsers(false);
      }
    });
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }

    if (pin.length !== PIN_LENGTH) {
      setError(`PIN must be exactly ${PIN_LENGTH} digits`);
      return;
    }

    if (!(pin.length === PIN_LENGTH && pin === confirmPin)) {
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
    setLocationStatus("Requesting location…");
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationStatus("Saving location…");
        try {
          await updateSettings({
            userLatitude: latitude,
            userLongitude: longitude,
          });
          setLocationStatus("Location saved for widgets and weather.");
        } catch (err) {
          setLocationError(
            (err as Error)?.message || "Failed to save location",
          );
          setLocationStatus("");
        }
      },
      (err) => {
        setLocationError(err.message || "Failed to get location");
        setLocationStatus("");
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  };

  const handleTailscaleChoice = async (
    choice: Exclude<TailscaleIntent, "pending">,
  ) => {
    setTailscaleIntent(choice);
    setTailscaleError(null);

    if (choice === "auto") {
      if (tailscaleStatus === "installing" || tailscaleStatus === "installed")
        return;
      setTailscaleStatus("installing");
      const result = await installInternalApp("tailscale");
      if (result.success) {
        setTailscaleStatus("installed");
      } else {
        setTailscaleStatus("error");
        setTailscaleError(result.error || "Failed to install Tailscale.");
      }
    } else {
      if (tailscaleStatus !== "installed") {
        setTailscaleStatus("idle");
      }
    }
  };

  const handleFinish = () => router.push("/login");

  if (checkingUsers) {
    return (
      <AuthShell
        badge="Setup"
        title="LiveOS"
        subtitle="Preparing first-time setup…"
        icon={<Rocket className="h-5 w-5 text-white/80" />}
      >
        <div className="flex justify-center py-12">
          <OrbitLoader />
        </div>
      </AuthShell>
    );
  }

  if (step === "next") {
    return (
      <AuthShell
        badge="Setup"
        title="Account created"
        subtitle="Optional preferences before you sign in"
        icon={<CheckCircle2 className="h-6 w-6 text-emerald-300" />}
        widthClass="max-w-4xl"
      >
        <PostSetup
          locationStatus={locationStatus}
          locationError={locationError}
          tailscaleIntent={tailscaleIntent}
          tailscaleStatus={tailscaleStatus}
          tailscaleError={tailscaleError}
          onUseLocation={handleUseLocation}
          onTailscaleChoice={handleTailscaleChoice}
          version={VERSION}
          onFinish={handleFinish}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      badge="Setup"
      title="Create your admin"
      subtitle="Set a username and a secure PIN"
      icon={<ShieldCheck className="h-5 w-5 text-white/80" />}
      widthClass="max-w-2xl"
    >
      <RegisterStep
        username={username}
        pin={pin}
        confirmPin={confirmPin}
        loading={loading}
        error={error}
        onUsernameChange={setUsername}
        onPinChange={setPin}
        onConfirmPinChange={setConfirmPin}
        onSubmit={handleSubmit}
      />
    </AuthShell>
  );
}
