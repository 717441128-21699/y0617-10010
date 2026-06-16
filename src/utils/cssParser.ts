import type { Keyframe, KeyframeProperties, EasingCurve } from '../store/animationStore';
import { presetEasings } from './bezierUtils';

export interface ParseResult {
  name: string;
  keyframes: Keyframe[];
  easingCurves: Record<string, EasingCurve>;
  duration?: number;
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

function parseTransform(transformStr: string): Partial<KeyframeProperties> {
  const props: Partial<KeyframeProperties> = {};

  const translateMatch = transformStr.match(/translate\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/);
  if (translateMatch) {
    props.translateX = parseCssValue(translateMatch[1]);
    props.translateY = parseCssValue(translateMatch[2]);
  }

  const translateXMatch = transformStr.match(/translateX\(\s*([^)]+?)\s*\)/);
  if (translateXMatch) {
    props.translateX = parseCssValue(translateXMatch[1]);
  }

  const translateYMatch = transformStr.match(/translateY\(\s*([^)]+?)\s*\)/);
  if (translateYMatch) {
    props.translateY = parseCssValue(translateYMatch[1]);
  }

  const rotateMatch = transformStr.match(/rotate\(\s*([^)]+?)\s*\)/);
  if (rotateMatch) {
    props.rotate = parseCssValue(rotateMatch[1]);
  }

  const scaleMatch = transformStr.match(/scale\(\s*([^,]+?)\s*(?:,\s*([^)]+?)\s*)?\)/);
  if (scaleMatch) {
    const sx = parseFloat(scaleMatch[1]);
    const sy = scaleMatch[2] ? parseFloat(scaleMatch[2]) : sx;
    props.scaleX = isNaN(sx) ? 1 : sx;
    props.scaleY = isNaN(sy) ? 1 : sy;
  }

  const scaleXMatch = transformStr.match(/scaleX\(\s*([^)]+?)\s*\)/);
  if (scaleXMatch) {
    props.scaleX = parseFloat(scaleXMatch[1]);
  }

  const scaleYMatch = transformStr.match(/scaleY\(\s*([^)]+?)\s*\)/);
  if (scaleYMatch) {
    props.scaleY = parseFloat(scaleYMatch[1]);
  }

  return props;
}

function parseCssValue(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith('px')) {
    return parseFloat(trimmed);
  } else if (trimmed.endsWith('deg')) {
    return parseFloat(trimmed);
  } else if (trimmed.endsWith('rad')) {
    return parseFloat(trimmed) * (180 / Math.PI);
  } else if (trimmed.endsWith('turn')) {
    return parseFloat(trimmed) * 360;
  } else if (trimmed === '0') {
    return 0;
  }
  return parseFloat(trimmed) || 0;
}

function parseEasing(easingStr: string): EasingCurve | null {
  const trimmed = easingStr.trim();
  const preset = presetEasings[trimmed];
  if (preset) {
    return { ...preset };
  }
  const cubicMatch = trimmed.match(/cubic-bezier\(\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/);
  if (cubicMatch) {
    return {
      name: 'custom',
      p1x: Math.max(0, Math.min(1, parseFloat(cubicMatch[1]))),
      p1y: parseFloat(cubicMatch[2]),
      p2x: Math.max(0, Math.min(1, parseFloat(cubicMatch[3]))),
      p2y: parseFloat(cubicMatch[4]),
    };
  }
  if (trimmed.startsWith('steps(')) {
    return { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 };
  }
  return null;
}

function findMatchingBlock(text: string, startIndex: number): string {
  let depth = 0;
  let i = startIndex;
  while (i < text.length) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.substring(startIndex, i + 1);
    }
    i++;
  }
  return text.substring(startIndex);
}

