import { create } from 'zustand';

export interface KeyframeProperties {
  translateX: number;
  translateY: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

export interface Keyframe {
  id: string;
  percent: number;
  properties: KeyframeProperties;
}

export interface EasingCurve {
  name: string;
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
}

export interface PreviewElement {
  width: number;
  height: number;
  borderRadius: number;
  background: string;
}

export interface AnimationState {
  name: string;
  duration: number;
  keyframes: Keyframe[];
  selectedKeyframeId: string | null;
  selectedEasingPair: string | null;
  easingCurves: Record<string, EasingCurve>;
  playback: {
    isPlaying: boolean;
    speed: number;
    loop: boolean;
    currentTime: number;
  };
  previewElement: PreviewElement;
  copied: boolean;
}

export interface AnimationActions {
  setName: (name: string) => void;
  setDuration: (duration: number) => void;
  addKeyframe: (percent: number) => void;
  removeKeyframe: (id: string) => void;
  selectKeyframe: (id: string | null) => void;
  updateKeyframePercent: (id: string, percent: number) => void;
  updateKeyframeProperty: (id: string, prop: keyof KeyframeProperties, value: number) => void;
  selectEasingPair: (pair: string | null) => void;
  updateEasingCurve: (pair: string, curve: Partial<EasingCurve>) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
  setCurrentTime: (time: number) => void;
  resetPlayback: () => void;
  updatePreviewElement: (element: Partial<PreviewElement>) => void;
  setCopied: (copied: boolean) => void;
}

const genId = () => Math.random().toString(36).substring(2, 11);

const defaultProps: KeyframeProperties = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
  opacity: 1,
};

const kf0: Keyframe = {
  id: genId(),
  percent: 0,
  properties: { ...defaultProps },
};

const kf50: Keyframe = {
  id: genId(),
  percent: 50,
  properties: { ...defaultProps, translateX: 120, rotate: 180, scaleX: 1.2, scaleY: 1.2 },
};

const kf100: Keyframe = {
  id: genId(),
  percent: 100,
  properties: { ...defaultProps, translateX: 0, rotate: 360 },
};

const easingPair1 = `${kf0.id}-${kf50.id}`;
const easingPair2 = `${kf50.id}-${kf100.id}`;

