'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser, hasUsers } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { WallpaperLayout } from '@/components/layout/wallpaper-layout';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingUsers, setCheckingUsers] = useState(true);

  useEffect(() => {
    // Check if users already exist, redirect to login if they do
    hasUsers().then((exists) => {
      if (exists) {
        router.push('/login');
      } else {
        setCheckingUsers(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser(username, pin);

      if (result.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (
    value: string,
    setter: (value: string) => void
  ) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setter(cleaned);
  };

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
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">Welcome to LiveOS</h1>
            <p className="text-zinc-200 drop-shadow-md">Create your admin account to get started</p>
          </div>

          {/* Setup Form */}
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  This will be your admin account with full system access. Choose a
                  memorable username and 4-digit PIN.
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
                <p className="text-xs text-zinc-400">
                  At least 3 characters
                </p>
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
                      <InputOTPSlot index={0} className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl" />
                      <InputOTPSlot index={1} className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl" />
                      <InputOTPSlot index={2} className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl" />
                      <InputOTPSlot index={3} className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl" />
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
                        <InputOTPSlot index={0} className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl" />
                        <InputOTPSlot index={1} className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl" />
                        <InputOTPSlot index={2} className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl" />
                        <InputOTPSlot index={3} className="bg-zinc-800/90 border-zinc-700 text-white w-12 h-12 text-xl" />
                      </InputOTPGroup>
                    </InputOTP>
                    {pinMatch && (
                      <CheckCircle2 className="absolute -right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
                {confirmPin.length === 4 && !pinMatch && (
                  <p className="text-xs text-red-400 text-center">PINs do not match</p>
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
                  'Create Admin Account'
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-zinc-200 drop-shadow-md">
            LiveOS - Self-hosted infrastructure management
          </p>
        </div>
      </div>
    </WallpaperLayout>
  );
}
