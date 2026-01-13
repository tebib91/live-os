'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, hasUsers } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { WallpaperLayout } from '@/components/layout/wallpaper-layout';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingUsers, setCheckingUsers] = useState(true);

  useEffect(() => {
    // Check if users exist, redirect to setup if not
    hasUsers().then((exists) => {
      if (!exists) {
        router.push('/setup');
      } else {
        setCheckingUsers(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, pin);

      if (result.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(result.error || 'Login failed');
        setPin(''); // Clear PIN on error
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
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

  return (
    <WallpaperLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">LiveOS</h1>
            <p className="text-zinc-200 drop-shadow-md">Sign in to continue</p>
          </div>

          {/* Login Form */}
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-xl p-8 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  className="bg-zinc-800/90 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              {/* PIN */}
              <div className="space-y-2">
                <Label htmlFor="pin" className="text-zinc-200">
                  PIN
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

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !username || pin.length !== 4}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
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
