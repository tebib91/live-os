"use client";

import { PinInput } from "@/components/auth/pin-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PIN_LENGTH } from "@/lib/config";
import { Loader2 } from "lucide-react";

type RegisterStepProps = {
  username: string;
  pin: string;
  confirmPin: string;
  loading: boolean;
  error: string;
  onUsernameChange: (value: string) => void;
  onPinChange: (value: string) => void;
  onConfirmPinChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function RegisterStep({
  username,
  pin,
  confirmPin,
  loading,
  error,
  onUsernameChange,
  onPinChange,
  onConfirmPinChange,
  onSubmit,
}: RegisterStepProps) {
  const pinMatch = pin.length === PIN_LENGTH && pin === confirmPin;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
        This account has full system access. Choose a memorable username and a{" "}
        {PIN_LENGTH}-digit PIN.
      </div>

      <div className="space-y-2">
        <Label htmlFor="username" className="text-white/90">
          Username
        </Label>
        <Input
          id="username"
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="Choose a username"
          required
          minLength={3}
          autoComplete="username"
          className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/40"
          disabled={loading}
        />
        <p className="text-xs text-white/50">At least 3 characters</p>
      </div>

      <div className="space-y-2">
        <Label className="text-white/90">Create PIN</Label>
        <div className="flex justify-center">
          <PinInput
            value={pin}
            onChange={onPinChange}
            disabled={loading}
            center
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white/90">Confirm PIN</Label>
        <div className="relative flex justify-center">
          <PinInput
            value={confirmPin}
            onChange={onConfirmPinChange}
            disabled={loading}
            center
          />
          {/* {pinMatch && (
            <CheckCircle2 className="absolute -right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
          )} */}
        </div>
        {confirmPin.length === PIN_LENGTH && !pinMatch && (
          <p className="text-xs text-red-400 text-center">PINs do not match</p>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading || !username || !pinMatch}
        className="w-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create admin account"
        )}
      </Button>
    </form>
  );
}
