import { useState } from 'react';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useAnimationStore } from '../store/animationStore';
import { parseCssKeyframes, isValidKeyframesCss } from '../utils/cssParser';

export default function ImportModal() {
  const { importModalOpen, setImportModalOpen, importFromCss } = useAnimationStore();
  const [cssText, setCssText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!importModalOpen) return null;

  const handleClose = () => {
    setImportModalOpen(false);
    setCssText('');
    setError(null);
    setSuccess(false);
  };

  const handleParse = () => {
    setError(null);
    setSuccess(false);

    if (!cssText.trim()) {
      setError('请粘贴 CSS 代码');
      return;
    }

    if (!isValidKeyframesCss(cssText)) {
      setError('未找到有效的 @keyframes 定义。请确保代码包含 @keyframes 声明。');
      return;
    }

    const result = parseCssKeyframes(cssText);
    if (!result) {
      setError('CSS 解析失败。请检查代码格式是否正确。');
      return;
    }

    if (result.keyframes.length < 2) {
      setError('@keyframes 至少需要两个关键帧（0% 和 100%）。');
      return;
    }

    importFromCss(result);
    setSuccess(true);
    setTimeout(() => {
      handleClose();
    }, 800);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCssText(text);
    } catch (e) {
      setError('无法访问剪贴板，请手动粘贴。');
    }
  };

  const exampleCss = `@keyframes bounceIn {
  0% {
    transform: translate(0, -60px) scale(0.3);
    opacity: 0;
    animation-timing-function: ease-out;
  }
  55% {
    transform: translate(0, 10px) scale(1.1);
    opacity: 1;
    animation-timing-function: ease-in;
  }
  72% {
    transform: translate(0, -5px) scale(0.95);
    animation-timing-function: ease-out;
  }
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[600px] max-h-[80vh] bg-editor-panel border border-editor-border rounded-xl shadow-2xl shadow-black/50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-editor-border/50">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-editor-accent" />
            <h2 className="font-display font-semibold text-slate-100 text-sm">导入 CSS @keyframes</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full hover:bg-editor-border/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-medium">粘贴你的 CSS @keyframes 代码</label>
            <div className="relative">
              <textarea
                value={cssText}
                onChange={(e) => setCssText(e.target.value)}
                placeholder="粘贴 @keyframes CSS 代码到这里..."
                className="w-full h-48 p-3 text-[12px] font-mono bg-editor-bg border border-editor-border rounded-lg text-slate-200 focus:outline-none focus:border-editor-accent resize-none leading-relaxed"
                spellCheck={false}
              />
              <button
                onClick={handlePaste}
                className="absolute top-2 right-2 px-2.5 py-1 text-[10px] bg-editor-border hover:bg-slate-600 text-slate-300 rounded transition-colors"
              >
                从剪贴板粘贴
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-editor-success/10 border border-editor-success/30">
              <CheckCircle size={16} className="text-editor-success flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-editor-success">解析成功！已导入 {success ? parseCssKeyframes(cssText)?.keyframes.length : 0} 个关键帧。</p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-editor-accent/5 border border-editor-accent/20">
            <p className="text-[11px] text-slate-300 mb-2 font-medium">示例代码（点击填充）:</p>
            <button
              onClick={() => setCssText(exampleCss)}
              className="w-full text-left text-[11px] font-mono text-slate-400 hover:text-editor-accent bg-editor-bg/50 rounded p-2 overflow-x-auto transition-colors"
            >
              {exampleCss.substring(0, 200)}...
            </button>
          </div>

          <div className="p-3 rounded-lg bg-editor-bg border border-editor-border/50">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="text-slate-300 font-medium">支持的属性:</span>
              <br />
              transform: translate(), translateX(), translateY(), rotate(), scale(), scaleX(), scaleY()
              <br />
              opacity, animation-timing-function (ease/linear/ease-in/ease-out/ease-in-out/cubic-bezier())
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-editor-border/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-[12px] rounded-lg bg-editor-border hover:bg-slate-600 text-slate-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleParse}
            className="px-4 py-2 text-[12px] rounded-lg bg-gradient-to-r from-editor-accent to-cyan-500 hover:shadow-glow-cyan text-slate-900 font-semibold transition-all hover:scale-105 active:scale-95"
          >
            解析并导入
          </button>
        </div>
      </div>
    </div>
  );
}
