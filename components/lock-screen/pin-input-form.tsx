"use client";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { card, iconBox, text, button } from "@/components/ui/design-tokens";
import { Loader2, ShieldCheck, User } from "lucide-react";

interface PinInputFormProps {
  pin: string;
  onPinChange: (value: string) => void;
  error: string;
  submitting: boolean;
  username: string;
  onSubmit: (e: React.FormEvent) => void;
}

export function PinInputForm({
  pin,
  onPinChange,
  error,
  submitting,
  username,
  onSubmit,
}: PinInputFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className={`${card.base} ${card.padding.lg} shadow-inner shadow-black/30`}>
        {/* User prompt */}
        <div className="mb-4 flex items-center gap-3">
          <div className={`${iconBox.md} rounded-full`}>
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className={text.subdued}>Enter your 4-digit PIN</p>
            <p className="text-xs text-zinc-500">Unlock LiveOS for {username}</p>
          </div>
        </div>

        {/* PIN Input */}
        <div className="flex flex-col items-center gap-4">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={onPinChange}
            autoFocus
            disabled={submitting}
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              <InputOTPSlot
                mask
                index={0}
                className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur"
              />
              <InputOTPSlot
                mask
                index={1}
                className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur"
              />
              <InputOTPSlot
                mask
                index={2}
                className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur"
              />
              <InputOTPSlot
                mask
                index={3}
                className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur"
              />
            </InputOTPGroup>
          </InputOTP>

          {/* Error message */}
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={pin.length !== 4 || submitting}
        className={`w-full ${button.ghost}`}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Unlocking...
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Unlock
          </>
        )}
      </Button>
    </form>
  );
}
