import { useAnimationStore, type KeyframeProperties } from '../store/animationStore';

interface SliderProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
}

function PropertySlider({ label, value, unit, min, max, step, onChange, icon }: SliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={Number(value.toFixed(2))}
            step={step}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="w-16 px-1.5 py-0.5 text-right text-xs font-mono bg-editor-bg border border-editor-border rounded focus:outline-none focus:border-editor-accent text-slate-200"
          />
          <span className="text-[10px] text-slate-500 w-5">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export default function PropertyPanel() {
  const {
    keyframes,
    selectedKeyframeId,
    updateKeyframeProperty,
    updatePreviewElement,
    previewElement,
  } = useAnimationStore();

  const selectedKf = keyframes.find((k) => k.id === selectedKeyframeId);

  const updateProp = (prop: keyof KeyframeProperties, val: number) => {
    if (!selectedKf) return;
    updateKeyframeProperty(selectedKf.id, prop, val);
  };

  return (
    <div className="w-80 bg-editor-panel border-l border-editor-border flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-editor-border/50 bg-editor-panel/80 backdrop-blur">
        <h2 className="font-display font-semibold text-slate-100 text-sm tracking-wide">
          属性配置
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {selectedKf
            ? `已选中 ${selectedKf.percent}% 关键帧`
            : '点击时间轴上的关键帧节点进行编辑'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-4">
          <div className="px-2 py-1.5 -mx-2 rounded bg-editor-accent/10 border border-editor-accent/20">
            <h3 className="text-xs font-semibold text-editor-accent font-display mb-1">
              关键帧属性
            </h3>
          </div>

          {!selectedKf ? (
            <div className="py-12 text-center">
              <div className="text-slate-600 text-xs">请先选择一个关键帧</div>
              <div className="mt-2 text-slate-700 text-[10px]">
                点击时间轴上的菱形节点
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <PropertySlider
                  label="X 位移"
                  value={selectedKf.properties.translateX}
                  unit="px"
                  min={-300}
                  max={300}
                  step={1}
                  onChange={(v) => updateProp('translateX', v)}
                />
                <PropertySlider
                  label="Y 位移"
                  value={selectedKf.properties.translateY}
                  unit="px"
                  min={-300}
                  max={300}
                  step={1}
                  onChange={(v) => updateProp('translateY', v)}
                />
              </div>

              <PropertySlider
                label="旋转角度"
                value={selectedKf.properties.rotate}
                unit="deg"
                min={-720}
                max={720}
                step={5}
                onChange={(v) => updateProp('rotate', v)}
              />

              <div className="grid grid-cols-2 gap-3">
                <PropertySlider
                  label="X 缩放"
                  value={selectedKf.properties.scaleX}
                  unit=""
                  min={0}
                  max={3}
                  step={0.05}
                  onChange={(v) => updateProp('scaleX', v)}
                />
                <PropertySlider
                  label="Y 缩放"
                  value={selectedKf.properties.scaleY}
                  unit=""
                  min={0}
                  max={3}
                  step={0.05}
                  onChange={(v) => updateProp('scaleY', v)}
                />
              </div>

              <PropertySlider
                label="透明度"
                value={selectedKf.properties.opacity}
                unit=""
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => updateProp('opacity', v)}
              />

              <div className="flex gap-2 pt-2 border-t border-editor-border/50">
                <button
                  onClick={() => {
                    const p = selectedKf.properties;
                    updateProp('scaleX', p.scaleY);
                  }}
                  className="flex-1 px-2 py-1 text-[10px] rounded bg-editor-border hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  同步缩放 X=Y
                </button>
                <button
                  onClick={() => {
                    ['translateX', 'translateY', 'rotate', 'opacity'].forEach((p) =>
                      updateProp(p as keyof KeyframeProperties, p === 'opacity' ? 1 : 0)
                    );
                    updateProp('scaleX', 1);
                    updateProp('scaleY', 1);
                  }}
                  className="flex-1 px-2 py-1 text-[10px] rounded bg-editor-border hover:bg-red-500/30 text-slate-300 hover:text-red-300 transition-colors"
                >
                  重置此关键帧
                </button>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4 pt-3 border-t border-editor-border/50">
          <div className="px-2 py-1.5 -mx-2 rounded bg-editor-keyframe/10 border border-editor-keyframe/20">
            <h3 className="text-xs font-semibold text-editor-keyframe font-display mb-1">
              预览元素样式
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PropertySlider
              label="宽度"
              value={previewElement.width}
              unit="px"
              min={20}
              max={200}
              step={2}
              onChange={(v) => updatePreviewElement({ width: v })}
            />
            <PropertySlider
              label="高度"
              value={previewElement.height}
              unit="px"
              min={20}
              max={200}
              step={2}
              onChange={(v) => updatePreviewElement({ height: v })}
            />
          </div>

          <PropertySlider
            label="圆角"
            value={previewElement.borderRadius}
            unit="px"
            min={0}
            max={100}
            step={1}
            onChange={(v) => updatePreviewElement({ borderRadius: v })}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-medium">渐变色</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                'linear-gradient(135deg, #22d3ee, #a855f7)',
                'linear-gradient(135deg, #f59e0b, #ef4444)',
                'linear-gradient(135deg, #10b981, #06b6d4)',
                'linear-gradient(135deg, #f472b6, #8b5cf6)',
                'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                '#ef4444',
                '#f59e0b',
                '#10b981',
                '#3b82f6',
                '#a855f7',
              ].map((c, i) => (
                <button
                  key={i}
                  onClick={() => updatePreviewElement({ background: c })}
                  className={`h-8 rounded border-2 transition-all hover:scale-105 ${
                    previewElement.background === c
                      ? 'border-editor-accent shadow-glow-cyan'
                      : 'border-transparent'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
