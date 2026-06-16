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

function keyframeBlock(kf: Keyframe, includeEasing = false): string {
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
  if (includeEasing && (kf as any).easingCss) {
    lines.push(`    animation-timing-function: ${(kf as any).easingCss};`);
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

function getTransitionEasing(easingCurves: Record<string, EasingCurve>, fromId: string, toId: string): string {
  const key = `${fromId}-${toId}`;
  const curve = easingCurves[key];
  if (!curve) return 'ease';
  return getEasingString(curve);
}

export function generateKeyframesCss(state: AnimationState): string {
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const blocks = sorted.map(kf => keyframeBlock(kf, false)).filter(Boolean);
  const name = state.name || 'animation';
  let result = `@keyframes ${name} {\n`;
  result += blocks.join('\n');
  result += '\n}';
  return result;
}

export function generateKeyframesWithEasing(state: AnimationState): string {
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const kfWithEasing = sorted.map((kf, idx) => {
    if (idx < sorted.length - 1) {
      const easingCss = getTransitionEasing(state.easingCurves, kf.id, sorted[idx + 1].id);
      return { ...kf, easingCss };
    }
    return kf;
  });
  const blocks = kfWithEasing.map(kf => keyframeBlock(kf, true)).filter(Boolean);
  const name = state.name || 'animation';
  let result = `@keyframes ${name} {\n`;
  result += blocks.join('\n');
  result += '\n}';
  return result;
}

export function generateWebAnimationsCode(state: AnimationState): string {
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const name = state.name || 'animation';

  const keyframesJs = sorted.map((kf, idx) => {
    const props: string[] = [];
    if (kf.properties.translateX !== 0 || kf.properties.translateY !== 0) {
      props.push(`    transform: \`translate(${formatNum(kf.properties.translateX)}px, ${formatNum(kf.properties.translateY)}px) rotate(${formatNum(kf.properties.rotate)}deg) scale(${formatNum(kf.properties.scaleX)}, ${formatNum(kf.properties.scaleY)})\``);
    } else {
      if (kf.properties.rotate !== 0 || kf.properties.scaleX !== 1 || kf.properties.scaleY !== 1) {
        props.push(`    transform: \`rotate(${formatNum(kf.properties.rotate)}deg) scale(${formatNum(kf.properties.scaleX)}, ${formatNum(kf.properties.scaleY)})\``);
      }
    }
    if (kf.properties.opacity !== 1) {
      props.push(`    opacity: ${formatNum(kf.properties.opacity)}`);
    }
    const easing = idx < sorted.length - 1
      ? `,\n    easing: '${getTransitionEasing(state.easingCurves, kf.id, sorted[idx + 1].id)}'`
      : '';
    return `  {\n    offset: ${kf.percent / 100}${easing}${props.length > 0 ? ',\n' + props.join(',\n') : ''}\n  }`;
  }).join(',\n');

  return `// Web Animations API - 精确还原每段缓动节奏
// 用法: const el = document.querySelector('.your-element');
//       el.animate(${name}Keyframes, ${name}Options);

const ${name}Keyframes = [\n${keyframesJs}\n];

const ${name}Options = {
  duration: ${state.duration * 1000}, // ms
  iterations: ${state.playback.loop ? 'Infinity' : 1},
  fill: 'both',
};

// 播放控制
// const anim = el.animate(${name}Keyframes, ${name}Options);
// anim.pause();
// anim.play();
// anim.currentTime = 1000; // 跳转到1秒`;
}

export function generateAnimationTimelineCss(state: AnimationState): string {
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const name = state.name || 'animation';
  const lines: string[] = [];

  lines.push('/* =============================================');
  lines.push('   animation-timeline 版本 (Chrome 115+ / Safari 17.5+)');
  lines.push('   用 @property 让每段缓动真正独立生效');
  lines.push('   ============================================= */');
  lines.push('');
  lines.push('@property --anim-x {');
  lines.push('  syntax: "<length>";');
  lines.push('  initial-value: 0px;');
  lines.push('  inherits: false;');
  lines.push('}');
  lines.push('');
  lines.push('@property --anim-y {');
  lines.push('  syntax: "<length>";');
  lines.push('  initial-value: 0px;');
  lines.push('  inherits: false;');
  lines.push('}');
  lines.push('');
  lines.push('@property --anim-rotate {');
  lines.push('  syntax: "<angle>";');
  lines.push('  initial-value: 0deg;');
  lines.push('  inherits: false;');
  lines.push('}');
  lines.push('');
  lines.push('@property --anim-scale {');
  lines.push('  syntax: "<number>";');
  lines.push('  initial-value: 1;');
  lines.push('  inherits: false;');
  lines.push('}');
  lines.push('');
  lines.push('@property --anim-opacity {');
  lines.push('  syntax: "<number>";');
  lines.push('  initial-value: 1;');
  lines.push('  inherits: false;');
  lines.push('}');
  lines.push('');

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const easing = getTransitionEasing(state.easingCurves, from.id, to.id);
    const segName = `${name}_seg${i + 1}`;

    lines.push(`/* 第 ${i + 1} 段: ${formatPercent(from.percent)} → ${formatPercent(to.percent)} */`);
    lines.push(`@keyframes ${segName} {`);
    lines.push(`  from {`);
    if (from.properties.translateX !== from.properties.translateY || from.properties.translateX !== 0) {
      lines.push(`    --anim-x: ${formatNum(from.properties.translateX)}px;`);
      lines.push(`    --anim-y: ${formatNum(from.properties.translateY)}px;`);
    }
    if (from.properties.rotate !== 0) {
      lines.push(`    --anim-rotate: ${formatNum(from.properties.rotate)}deg;`);
    }
    if (from.properties.scaleX !== 1 || from.properties.scaleY !== 1) {
      lines.push(`    --anim-scale: ${formatNum(from.properties.scaleX)};`);
    }
    if (from.properties.opacity !== 1) {
      lines.push(`    --anim-opacity: ${formatNum(from.properties.opacity)};`);
    }
    lines.push(`  }`);
    lines.push(`  to {`);
    if (to.properties.translateX !== to.properties.translateY || to.properties.translateX !== 0) {
      lines.push(`    --anim-x: ${formatNum(to.properties.translateX)}px;`);
      lines.push(`    --anim-y: ${formatNum(to.properties.translateY)}px;`);
    }
    if (to.properties.rotate !== 0) {
      lines.push(`    --anim-rotate: ${formatNum(to.properties.rotate)}deg;`);
    }
    if (to.properties.scaleX !== 1 || to.properties.scaleY !== 1) {
      lines.push(`    --anim-scale: ${formatNum(to.properties.scaleX)};`);
    }
    if (to.properties.opacity !== 1) {
      lines.push(`    --anim-opacity: ${formatNum(to.properties.opacity)};`);
    }
    lines.push(`  }`);
    lines.push(`}`);
    lines.push('');
  }

  lines.push(`/* 应用到元素 */`);
  lines.push(`.${name}-modern {`);
  lines.push(`  transform: translate(var(--anim-x), var(--anim-y)) rotate(var(--anim-rotate)) scale(var(--anim-scale));`);
  lines.push(`  opacity: var(--anim-opacity);`);
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    const easing = getTransitionEasing(state.easingCurves, from.id, to.id);
    const segName = `${name}_seg${i + 1}`;
    lines.push(`  animation-name: ${segName};`);
    lines.push(`  animation-timing-function: ${easing};`);
    lines.push(`  animation-duration: ${formatNum(state.duration, 2)}s;`);
    lines.push(`  animation-range: ${formatPercent(from.percent)} ${formatPercent(to.percent)};`);
    lines.push(`  animation-fill-mode: both;`);
  }
  lines.push(`  animation-timeline: --${name}-timeline;`);
  lines.push(`  animation-iteration-count: ${state.playback.loop ? 'infinite' : '1'};`);
  lines.push(`}`);

  return lines.join('\n');
}

