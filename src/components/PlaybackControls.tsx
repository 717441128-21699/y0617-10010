import { Play, Pause, RotateCcw, Gauge } from 'lucide-react';
import { useAnimationStore } from '../store/animationStore';

const speedOptions = [0.25, 0.5, 1, 1.5, 2, 3, 4];

export default function PlaybackControls() {
  const { playback, togglePlay, resetPlayback, setSpeed, setLoop, setDuration, duration } = useAnimationStore();

  return (
    <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-editor-panel/90 backdrop-blur-md border border-editor-border shadow-2xl shadow-black/30 z-20">
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-lg bg-gradient-to-br from-editor-accent to-cyan-500 hover:shadow-glow-cyan flex items-center justify-center text-slate-900 font-bold transition-all hover:scale-105 active:scale-95"
        title={playback.isPlaying ? '暂停' : '播放'}
      >
        {playback.isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>

      <button
        onClick={resetPlayback}
        className="w-9 h-9 rounded-lg bg-editor-border hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-all hover:scale-105 active:scale-95"
        title="重置"
      >
        <RotateCcw size={16} />
      </button>

      <div className="w-px h-7 bg-editor-border mx-1" />

      <div className="flex items-center gap-1.5">
        {speedOptions.map((s) => (
          <button
          key={s}
          onClick={() => setSpeed(s)}
          className={`px-2 py-1 rounded text-xs font-mono transition-all ${
            playback.speed === s
              ? 'bg-editor-warn/20 text-editor-warn border border-editor-warn/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-editor-border/50'
          }`}
        >
          {s}x
        </button>
      ))}
      </div>

      <div className="w-px h-7 bg-editor-border mx-1" />

      <div className="flex items-center gap-2">
        <Gauge size={14} className="text-slate-400" />
        <input
          type="number"
          min={0.1}
          max={30}
          step={0.1}
          value={duration}
          onChange={(e) => setDuration(parseFloat(e.target.value) || 1)}
          className="w-14 px-2 py-1 bg-editor-bg border border-editor-border rounded-md text-xs font-mono text-slate-200 focus:outline-none focus:border-editor-accent"
        />
        <span className="text-xs text-slate-400">秒</span>
      </div>

      <div className="w-px h-7 bg-editor-border mx-1" />

      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={playback.loop}
          onChange={(e) => setLoop(e.target.checked)}
          className="w-4 h-4 accent-editor-accent rounded cursor-pointer"
        />
        <span className="text-xs text-slate-300 font-medium">循环</span>
      </label>
    </div>
  );
}
