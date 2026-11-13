'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Single-device remembered username check
    try {
      const savedUser = localStorage.getItem('cafe_pos_remembered_username');
      const savedRemember = localStorage.getItem('cafe_pos_remember_device');
      if (savedUser) {
        setUsername(savedUser);
        setRememberMe(savedRemember !== 'false');
      }
    } catch {
      // Ignore localStorage access restrictions if any
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          rememberMe,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        return;
      }

      // Manage single-device remembered state
      try {
        if (rememberMe) {
          localStorage.setItem('cafe_pos_remembered_username', username.trim().toLowerCase());
          localStorage.setItem('cafe_pos_remember_device', 'true');
        } else {
          localStorage.removeItem('cafe_pos_remembered_username');
          localStorage.setItem('cafe_pos_remember_device', 'false');
        }
      } catch {
        // Ignore
      }

      // Seamlessly navigate to dashboard in the same window
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8EB] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and Cafe Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E5AE45] mb-3 shadow-sm">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#3C2A20]">Cafe POS</h1>
          <p className="text-sm text-[#8B7355] mt-1 font-medium">Floor & Order Management System</p>
        </div>

        <div className="card p-8 shadow-sm border border-[#E8DCC8]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-[#C44536] px-4 py-3 rounded-lg text-xs font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="label-text">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field text-sm"
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus={!username}
              />
            </div>

            <div>
              <label htmlFor="password" className="label-text">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-11 text-sm"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  autoFocus={!!username}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7355] hover:text-[#3C2A20]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me on this device checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#E5AE45] focus:ring-[#E5AE45] border-[#E8DCC8] accent-[#E5AE45]"
                />
                <span className="text-xs font-medium text-[#3C2A20]">
                  Remember me on this device
                </span>
              </label>
              <p className="text-[10px] text-[#8B7355] mt-0.5 ml-6">
                Keeps your session active and pre-fills your username on this computer or tablet.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-bold text-sm shadow-sm"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>

        {/* Private System Notice */}
        <p className="text-center text-[11px] text-[#8B7355] mt-6">
          Authorized staff & management portal only. Contact the cafe owner for account access.
        </p>
      </div>
    </div>
  );
}
