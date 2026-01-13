'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser, verifyPin, type AuthUser } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Loader2, Lock, ShieldCheck, User } from 'lucide-react';

type LockScreenProps = {
  open: boolean;
  onUnlock: () => void;
};

export function LockScreen({ open, onUnlock }: LockScreenProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Clear entry state every time the lock screen is shown
  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
    }
  }, [open]);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch((err) => {
        console.error('Failed to load user for lock screen:', err);
      })
      .finally(() => {
        if (active) {
          setLoadingUser(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const friendlyName = user?.username ?? (loadingUser ? 'Loading user...' : 'User');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pin.length !== 4 || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const result = await verifyPin(pin);
      if (result.success) {
        setPin('');
        setError('');
        onUnlock();
      } else {
        setError(result.error || 'Invalid PIN');
      }
    } catch (err) {
      console.error('Failed to verify PIN:', err);
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/60 backdrop-blur-3xl px-4">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-300">
              Locked
            </p>
            <p className="text-2xl font-semibold text-white leading-tight">
              {friendlyName}
            </p>
            <p className="text-sm text-zinc-400">
              Press Cmd + L anytime to lock the screen
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-inner shadow-black/30">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-zinc-300">Enter your 4-digit PIN</p>
                <p className="text-xs text-zinc-500">
                  Unlock LiveOS for {friendlyName}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={setPin}
                autoFocus
                disabled={submitting}
                containerClassName="justify-center"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur" />
                  <InputOTPSlot index={1} className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur" />
                  <InputOTPSlot index={2} className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur" />
                  <InputOTPSlot index={3} className="bg-white/5 text-white border-white/20 h-12 w-12 text-xl backdrop-blur" />
                </InputOTPGroup>
              </InputOTP>

              {error && (
                <p className="text-sm text-red-300">{error}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={pin.length !== 4 || submitting}
            className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/20"
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
      </div>
    </div>
  );
}
