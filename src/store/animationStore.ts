import { create } from 'zustand';
import { produce } from 'immer';
import type { Draft } from 'immer';
import type { ParseResult } from '../utils/cssParser';
import {
  loadDrafts, loadPresets, saveDrafts, savePresets,
  loadSnapSetting, saveSnapSetting,
  createDraftFromState, importAnimationFromJson,
  type SavedAnimation,
} from '../utils/storage';

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
  easing?: string;
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

export interface HistoryState {
  name: string;
  duration: number;
  keyframes: Keyframe[];
  easingCurves: Record<string, EasingCurve>;
  previewElement: PreviewElement;
}

export interface AnimationState {
  name: string;
  duration: number;
  keyframes: Keyframe[];
  selectedKeyframeId: string | null;
  selectedEasingPair: string | null;
  easingCurves: Record<string, EasingCurve>;
  snapEnabled: boolean;
  snapStep: number;
  playback: {
    isPlaying: boolean;
    speed: number;
    loop: boolean;
    currentTime: number;
  };
  previewElement: PreviewElement;
  copied: boolean;
  importModalOpen: boolean;
  showDraftPanel: boolean;
  drafts: SavedAnimation[];
  presets: SavedAnimation[];
  past: HistoryState[];
  future: HistoryState[];
}

