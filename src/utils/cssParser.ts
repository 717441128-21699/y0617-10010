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

function parseDurationValue(raw: string): number | undefined {
  const parts = raw.split(/[,\s]+/);
  for (const part of parts) {
    const val = part.trim().toLowerCase();
    if (!val) continue;
    if (val.endsWith('ms')) {
      const n = parseFloat(val);
      if (!isNaN(n)) return n / 1000;
    } else if (val.endsWith('s')) {
      const n = parseFloat(val);
      if (!isNaN(n)) return n;
    } else {
      const n = parseFloat(val);
      if (!isNaN(n)) return n >= 10 ? n / 1000 : n;
    }
  }
  return undefined;
}

export function parseCssKeyframes(cssText: string): ParseResult | null {
  try {
    let css = cssText.replace(/\/\*[\s\S]*?\*\//g, '').trim();

    const keyframesMatch = css.match(/@-?webkit-?keyframes\s+([^{]+?)\s*\{/i);
    if (!keyframesMatch) return null;

    const name = keyframesMatch[1].trim();
    const blockStart = keyframesMatch.index! + keyframesMatch[0].length - 1;
    const fullBlock = findMatchingBlock(css, blockStart);
    const innerContent = fullBlock.substring(fullBlock.indexOf('{') + 1, fullBlock.lastIndexOf('}'));

    const rawKeyframes: Array<{ percent: number; properties: Record<string, string> }> = [];
    const tokens: Array<{ type: 'sel' | 'prop'; value: string; block?: string }> = [];
    {
      let depth = 0;
      let i = 0;
      let buf = '';
      while (i < innerContent.length) {
        const c = innerContent[i];
        if (c === '{') {
          if (depth === 0 && buf.trim()) {
            tokens.push({ type: 'sel', value: buf.trim() });
            buf = '';
          } else {
            buf += c;
          }
          depth++;
        } else if (c === '}') {
          depth--;
          if (depth === 0) {
            const last = tokens[tokens.length - 1];
            if (last && last.type === 'sel') last.block = buf;
            buf = '';
          } else {
            buf += c;
          }
        } else {
          buf += c;
        }
        i++;
      }
    }

    for (const tok of tokens) {
      if (tok.type !== 'sel' || !tok.block) continue;
      const selector = tok.value;
      const blockContent = tok.block;
      const percents = selector.split(',').map(s => s.trim());
      const properties: Record<string, string> = {};
      const propParts = blockContent.split(';');
      for (const pp of propParts) {
        const colon = pp.indexOf(':');
        if (colon < 0) continue;
        const pn = pp.substring(0, colon).trim().toLowerCase();
        const pv = pp.substring(colon + 1).trim();
        if (pn && pv) properties[pn] = pv;
      }
      for (const p of percents) {
        let percent: number;
        if (p.toLowerCase() === 'from') percent = 0;
        else if (p.toLowerCase() === 'to') percent = 100;
        else if (p.endsWith('%')) percent = parseFloat(p);
        else continue;
        if (isNaN(percent) || percent < 0 || percent > 100) continue;
        rawKeyframes.push({ percent, properties: { ...properties } });
      }
    }

    if (rawKeyframes.length === 0) return null;

    rawKeyframes.sort((a, b) => a.percent - b.percent);

    if (rawKeyframes[0].percent !== 0) {
      rawKeyframes.unshift({ percent: 0, properties: {} });
    }
    if (rawKeyframes[rawKeyframes.length - 1].percent !== 100) {
      rawKeyframes.push({ percent: 100, properties: {} });
    }

    const merged: Array<{ percent: number; properties: Record<string, string> }> = [];
    for (const rk of rawKeyframes) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.percent - rk.percent) < 0.01) {
        last.properties = { ...last.properties, ...rk.properties };
      } else {
        merged.push({ percent: rk.percent, properties: { ...rk.properties } });
      }
    }

    const keyframes: Keyframe[] = merged.map((rk) => {
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
        const op = parseFloat(rk.properties['opacity']);
        props.opacity = isNaN(op) ? 1 : op;
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
      if (isNaN(kf.properties.opacity)) {
        if (i === 0) {
          const next = keyframes.find((k, j) => j > i && !isNaN(k.properties.opacity));
          kf.properties.opacity = next ? next.properties.opacity : 1;
        } else {
          kf.properties.opacity = keyframes[i - 1].properties.opacity;
        }
      }
    }

    const easingCurves: Record<string, EasingCurve> = {};
    const defEase: EasingCurve = { name: 'ease', p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1 };
    for (let i = 0; i < keyframes.length - 1; i++) {
      const pairKey = `${keyframes[i].id}-${keyframes[i + 1].id}`;
      let easing = defEase;
      if (keyframes[i].easing) {
        const parsed = parseEasing(keyframes[i].easing as string);
        if (parsed) easing = parsed;
      }
      easingCurves[pairKey] = easing;
    }

    let duration: number | undefined;
    const durPropMatch = css.match(/animation-duration\s*:\s*([^;]+)/i);
    if (durPropMatch) duration = parseDurationValue(durPropMatch[1]);
    if (!duration) {
      const shorthandMatch = css.match(/(?:^|[{;])\s*animation\s*:\s*([^;]+)/im);
      if (shorthandMatch) duration = parseDurationValue(shorthandMatch[1]);
    }
    if (!duration) {
      const animShorthandAll = css.match(/animation\s*:\s*([^;{]+)/gi);
      if (animShorthandAll) {
        for (const m of animShorthandAll) {
          const parts = m.split(':');
          if (parts.length >= 2) {
            const d = parseDurationValue(parts[1]);
            if (d) {
              duration = d;
              break;
            }
          }
        }
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
