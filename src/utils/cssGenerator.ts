import type { AnimationState, Keyframe, EasingCurve } from '../store/animationStore';
import { bezierToCss, presetEasings } from './bezierUtils';

function formatNum(n: number, digits = 2): string {
  return Number(n.toFixed(digits)).toString();
}

function keyframeBlock(kf: Keyframe): string {
  const { properties } = kf;
  const transforms: string[] = [];
  if (properties.translateX !== 0 || properties.translateY !== 0) {
    transforms.push(`translate(${formatNum(properties.translateX)}px, ${formatNum(properties.translateY)}px)`);
  }
  if (properties.rotate !== 0) {
    transforms.push(`rotate(${formatNum(properties.rotate)}deg)`);
  }
  if (properties.scaleX !== 1 || properties.scaleY !== 1) {
    transforms.push(`scale(${formatNum(properties.scaleX)}, ${formatNum(properties.scaleY)})`);
  }
  const lines: string[] = [];
  if (transforms.length > 0) {
    lines.push(`    transform: ${transforms.join(' ')};`);
  }
  if (properties.opacity !== 1) {
    lines.push(`    opacity: ${formatNum(properties.opacity)};`);
  }
  if (lines.length === 0) return '';
  return `  ${kf.percent}% {\n${lines.join('\n')}\n  }`;
}

function getTransitionEasing(easingCurves: Record<string, EasingCurve>, fromId: string, toId: string): string {
  const key = `${fromId}-${toId}`;
  const curve = easingCurves[key];
  if (!curve) return 'ease';
  const presetMatch = Object.entries(presetEasings).find(([, p]) =>
    Math.abs(p.p1x - curve.p1x) < 0.01 && Math.abs(p.p1y - curve.p1y) < 0.01 &&
    Math.abs(p.p2x - curve.p2x) < 0.01 && Math.abs(p.p2y - curve.p2y) < 0.01
  );
  if (presetMatch) return presetMatch[0];
  return bezierToCss(curve);
}

export function generateKeyframesCss(state: AnimationState): string {
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const blocks = sorted.map(keyframeBlock).filter(Boolean);
  const name = state.name || 'animation';

  let result = `@keyframes ${name} {\n`;
  result += blocks.join('\n');
  result += '\n}';
  return result;
}

export function generateFullCss(state: AnimationState): string {
  const name = state.name || 'animation';
  const keyframes = generateKeyframesCss(state);
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const firstKf = sorted[0];

  const lines: string[] = [
    `/* ${name} - CSS @keyframes Animation */`,
    '/* Apply this class to your animated element */',
    `.${name} {`,
    `  animation-name: ${name};`,
    `  animation-duration: ${formatNum(state.duration, 1)}s;`,
    `  animation-timing-function: ${getTransitionEasing(state.easingCurves, sorted[0].id, sorted[1]?.id || sorted[0].id)};`,
    `  animation-iteration-count: ${state.playback.loop ? 'infinite' : '1'};`,
    `  animation-fill-mode: both;`,
  ];

  if (firstKf) {
    const t: string[] = [];
    if (firstKf.properties.translateX || firstKf.properties.translateY) {
      t.push(`translate(${formatNum(firstKf.properties.translateX)}px, ${formatNum(firstKf.properties.translateY)}px)`);
    }
    if (firstKf.properties.rotate) {
      t.push(`rotate(${formatNum(firstKf.properties.rotate)}deg)`);
    }
    if (firstKf.properties.scaleX !== 1 || firstKf.properties.scaleY !== 1) {
      t.push(`scale(${formatNum(firstKf.properties.scaleX)}, ${formatNum(firstKf.properties.scaleY)})`);
    }
    if (t.length > 0) lines.push(`  transform: ${t.join(' ')};`);
    if (firstKf.properties.opacity !== 1) {
      lines.push(`  opacity: ${formatNum(firstKf.properties.opacity)};`);
    }
  }

  lines.push('}');
  lines.push('');

  if (sorted.length > 2) {
    lines.push('/* Advanced: Per-segment easing with animation-timeline (Chrome 115+) */');
    lines.push('/* Or use individual @keyframes for complex timings */');
    lines.push('');
  }

  lines.push(keyframes);

  if (sorted.length > 2) {
    lines.push('');
    lines.push('/* Transition timings per segment: */');
    for (let i = 0; i < sorted.length - 1; i++) {
      const easing = getTransitionEasing(state.easingCurves, sorted[i].id, sorted[i + 1].id);
      lines.push(`/*   ${sorted[i].percent}% -> ${sorted[i + 1].percent}%: ${easing} */`);
    }
  }

  return lines.join('\n');
}
