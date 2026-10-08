import { useState, useEffect, useMemo, useRef } from 'react';
import type { PromptItem, UserProfile } from './types/prompt';
import {
  fetchAllPrompts,
  saveNewPrompt,
  removePromptById,
  updatePromptStatus,
  subscribeToPromptChanges,
  resetAllUserData,
} from './services/db';
import type { UploadableImage } from './services/db';
import {
  signInWithGoogle,
  logoutUser,
  onAuthChange,
  getUserProfile,
} from './services/firebase';
import { Header } from './components/Header';
import { CategoryPills } from './components/CategoryPills';
import { PromptCard } from './components/PromptCard';
import { AddPromptModal } from './components/AddPromptModal';
import { PromptDetailModal } from './components/PromptDetailModal';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { BottomNav } from './components/BottomNav';
import { ExploreView } from './components/ExploreView';
import { EmptyState } from './components/EmptyState';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Toast } from './components/Toast';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { useLenis } from './hooks/useLenis';
import { RefreshCw } from 'lucide-react';

export function App() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // User & Auth State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Modals & Selected Prompt (Store ID to avoid stale references)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  // Active Bottom Nav Tab
  const [activeTab, setActiveTab] = useState<'home' | 'labels'>('home');

  // Lenis Smooth Momentum Scroll (pauses when any full-screen modal is open)
  const isAnyModalOpen = isAddModalOpen || selectedPromptId !== null || isSecurityModalOpen || isOnboardingOpen;
  useLenis(isAnyModalOpen);

  // Toast feedback with type (success, error, info)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3200);
  };

  // Auth Listener
  useEffect(() => {
    const unsubAuth = onAuthChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile && profile.name) {
            setUserProfile(profile);
            setIsOnboardingOpen(false);
          } else {
            // New user or missing profile -> Onboarding
            setPendingGoogleUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
            });
            setIsOnboardingOpen(true);
          }
        } else {
          setUserProfile(null);
          setIsOnboardingOpen(false);
          setPendingGoogleUser(null);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // Prompts Real-time Sync (Scoped to authenticated user, direct data delivery)
  useEffect(() => {
    if (!userProfile?.uid) {
      setPrompts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial load
    fetchAllPrompts(userProfile.uid)
      .then((data) => {
        setPrompts(data);
      })
      .catch((err) => {
        console.error('Failed to load prompts:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Real-time listener: snapshot updates state directly, eliminating double reads
    const unsubscribe = subscribeToPromptChanges(userProfile.uid, (updatedPrompts) => {
      setPrompts(updatedPrompts);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [userProfile?.uid]);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const user = await signInWithGoogle();
      showToast(`Signed in as ${user.displayName || 'Creator'}`, 'success');
    } catch (err: unknown) {
      console.error('Google Sign In error:', err);
      const errorCode = (err as { code?: string })?.code;
      if (errorCode === 'auth/popup-closed-by-user') {
        showToast('Sign in cancelled', 'info');
      } else if (errorCode === 'auth/popup-blocked') {
        showToast('Popup was blocked by browser. Please allow popups.', 'error');
      } else {
        showToast('Sign in failed. Please try again.', 'error');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Full state cleanup on Logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      setUserProfile(null);
      setPrompts([]);
      setSelectedPromptId(null);
      setIsAddModalOpen(false);
      setActiveCategory('all');
      setSearchQuery('');
      setActiveTab('home');
      showToast('Logged out successfully', 'info');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Onboarding Complete Handler
  const handleOnboardingComplete = (completedProfile: UserProfile) => {
    setUserProfile(completedProfile);
    setIsOnboardingOpen(false);
    setPendingGoogleUser(null);
    showToast(`Welcome to PromptG, ${completedProfile.name}!`, 'success');
  };

  // Compute distinct labels & counts from actual prompts (normalized lowercase)
  const { categories, counts } = useMemo(() => {
    const labelCounts: Record<string, number> = { all: prompts.length };
    const labelSet = new Set<string>();

    let pendingCount = 0;
    let usedCount = 0;

    prompts.forEach((p) => {
      if (p.enableCheckmark) {
        if (p.isUsed) {
          usedCount++;
        } else {
          pendingCount++;
        }
      }

      if (p.labels && Array.isArray(p.labels)) {
        p.labels.forEach((l) => {
          const norm = l.trim();
          if (norm) {
            labelSet.add(norm);
            const lower = norm.toLowerCase();
            labelCounts[lower] = (labelCounts[lower] || 0) + 1;
            labelCounts[norm] = labelCounts[lower];
          }
        });
      }
    });

    labelCounts['__pending'] = pendingCount;
    labelCounts['__used'] = usedCount;

    return {
      categories: Array.from(labelSet),
      counts: labelCounts,
    };
  }, [prompts]);

  // Filtered prompts based on Search and Selected Label
  const filteredPrompts = useMemo(() => {
    return prompts.filter((item) => {
      if (activeCategory === '__pending') {
        if (!item.enableCheckmark || item.isUsed) return false;
      } else if (activeCategory === '__used') {
        if (!item.enableCheckmark || !item.isUsed) return false;
      } else if (activeCategory !== 'all') {
        const hasLabel = item.labels?.some(
          (l) => l.toLowerCase() === activeCategory.toLowerCase()
        );
        if (!hasLabel) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesPrompt = item.prompt.toLowerCase().includes(q);
        const matchesLabel = item.labels?.some((l) => l.toLowerCase().includes(q));

        return matchesTitle || matchesDesc || matchesPrompt || matchesLabel;
      }

      return true;
    });
  }, [prompts, activeCategory, searchQuery]);

  // Derived selected prompt object (never stale)
  const selectedPrompt = useMemo(
    () => prompts.find((p) => p.id === selectedPromptId) || null,
    [prompts, selectedPromptId]
  );

  // Distinct previous short descriptions for quick selection
  const previousDescriptions = useMemo(() => {
    const descSet = new Set<string>();
    prompts.forEach((p) => {
      const d = p.description?.trim();
      if (d) descSet.add(d);
    });
    return Array.from(descSet);
  }, [prompts]);

  // Handle saving new prompt with progress and re-throw on error
  const handleSavePrompt = async (
    promptData: Omit<PromptItem, 'id' | 'created_at' | 'images'>,
    imagesToProcess: UploadableImage[],
    onProgress?: (current: number, total: number) => void
  ) => {
    if (!userProfile) {
      showToast('Please sign in first to add prompts', 'error');
      throw new Error('Please sign in first to add prompts');
    }

    try {
      const enrichedData = {
        ...promptData,
        userId: userProfile.uid,
        userName: userProfile.name,
      };
      const saved = await saveNewPrompt(enrichedData, imagesToProcess, onProgress);
      setPrompts((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)]);
      showToast('Prompt saved successfully!', 'success');
    } catch (err: unknown) {
      console.error('Error saving prompt:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to save prompt';
      showToast(errorMsg, 'error');
      throw err; // Rethrow so AddPromptModal displays error and keeps form intact
    }
  };

  // Handle deleting prompt (deletes both Firestore document & Supabase Storage images)
  const handleDeletePrompt = async (id: string, imageUrls?: string[]) => {
    try {
      const promptToDelete = prompts.find((p) => p.id === id);
      const imagesToDelete = (imageUrls && imageUrls.length > 0) ? imageUrls : (promptToDelete?.images || []);
      await removePromptById(id, imagesToDelete);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
      if (selectedPromptId === id) setSelectedPromptId(null);
      showToast('Prompt deleted permanently', 'info');
    } catch (err: unknown) {
      console.error('Failed to delete prompt:', err);
      showToast('Failed to delete prompt', 'error');
      throw err;
    }
  };

  // DANGER: Reset entire app — delete all prompts & images from Firebase/Supabase, clear local state
  const handleResetApp = async (onProgress?: (deleted: number, total: number) => void): Promise<void> => {
    if (!userProfile?.uid) throw new Error('Not signed in');
    await resetAllUserData(userProfile.uid, onProgress);
    setPrompts([]);
    setSelectedPromptId(null);
  };

  // Handle copy prompt
  const handleCopyPrompt = (_promptText: string, title: string) => {
    showToast(`Copied: "${title}"`, 'success');
  };

  // Toggle Checkmark / Instagram posted status
  // Toggle Checkmark / Instagram posted status (One-way: Pending -> Used only)
  const handleToggleUsed = async (id: string, isUsed: boolean) => {
    // One-way rule: Once green (used), it cannot be reverted back to red
    if (!isUsed) return;
    try {
      // Optimistic update
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isUsed: true } : p))
      );
      await updatePromptStatus(id, { isUsed: true });
      showToast('Marked as Used & Uploaded! (Yes)', 'success');
    } catch (err: unknown) {
      console.error('Failed to toggle prompt status:', err);
      // Rollback on failure
      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isUsed: false } : p))
      );
      showToast('Failed to update status', 'error');
    }
  };

  // Enable or disable social status tracking on any prompt
  const handleToggleEnableTracking = async (id: string, enableCheckmark: boolean) => {
    try {
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, enableCheckmark, isUsed: enableCheckmark ? (p.isUsed ?? false) : false } : p
        )
      );
      await updatePromptStatus(id, { enableCheckmark, isUsed: false });
      showToast(
        enableCheckmark
          ? 'Social tracking enabled! (🔴 Red dot added)'
          : 'Social tracking disabled',
        'info'
      );
    } catch (err: unknown) {
      console.error('Failed to toggle tracking:', err);
      showToast('Failed to update tracking', 'error');
    }
  };

  // Bottom Nav navigation handler
  const handleTabChange = (tab: 'home' | 'labels') => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="h-[100dvh] w-full bg-zinc-950 flex flex-col items-center justify-center text-white gap-3 select-none">
        <div className="relative">
          <img
            src="/apple-touch-icon.png"
            alt="Prompt G"
            className="w-14 h-14 rounded-2xl shadow-2xl object-cover animate-pulse"
          />
        </div>
        <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Loading Prompt G...</p>
      </div>
    );
  }

  // Welcome / Landing Screen for unauthenticated visitors
  if (!userProfile && !pendingGoogleUser) {
    return (
      <WelcomeScreen
        onGoogleSignIn={handleGoogleSignIn}
        isLoading={isSigningIn}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbf9] text-zinc-900 flex flex-col font-sans pb-28">
      {/* Onboarding Dialog (First-time Google Sign-In) */}
      {pendingGoogleUser && (
        <OnboardingModal
          isOpen={isOnboardingOpen}
          uid={pendingGoogleUser.uid}
          initialName={pendingGoogleUser.displayName || ''}
          email={pendingGoogleUser.email || ''}
          photoURL={pendingGoogleUser.photoURL || ''}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Main App Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        userProfile={userProfile}
        onGoogleSignIn={handleGoogleSignIn}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6">
        {/* Category Filter Pills */}
        <CategoryPills
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          counts={counts}
        />

        {/* Dynamic Prompts View: Explore Horizontal Reels vs Home Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-3 text-zinc-300" />
            <p className="text-xs font-semibold uppercase tracking-wider">Syncing your prompts...</p>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <EmptyState
            isSearchingOrFiltered={activeCategory !== 'all' || Boolean(searchQuery.trim())}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onClearFilters={() => {
              setActiveCategory('all');
              setSearchQuery('');
            }}
          />
        ) : activeTab === 'labels' ? (
          /* List View (Explore Tab: Left pic, Title/tags, Right go-to-page arrow) */
          <ExploreView
            prompts={filteredPrompts}
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            onCardClick={(item) => setSelectedPromptId(item.id)}
            onCopyPrompt={handleCopyPrompt}
            onToggleUsed={handleToggleUsed}
          />
        ) : (
          /* Standard Responsive Grid (Home Tab) */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mt-4">
            {filteredPrompts.map((item) => (
              <PromptCard
                key={item.id}
                item={item}
                onCardClick={() => setSelectedPromptId(item.id)}
                onCopyPrompt={handleCopyPrompt}
                onToggleUsed={handleToggleUsed}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Add Prompt Modal */}
      <AddPromptModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSavePrompt}
        existingLabels={categories}
        existingDescriptions={previousDescriptions}
      />

      {/* Prompt Detail Modal (keyed by ID to reset gallery state) */}
      <PromptDetailModal
        key={selectedPromptId ?? 'none'}
        item={selectedPrompt}
        onClose={() => setSelectedPromptId(null)}
        onDelete={handleDeletePrompt}
        onCopyPrompt={handleCopyPrompt}
        onSelectLabel={(lbl) => setActiveCategory(lbl)}
        userProfile={userProfile}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onToggleUsed={handleToggleUsed}
        onToggleEnableTracking={handleToggleEnableTracking}
      />

      {/* Delete Protection Setup Modal */}
      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        userProfile={userProfile}
        onProfileUpdated={(updated) => setUserProfile(updated)}
        showToast={showToast}
        onResetApp={handleResetApp}
      />

      {/* PWA Install Prompt Banner */}
      <PWAInstallBanner onInstalled={() => showToast('Prompt G is installed on your device!', 'success')} />

      {/* Toast Notification with Type Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
