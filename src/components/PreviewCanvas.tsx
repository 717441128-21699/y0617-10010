import { useEffect, useRef } from 'react';
import { useAnimationStore, type Keyframe } from '../store/animationStore';
import { cubicBezier } from '../utils/bezierUtils';

function interpolateProps(
  keyframes: Keyframe[],
  easingCurves: Record<string, { p1x: number; p1y: number; p2x: number; p2y: number }>,
  t: number
) {
  const sorted = [...keyframes].sort((a, b) => a.percent - b.percent);
  if (t <= sorted[0].percent) return { ...sorted[0].properties };
  if (t >= sorted[sorted.length - 1].percent) return { ...sorted[sorted.length - 1].properties };

  let fromIdx = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (t >= sorted[i].percent && t <= sorted[i + 1].percent) {
      fromIdx = i;
      break;
    }
  }
  const from = sorted[fromIdx];
  const to = sorted[fromIdx + 1];
  const segT = (t - from.percent) / (to.percent - from.percent);
  const easingKey = `${from.id}-${to.id}`;
  const easing = easingCurves[easingKey] || { p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 };
  const eased = cubicBezier(segT, easing);

  const lerp = (a: number, b: number) => a + (b - a) * eased;
  return {
    translateX: lerp(from.properties.translateX, to.properties.translateX),
    translateY: lerp(from.properties.translateY, to.properties.translateY),
    rotate: lerp(from.properties.rotate, to.properties.rotate),
    scaleX: lerp(from.properties.scaleX, to.properties.scaleX),
    scaleY: lerp(from.properties.scaleY, to.properties.scaleY),
    opacity: lerp(from.properties.opacity, to.properties.opacity),
  };
}

export default function PreviewCanvas() {
  const {
    keyframes,
    easingCurves,
    previewElement,
    playback,
    setCurrentTime,
    duration,
  } = useAnimationStore();

  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!playback.isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const state = useAnimationStore.getState();
      const { speed, loop, currentTime } = state.playback;
      const inc = (dt / state.duration) * 100 * speed;
      let newT = currentTime + inc;
      if (newT >= 100) {
        if (loop) {
          newT = newT - 100;
        } else {
          newT = 100;
          useAnimationStore.getState().pause();
        }
      }
      setCurrentTime(newT);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playback.isPlaying, playback.speed, playback.loop, duration, setCurrentTime]);

  const props = interpolateProps(keyframes, easingCurves, playback.currentTime);
  const style: React.CSSProperties = {
    width: previewElement.width,
    height: previewElement.height,
    borderRadius: previewElement.borderRadius,
    background: previewElement.background,
    transform: `translate(${props.translateX}px, ${props.translateY}px) rotate(${props.rotate}deg) scale(${props.scaleX}, ${props.scaleY})`,
    opacity: props.opacity,
    boxShadow: '0 8px 32px rgba(34, 211, 238, 0.25), 0 4px 16px rgba(168, 85, 247, 0.2)',
    transition: playback.isPlaying ? 'none' : 'all 0.05s linear',
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative bg-editor-bg overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(to right, #334155 1px, transparent 1px),
          linear-gradient(to bottom, #334155 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-xs text-slate-400">
        <span className="font-display font-medium tracking-wider">预览画布</span>
        <span className="px-2 py-0.5 rounded bg-editor-panel border border-editor-border font-mono">
          t = {playback.currentTime.toFixed(1)}%
        </span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <div className="text-xs text-slate-400 font-mono">
          <div>duration: <span className="text-editor-accent">{duration}s</span></div>
          <div>speed: <span className="text-editor-warn">{playback.speed}x</span></div>
        </div>
      </div>

      <div className="relative z-10">
        <div style={style} />
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] text-slate-500 font-mono">
        <div>◀</div>
        <div>原点 (0, 0)</div>
        <div>▶</div>
      </div>
    </div>
  );
}
