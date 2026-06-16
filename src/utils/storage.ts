import type { AnimationState, PreviewElement, Keyframe, EasingCurve } from '../store/animationStore';

const DRAFTS_KEY = 'css_editor_drafts';
const PRESETS_KEY = 'css_editor_presets';
const SNAP_KEY = 'css_editor_snap';

export interface SavedAnimation {
  id: string;
  name: string;
  type: 'draft' | 'preset';
  createdAt: number;
  updatedAt: number;
  data: {
    name: string;
    duration: number;
    keyframes: Keyframe[];
    easingCurves: Record<string, EasingCurve>;
    previewElement: PreviewElement;
  };
}

const genId = () => 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);

export function loadDrafts(): SavedAnimation[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('加载草稿失败', e);
    return [];
  }
}

export function saveDrafts(drafts: SavedAnimation[]): void {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('保存草稿失败', e);
  }
}

export function loadPresets(): SavedAnimation[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return initDefaultPresets();
  } catch (e) {
    console.error('加载预设失败', e);
    return initDefaultPresets();
  }
}

export function savePresets(presets: SavedAnimation[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('保存预设失败', e);
  }
}

export function loadSnapSetting(): boolean {
  try {
    const raw = localStorage.getItem(SNAP_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function saveSnapSetting(enabled: boolean): void {
  try {
    localStorage.setItem(SNAP_KEY, String(enabled));
  } catch (e) {
    console.error('保存吸附设置失败', e);
  }
}

export function createDraftFromState(state: AnimationState, name?: string): SavedAnimation {
  return {
    id: genId(),
    name: name || state.name || '未命名动画',
    type: 'draft',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    data: {
      name: state.name,
      duration: state.duration,
      keyframes: JSON.parse(JSON.stringify(state.keyframes)),
      easingCurves: JSON.parse(JSON.stringify(state.easingCurves)),
      previewElement: JSON.parse(JSON.stringify(state.previewElement)),
    },
  };
}

const kfId = () => 'kf_' + Math.random().toString(36).substring(2, 10);

function initDefaultPresets(): SavedAnimation[] {
  const presetList: SavedAnimation[] = [];
  const now = Date.now();

  const defaultEl: PreviewElement = {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #22d3ee, #a855f7)',
  };

  const k1: Keyframe = {
    id: kfId(),
    percent: 0,
    properties: { translateX: 0, translateY: -100, rotate: -15, scaleX: 0.3, scaleY: 0.3, opacity: 0 },
  };
  const k2: Keyframe = {
    id: kfId(),
    percent: 55,
    properties: { translateX: 0, translateY: 20, rotate: 3, scaleX: 1.1, scaleY: 1.1, opacity: 1 },
  };
  const k3: Keyframe = {
    id: kfId(),
    percent: 72,
    properties: { translateX: 0, translateY: -8, rotate: -1, scaleX: 0.95, scaleY: 0.95, opacity: 1 },
  };
  const k4: Keyframe = {
    id: kfId(),
    percent: 85,
    properties: { translateX: 0, translateY: 3, rotate: 0, scaleX: 1.02, scaleY: 1.02, opacity: 1 },
  };
  const k5: Keyframe = {
    id: kfId(),
    percent: 100,
    properties: { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 },
  };
  presetList.push({
    id: 'preset_bounce',
    name: '弹跳进入 (bounceIn)',
    type: 'preset',
    createdAt: now,
    updatedAt: now,
    data: {
      name: 'bounceIn',
      duration: 1.2,
      keyframes: [k1, k2, k3, k4, k5],
      easingCurves: {
        [`${k1.id}-${k2.id}`]: { name: 'ease-out', p1x: 0, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${k2.id}-${k3.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${k3.id}-${k4.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${k4.id}-${k5.id}`]: { name: 'ease-out', p1x: 0, p1y: 0, p2x: 0.58, p2y: 1 },
      },
      previewElement: defaultEl,
    },
  });

  const f1: Keyframe = { id: kfId(), percent: 0, properties: { translateX: 0, translateY: 60, rotate: 0, scaleX: 1, scaleY: 1, opacity: 0 } };
  const f2: Keyframe = { id: kfId(), percent: 100, properties: { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 } };
  presetList.push({
    id: 'preset_fadeInUp',
    name: '淡入上移 (fadeInUp)',
    type: 'preset',
    createdAt: now,
    updatedAt: now,
    data: {
      name: 'fadeInUp',
      duration: 0.8,
      keyframes: [f1, f2],
      easingCurves: { [`${f1.id}-${f2.id}`]: { name: 'ease-out', p1x: 0, p1y: 0, p2x: 0.58, p2y: 1 } },
      previewElement: defaultEl,
    },
  });

  const s1: Keyframe = { id: kfId(), percent: 0, properties: { translateX: 0, translateY: 0, rotate: -180, scaleX: 0, scaleY: 0, opacity: 0 } };
  const s2: Keyframe = { id: kfId(), percent: 100, properties: { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 } };
  presetList.push({
    id: 'preset_spinIn',
    name: '旋转进入 (spinIn)',
    type: 'preset',
    createdAt: now,
    updatedAt: now,
    data: {
      name: 'spinIn',
      duration: 0.9,
      keyframes: [s1, s2],
      easingCurves: { [`${s1.id}-${s2.id}`]: { name: 'ease-out-cubic', p1x: 0.33, p1y: 1, p2x: 0.68, p2y: 1 } },
      previewElement: defaultEl,
    },
  });

  const p1: Keyframe = { id: kfId(), percent: 0, properties: { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 } };
  const p2: Keyframe = { id: kfId(), percent: 50, properties: { translateX: 0, translateY: 0, rotate: 0, scaleX: 1.15, scaleY: 1.15, opacity: 0.85 } };
  const p3: Keyframe = { id: kfId(), percent: 100, properties: { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 } };
  presetList.push({
    id: 'preset_pulse',
    name: '呼吸脉冲 (pulse)',
    type: 'preset',
    createdAt: now,
    updatedAt: now,
    data: {
      name: 'pulse',
      duration: 2,
      keyframes: [p1, p2, p3],
      easingCurves: {
        [`${p1.id}-${p2.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${p2.id}-${p3.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
      },
      previewElement: defaultEl,
    },
  });

  const sh1: Keyframe = { id: kfId(), percent: 0, properties: { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 } };
  const sh2: Keyframe = { id: kfId(), percent: 15, properties: { translateX: -12, translateY: 0, rotate: -4, scaleX: 1, scaleY: 1, opacity: 1 } };
  const sh3: Keyframe = { id: kfId(), percent: 30, properties: { translateX: 12, translateY: 0, rotate: 4, scaleX: 1, scaleY: 1, opacity: 1 } };
  const sh4: Keyframe = { id: kfId(), percent: 45, properties: { translateX: -8, translateY: 0, rotate: -3, scaleX: 1, scaleY: 1, opacity: 1 } };
  const sh5: Keyframe = { id: kfId(), percent: 60, properties: { translateX: 8, translateY: 0, rotate: 3, scaleX: 1, scaleY: 1, opacity: 1 } };
  const sh6: Keyframe = { id: kfId(), percent: 75, properties: { translateX: -4, translateY: 0, rotate: -2, scaleX: 1, scaleY: 1, opacity: 1 } };
  const sh7: Keyframe = { id: kfId(), percent: 100, properties: { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 } };
  presetList.push({
    id: 'preset_shake',
    name: '抖动效果 (shake)',
    type: 'preset',
    createdAt: now,
    updatedAt: now,
    data: {
      name: 'shake',
      duration: 0.8,
      keyframes: [sh1, sh2, sh3, sh4, sh5, sh6, sh7],
      easingCurves: {
        [`${sh1.id}-${sh2.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${sh2.id}-${sh3.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${sh3.id}-${sh4.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${sh4.id}-${sh5.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${sh5.id}-${sh6.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${sh6.id}-${sh7.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
      },
      previewElement: defaultEl,
    },
  });

  const fl1: Keyframe = { id: kfId(), percent: 0, properties: { translateX: 0, translateY: -15, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 } };
  const fl2: Keyframe = { id: kfId(), percent: 50, properties: { translateX: 0, translateY: 15, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 } };
  const fl3: Keyframe = { id: kfId(), percent: 100, properties: { translateX: 0, translateY: -15, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 } };
  presetList.push({
    id: 'preset_float',
    name: '上下漂浮 (float)',
    type: 'preset',
    createdAt: now,
    updatedAt: now,
    data: {
      name: 'float',
      duration: 3,
      keyframes: [fl1, fl2, fl3],
      easingCurves: {
        [`${fl1.id}-${fl2.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
        [`${fl2.id}-${fl3.id}`]: { name: 'ease-in-out', p1x: 0.42, p1y: 0, p2x: 0.58, p2y: 1 },
      },
      previewElement: defaultEl,
    },
  });

  savePresets(presetList);
  return presetList;
}

export function exportAnimationToJson(state: AnimationState): string {
  const data = createDraftFromState(state);
  return JSON.stringify(data, null, 2);
}

export function importAnimationFromJson(jsonStr: string): SavedAnimation | null {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.data || !data.data.keyframes) return null;
    return {
      id: data.id || genId(),
      name: data.name || '导入的动画',
      type: 'draft',
      createdAt: data.createdAt || Date.now(),
      updatedAt: Date.now(),
      data: data.data,
    };
  } catch (e) {
    console.error('导入JSON失败', e);
    return null;
  }
}
