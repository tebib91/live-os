"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PIN_LENGTH } from "@/lib/config";
import type { Dispatch, SetStateAction } from "react";

type PinInputProps = {
  value: string;
  onChange: Dispatch<SetStateAction<string>> | ((value: string) => void);
  disabled?: boolean;
  center?: boolean;
};

export function PinInput({ value, onChange, disabled, center }: PinInputProps) {
  return (
    <InputOTP
      maxLength={PIN_LENGTH}
      value={value}
      onChange={onChange}
      disabled={disabled}
      containerClassName={center ? "justify-center" : undefined}
      pattern="[0-9]*"
    >
      <InputOTPGroup className="gap-3">
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <InputOTPSlot
            key={index}
            mask
            index={index}
            className="h-12 w-12 rounded-xl border border-white/20 bg-white/5 text-xl text-white backdrop-blur focus:border-white/40"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
