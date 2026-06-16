import { Wand2 } from 'lucide-react';
import PreviewCanvas from '@/components/PreviewCanvas';
import PlaybackControls from '@/components/PlaybackControls';
import Timeline from '@/components/Timeline';
import PropertyPanel from '@/components/PropertyPanel';
import BezierEditor from '@/components/BezierEditor';
import CodeExporter from '@/components/CodeExporter';

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-editor-bg overflow-hidden">
      <header className="h-12 px-4 flex items-center justify-between border-b border-editor-border bg-editor-panel/80 backdrop-blur-md flex-shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-editor-accent to-editor-keyframe flex items-center justify-center shadow-glow-cyan">
            <Wand2 size={14} className="text-slate-900" />
          </div>
          <h1 className="font-display font-bold text-base tracking-tight bg-gradient-to-r from-editor-accent via-white to-editor-keyframe bg-clip-text text-transparent">
            CSS 动画编辑器
          </h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-editor-accent/15 border border-editor-accent/30 text-editor-accent font-mono">
            v1.0
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <div className="hidden md:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-editor-border text-slate-300 font-mono">点击</kbd>
            <span>时间轴添加关键帧</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-editor-border text-slate-300 font-mono">拖拽</kbd>
            <span>调整关键帧位置</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-editor-border text-slate-300 font-mono">双击</kbd>
            <span>删除关键帧</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 hidden lg:block">
            @keyframes 可视化编辑器
          </span>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <BezierEditor />

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 relative min-h-0">
            <PreviewCanvas />
            <PlaybackControls />
          </div>
          <Timeline />
        </div>

        <div className="flex flex-col min-w-0">
          <PropertyPanel />
          <CodeExporter />
        </div>
      </div>
    </div>
  );
}
