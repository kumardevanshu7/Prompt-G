import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { UserProfile } from '../types/prompt';
import { saveUserProfile } from '../services/firebase';

interface OnboardingModalProps {
  isOpen: boolean;
  initialName?: string;
  uid: string;
  email?: string;
  photoURL?: string;
  onComplete: (profile: UserProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialName = '',
  uid,
  email = '',
  photoURL = '',
  onComplete,
}) => {
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initialName when Google Auth resolves
  useEffect(() => {
    if (initialName && !name) {
      setName(initialName);
    }
  }, [initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const profile: UserProfile = {
        uid,
        name: name.trim(),
        gender: gender ? gender : undefined,
        email,
        photoURL,
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(profile);
      onComplete(profile);
    } catch (err: unknown) {
      console.error('Error saving onboarding profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md bg-white rounded-[36px] shadow-2xl border border-zinc-100 p-7 overflow-hidden">
        
        {/* Top Icon Badge */}
        <div className="flex items-center justify-center mb-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-zinc-200">
              <span className="font-extrabold font-mono text-xl tracking-wider bg-gradient-to-tr from-amber-200 via-amber-400 to-amber-300 bg-clip-text text-transparent">
                {(() => {
                  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
                  if (parts.length === 0) return 'PG';
                  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                })()}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-zinc-900 flex items-center justify-center shadow">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
            Welcome to Prompt<span className="text-amber-500">G</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Confirm your profile to enter your vault
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
              {error}
            </div>
          )}

          {/* 1. Name */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              Your Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Devanshu Kumar"
              className="w-full px-4 py-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white text-sm font-semibold transition-all"
            />
          </div>

          {/* 2. Gender Selection (Pills) */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Gender <span className="text-zinc-400 text-[10px] normal-case">(Optional)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'male', label: 'Male' },
                  { id: 'female', label: 'Female' },
                  { id: 'other', label: 'Other' },
                ] as const
              ).map((item) => {
                const isSelected = gender === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGender(item.id)}
                    className={`py-3 px-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-md shadow-zinc-900/10'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Complete Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-4 px-6 rounded-full bg-zinc-900 hover:bg-black text-white font-bold text-sm tracking-wide shadow-lg shadow-zinc-900/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving Profile...</span>
            ) : (
              <>
                <span>Enter Your Vault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