export function generateFullCss(state: AnimationState): string {
  const name = state.name || 'animation';
  const sorted = [...state.keyframes].sort((a, b) => a.percent - b.percent);
  const firstKf = sorted[0];
  const firstEasing = getTransitionEasing(state.easingCurves, sorted[0].id, sorted[1]?.id || sorted[0].id);

  const lines: string[] = [];

  lines.push('/* =====================================================');
  lines.push(`   ${name} - CSS @keyframes 动画`);
  lines.push('   生成时间: ' + new Date().toLocaleString());
  lines.push('   ===================================================== */');
  lines.push('');
  lines.push('/* =============================================');
  lines.push('   版本 1: 标准 CSS (兼容性最好)');
  lines.push('   说明: animation-timing-function 只能设置一个全局值');
  lines.push('         多段缓动信息在下方注释中，供手动拆分参考');
  lines.push('   若需精确还原节奏，请使用版本 2 (Web Animations API)');
  lines.push('   ============================================= */');
  lines.push('');

  const classLines: string[] = [
    `.${name} {`,
    `  animation-name: ${name};`,
    `  animation-duration: ${formatNum(state.duration, 2)}s;`,
    `  animation-timing-function: ${firstEasing};`,
    `  animation-iteration-count: ${state.playback.loop ? 'infinite' : '1'};`,
    `  animation-fill-mode: both;`,
  ];

  if (firstKf && !propsEquals(firstKf.properties, { translateX: 0, translateY: 0, rotate: 0, scaleX: 1, scaleY: 1, opacity: 1 })) {
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
    if (t.length > 0) classLines.push(`  transform: ${t.join(' ')};`);
    if (firstKf.properties.opacity !== 1) {
      classLines.push(`  opacity: ${formatNum(firstKf.properties.opacity)};`);
    }
  }
  classLines.push('}');
  lines.push(classLines.join('\n'));
  lines.push('');

  lines.push(generateKeyframesCss(state));
  lines.push('');

  lines.push('/* --- 各段缓动曲线 --- */');
  lines.push('/* 如要精确还原节奏，请将 @keyframes 拆分为多个，');
  lines.push('/* 或使用下方的 Web Animations API 版本。 */');
  for (let i = 0; i < sorted.length - 1; i++) {
    const easing = getTransitionEasing(state.easingCurves, sorted[i].id, sorted[i + 1].id);
    lines.push(`/* ${formatPercent(sorted[i].percent)} → ${formatPercent(sorted[i + 1].percent)}: ${easing} */`);
  }
  lines.push('');
  lines.push('');

  lines.push('/* =============================================');
  lines.push('   版本 2: Web Animations API (推荐)');
  lines.push('   兼容性: Chrome 36+, Firefox 48+, Safari 13.1+');
  lines.push('   优势: 每段缓动独立控制，节奏 100% 还原');
  lines.push('   ============================================= */');
  lines.push('');
  lines.push(generateWebAnimationsCode(state));
  lines.push('');

  if (sorted.length > 2) {
    lines.push('');
    lines.push(generateAnimationTimelineCss(state));
  }

  return lines.join('\n');
}
