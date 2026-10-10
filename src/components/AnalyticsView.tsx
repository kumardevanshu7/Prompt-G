import React, { useMemo } from 'react';
import type { PromptItem } from '../types/prompt';
import {
  BarChart3,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Send,
  Hash,
  FileText,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { getLabelBadgeClass, getLabelIcon } from '../utils/labelColors';

interface AnalyticsViewProps {
  prompts: PromptItem[];
  onSelectCategory?: (category: string) => void;
  onNavigateTab?: (tab: 'home' | 'categories' | 'labels') => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  prompts,
  onSelectCategory,
  onNavigateTab,
}) => {
  // ── 1. Model Stats ──
  const modelStats = useMemo(() => {
    const counts: Record<string, number> = {};
    prompts.forEach((p) => {
      const model = p.modelUsed || 'Not Specified';
      counts[model] = (counts[model] || 0) + 1;
    });

    const total = prompts.length || 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    const topModel = sorted[0] ? sorted[0][0] : 'None';
    const topModelCount = sorted[0] ? sorted[0][1] : 0;
    const topModelPct = Math.round((topModelCount / total) * 100);

    return { counts, sorted, topModel, topModelCount, topModelPct };
  }, [prompts]);

  // ── 2. Bypass / Success Ratio Stats ──
  const bypassStats = useMemo(() => {
    let easilyPassCount = 0;
    let difficultCount = 0;
    let totalRated = 0;

    prompts.forEach((p) => {
      if (p.modelBypass) {
        Object.values(p.modelBypass).forEach((status) => {
          totalRated++;
          if (status === 'easily_pass') easilyPassCount++;
          if (status === 'difficult_to_bypass') difficultCount++;
        });
      }
    });

    const passRate = totalRated > 0 ? Math.round((easilyPassCount / totalRated) * 100) : 0;
    return { easilyPassCount, difficultCount, totalRated, passRate };
  }, [prompts]);

  // ── 3. Publishing & Category Stats ──
  const publishStats = useMemo(() => {
    let directCount = 0;
    let unreleasedCount = 0;
    let pendingCount = 0;

    prompts.forEach((p) => {
      if (p.isUsed) {
        if (p.publishCategory === 'unreleased' || p.labels?.some((l) => l.toLowerCase() === 'unreleased')) {
          unreleasedCount++;
        } else {
          directCount++;
        }
      } else if (p.enableCheckmark) {
        pendingCount++;
      }
    });

    const totalPublished = directCount + unreleasedCount;
    return { directCount, unreleasedCount, pendingCount, totalPublished };
  }, [prompts]);

  // ── 4. Tag / Keyword Frequency ──
  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    prompts.forEach((p) => {
      if (p.labels) {
        p.labels.forEach((lbl) => {
          const clean = lbl.trim().toLowerCase();
          if (clean) counts[clean] = (counts[clean] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [prompts]);

  // ── 5. Prompt Text Metrics ──
  const textMetrics = useMemo(() => {
    if (prompts.length === 0) return { avgChars: 0, maxChars: 0, totalImages: 0 };
    let totalChars = 0;
    let maxChars = 0;
    let totalImages = 0;

    prompts.forEach((p) => {
      const len = p.prompt.length;
      totalChars += len;
      if (len > maxChars) maxChars = len;
      if (p.images) totalImages += p.images.length;
    });

    return {
      avgChars: Math.round(totalChars / prompts.length),
      maxChars,
      totalImages,
    };
  }, [prompts]);

  return (
    <div className="space-y-6 pt-1 pb-24 animate-in fade-in duration-200 max-w-6xl mx-auto px-1 sm:px-2">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:p-6 rounded-3xl bg-white border border-zinc-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
              Vault Analytics
            </h1>
            <p className="text-xs text-zinc-500">
              Deep performance metrics across models, bypass rates, and collections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
            {prompts.length} Prompts Tracked
          </span>
        </div>
      </div>

      {/* ── 4 Top KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Prompts */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Vault</span>
            <FileText className="w-4 h-4 text-zinc-700" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-900">
            {prompts.length}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-medium">
            {textMetrics.totalImages} images uploaded
          </p>
        </div>

        {/* KPI 2: Most Used Model */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Top Model</span>
            <Cpu className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-zinc-900 truncate">
            {modelStats.topModel}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-semibold">
            Used {modelStats.topModelCount} times ({modelStats.topModelPct}%)
          </p>
        </div>

        {/* KPI 3: Bypass Success Rate */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Pass Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {bypassStats.passRate}%
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-medium">
            {bypassStats.easilyPassCount} Easily Pass / {bypassStats.difficultCount} Hard
          </p>
        </div>

        {/* KPI 4: Published Rate */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-zinc-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Published</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-900">
            {publishStats.totalPublished}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-semibold">
            {publishStats.directCount} Direct • {publishStats.unreleasedCount} Unreleased
          </p>
        </div>
      </div>

      {/* ── Two-Column Breakdown Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: AI Model Usage Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-zinc-800" />
              <h2 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider">
                Model Usage Breakdown
              </h2>
            </div>
            <span className="text-xs font-bold text-zinc-400">Frequency</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {modelStats.sorted.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">No models recorded yet</p>
            ) : (
              modelStats.sorted.map(([model, count]) => {
                const total = prompts.length || 1;
                const pct = Math.round((count / total) * 100);

                const barColor =
                  model === 'Nano Pro'
                    ? 'bg-amber-500'
                    : model === 'Nano 2.1'
                    ? 'bg-sky-500'
                    : model.toLowerCase().includes('both')
                    ? 'bg-purple-600'
                    : 'bg-zinc-800';

                return (
                  <div key={model} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${barColor}`} />
                        {model}
                      </span>
                      <span className="text-zinc-500">
                        {count} prompts ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Bypass & Success Ratio Analysis */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider">
                Bypass & Success Difficulty
              </h2>
            </div>
            <span className="text-xs font-bold text-zinc-400">Performance</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Easily Pass */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Easily Pass</span>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {bypassStats.easilyPassCount}
              </div>
              <p className="text-[10px] text-emerald-600 mt-0.5 font-semibold">
                High reliability generations
              </p>
            </div>

            {/* Difficult to Bypass */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Difficult to Bypass</span>
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                {bypassStats.difficultCount}
              </div>
              <p className="text-[10px] text-amber-600 mt-0.5 font-semibold">
                Requires prompt tweaking
              </p>
            </div>
          </div>

          {/* Publishing Distribution */}
          <div className="pt-2 border-t border-zinc-100">
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">
              Publishing Distribution
            </h3>
            <div className="flex items-center gap-2">
              <div
                onClick={() => onNavigateTab?.('categories')}
                className="flex-1 p-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 cursor-pointer transition-all text-center"
              >
                <div className="text-xs font-bold text-zinc-900 flex items-center justify-center gap-1">
                  <Send className="w-3 h-3 text-emerald-600" />
                  <span>Direct Feed</span>
                </div>
                <div className="text-base font-black text-zinc-900 mt-0.5">
                  {publishStats.directCount}
                </div>
              </div>

              <div
                onClick={() => onNavigateTab?.('categories')}
                className="flex-1 p-3 rounded-xl bg-blue-50/60 hover:bg-blue-100/60 border border-blue-200 cursor-pointer transition-all text-center"
              >
                <div className="text-xs font-bold text-blue-900 flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  <span>Unreleased</span>
                </div>
                <div className="text-base font-black text-blue-900 mt-0.5">
                  {publishStats.unreleasedCount}
                </div>
              </div>

              <div
                onClick={() => onNavigateTab?.('home')}
                className="flex-1 p-3 rounded-xl bg-rose-50/60 hover:bg-rose-100/60 border border-rose-200 cursor-pointer transition-all text-center"
              >
                <div className="text-xs font-bold text-rose-900 flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Pending</span>
                </div>
                <div className="text-base font-black text-rose-900 mt-0.5">
                  {publishStats.pendingCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Top Labels & Tags Frequency ── */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-zinc-800" />
            <h2 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider">
              Top Tags & Collections
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-semibold">
            {tagStats.length} Most Active Tags
          </span>
        </div>

        {tagStats.length === 0 ? (
          <p className="text-xs text-zinc-400 py-3 text-center">No tags found in vault</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {tagStats.map(([tag, count]) => {
              const icon = getLabelIcon(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onSelectCategory?.(tag)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${getLabelBadgeClass(
                    tag,
                    'pill'
                  )}`}
                >
                  {icon && <span>{icon}</span>}
                  <span>#{tag}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px] font-black">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Text statistics row */}
        <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-zinc-600">
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70">
            <span className="text-zinc-400 text-[10px] font-bold uppercase block">Avg Prompt Length</span>
            <span className="text-sm font-black text-zinc-900">{textMetrics.avgChars} chars</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70">
            <span className="text-zinc-400 text-[10px] font-bold uppercase block">Max Prompt Length</span>
            <span className="text-sm font-black text-zinc-900">{textMetrics.maxChars} chars</span>
          </div>
          <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/70 col-span-2 sm:col-span-1">
            <span className="text-zinc-400 text-[10px] font-bold uppercase block">Total Visuals</span>
            <span className="text-sm font-black text-zinc-900">{textMetrics.totalImages} images</span>
          </div>
        </div>
      </div>
    </div>
  );
};
