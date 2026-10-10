/**
 * Label and Tag styling helper.
 * Provides custom branding colors:
 * - 'insta' / 'instagram' => Light red / pinkish
 * - 'snap' / 'snapchat' => Yellow
 * - 'gemini' => Light blue
 * - 'chatgpt' / 'gpt' => Light grey
 * - Others => Neutral zinc
 */

export type LabelBrand =
  | 'instagram'
  | 'snapchat'
  | 'gemini'
  | 'chatgpt'
  | 'unreleased'
  | 'success20'
  | 'uncensored'
  | 'default';

export function getLabelBrand(tag: string): LabelBrand {
  const norm = (tag || '').trim().toLowerCase().replace(/^#+/, '');
  if (norm === 'instagram' || norm === 'insta' || norm.startsWith('insta-') || norm.startsWith('insta_')) {
    return 'instagram';
  }
  if (norm === 'snap' || norm === 'snapchat' || norm.startsWith('snap-') || norm.startsWith('snap_')) {
    return 'snapchat';
  }
  if (norm === 'gemini' || norm.startsWith('gemini-') || norm.startsWith('gemini_') || norm === 'google gemini') {
    return 'gemini';
  }
  if (
    /^(chat-?gpt|gpt)([-_]?[0-9a-z.]+)?$/i.test(norm) ||
    norm === 'openai' ||
    norm.startsWith('openai-') ||
    norm.startsWith('openai_')
  ) {
    return 'chatgpt';
  }
  if (
    norm === 'unreleased' ||
    norm === 'unrelease' ||
    norm.startsWith('unreleased-') ||
    norm.startsWith('unreleased_') ||
    norm.startsWith('unrelease-') ||
    norm.startsWith('unrelease_')
  ) {
    return 'unreleased';
  }
  if (
    norm.includes('20%') ||
    norm === '20' ||
    norm === '20-success' ||
    norm === '20_success' ||
    norm === '20% success' ||
    norm === '20-pass' ||
    norm === '20% pass' ||
    norm === '20success'
  ) {
    return 'success20';
  }
  if (
    norm === 'uncensored' ||
    norm === 'uncensor' ||
    norm === 'nsfw' ||
    norm.startsWith('uncensored-') ||
    norm.startsWith('uncensored_')
  ) {
    return 'uncensored';
  }
  return 'default';
}

/**
 * Returns leading icon for special tags (e.g. 🚫 for uncensored)
 */
export function getLabelIcon(tag: string): string | null {
  const brand = getLabelBrand(tag);
  if (brand === 'uncensored') {
    return '🚫';
  }
  return null;
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

  if (brand === 'gemini') {
    if (variant === 'activePill') {
      return 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/25';
    }
    if (variant === 'card') {
      return 'bg-sky-500/90 backdrop-blur-xs text-white font-bold shadow-xs';
    }
    // Light blue for tags & filters
    return 'bg-sky-100 text-sky-800 border border-sky-300 font-semibold hover:bg-sky-200';
  }

  if (brand === 'chatgpt') {
    if (variant === 'activePill') {
      return 'bg-zinc-700 text-white font-bold shadow-md shadow-zinc-700/25';
    }
    if (variant === 'card') {
      return 'bg-zinc-200/95 backdrop-blur-xs text-zinc-900 font-bold shadow-xs';
    }
    // Light grey for tags & filters
    return 'bg-zinc-200/85 text-zinc-800 border border-zinc-300 font-semibold hover:bg-zinc-300';
  }

  if (brand === 'unreleased') {
    if (variant === 'activePill') {
      return 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25';
    }
    if (variant === 'card') {
      return 'bg-blue-500/90 backdrop-blur-xs text-white font-bold shadow-xs';
    }
    // Light blue for tags & filters
    return 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold hover:bg-blue-100';
  }

  // 20% Success: Brown light
  if (brand === 'success20') {
    if (variant === 'activePill') {
      return 'bg-[#783e19] text-white font-bold shadow-md shadow-[#783e19]/25';
    }
    if (variant === 'card') {
      return 'bg-[#783e19]/90 backdrop-blur-xs text-white font-bold shadow-xs';
    }
    return 'bg-[#fbf4ee] text-[#783e19] border border-[#e8d2c0] font-semibold hover:bg-[#f5e9df]';
  }

  // Uncensored: Light red with ban styling
  if (brand === 'uncensored') {
    if (variant === 'activePill') {
      return 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/25';
    }
    if (variant === 'card') {
      return 'bg-rose-600/95 backdrop-blur-xs text-white font-bold shadow-xs';
    }
    return 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold hover:bg-rose-200';
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
