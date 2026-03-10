import { normalizeTimeString } from "@/lib/time-utils";
import type { TimeField } from "@/types/timecard";

export type OcrWord = {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  lineId?: string;
};

type PositionedTime = {
  value: string;
  x: number;
  y: number;
};

type DayMarker = {
  day: number;
  x: number;
  y: number;
};

export type DetectedDayTimes = {
  day: number;
  values: Partial<Record<TimeField, string>>;
};

const COLUMN_ORDER: TimeField[] = [
  "entry1",
  "exit1",
  "entry2",
  "exit2",
  "extraEntry",
  "extraExit",
];

function toCenter(word: OcrWord) {
  return {
    x: (word.bbox.x0 + word.bbox.x1) / 2,
    y: (word.bbox.y0 + word.bbox.y1) / 2,
  };
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function extractTimesFromWord(word: OcrWord): PositionedTime[] {
  const compactText = word.text.replace(/\s/g, "");
  const regex = /(\d{1,2}[:hH.]?\d{2}|\d{4})/g;
  const matches = Array.from(compactText.matchAll(regex));
  if (matches.length === 0) {
    return [];
  }

  const width = Math.max(word.bbox.x1 - word.bbox.x0, 1);
  const slotWidth = width / matches.length;
  const y = (word.bbox.y0 + word.bbox.y1) / 2;

  return matches
    .map((match, index) => {
      const normalized = normalizeTimeString(match[0]);
      if (!normalized) {
        return null;
      }
      return {
        value: normalized,
        x: word.bbox.x0 + slotWidth * (index + 0.5),
        y,
      };
    })
    .filter((item): item is PositionedTime => item !== null);
}

function extractDayFromWord(word: OcrWord): number | null {
  const clean = word.text
    .trim()
    .replace(/[oO]/g, "0")
    .replace(/[iIl]/g, "1")
    .replace(/[sS]/g, "5")
    .replace(/[^\d]/g, "");
  if (!clean) {
    return null;
  }
  if (!/^\d{1,2}$/.test(clean)) {
    return null;
  }

  const day = Number(clean);
  if (day < 1 || day > 31) {
    return null;
  }

  return day;
}

function parseLineBasedDetections(words: OcrWord[]): DetectedDayTimes[] {
  const withLine = words.filter((word) => word.lineId);
  if (withLine.length === 0) {
    return [];
  }

  const byLine = new Map<string, OcrWord[]>();
  for (const word of withLine) {
    const key = word.lineId as string;
    const current = byLine.get(key) ?? [];
    current.push(word);
    byLine.set(key, current);
  }

  const byDay = new Map<number, DetectedDayTimes>();
  for (const lineWords of byLine.values()) {
    const sorted = [...lineWords].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const dayWord = sorted.find((word) => extractDayFromWord(word) !== null);
    if (!dayWord) {
      continue;
    }

    const day = extractDayFromWord(dayWord);
    if (day === null) {
      continue;
    }

    const times = sorted.flatMap(extractTimesFromWord).sort((a, b) => a.x - b.x);
    if (times.length === 0) {
      continue;
    }

    const mapped: Partial<Record<TimeField, string>> = {};
    times.slice(0, COLUMN_ORDER.length).forEach((value, index) => {
      mapped[COLUMN_ORDER[index]] = value.value;
    });

    byDay.set(day, { day, values: mapped });
  }

  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

function buildDayMarkers(words: OcrWord[]): DayMarker[] {
  const allMarkers = words
    .map((word) => {
      const day = extractDayFromWord(word);
      if (day === null) {
        return null;
      }
      const center = toCenter(word);
      return { day, x: center.x, y: center.y };
    })
    .filter((item): item is DayMarker => item !== null);

  if (allMarkers.length === 0) {
    return [];
  }

  const maxX = Math.max(...allMarkers.map((marker) => marker.x));
  const leftSideMarkers = allMarkers.filter((marker) => marker.x < maxX * 0.45);
  const preferred = leftSideMarkers.length > 4 ? leftSideMarkers : allMarkers;

  const byDay = new Map<number, DayMarker>();
  for (const marker of preferred) {
    const existing = byDay.get(marker.day);
    if (!existing || marker.x < existing.x) {
      byDay.set(marker.day, marker);
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

export function parseDetectedTimesFromWords(words: OcrWord[]): DetectedDayTimes[] {
  if (!words.length) {
    return [];
  }

  const dayMarkers = buildDayMarkers(words);
  if (!dayMarkers.length) {
    return [];
  }

  const sortedByY = [...dayMarkers].sort((a, b) => a.y - b.y);
  const dayYDiffs = sortedByY
    .slice(1)
    .map((marker, index) => marker.y - sortedByY[index].y)
    .filter((value) => value > 5);
  const rowStep = median(dayYDiffs) || 30;
  const maxDistance = Math.max(rowStep * 0.7, 20);
  const dayMaxX = Math.max(...dayMarkers.map((marker) => marker.x));

  const timeCandidates = words.flatMap(extractTimesFromWord).filter((candidate) => {
    return candidate.x > dayMaxX + 10;
  });

  const grouped = new Map<number, PositionedTime[]>();
  for (const candidate of timeCandidates) {
    let bestDay: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const marker of dayMarkers) {
      const distance = Math.abs(candidate.y - marker.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestDay = marker.day;
      }
    }

    if (bestDay !== null && bestDistance <= maxDistance) {
      const list = grouped.get(bestDay) ?? [];
      list.push(candidate);
      grouped.set(bestDay, list);
    }
  }

  const detected: DetectedDayTimes[] = [];
  for (const [day, values] of grouped.entries()) {
    const sorted = values.sort((a, b) => a.x - b.x).slice(0, COLUMN_ORDER.length);
    const mapped: Partial<Record<TimeField, string>> = {};
    sorted.forEach((value, index) => {
      mapped[COLUMN_ORDER[index]] = value.value;
    });

    if (Object.keys(mapped).length > 0) {
      detected.push({ day, values: mapped });
    }
  }

  const sortedDetected = detected.sort((a, b) => a.day - b.day);
  if (sortedDetected.length > 0) {
    return sortedDetected;
  }

  return parseLineBasedDetections(words);
}