export interface AnimationActions {
  setName: (name: string) => void;
  setDuration: (duration: number) => void;
  addKeyframe: (percent: number, properties?: Partial<KeyframeProperties>) => void;
  addKeyframeAtCurrentTime: () => void;
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
  setSnapEnabled: (enabled: boolean) => void;
  setSnapStep: (step: number) => void;
  setImportModalOpen: (open: boolean) => void;
  setShowDraftPanel: (show: boolean) => void;
  importFromCss: (result: ParseResult) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveDraft: (name?: string) => void;
  loadDraft: (id: string) => void;
  deleteDraft: (id: string) => void;
  loadPreset: (id: string) => void;
  exportToJson: () => string;
  importFromJson: (json: string) => boolean;
  jumpToPercent: (percent: number) => void;
  addKeyframeAtPercent: (percent: number) => void;
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

function cloneStateForHistory(s: AnimationState): HistoryState {
  return {
    name: s.name,
    duration: s.duration,
    keyframes: JSON.parse(JSON.stringify(s.keyframes)),
    easingCurves: JSON.parse(JSON.stringify(s.easingCurves)),
    previewElement: JSON.parse(JSON.stringify(s.previewElement)),
  };
}

function createInitialKeyframes(): { kfs: Keyframe[]; ec: Record<string, EasingCurve> } {
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
  return {
    kfs: [kf0, kf50, kf100].sort((a, b) => a.percent - b.percent),
    ec: {
      [easingPair1]: { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 },
      [easingPair2]: { name: 'ease-out', p1x: 0, p1y: 0, p2x: 0.58, p2y: 1 },
    },
  };
}

const MAX_HISTORY = 50;

function pushHistory(state: AnimationState): void {
  const historyEntry = cloneStateForHistory(state);
  state.past.push(historyEntry);
  if (state.past.length > MAX_HISTORY) {
    state.past.shift();
  }
  state.future.length = 0;
}

const initialData = createInitialKeyframes();

export const useAnimationStore = create<AnimationState & AnimationActions>((set, get) => ({
  name: 'myAnimation',
  duration: 3,
  keyframes: initialData.kfs,
  selectedKeyframeId: null,
  selectedEasingPair: null,
  easingCurves: initialData.ec,
  snapEnabled: loadSnapSetting(),
  snapStep: 5,
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
  importModalOpen: false,
  showDraftPanel: false,
  drafts: loadDrafts(),
  presets: loadPresets(),
  past: [],
  future: [],

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  setName: (name) => set(
    produce((s: AnimationState) => {
      pushHistory(s);
      s.name = name;
    })
  ),

  setDuration: (duration) => set(
    produce((s: AnimationState) => {
      pushHistory(s);
      s.duration = Math.max(0.1, duration);
    })
  ),

  addKeyframeAtPercent: (percent) => {
    const { keyframes, easingCurves, snapEnabled, snapStep } = get();
    let finalPercent = percent;
    if (snapEnabled) {
      finalPercent = Math.round(percent / snapStep) * snapStep;
    } else {
      finalPercent = Math.round(percent * 100) / 100;
    }
    const exists = keyframes.find((k) => Math.abs(k.percent - finalPercent) < 0.01);
    if (exists) {
      get().selectKeyframe(exists.id);
      return;
    }
    set(
      produce((s: AnimationState) => {
        pushHistory(s);
        let properties = { ...defaultProps };
        const sorted = [...s.keyframes].sort((a, b) => a.percent - b.percent);
        for (let i = 0; i < sorted.length - 1; i++) {
          if (finalPercent > sorted[i].percent && finalPercent < sorted[i + 1].percent) {
            const t = (finalPercent - sorted[i].percent) / (sorted[i + 1].percent - sorted[i].percent);
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
        const newKf: Keyframe = { id: genId(), percent: finalPercent, properties };
        s.keyframes = [...s.keyframes, newKf].sort((a, b) => a.percent - b.percent);

        const idx = s.keyframes.findIndex((k) => k.id === newKf.id);
        if (idx > 0) {
          const prevPair = `${s.keyframes[idx - 1].id}-${newKf.id}`;
          s.easingCurves[prevPair] = { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 };
        }
        if (idx < s.keyframes.length - 1) {
          const nextPair = `${newKf.id}-${s.keyframes[idx + 1].id}`;
          s.easingCurves[nextPair] = { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 };
        }
        s.selectedKeyframeId = newKf.id;
      })
    );
  },

  addKeyframe: (percent, properties) => {
    get().addKeyframeAtPercent(percent);
    if (properties && get().selectedKeyframeId) {
      const id = get().selectedKeyframeId;
      set(
        produce((s: AnimationState) => {
          const kf = s.keyframes.find((k: Keyframe) => k.id === id);
          if (kf) {
            Object.assign(kf.properties, properties);
          }
        })
      );
    }
  },

  addKeyframeAtCurrentTime: () => {
    const { playback } = get();
    get().addKeyframeAtPercent(playback.currentTime);
  },

  removeKeyframe: (id) => {
    const { keyframes } = get();
    if (keyframes.length <= 2) return;
    const kf = keyframes.find((k) => k.id === id);
    if (!kf || kf.percent === 0 || kf.percent === 100) return;
    set(
      produce((s: AnimationState) => {
        pushHistory(s);
        s.keyframes = s.keyframes.filter((k: Keyframe) => k.id !== id);
        Object.keys(s.easingCurves).forEach((pair) => {
          if (pair.includes(id)) delete s.easingCurves[pair];
        });
        if (s.selectedKeyframeId === id) s.selectedKeyframeId = null;
      })
    );
  },

  selectKeyframe: (id) => set({ selectedKeyframeId: id, selectedEasingPair: null }),
  selectEasingPair: (pair) => set({ selectedEasingPair: pair, selectedKeyframeId: null }),

  updateKeyframePercent: (id, percent) => {
    set(
      produce((s: AnimationState) => {
        pushHistory(s);
        const sorted = [...s.keyframes].sort((a, b) => a.percent - b.percent);
        const idx = sorted.findIndex((k) => k.id === id);
        if (idx < 0) return;
        const minP = idx === 0 ? 0 : sorted[idx - 1].percent + 0.01;
        const maxP = idx === sorted.length - 1 ? 100 : sorted[idx + 1].percent - 0.01;
        const clamped = Math.max(minP, Math.min(maxP, percent));
        const kf = s.keyframes.find((k: Keyframe) => k.id === id);
        if (kf) kf.percent = clamped;
      })
    );
  },

  updateKeyframeProperty: (id, prop, value) => {
    set(
      produce((s: AnimationState) => {
        pushHistory(s);
        const kf = s.keyframes.find((k: Keyframe) => k.id === id);
        if (kf) {
          kf.properties[prop] = value;
        }
      })
    );
  },

  updateEasingCurve: (pair, curve) => {
    set(
      produce((s: AnimationState) => {
        pushHistory(s);
        const current = s.easingCurves[pair] || { name: 'custom', p1x: 0, p1y: 0, p2x: 1, p2y: 1 };
        s.easingCurves[pair] = { ...current, ...curve };
      })
    );
  },

  play: () => set({ playback: { ...get().playback, isPlaying: true } }),
  pause: () => set({ playback: { ...get().playback, isPlaying: false } }),
  togglePlay: () => set({ playback: { ...get().playback, isPlaying: !get().playback.isPlaying } }),
  setSpeed: (speed) => set({ playback: { ...get().playback, speed: Math.max(0.25, Math.min(4, speed)) } }),
  setLoop: (loop) => set({ playback: { ...get().playback, loop } }),
  setCurrentTime: (time) => set({ playback: { ...get().playback, currentTime: Math.max(0, Math.min(100, time)) } }),
  resetPlayback: () => set({ playback: { ...get().playback, isPlaying: false, currentTime: 0 } }),

  updatePreviewElement: (element) => set(
    produce((s: AnimationState) => {
      Object.assign(s.previewElement, element);
    })
  ),

  setCopied: (copied) => set({ copied }),

  setSnapEnabled: (enabled) => {
    saveSnapSetting(enabled);
    set({ snapEnabled: enabled });
  },
  setSnapStep: (step) => set({ snapStep: Math.max(0.1, step) }),

  setImportModalOpen: (open) => set({ importModalOpen: open }),
  setShowDraftPanel: (show) => set({ showDraftPanel: show }),

  jumpToPercent: (percent) => {
    get().setCurrentTime(Math.max(0, Math.min(100, percent)));
  },

  importFromCss: (result) => {
    set(
      produce((s: AnimationState) => {
        pushHistory(s);
        s.name = result.name;
        s.keyframes = result.keyframes;
        s.easingCurves = result.easingCurves;
        if (result.duration) s.duration = result.duration;
        s.selectedKeyframeId = null;
        s.selectedEasingPair = null;
        s.playback.currentTime = 0;
        s.playback.isPlaying = false;
      })
    );
  },

  undo: () => {
    set(
      produce((s: AnimationState) => {
        if (s.past.length === 0) return;
        const prev = s.past.pop()!;
        const current = cloneStateForHistory(s);
        s.future.push(current);
        s.name = prev.name;
        s.duration = prev.duration;
        s.keyframes = prev.keyframes;
        s.easingCurves = prev.easingCurves;
        s.previewElement = prev.previewElement;
        s.selectedKeyframeId = null;
        s.selectedEasingPair = null;
      })
    );
  },

  redo: () => {
    set(
      produce((s: AnimationState) => {
        if (s.future.length === 0) return;
        const next = s.future.pop()!;
        const current = cloneStateForHistory(s);
        s.past.push(current);
        s.name = next.name;
        s.duration = next.duration;
        s.keyframes = next.keyframes;
        s.easingCurves = next.easingCurves;
        s.previewElement = next.previewElement;
        s.selectedKeyframeId = null;
        s.selectedEasingPair = null;
      })
    );
  },

  saveDraft: (name) => {
    const draft = createDraftFromState(get(), name);
    set(
      produce((s: AnimationState) => {
        s.drafts = [draft, ...s.drafts];
      })
    );
    saveDrafts(get().drafts);
  },

  loadDraft: (id) => {
    const draft = get().drafts.find((d) => d.id === id);
    if (!draft) return;
    set(
      produce((s: AnimationState) => {
        pushHistory(s);
        s.name = draft.data.name;
        s.duration = draft.data.duration;
        s.keyframes = JSON.parse(JSON.stringify(draft.data.keyframes));
        s.easingCurves = JSON.parse(JSON.stringify(draft.data.easingCurves));
        s.previewElement = JSON.parse(JSON.stringify(draft.data.previewElement));
        s.selectedKeyframeId = null;
        s.selectedEasingPair = null;
        s.playback.currentTime = 0;
        s.playback.isPlaying = false;
      })
    );
  },

  deleteDraft: (id) => {
    const newDrafts = get().drafts.filter((d) => d.id !== id);
    set({ drafts: newDrafts });
    saveDrafts(newDrafts);
  },

  loadPreset: (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    set(
      produce((s: AnimationState) => {
        pushHistory(s);
        s.name = preset.data.name;
        s.duration = preset.data.duration;
        s.keyframes = JSON.parse(JSON.stringify(preset.data.keyframes));
        s.easingCurves = JSON.parse(JSON.stringify(preset.data.easingCurves));
        s.previewElement = JSON.parse(JSON.stringify(preset.data.previewElement));
        s.selectedKeyframeId = null;
        s.selectedEasingPair = null;
        s.playback.currentTime = 0;
        s.playback.isPlaying = false;
      })
    );
  },

  exportToJson: () => {
    return JSON.stringify(createDraftFromState(get()), null, 2);
  },

  importFromJson: (json) => {
    const result = importAnimationFromJson(json);
    if (!result) return false;
    set(
      produce((s: AnimationState) => {
        pushHistory(s);
        s.name = result.data.name;
        s.duration = result.data.duration;
        s.keyframes = JSON.parse(JSON.stringify(result.data.keyframes));
        s.easingCurves = JSON.parse(JSON.stringify(result.data.easingCurves));
        s.previewElement = JSON.parse(JSON.stringify(result.data.previewElement));
        s.selectedKeyframeId = null;
        s.selectedEasingPair = null;
        s.playback.currentTime = 0;
        s.playback.isPlaying = false;
        s.drafts = [result, ...s.drafts];
      })
    );
    saveDrafts(get().drafts);
    return true;
  },
}));
