import type { AnimationState, Keyframe, EasingCurve, KeyframeProperties } from '../store/animationStore';
import { bezierToCss, presetEasings } from './bezierUtils';

function formatNum(n: number, digits = 2): string {
  return Number(n.toFixed(digits)).toString();
}

function formatPercent(p: number): string {
  return Number.isInteger(p) ? `${p}%` : `${p.toFixed(2)}%`;
}

function propsEquals(a: KeyframeProperties, b: KeyframeProperties): boolean {
  return (
    a.translateX === b.translateX &&
    a.translateY === b.translateY &&
    a.rotate === b.rotate &&
    a.scaleX === b.scaleX &&
    a.scaleY === b.scaleY &&
    a.opacity === b.opacity
  );
}

function propsToLines(props: KeyframeProperties, indent = '    '): string[] {
  const transforms: string[] = [];
  if (props.translateX !== 0 || props.translateY !== 0) {
    transforms.push(`translate(${formatNum(props.translateX)}px, ${formatNum(props.translateY)}px)`);
  }
  if (props.rotate !== 0) {
    transforms.push(`rotate(${formatNum(props.rotate)}deg)`);
  }
  if (props.scaleX !== 1 || props.scaleY !== 1) {
    transforms.push(`scale(${formatNum(props.scaleX)}, ${formatNum(props.scaleY)})`);
  }
  const lines: string[] = [];
  if (transforms.length > 0) {
    lines.push(`${indent}transform: ${transforms.join(' ')};`);
  }
  if (props.opacity !== 1) {
    lines.push(`${indent}opacity: ${formatNum(props.opacity)};`);
  }
  return lines;
}

function keyframeBlock(
  kf: Keyframe,
  includeEasing = false,
  easingCss?: string
): string {
  const lines = propsToLines(kf.properties);
  if (includeEasing && easingCss) {
    lines.push(`    animation-timing-function: ${easingCss};`);
  }
  if (lines.length === 0) return '';
  return `  ${formatPercent(kf.percent)} {\n${lines.join('\n')}\n  }`;
}

export function getEasingString(curve: EasingCurve): string {
  const presetMatch = Object.entries(presetEasings).find(([, p]) =>
    Math.abs(p.p1x - curve.p1x) < 0.01 && Math.abs(p.p1y - curve.p1y) < 0.01 &&
    Math.abs(p.p2x - curve.p2x) < 0.01 && Math.abs(p.p2y - curve.p2y) < 0.01
  );
  if (presetMatch) return presetMatch[0];
  return bezierToCss(curve);
}

function getTransitionEasing(
  easingCurves: Record<string, EasingCurve>,
  fromId: string,
  toId: string
): string {
  const key = `${fromId}-${toId}`;
  const curve = easingCurves[key];
  if (!curve) return 'ease';
  return getEasingString(curve);
}

export function generateKeyframesCss(state: AnimationState): string {
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const blocks = sorted.map((kf) => keyframeBlock(kf, false)).filter(Boolean);
  const name = state.name || 'animation';
  return `@keyframes ${name} {\n${blocks.join('\n')}\n}`;
}

export function generateKeyframesWithEasing(state: AnimationState): string {
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const blocks = sorted
    .map((kf, idx) => {
      const easingCss =
        idx < sorted.length - 1
          ? getTransitionEasing(state.easingCurves, kf.id, sorted[idx + 1].id)
          : undefined;
      return keyframeBlock(kf, !!easingCss, easingCss);
    })
    .filter(Boolean);
  const name = state.name || 'animation';
  return `@keyframes ${name} {\n${blocks.join('\n')}\n}`;
}

