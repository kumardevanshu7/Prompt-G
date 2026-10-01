/**
 * Label and Tag styling helper.
 * Provides custom branding colors:
 * - 'insta' / 'instagram' => Light red / pinkish
 * - 'snap' / 'snapchat' => Yellow
 * - Others => Neutral zinc
 */

export type LabelBrand = 'instagram' | 'snapchat' | 'default';

export function getLabelBrand(tag: string): LabelBrand {
  const norm = (tag || '').trim().toLowerCase().replace(/^#+/, '');
  if (norm === 'instagram' || norm === 'insta' || norm.startsWith('insta-') || norm.startsWith('insta_')) {
    return 'instagram';
  }
  if (norm === 'snap' || norm === 'snapchat' || norm.startsWith('snap-') || norm.startsWith('snap_')) {
    return 'snapchat';
  }
  return 'default';
}

/**
 * Returns Tailwind classNames for badges/tags based on brand
 */
export function getLabelBadgeClass(
  tag: string,
  variant: 'pill' | 'card' | 'activePill' = 'pill'
): string {
  const brand = getLabelBrand(tag);

  if (brand === 'instagram') {
    if (variant === 'activePill') {
      return 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white font-bold shadow-md shadow-pink-500/25';
    }
    if (variant === 'card') {
      return 'bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold shadow-xs';
    }
    // Light red / pinkish for tags & filters
    return 'bg-rose-100/90 text-rose-700 border border-rose-200/90 font-semibold hover:bg-rose-200/90';
  }

  if (brand === 'snapchat') {
    if (variant === 'activePill') {
      return 'bg-amber-400 text-zinc-950 font-extrabold shadow-md shadow-amber-400/25';
    }
    if (variant === 'card') {
      return 'bg-amber-400 text-zinc-950 font-bold shadow-xs';
    }
    // Yellow for tags & filters
    return 'bg-amber-100/90 text-amber-950 border border-amber-300 font-semibold hover:bg-amber-200/90';
  }

  // Default Neutral styling
  if (variant === 'activePill') {
    return 'bg-zinc-900 text-white shadow-md shadow-zinc-900/10 font-bold';
  }
  if (variant === 'card') {
    return 'bg-black/60 backdrop-blur-md text-white font-medium';
  }
  return 'bg-[#ecebee] text-zinc-700 hover:bg-[#e4e3e6] font-medium';
}
