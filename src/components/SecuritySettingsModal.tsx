import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Lock, Check, Eye, EyeOff, KeyRound, AlertTriangle, RefreshCw } from 'lucide-react';
import type { UserProfile } from '../types/prompt';
import { saveUserProfile, auth, googleProvider } from '../services/firebase';
import { reauthenticateWithPopup } from 'firebase/auth';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PRESET_QUESTIONS = [
  'What is your secret passkey / word?',
  'What was the name of your first school?',
  'What is your childhood pet name?',
  'What city were you born in?',
  'What is your favorite movie or book?',
];

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
  showToast,
}) => {
  const hasExistingSetup = Boolean(userProfile?.securityQuestion && userProfile?.securityAnswer);

  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [newAnswer, setNewAnswer] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnlockedByGoogle, setIsUnlockedByGoogle] = useState(false);

  useEffect(() => {
    if (!isOpen || !userProfile) return;
    if (userProfile.securityQuestion) {
      if (PRESET_QUESTIONS.includes(userProfile.securityQuestion)) {
        setSelectedQuestion(userProfile.securityQuestion);
        setIsCustom(false);
      } else {
        setIsCustom(true);
        setCustomQuestion(userProfile.securityQuestion);
      }
    }
    // Always clear answer fields on modal open
    setCurrentAnswer('');
    setShowCurrentPassword(false);
    setNewAnswer('');
    setShowNewPassword(false);
    setError(null);
    setIsUnlockedByGoogle(false);
  }, [isOpen, userProfile]);

  if (!isOpen || !userProfile) return null;

  // Handle Google Re-Authentication to reset forgotten answer
  const handleGoogleReset = async () => {
    try {
      setIsResetting(true);
      setError(null);
      if (!auth.currentUser) {
        throw new Error('User session not found. Please sign in again.');
      }
      await reauthenticateWithPopup(auth.currentUser, googleProvider);
      setIsUnlockedByGoogle(true);
      showToast('Identity verified via Google! You can now set a new question and answer.', 'success');
    } catch (err: unknown) {
      console.error('Google re-auth failed:', err);
      setError('Google verification cancelled or failed.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If existing setup and not unlocked by Google, verify current answer
    if (hasExistingSetup && !isUnlockedByGoogle) {
      const trimmedCurrent = currentAnswer.trim();
      if (!trimmedCurrent) {
        setError('Verification required: Please enter your current secret answer.');
        return;
      }

      if (trimmedCurrent.toLowerCase() !== userProfile.securityAnswer?.trim().toLowerCase()) {
        setError('Incorrect current secret answer! Authorization denied.');
        return;
      }
    }

    const finalQuestion = isCustom ? customQuestion.trim() : selectedQuestion;
    const finalNewAnswer = newAnswer.trim();

    if (!finalQuestion) {
      setError('Please select or enter a valid security question.');
      return;
    }

    // If first time setup or resetting via Google, new answer is strictly mandatory
    if ((!hasExistingSetup || isUnlockedByGoogle) && !finalNewAnswer) {
      setError('Please provide a secret answer to your question.');
      return;
    }

    // Determine answer to save
    const answerToSave = finalNewAnswer
      ? finalNewAnswer.toLowerCase()
      : (userProfile.securityAnswer || '').toLowerCase();

    if (!answerToSave) {
      setError('Secret answer cannot be empty.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const updatedProfile: UserProfile = {
        ...userProfile,
        securityQuestion: finalQuestion,
        securityAnswer: answerToSave,
      };

      await saveUserProfile(updatedProfile);
      onProfileUpdated(updatedProfile);
      showToast(hasExistingSetup ? 'Security question updated!' : 'Delete protection activated!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to save security question:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-zinc-100 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-100 bg-[#fbfbf9] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 leading-tight">Delete Protection</h2>
              <p className="text-xs text-zinc-500">Security question required to delete prompts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-zinc-200/70 hover:bg-zinc-300 text-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {hasExistingSetup && !isUnlockedByGoogle ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Delete Protection is Active:</span>
                <p className="mt-0.5 text-emerald-800 leading-relaxed">
                  Enter your current secret answer to verify ownership before making any changes.
                </p>
              </div>
            </div>
          ) : isUnlockedByGoogle ? (
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-sky-600 shrink-0" />
              <span><strong>Google Verified:</strong> Set up your new secret question and answer below.</span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
              <span className="font-bold">🔒 Setup Delete Protection:</span> Choose a secret question & answer. Deleting any prompt will strictly require this answer.
            </div>
          )}

          {/* Current Answer Verification (Required if existing setup and not unlocked via Google) */}
          {hasExistingSetup && !isUnlockedByGoogle && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Current Secret Answer <span className="text-rose-500 font-bold">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGoogleReset}
                  disabled={isResetting}
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer"
                >
                  {isResetting ? 'Verifying...' : 'Forgot answer?'}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentAnswer}
                  onChange={(e) => {
                    setCurrentAnswer(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your current secret answer"
                  autoComplete="off"
                  autoFocus
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-zinc-200 text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  title={showCurrentPassword ? 'Hide answer' : 'Show answer'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Question Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
              {hasExistingSetup ? 'Security Question (or keep current)' : 'Select Security Question'}
            </label>
            <select
              value={isCustom ? 'custom' : selectedQuestion}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustom(true);
                } else {
                  setIsCustom(false);
                  setSelectedQuestion(e.target.value);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all cursor-pointer"
            >
              {PRESET_QUESTIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
              <option value="custom">✍️ Write my own question...</option>
            </select>
          </div>

          {/* Custom Question input if selected */}
          {isCustom && (
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                Your Custom Question
              </label>
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="e.g. Who is Alu?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
              />
            </div>
          )}

          {/* Secret Answer */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{hasExistingSetup && !isUnlockedByGoogle ? 'New Secret Answer (Leave blank to keep current)' : 'Secret Answer'}</span>
              <span className="text-[10px] text-zinc-400 font-normal lowercase">(not case-sensitive)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newAnswer}
                onChange={(e) => {
                  setNewAnswer(e.target.value);
                  setError(null);
                }}
                placeholder={hasExistingSetup && !isUnlockedByGoogle ? '•••••••• (Enter new answer if changing)' : 'Enter your secret answer'}
                autoComplete="off"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-base sm:text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                title={showNewPassword ? 'Hide answer' : 'Show answer'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{hasExistingSetup && !isUnlockedByGoogle ? 'Verify & Save Changes' : 'Save Protection'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