export function generateWebAnimationsCode(state: AnimationState): string {
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const name = state.name || 'animation';

  const keyframesJs = sorted
    .map((kf, idx) => {
      const props: string[] = [];
      const tParts: string[] = [];
      if (kf.properties.translateX !== 0 || kf.properties.translateY !== 0)
        tParts.push(
          `translate(${formatNum(kf.properties.translateX)}px, ${formatNum(kf.properties.translateY)}px)`
        );
      if (kf.properties.rotate !== 0) tParts.push(`rotate(${formatNum(kf.properties.rotate)}deg)`);
      if (kf.properties.scaleX !== 1 || kf.properties.scaleY !== 1)
        tParts.push(`scale(${formatNum(kf.properties.scaleX)}, ${formatNum(kf.properties.scaleY)})`);
      if (tParts.length > 0) props.push(`    transform: \`${tParts.join(' ')}\``);
      if (kf.properties.opacity !== 1)
        props.push(`    opacity: ${formatNum(kf.properties.opacity)}`);
      const easing =
        idx < sorted.length - 1
          ? `,\n    easing: '${getTransitionEasing(state.easingCurves, kf.id, sorted[idx + 1].id)}'`
          : '';
      return `  {\n    offset: ${kf.percent / 100}${easing}${props.length > 0 ? ',\n' + props.join(',\n') : ''}\n  }`;
    })
    .join(',\n');

  return `// Web Animations API - 精确还原每段缓动节奏
// 用法: const el = document.querySelector('.your-element');
//       el.animate(${name}Keyframes, ${name}Options);

const ${name}Keyframes = [\n${keyframesJs}\n];

const ${name}Options = {
  duration: ${state.duration * 1000}, // ms
  iterations: ${state.playback.loop ? 'Infinity' : 1},
  fill: 'both'
};

// 播放控制:
// const anim = el.animate(${name}Keyframes, ${name}Options);
// anim.pause(); anim.play();
// anim.currentTime = 1000;`;
}

function buildFullSpanSegment(
  segName: string,
  startPct: number,
  endPct: number,
  fromProps: KeyframeProperties,
  toProps: KeyframeProperties
): string {
  const fromLines = propsToLines(fromProps, '    ');
  const toLines = propsToLines(toProps, '    ');
  if (fromLines.length === 0 && toLines.length === 0) return '';

  const sp = formatPercent(startPct);
  const ep = formatPercent(endPct);

  if (startPct === 0) {
    return `@keyframes ${segName} {\n  ${sp} {\n${fromLines.join('\n')}\n  }\n  ${ep} {\n${toLines.join('\n')}\n  }\n  100% {\n${toLines.join('\n')}\n  }\n}`;
  }
  if (Math.abs(endPct - 100) < 0.01) {
    return `@keyframes ${segName} {\n  0% {\n${fromLines.join('\n')}\n  }\n  ${sp} {\n${fromLines.join('\n')}\n  }\n  ${ep} {\n${toLines.join('\n')}\n  }\n}`;
  }
  return `@keyframes ${segName} {\n  0% {\n${fromLines.join('\n')}\n  }\n  ${sp} {\n${fromLines.join('\n')}\n  }\n  ${ep} {\n${toLines.join('\n')}\n  }\n  100% {\n${toLines.join('\n')}\n  }\n}`;
}

