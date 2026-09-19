/**
 * Data and metric formatters for AnalyzerOS
 */
import { formatFieldLabel } from './display-labels';

/**
 * Safely coerces a value that is expected to be displayable text but may
 * arrive as a non-string from the LLM-driven n8n backend (its output isn't
 * schema-validated, so fields like `driver` or `impact` occasionally come
 * back as nested objects). Rendering an object directly as a React child
 * throws and crashes the whole view, so every backend-sourced text field
 * should be passed through this before being rendered.
 */
export function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date && !isNaN(value.getTime())) {
    return formatHumanDate(value);
  }
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item))) {
      return value.map((item) => asText(item)).filter(Boolean).join(', ');
    }
    const first = value.find((item) => item && typeof item === 'object') as Record<string, unknown> | undefined;
    if (first) {
      const label = first.finding || first.driver || first.title || first.name || first.claim || first.action;
      if (typeof label === 'string') return label;
    }
  }
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    const label =
      rec.finding || rec.driver || rec.title || rec.name || rec.claim || rec.action || rec.explanation || rec.detail;
    if (typeof label === 'string' && label.trim()) return label;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

export function humanizeKey(key: string): string {
  return formatFieldLabel(key);
}

export function looksLikeIsoDate(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (/^\d{4}-\d{2}(-\d{2})?(T[\d:.Z+-]+)?$/.test(value.trim())) return true;
  return false;
}

export function formatHumanDate(value: Date | string): string {
  const raw = value instanceof Date ? value : new Date(value);
  if (isNaN(raw.getTime())) return String(value);
  const asString = typeof value === 'string' ? value.trim() : '';
  if (/^\d{4}-\d{2}$/.test(asString)) {
    const [year, month] = asString.split('-').map(Number);
    return `${MONTHS[(month || 1) - 1]} ${year}`;
  }
  return `${MONTHS[raw.getUTCMonth()]} ${raw.getUTCDate()}, ${raw.getUTCFullYear()}`;
}

export function formatDisplayValue(value: unknown, key?: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  const keyLower = (key || '').toLowerCase();
  const wantsPercent = /pct|percent|percentage|rate/.test(keyLower);

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (wantsPercent) {
      const pct = Math.abs(value) <= 1 && value !== 0 ? value * 100 : value;
      const sign = pct > 0 ? '+' : pct < 0 ? '' : '';
      return `${sign}${pct.toFixed(2)}%`;
    }
    const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
    if (/change|delta|diff|variance/.test(keyLower) && value > 0) return `+${formatted}`;
    return formatted;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (looksLikeIsoDate(trimmed) || (/^\d{4}-\d{2}-\d{2}/.test(trimmed) && !isNaN(Date.parse(trimmed)))) {
      if (/^\d{4}-\d{2}$/.test(trimmed)) return formatHumanDate(trimmed);
      return formatHumanDate(trimmed);
    }
    if (/^[A-Za-z]{3,9}\s+\d{4}$/.test(trimmed)) return trimmed;
    const numeric = Number(trimmed.replace(/,/g, ''));
    if (trimmed !== '' && Number.isFinite(numeric) && /^-?\d+(\.\d+)?$/.test(trimmed.replace(/,/g, ''))) {
      return formatDisplayValue(numeric, key);
    }
    return trimmed;
  }

  if (value instanceof Date) return formatHumanDate(value);
  if (Array.isArray(value) && value.every((item) => !isPlainObject(item))) {
    return value.map((item) => formatDisplayValue(item, key)).join(', ');
  }
  return asText(value);
}

export function extractReadableText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isPlainObject(value)) return asText(value);
  return asText(
    value.finding ||
      value.driver ||
      value.title ||
      value.name ||
      value.claim ||
      value.explanation ||
      value.detail ||
      value.reason ||
      value.action ||
      ''
  );
}

export function formatMetricValue(
  value: number | string | undefined | null,
  format?: 'currency' | 'number' | 'percent' | 'decimal' | string
): string {
  if (value === undefined || value === null || value === '') return '—';

  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return String(value);

  switch (format?.toLowerCase()) {
    case 'currency':
      if (Math.abs(num) >= 1_000_000) {
        return `$${(num / 1_000_000).toFixed(1)}M`;
      }
      if (Math.abs(num) >= 1_000) {
        return `$${(num / 1_000).toFixed(1)}k`;
      }
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: num % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(num);

    case 'percent':
      // Check if value is between 0 and 1 or already a whole percentage
      const pctValue = Math.abs(num) <= 1 && num !== 0 ? num * 100 : num;
      return `${pctValue >= 0 ? '' : '-'}${Math.abs(pctValue).toFixed(1)}%`;

    case 'decimal':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);

    case 'number':
    default:
      if (Math.abs(num) >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
      }
      if (Math.abs(num) >= 10_000) {
        return `${(num / 1_000).toFixed(1)}k`;
      }
      return new Intl.NumberFormat('en-US').format(num);
  }
}

/**
 * The backend's format inference isn't always right (an LLM occasionally
 * tags a plain count — "Matches", "Total Records" — as currency). Counts of
 * discrete entities should never carry a currency symbol, so we override
 * `currency` when the metric's own name clearly describes a count rather
 * than a monetary amount. Any other backend-provided format is trusted.
 */
export function resolveKpiFormat(label: string | undefined, format: string | undefined): string {
  const fmt = (format || 'number').toLowerCase();
  if (fmt !== 'currency') return fmt;

  const name = (label || '').toLowerCase();
  const looksLikeCount =
    /\b(count|matches|goals|games|rows|records|orders|units|quantity|qty|visits|sessions|clicks|impressions|views|users|customers|players|teams|events|entries|items|tickets|calls|messages)\b/.test(
      name
    ) || /\bnumber of\b/.test(name);

  return looksLikeCount ? 'number' : 'currency';
}

/** Full-precision display string for a value, used in tooltips over abbreviated KPI values. */
export function formatExactValue(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '—';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
}

export function formatChange(
  changeVal?: number | string,
  changePct?: number | string
): { text: string; isPositive: boolean; isNegative: boolean } {
  if (changePct !== undefined && changePct !== null && changePct !== '') {
    const p = typeof changePct === 'number' ? changePct : parseFloat(String(changePct));
    if (!isNaN(p)) {
      const sign = p > 0 ? '+' : '';
      return {
        text: `${sign}${p.toFixed(1)}%`,
        isPositive: p > 0,
        isNegative: p < 0,
      };
    }
  }

  if (changeVal !== undefined && changeVal !== null && changeVal !== '') {
    const v = typeof changeVal === 'number' ? changeVal : parseFloat(String(changeVal));
    if (!isNaN(v)) {
      const sign = v > 0 ? '+' : '';
      return {
        text: `${sign}${formatMetricValue(v, 'number')}`,
        isPositive: v > 0,
        isNegative: v < 0,
      };
    }
    return {
      text: String(changeVal),
      isPositive: String(changeVal).includes('+'),
      isNegative: String(changeVal).includes('-'),
    };
  }

  return { text: '', isPositive: false, isNegative: false };
}
