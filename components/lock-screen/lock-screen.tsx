"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, verifyPin, type AuthUser } from "@/app/actions/auth";
import { card } from "@/components/ui/design-tokens";
import { UserHeader } from "./user-header";
import { PinInputForm } from "./pin-input-form";

type LockScreenProps = {
  open: boolean;
  onUnlock: () => void;
};

export function LockScreen({ open, onUnlock }: LockScreenProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Clear entry state when lock screen is shown
  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
    }
  }, [open]);

  // Load current user
  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((err) => {
        console.error("Failed to load user for lock screen:", err);
      })
      .finally(() => {
        if (active) setLoadingUser(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const friendlyName = user?.username ?? (loadingUser ? "Loading user..." : "User");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pin.length !== 4 || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const result = await verifyPin(pin);
      if (result.success) {
        setPin("");
        setError("");
        onUnlock();
      } else {
        setError(result.error || "Invalid PIN");
      }
    } catch (err) {
      console.error("Failed to verify PIN:", err);
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/60 backdrop-blur-3xl px-4">
      <div className={`w-full max-w-lg space-y-8 rounded-3xl ${card.base} p-10`}>
        <UserHeader username={friendlyName} loading={loadingUser} />
        <PinInputForm
          pin={pin}
          onPinChange={setPin}
          error={error}
          submitting={submitting}
          username={friendlyName}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