export function generateMultiAnimationCss(state: AnimationState): string {
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const name = state.name || 'animation';
  const totalDur = state.duration;
  const segs: Array<{ segName: string; easing: string; spanPct: [number, number] }> = [];
  const kfDefs: string[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const easing = getTransitionEasing(state.easingCurves, from.id, to.id);
    const segName = `${name}_s${i + 1}`;
    segs.push({ segName, easing, spanPct: [from.percent, to.percent] });
    const def = buildFullSpanSegment(
      segName,
      from.percent,
      to.percent,
      from.properties,
      to.properties
    );
    if (def) kfDefs.push(def);
  }

  const animNames = segs.map((s) => s.segName).join(',\n    ');
  const animDurs = segs.map(() => `${formatNum(totalDur, 3)}s`).join(', ');
  const animEasings = segs.map((s) => s.easing).join(', ');
  const animFills = segs.map(() => 'both').join(', ');
  const iter = state.playback.loop ? 'infinite' : '1';

  const first = sorted[0];
  const initialLines = propsToLines(first.properties, '  ');
  const result: string[] = [];
  result.push('/* =====================================================');
  result.push(`   分段 @keyframes 版本 — 兼容性 Chrome 43+, Firefox 16+, Safari 9+`);
  result.push(`   每段独立 @keyframes 在整个动画时长内按百分比窗口切换`);
  result.push(`   循环播放时严格按 1→2→3→… 顺序一轮轮执行，不会堆叠`);
  result.push('   ===================================================== */');
  result.push('');
  result.push(...kfDefs);
  result.push('');
  result.push(`.${name}-segments {`);
  if (initialLines.length > 0) result.push(...initialLines);
  result.push(`  animation-name:\n    ${animNames};`);
  result.push(`  animation-duration: ${animDurs};`);
  result.push(`  animation-timing-function: ${animEasings};`);
  result.push(`  animation-fill-mode: ${animFills};`);
  result.push(`  animation-iteration-count: ${iter};`);
  result.push(`}`);
  return result.join('\n');
}

export function generateAnimationTimelineCss(state: AnimationState): string {
  return generateMultiAnimationCss(state);
}

export function generateFullCss(state: AnimationState): string {
  const name = state.name || 'animation';
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const firstKf = sorted[0];
  const firstEasing =
    sorted.length > 1
      ? getTransitionEasing(state.easingCurves, sorted[0].id, sorted[1].id)
      : 'ease';

  const lines: string[] = [];

  lines.push('/* =====================================================');
  lines.push(`   ${name} — CSS 动画代码`);
  lines.push('   生成时间: ' + new Date().toLocaleString());
  lines.push('   ===================================================== */');
  lines.push('');
  lines.push('/* =============================================');
  lines.push('   版本 1: 标准 @keyframes（兼容性最好）');
  lines.push('   兼容性: 所有现代浏览器');
  lines.push('   说明: 每段缓动直接写在对应关键帧的');
  lines.push('         animation-timing-function 中');
  lines.push('         按 CSS Animations 规范直接生效');
  lines.push('   ============================================= */');
  lines.push('');

  const classLines: string[] = [
    `.${name} {`,
    `  animation-name: ${name};`,
    `  animation-duration: ${formatNum(state.duration, 2)}s;`,
    `  animation-timing-function: ${firstEasing};`,
    `  animation-iteration-count: ${state.playback.loop ? 'infinite' : '1'};`,
    `  animation-fill-mode: both;`
  ];

  if (
    firstKf &&
    !propsEquals(firstKf.properties, { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 })
  ) {
    const initLines = propsToLines(firstKf.properties, '  ');
    if (initLines.length > 0) classLines.push(...initLines);
  }
  classLines.push('}');
  lines.push(classLines.join('\n'));
  lines.push('');
  lines.push(generateKeyframesWithEasing(state));
  lines.push('');
  lines.push('');

  lines.push('/* =============================================');
  lines.push('   版本 2: 分段 @keyframes（多段缓动推荐）');
  lines.push('   兼容性: Chrome 43+, Firefox 16+, Safari 9+');
  lines.push('   说明: 每段独立 @keyframes，用 animation-delay 依次播放');
  lines.push('         节奏与编辑器预览 100% 一致，无需 JS');
  lines.push('   ============================================= */');
  lines.push('');
  const multi = generateMultiAnimationCss(state);
  const multiClean = multi.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
  lines.push(multiClean);
  lines.push('');
  lines.push('');

  lines.push('/* =============================================');
  lines.push('   版本 3: Web Animations API（JS 版本）');
  lines.push('   兼容性: Chrome 36+, Firefox 48+, Safari 13.1+');
  lines.push('   说明: 通过 JS 调用，精确控制每段缓动');
  lines.push('   ============================================= */');
  lines.push('');
  lines.push(generateWebAnimationsCode(state));

  return lines.join('\n');
}
