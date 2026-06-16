import { useState, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Code, Sparkles, Upload, FileCode, Layers } from 'lucide-react';
import { useAnimationStore } from '../store/animationStore';
import { generateFullCss, generateKeyframesCss, generateWebAnimationsCode, generateKeyframesWithEasing, generateMultiAnimationCss } from '../utils/cssGenerator';

export type ExportMode = 'standard' | 'waapi' | 'timeline';

export default function CodeExporter() {
  const state = useAnimationStore();
  const { setCopied, copied, setName, name, setImportModalOpen } = useAnimationStore();
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'full' | 'keyframes'>('full');
  const [exportMode, setExportMode] = useState<ExportMode>('standard');

  const fullCss = useMemo(() => generateFullCss(state), [state]);
  const kfCss = useMemo(() => generateKeyframesCss(state), [state]);
  const kfWithEasingCss = useMemo(() => generateKeyframesWithEasing(state), [state]);
  const waapiCode = useMemo(() => generateWebAnimationsCode(state), [state]);
  const timelineCode = useMemo(() => generateAnimationTimelineCss(state), [state]);

  const displayCode = useMemo(() => {
    if (exportMode === 'waapi') return waapiCode;
    if (exportMode === 'timeline') return timelineCode;
    return viewMode === 'full' ? fullCss : kfWithEasingCss;
  }, [exportMode, viewMode, fullCss, kfWithEasingCss, waapiCode, timelineCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('复制失败', e);
    }
  };

  return (
    <div className="w-80 bg-editor-panel border-t border-editor-border flex flex-col overflow-hidden">
      <div className="px-4 py-2.5 border-b border-editor-border/50 bg-editor-panel/80 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code size={14} className="text-editor-accent" />
          <h2 className="font-display font-semibold text-slate-100 text-xs tracking-wide">
            CSS 代码
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setImportModalOpen(true)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-editor-accent/20 text-slate-400 hover:text-editor-accent transition-all"
            title="导入 CSS @keyframes"
          >
            <Upload size={13} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-editor-border/50 text-slate-400 hover:text-slate-200 transition-all"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          <div className="px-4 py-2 border-b border-editor-border/30 flex items-center gap-2">
            <label className="text-[10px] text-slate-500">动画名:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              className="flex-1 px-2 py-1 text-xs font-mono bg-editor-bg border border-editor-border rounded text-slate-200 focus:outline-none focus:border-editor-accent"
            />
            <Sparkles size={12} className="text-editor-warn" />
          </div>

          <div className="px-4 py-2 border-b border-editor-border/30 flex flex-col gap-2">
            <div className="flex items-center gap-1">
              <Layers size={11} className="text-slate-500" />
              <span className="text-[10px] text-slate-500">导出模式:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setExportMode('standard')}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
                  exportMode === 'standard'
                    ? 'bg-editor-accent/20 text-editor-accent border-editor-accent/40'
                    : 'bg-editor-bg text-slate-400 border-editor-border hover:text-slate-200'
                }`}
              >
                <FileCode size={10} />
                标准 CSS
              </button>
              <button
                onClick={() => setExportMode('waapi')}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
                  exportMode === 'waapi'
                    ? 'bg-editor-accent/20 text-editor-accent border-editor-accent/40'
                    : 'bg-editor-bg text-slate-400 border-editor-border hover:text-slate-200'
                }`}
              >
                <Code size={10} />
                WAAPI
              </button>
              <button
                onClick={() => setExportMode('timeline')}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded border transition-all ${
                  exportMode === 'timeline'
                    ? 'bg-editor-accent/20 text-editor-accent border-editor-accent/40'
                    : 'bg-editor-bg text-slate-400 border-editor-border hover:text-slate-200'
                }`}
              >
                <Layers size={10} />
                Timeline
              </button>
            </div>
            {exportMode === 'standard' && (
              <div className="flex rounded bg-editor-bg border border-editor-border overflow-hidden">
                <button
                  onClick={() => setViewMode('full')}
                  className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                    viewMode === 'full'
                      ? 'bg-editor-accent/20 text-editor-accent'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  完整
                </button>
                <button
                  onClick={() => setViewMode('keyframes')}
                  className={`px-2 py-0.5 text-[10px] font-mono transition-all ${
                    viewMode === 'keyframes'
                      ? 'bg-editor-accent/20 text-editor-accent'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  @keyframes
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <button
              onClick={handleCopy}
              className={`absolute top-2 right-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                copied
                  ? 'bg-editor-success/20 text-editor-success border border-editor-success/40'
                  : 'bg-editor-border text-slate-300 hover:bg-slate-600 hover:text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check size={11} />
                  已复制
                </>
              ) : (
                <>
                  <Copy size={11} />
                  复制代码
                </>
              )}
            </button>
            <pre className="h-full overflow-y-auto p-4 pt-10 m-0 text-[11px] leading-relaxed font-mono text-slate-300 bg-[#0a0f1c]">
              <code>
                {displayCode.split('\n').map((line, i) => {
                  let highlighted = line;
                  highlighted = highlighted.replace(
                    /(@keyframes)(\s+)([a-zA-Z_-][\w-]*)/g,
                    '<span style="color:#a855f7">$1</span>$2<span style="color:#22d3ee">$3</span>'
                  );
                  highlighted = highlighted.replace(
                    /(animation-[a-z-]+)(\s*:)/g,
                    '<span style="color:#60a5fa">$1</span>$2'
                  );
                  highlighted = highlighted.replace(
                    /(transform|opacity|background)(\s*:)/g,
                    '<span style="color:#f59e0b">$1</span>$2'
                  );
                  highlighted = highlighted.replace(
                    /(\d+\.?\d*)(px|s|deg|%|ms)?/g,
                    '<span style="color:#10b981">$1</span><span style="color:#10b981">$2</span>'
                  );
                  highlighted = highlighted.replace(
                    /(infinite|both|linear|ease[^-]*-?[a-z]*)/g,
                    '<span style="color:#ec4899">$1</span>'
                  );
                  highlighted = highlighted.replace(
                    /(\/\*[\s\S]*?\*\/)/g,
                    '<span style="color:#64748b;font-style:italic">$1</span>'
                  );
                  highlighted = highlighted.replace(
                    /(cubic-bezier\([^)]+\))/g,
                    '<span style="color:#22d3ee">$1</span>'
                  );
                  return (
                    <div key={i} className="flex">
                      <span className="w-8 pr-3 text-right text-slate-600 select-none text-[10px] leading-relaxed">
                        {i + 1}
                      </span>
                      <span dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }} />
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
