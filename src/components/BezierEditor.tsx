import { useRef, useState } from 'react';
import { useAnimationStore } from '../store/animationStore';
import { presetEasings, type BezierPoints } from '../utils/bezierUtils';

const CANVAS_SIZE = 240;
const PADDING = 24;
const GRAPH_SIZE = CANVAS_SIZE - PADDING * 2;

function toSvg(n: number) {
  return PADDING + n * GRAPH_SIZE;
}

export default function BezierEditor() {
  const {
    keyframes,
    easingCurves,
    updateEasingCurve,
    selectedKeyframeId,
    selectEasingPair,
    selectedEasingPair,
  } = useAnimationStore();

  const sorted = [...keyframes].sort((a, b) => a.percent - b.percent);

  const pairs: { key: string; label: string }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    pairs.push({
      key: `${sorted[i].id}-${sorted[i + 1].id}`,
      label: `${sorted[i].percent}% → ${sorted[i + 1].percent}%`,
    });
  }

  const activePair = selectedEasingPair || (selectedKeyframeId ? (() => {
    const idx = sorted.findIndex((k) => k.id === selectedKeyframeId);
    if (idx > 0) return `${sorted[idx - 1].id}-${sorted[idx].id}`;
    if (idx < sorted.length - 1) return `${sorted[idx].id}-${sorted[idx + 1].id}`;
    return pairs[0]?.key;
  })() : pairs[0]?.key);

  const curve = activePair
    ? easingCurves[activePair] || presetEasings.ease
    : presetEasings.ease;

  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingPoint, setDraggingPoint] = useState<1 | 2 | null>(null);

  const handleControlPointDown = (e: React.MouseEvent, point: 1 | 2) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingPoint(point);
    const onMouseMove = (ev: MouseEvent) => {
      if (!svgRef.current || !activePair) return;
      const rect = svgRef.current.getBoundingClientRect();
      let x = (ev.clientX - rect.left - PADDING) / GRAPH_SIZE;
      let y = 1 - (ev.clientY - rect.top - PADDING) / GRAPH_SIZE;
      x = Math.max(0, Math.min(1, x));
      y = Math.max(-0.5, Math.min(1.5, y));
      const propX = point === 1 ? 'p1x' : 'p2x';
      const propY = point === 1 ? 'p1y' : 'p2y';
      updateEasingCurve(activePair, { [propX]: x, [propY]: y, name: 'custom' });
    };
    const onMouseUp = () => {
      setDraggingPoint(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const applyPreset = (preset: BezierPoints & { name: string }) => {
    if (!activePair) return;
    updateEasingCurve(activePair, preset);
  };

  const pathD = `M ${toSvg(0)} ${toSvg(1)} C ${toSvg(curve.p1x)} ${toSvg(1 - curve.p1y)}, ${toSvg(curve.p2x)} ${toSvg(1 - curve.p2y)}, ${toSvg(1)} ${toSvg(0)}`;

  return (
    <div className="w-72 bg-editor-panel border-r border-editor-border flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-editor-border/50 bg-editor-panel/80 backdrop-blur">
        <h2 className="font-display font-semibold text-slate-100 text-sm tracking-wide">
          缓动曲线
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          拖拽控制点调整过渡效果
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-[11px] text-slate-400 font-medium">选择过渡区间</label>
          <div className="flex flex-wrap gap-1">
            {pairs.map((p) => (
              <button
                key={p.key}
                onClick={() => selectEasingPair(p.key)}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                  activePair === p.key
                    ? 'bg-editor-accent/20 text-editor-accent border border-editor-accent/50'
                    : 'bg-editor-bg text-slate-400 border border-editor-border hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center bg-editor-bg rounded-lg p-2 border border-editor-border">
          <svg
            ref={svgRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ userSelect: 'none' }}
          >
            <defs>
              <linearGradient id="curveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line
                  x1={toSvg(v)}
                  y1={PADDING}
                  x2={toSvg(v)}
                  y2={PADDING + GRAPH_SIZE}
                  stroke="#334155"
                  strokeWidth={0.5}
                  strokeDasharray={v === 0 || v === 1 ? '0' : '2,2'}
                />
                <line
                  x1={PADDING}
                  y1={toSvg(1 - v)}
                  x2={PADDING + GRAPH_SIZE}
                  y2={toSvg(1 - v)}
                  stroke="#334155"
                  strokeWidth={0.5}
                  strokeDasharray={v === 0 || v === 1 ? '0' : '2,2'}
                />
              </g>
            ))}

            <rect
              x={PADDING}
              y={PADDING}
              width={GRAPH_SIZE}
              height={GRAPH_SIZE}
              fill="none"
              stroke="#475569"
              strokeWidth={1}
            />

            <line
              x1={toSvg(0)}
              y1={toSvg(1)}
              x2={toSvg(1)}
              y2={toSvg(0)}
              stroke="#475569"
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />

            <line
              x1={toSvg(0)}
              y1={toSvg(1)}
              x2={toSvg(curve.p1x)}
              y2={toSvg(1 - curve.p1y)}
              stroke="#f59e0b"
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.7}
            />
            <line
              x1={toSvg(1)}
              y1={toSvg(0)}
              x2={toSvg(curve.p2x)}
              y2={toSvg(1 - curve.p2y)}
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.7}
            />

            <path
              d={pathD}
              fill="none"
              stroke="url(#curveGrad)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />

            <circle cx={toSvg(0)} cy={toSvg(1)} r={4} fill="#64748b" />
            <circle cx={toSvg(1)} cy={toSvg(0)} r={4} fill="#64748b" />

            <circle
              cx={toSvg(curve.p1x)}
              cy={toSvg(1 - curve.p1y)}
              r={7}
              fill="#f59e0b"
              stroke="#fbbf24"
              strokeWidth={2}
              style={{ cursor: draggingPoint === 1 ? 'grabbing' : 'grab' }}
              onMouseDown={(e) => handleControlPointDown(e, 1)}
            />
            <circle
              cx={toSvg(curve.p2x)}
              cy={toSvg(1 - curve.p2y)}
              r={7}
              fill="#10b981"
              stroke="#34d399"
              strokeWidth={2}
              style={{ cursor: draggingPoint === 2 ? 'grabbing' : 'grab' }}
              onMouseDown={(e) => handleControlPointDown(e, 2)}
            />

            <text x={toSvg(0)} y={PADDING + GRAPH_SIZE + 14} fontSize="9" fill="#64748b" textAnchor="middle" fontFamily="JetBrains Mono">0</text>
            <text x={toSvg(1)} y={PADDING + GRAPH_SIZE + 14} fontSize="9" fill="#64748b" textAnchor="middle" fontFamily="JetBrains Mono">1</text>
            <text x={PADDING - 10} y={toSvg(1) + 3} fontSize="9" fill="#64748b" textAnchor="middle" fontFamily="JetBrains Mono">0</text>
            <text x={PADDING - 10} y={toSvg(0) + 3} fontSize="9" fill="#64748b" textAnchor="middle" fontFamily="JetBrains Mono">1</text>
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-editor-bg p-2 rounded border border-editor-border">
          <div className="text-slate-500">
            P1:
            <span className="text-editor-warn ml-1">
              ({curve.p1x.toFixed(2)}, {curve.p1y.toFixed(2)})
            </span>
          </div>
          <div className="text-slate-500">
            P2:
            <span className="text-editor-success ml-1">
              ({curve.p2x.toFixed(2)}, {curve.p2y.toFixed(2)})
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] text-slate-400 font-medium">预设缓动</label>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(presetEasings).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => applyPreset(preset)}
                className="px-2 py-1.5 rounded text-[10px] font-mono bg-editor-bg border border-editor-border text-slate-300 hover:border-editor-accent hover:text-editor-accent transition-all"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
