import { useState } from 'react';
import { X, Save, FolderOpen, Trash2, Download, Upload, Sparkles } from 'lucide-react';
import { useAnimationStore, type AnimationState } from '../store/animationStore';
import type { SavedAnimation } from '../utils/storage';

export default function DraftPanel() {
  const {
    showDraftPanel,
    setShowDraftPanel,
    drafts,
    presets,
    saveDraft,
    loadDraft,
    deleteDraft,
    loadPreset,
    exportToJson,
    importFromJson,
  } = useAnimationStore();

  const [draftName, setDraftName] = useState('');
  const [tab, setTab] = useState<'drafts' | 'presets'>('presets');
  const [showSaveInput, setShowSaveInput] = useState(false);

  if (!showDraftPanel) return null;

  const handleSave = () => {
    saveDraft(draftName || undefined);
    setDraftName('');
    setShowSaveInput(false);
    setTab('drafts');
  };

  const handleExportJson = () => {
    const json = exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${useAnimationStore.getState().name || 'animation'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (importFromJson(content)) {
          setTab('drafts');
        } else {
          alert('JSON 文件格式不正确');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[500px] max-h-[75vh] bg-editor-panel border border-editor-border rounded-xl shadow-2xl shadow-black/50 flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-editor-border/50">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-editor-keyframe" />
            <h2 className="font-display font-semibold text-slate-100 text-sm">草稿与预设</h2>
          </div>
          <button
            onClick={() => setShowDraftPanel(false)}
            className="w-7 h-7 rounded-full hover:bg-editor-border/50 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b border-editor-border/50">
          <button
            onClick={() => setTab('presets')}
            className={`flex-1 px-4 py-2.5 text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'presets'
                ? 'text-editor-accent border-b-2 border-editor-accent bg-editor-accent/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={13} />
            预设模板
          </button>
          <button
            onClick={() => setTab('drafts')}
            className={`flex-1 px-4 py-2.5 text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === 'drafts'
                ? 'text-editor-keyframe border-b-2 border-editor-keyframe bg-editor-keyframe/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save size={13} />
            我的草稿 ({drafts.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tab === 'presets' && (
            <>
              {presets.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">暂无预设</div>
              ) : (
                presets.map((p) => (
                  <PresetCard key={p.id} item={p} onLoad={() => { loadPreset(p.id); setShowDraftPanel(false); }} />
                ))
              )}
            </>
          )}

          {tab === 'drafts' && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handleExportJson}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] rounded-lg bg-editor-bg border border-editor-border text-slate-300 hover:border-editor-accent hover:text-editor-accent transition-all"
                >
                  <Download size={12} />
                  导出 JSON
                </button>
                <button
                  onClick={handleImportJson}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] rounded-lg bg-editor-bg border border-editor-border text-slate-300 hover:border-editor-accent hover:text-editor-accent transition-all"
                >
                  <Upload size={12} />
                  导入 JSON
                </button>
              </div>

              {showSaveInput ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-editor-accent/10 border border-editor-accent/30">
                  <input
                    type="text"
                    placeholder="草稿名称"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-[11px] font-mono bg-editor-bg border border-editor-border rounded text-slate-200 focus:outline-none focus:border-editor-accent"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  />
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-[11px] rounded bg-editor-accent text-slate-900 font-medium hover:bg-cyan-400 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => { setShowSaveInput(false); setDraftName(''); }}
                    className="px-2 py-1.5 text-[11px] rounded bg-editor-border text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] rounded-lg bg-editor-keyframe/20 text-editor-keyframe border border-editor-keyframe/30 hover:bg-editor-keyframe/30 transition-all font-medium"
                >
                  <Save size={12} />
                  保存当前状态为草稿
                </button>
              )}

              {drafts.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-slate-500 text-xs mb-1">暂无草稿</div>
                  <div className="text-slate-600 text-[10px]">点击上方按钮保存当前动画</div>
                </div>
              ) : (
                drafts.map((d) => (
                  <DraftCard
                    key={d.id}
                    item={d}
                    onLoad={() => { loadDraft(d.id); setShowDraftPanel(false); }}
                    onDelete={() => deleteDraft(d.id)}
                    formatDate={formatDate}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PresetCard({ item, onLoad }: { item: SavedAnimation; onLoad: () => void }) {
  return (
    <div className="group p-3 rounded-lg bg-editor-bg border border-editor-border hover:border-editor-accent/50 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-[12px] font-semibold text-slate-200 truncate">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
            <span>{item.data.keyframes.length} 关键帧</span>
            <span>•</span>
            <span>{item.data.duration}s</span>
          </div>
        </div>
        <button
          onClick={onLoad}
          className="px-3 py-1.5 text-[10px] rounded bg-editor-accent/20 text-editor-accent border border-editor-accent/30 hover:bg-editor-accent/30 transition-all font-medium opacity-0 group-hover:opacity-100"
        >
          应用
        </button>
      </div>
    </div>
  );
}

function DraftCard({
  item,
  onLoad,
  onDelete,
  formatDate,
}: {
  item: SavedAnimation;
  onLoad: () => void;
  onDelete: () => void;
  formatDate: (ts: number) => string;
}) {
  return (
    <div className="group p-3 rounded-lg bg-editor-bg border border-editor-border hover:border-editor-keyframe/50 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-[12px] font-semibold text-slate-200 truncate">{item.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
            <span>{item.data.keyframes.length} 关键帧</span>
            <span>•</span>
            <span>{item.data.duration}s</span>
            <span>•</span>
            <span>{formatDate(item.updatedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onLoad}
            className="px-2.5 py-1 text-[10px] rounded bg-editor-keyframe/20 text-editor-keyframe border border-editor-keyframe/30 hover:bg-editor-keyframe/30 transition-all font-medium"
          >
            加载
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-all"
            title="删除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
