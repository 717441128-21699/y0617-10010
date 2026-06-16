import { useRef, useState } from 'react';
import { Trash2, Plus, Magnet, CircleSlash2, Crosshair } from 'lucide-react';
import { useAnimationStore } from '../store/animationStore';

export default function Timeline() {
  const {
    keyframes,
    selectedKeyframeId,
    selectKeyframe,
    addKeyframeAtPercent,
    updateKeyframePercent,
    removeKeyframe,
    playback,
    setCurrentTime,
    snapEnabled,
    setSnapEnabled,
    addKeyframeAtCurrentTime,
    jumpToPercent,
  } = useAnimationStore();

  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartX = useRef(0);
  const dragStartPercent = useRef(0);
  const [jumpInput, setJumpInput] = useState('');

  const sortedKfs = [...keyframes].sort((a, b) => a.percent - b.percent);

  const formatPct = (p: number) => {
    if (!snapEnabled) return p.toFixed(2);
    return Number.isInteger(p) ? p.toString() : p.toFixed(1);
  };

  const getPercentFromX = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(0, Math.min(100, pct));
    if (snapEnabled) {
      pct = Math.round(pct / 5) * 5;
    } else {
      pct = Math.round(pct * 100) / 100;
    }
    return pct;
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if (draggingId) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-kf]')) return;
    const pct = getPercentFromX(e.clientX);
    if (pct === 0 || pct === 100) {
      setCurrentTime(pct);
      return;
    }
    addKeyframeAtPercent(pct);
  };

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const onMouseMove = (ev: MouseEvent) => {
      const rect = trackRef.current!.getBoundingClientRect();
      let pct = ((ev.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      if (!snapEnabled) pct = Math.round(pct * 100) / 100;
      setCurrentTime(pct);
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleKfMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const kf = keyframes.find((k) => k.id === id);
    if (!kf) return;
    selectKeyframe(id);
    setDraggingId(id);
    dragStartX.current = e.clientX;
    dragStartPercent.current = kf.percent;
    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartX.current;
      const rect = trackRef.current!.getBoundingClientRect();
      const deltaPct = (dx / rect.width) * 100;
      let newPct = dragStartPercent.current + deltaPct;
      if (snapEnabled) {
        newPct = Math.round(newPct / 5) * 5;
      } else {
        newPct = Math.round(newPct * 100) / 100;
      }
      updateKeyframePercent(id, newPct);
    };
    const onMouseUp = () => {
      setDraggingId(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(jumpInput);
    if (!isNaN(pct) && pct >= 0 && pct <= 100) {
      jumpToPercent(pct);
      setJumpInput('');
    }
  };

  const handleAddAtCurrent = () => {
    addKeyframeAtCurrentTime();
  };

  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);

  return (
    <div className="h-40 bg-editor-panel border-t border-editor-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-editor-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-display font-semibold text-slate-200">时间轴</span>
            <span className="text-slate-500">|</span>
            <span className="font-mono text-slate-400">{keyframes.length} 关键帧</span>
          </div>

          <div className="flex items-center gap-1.5">
            <form onSubmit={handleJump} className="flex items-center gap-1">
              <Crosshair size={12} className="text-slate-400" />
              <input
                type="number"
                placeholder="跳转%"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                min={0}
                max={100}
                step={snapEnabled ? 5 : 0.01}
                className="w-16 px-1.5 py-0.5 text-[10px] font-mono bg-editor-bg border border-editor-border rounded text-slate-200 focus:outline-none focus:border-editor-accent"
              />
              <button
                type="submit"
                className="px-1.5 py-0.5 text-[10px] bg-editor-border hover:bg-slate-600 text-slate-300 rounded transition-colors"
              >
                跳转
              </button>
            </form>

            <button
              onClick={handleAddAtCurrent}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-editor-accent/20 text-editor-accent border border-editor-accent/30 hover:bg-editor-accent/30 transition-colors"
              title="在当前播放位置添加关键帧"
            >
              <Plus size={10} />
              当前位置
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSnapEnabled(!snapEnabled)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all ${
              snapEnabled
                ? 'bg-editor-warn/20 text-editor-warn border border-editor-warn/40'
                : 'bg-editor-bg text-slate-400 border border-editor-border hover:text-slate-300'
            }`}
            title={snapEnabled ? '关闭吸附' : '开启5%吸附'}
          >
            {snapEnabled ? <Magnet size={12} /> : <CircleSlash2 size={12} />}
            {snapEnabled ? '吸附 5%' : '精细模式'}
          </button>

          <div className="flex items-center gap-1 px-2 py-1 rounded bg-editor-bg border border-editor-border">
            <Plus size={12} className="text-editor-accent" />
            <span className="text-[10px] font-mono text-slate-300">
              t = {formatPct(playback.currentTime)}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative px-4 pt-2 pb-2">
        <div className="relative h-6 mb-1">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 h-2 w-px"
              style={{
                left: `${t}%`,
                backgroundColor: t % 25 === 0 ? '#475569' : '#334155',
              }}
            >
              {t % 25 === 0 && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-500">
                  {t}%
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="relative h-14 mt-1 cursor-pointer group"
        >
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-editor-border/80" />
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 rounded-l-full bg-gradient-to-r from-editor-accent to-editor-keyframe"
            style={{ width: `${playback.currentTime}%` }}
          />

          <div
            onMouseDown={handlePlayheadMouseDown}
            className="absolute top-1/2 -translate-y-1/2 z-20 cursor-ew-resize"
            style={{ left: `${playback.currentTime}%` }}
          >
            <div className="w-0.5 h-12 -translate-x-1/2 bg-editor-warn" />
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-editor-warn shadow-glow-cyan" />
          </div>

          {sortedKfs.map((kf) => (
            <div
              key={kf.id}
              data-kf
              onMouseDown={(e) => handleKfMouseDown(e, kf.id)}
              onClick={(e) => {
                e.stopPropagation();
                if (!draggingId) selectKeyframe(kf.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                removeKeyframe(kf.id);
              }}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing z-10 transition-transform ${
                selectedKeyframeId === kf.id ? 'scale-125' : 'hover:scale-110'
              }`}
              style={{ left: `${kf.percent}%` }}
            >
              <div
                className={`w-4 h-4 rotate-45 transition-all ${
                  selectedKeyframeId === kf.id
                    ? 'bg-editor-keyframe shadow-glow-purple ring-2 ring-editor-keyframe/50'
                    : 'bg-slate-500 hover:bg-slate-400'
                }`}
              />
              {selectedKeyframeId === kf.id && kf.percent !== 0 && kf.percent !== 100 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeKeyframe(kf.id);
                  }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg"
                  title="删除关键帧"
                >
                  <Trash2 size={11} />
                </button>
              )}
              <span
                className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono whitespace-nowrap ${
                  selectedKeyframeId === kf.id ? 'text-editor-keyframe font-semibold' : 'text-slate-500'
                }`}
              >
                {formatPct(kf.percent)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