export const useAnimationStore = create<AnimationState & AnimationActions>((set, get) => ({
  name: 'myAnimation',
  duration: 3,
  keyframes: [kf0, kf50, kf100].sort((a, b) => a.percent - b.percent),
  selectedKeyframeId: null,
  selectedEasingPair: null,
  easingCurves: {
    [easingPair1]: { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 },
    [easingPair2]: { name: 'ease-out', p1x: 0, p1y: 0, p2x: 0.58, p2y: 1 },
  },
  playback: {
    isPlaying: false,
    speed: 1,
    loop: true,
    currentTime: 0,
  },
  previewElement: {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
  },
  copied: false,

  setName: (name) => set({ name }),
  setDuration: (duration) => set({ duration: Math.max(0.1, duration) }),

  addKeyframe: (percent) => {
    const { keyframes } = get();
    const exists = keyframes.find((k) => Math.abs(k.percent - percent) < 0.5);
    if (exists) return;
    let properties = { ...defaultProps };
    const sorted = [...keyframes].sort((a, b) => a.percent - b.percent);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (percent > sorted[i].percent && percent < sorted[i + 1].percent) {
        const t = (percent - sorted[i].percent) / (sorted[i + 1].percent - sorted[i].percent);
        properties = {
          translateX: sorted[i].properties.translateX + (sorted[i + 1].properties.translateX - sorted[i].properties.translateX) * t,
          translateY: sorted[i].properties.translateY + (sorted[i + 1].properties.translateY - sorted[i].properties.translateY) * t,
          rotate: sorted[i].properties.rotate + (sorted[i + 1].properties.rotate - sorted[i].properties.rotate) * t,
          scaleX: sorted[i].properties.scaleX + (sorted[i + 1].properties.scaleX - sorted[i].properties.scaleX) * t,
          scaleY: sorted[i].properties.scaleY + (sorted[i + 1].properties.scaleY - sorted[i].properties.scaleY) * t,
          opacity: sorted[i].properties.opacity + (sorted[i + 1].properties.opacity - sorted[i].properties.opacity) * t,
        };
        break;
      }
    }
    const newKf: Keyframe = { id: genId(), percent, properties };
    const newKeyframes = [...keyframes, newKf].sort((a, b) => a.percent - b.percent);

    const newEasingCurves = { ...get().easingCurves };
    const idx = newKeyframes.findIndex((k) => k.id === newKf.id);
    if (idx > 0) {
      const prevPair = `${newKeyframes[idx - 1].id}-${newKf.id}`;
      newEasingCurves[prevPair] = { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 };
    }
    if (idx < newKeyframes.length - 1) {
      const nextPair = `${newKf.id}-${newKeyframes[idx + 1].id}`;
      newEasingCurves[nextPair] = { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 };
    }

    set({ keyframes: newKeyframes, easingCurves: newEasingCurves, selectedKeyframeId: newKf.id });
  },

  removeKeyframe: (id) => {
    const { keyframes, easingCurves } = get();
    if (keyframes.length <= 2) return;
    const kf = keyframes.find((k) => k.id === id);
    if (!kf || kf.percent === 0 || kf.percent === 100) return;
    const newKeyframes = keyframes.filter((k) => k.id !== id);
    const newEasingCurves: Record<string, EasingCurve> = {};
    Object.entries(easingCurves).forEach(([pair, curve]) => {
      if (!pair.includes(id)) newEasingCurves[pair] = curve;
    });
    set({
      keyframes: newKeyframes,
      easingCurves: newEasingCurves,
      selectedKeyframeId: get().selectedKeyframeId === id ? null : get().selectedKeyframeId,
    });
  },

  selectKeyframe: (id) => set({ selectedKeyframeId: id, selectedEasingPair: null }),
  selectEasingPair: (pair) => set({ selectedEasingPair: pair, selectedKeyframeId: null }),

  updateKeyframePercent: (id, percent) => {
    const { keyframes } = get();
    const sorted = [...keyframes].sort((a, b) => a.percent - b.percent);
    const idx = sorted.findIndex((k) => k.id === id);
    if (idx < 0) return;
    const minP = idx === 0 ? 0 : sorted[idx - 1].percent + 0.5;
    const maxP = idx === sorted.length - 1 ? 100 : sorted[idx + 1].percent - 0.5;
    const clamped = Math.max(minP, Math.min(maxP, percent));
    const newKeyframes = keyframes.map((k) => (k.id === id ? { ...k, percent: clamped } : k));
    set({ keyframes: newKeyframes });
  },

  updateKeyframeProperty: (id, prop, value) => {
    set({
      keyframes: get().keyframes.map((k) =>
        k.id === id ? { ...k, properties: { ...k.properties, [prop]: value } } : k
      ),
    });
  },

  updateEasingCurve: (pair, curve) => {
    const current = get().easingCurves[pair] || { name: 'custom', p1x: 0, p1y: 0, p2x: 1, p2y: 1 };
    set({
      easingCurves: { ...get().easingCurves, [pair]: { ...current, ...curve } },
    });
  },

  play: () => set({ playback: { ...get().playback, isPlaying: true } }),
  pause: () => set({ playback: { ...get().playback, isPlaying: false } }),
  togglePlay: () => set({ playback: { ...get().playback, isPlaying: !get().playback.isPlaying } }),
  setSpeed: (speed) => set({ playback: { ...get().playback, speed: Math.max(0.25, Math.min(4, speed)) } }),
  setLoop: (loop) => set({ playback: { ...get().playback, loop } }),
  setCurrentTime: (time) => set({ playback: { ...get().playback, currentTime: Math.max(0, Math.min(100, time)) } }),
  resetPlayback: () => set({ playback: { ...get().playback, isPlaying: false, currentTime: 0 } }),

  updatePreviewElement: (element) => set({ previewElement: { ...get().previewElement, ...element } }),
  setCopied: (copied) => set({ copied }),
}));