export function parseCssKeyframes(cssText: string): ParseResult | null {
  try {
    let css = cssText.replace(/\/\*[\s\S]*?\*\//g, '').trim();

    const keyframesMatch = css.match(/@keyframes\s+([^{]+?)\s*\{/i);
    if (!keyframesMatch) {
      const kfMatch = css.match(/@-webkit-keyframes\s+([^{]+?)\s*\{/i);
      if (!kfMatch) return null;
      return parseCssKeyframes(css.replace(/@-webkit-keyframes/i, '@keyframes'));
    }

    const name = keyframesMatch[1].trim();
    const blockStart = keyframesMatch.index! + keyframesMatch[0].length - 1;
    const fullBlock = findMatchingBlock(css, blockStart);
    const innerContent = fullBlock.substring(fullBlock.indexOf('{') + 1, fullBlock.lastIndexOf('}'));

    const kfRegex = /(?:^|\})\s*([^{]+?)\s*\{/g;
    const rawKeyframes: Array<{ percent: number; properties: Record<string, string> }> = [];
    let match;
    let lastIndex = 0;

    while ((match = kfRegex.exec(innerContent)) !== null) {
      if (match.index < lastIndex) continue;
      const selector = match[1].trim();
      const blockStartIdx = match.index + match[0].length - 1;
      const block = findMatchingBlock(innerContent, blockStartIdx);
      const blockContent = block.substring(block.indexOf('{') + 1, block.lastIndexOf('}'));
      lastIndex = match.index + block.length;

      const percents = selector.split(',').map(s => s.trim());
      for (const p of percents) {
        let percent: number;
        if (p.toLowerCase() === 'from') percent = 0;
        else if (p.toLowerCase() === 'to') percent = 100;
        else if (p.endsWith('%')) percent = parseFloat(p);
        else continue;

        if (isNaN(percent) || percent < 0 || percent > 100) continue;

        const properties: Record<string, string> = {};
        const propRegex = /([a-zA-Z-]+)\s*:\s*([^;]+?)(?=;|$)/g;
        let propMatch;
        while ((propMatch = blockContent.matchAll(propRegex)) !== null) {
          const m = propMatch.next();
          if (m.done) break;
          const [_, propName, propValue] = m.value;
          properties[propName.trim().toLowerCase()] = propValue.trim();
        }
        rawKeyframes.push({ percent, properties });
      }
    }

    if (rawKeyframes.length < 2) {
      return null;
    }

    rawKeyframes.sort((a, b) => a.percent - b.percent);

    if (rawKeyframes[0].percent !== 0) {
      rawKeyframes.unshift({ percent: 0, properties: {} });
    }
    if (rawKeyframes[rawKeyframes.length - 1].percent !== 100) {
      rawKeyframes.push({ percent: 100, properties: {} });
    }

    const keyframes: Keyframe[] = rawKeyframes.map((rk, idx) => {
      const props = { ...defaultProps };
      if (rk.properties['transform']) {
        const parsed = parseTransform(rk.properties['transform']);
        if (parsed.translateX !== undefined) props.translateX = parsed.translateX;
        if (parsed.translateY !== undefined) props.translateY = parsed.translateY;
        if (parsed.rotate !== undefined) props.rotate = parsed.rotate;
        if (parsed.scaleX !== undefined) props.scaleX = parsed.scaleX;
        if (parsed.scaleY !== undefined) props.scaleY = parsed.scaleY;
      }
      if (rk.properties['opacity']) {
        props.opacity = parseFloat(rk.properties['opacity']);
        if (isNaN(props.opacity)) props.opacity = 1;
      }
      return {
        id: genId(),
        percent: rk.percent,
        properties: props,
        easing: rk.properties['animation-timing-function'],
      };
    });

    for (let i = 0; i < keyframes.length; i++) {
      const kf = keyframes[i];
      if (kf.properties.opacity === undefined || isNaN(kf.properties.opacity)) {
        if (i === 0) {
          const nextNonZero = keyframes.find((k, j) => j > i && !isNaN(k.properties.opacity) && k.properties.opacity !== undefined);
          kf.properties.opacity = nextNonZero ? nextNonZero.properties.opacity : 1;
        } else if (i === keyframes.length - 1) {
          kf.properties.opacity = keyframes[i - 1].properties.opacity;
        } else {
          const prev = keyframes[i - 1];
          const next = keyframes[i + 1];
          const t = (kf.percent - prev.percent) / (next.percent - prev.percent);
          kf.properties.opacity = prev.properties.opacity + (next.properties.opacity - prev.properties.opacity) * t;
        }
      }
    }

    const easingCurves: Record<string, EasingCurve> = {};
    for (let i = 0; i < keyframes.length - 1; i++) {
      const pairKey = `${keyframes[i].id}-${keyframes[i + 1].id}`;
      let easing: EasingCurve = { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 };
      if (keyframes[i].easing) {
        const parsed = parseEasing(keyframes[i].easing as string);
        if (parsed) easing = parsed;
      }
      easingCurves[pairKey] = easing;
    }

    let duration: number | undefined;
    const durationMatch = css.match(/animation-duration\s*:\s*([^;]+)/i);
    if (durationMatch) {
      const val = durationMatch[1].trim();
      if (val.endsWith('s')) {
        duration = parseFloat(val);
      } else if (val.endsWith('ms')) {
        duration = parseFloat(val) / 1000;
      }
    }

    return { name, keyframes, easingCurves, duration };
  } catch (e) {
    console.error('CSS解析失败:', e);
    return null;
  }
}

export function isValidKeyframesCss(cssText: string): boolean {
  const normalized = cssText.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return /@keyframes\s+\w+\s*\{/i.test(normalized) || /@-webkit-keyframes\s+\w+\s*\{/i.test(normalized);
}
