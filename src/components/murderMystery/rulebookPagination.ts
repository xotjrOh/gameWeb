import { RefObject, useEffect, useMemo, useState } from 'react';

const DEFAULT_RULEBOOK_LINES_PER_PAGE = 24;
const DEFAULT_RULEBOOK_CHARS_PER_LINE = 36;

interface RulebookPaginationOptions {
  linesPerPage?: number;
  charsPerLine?: number;
}

const SECTION_HEADING_PATTERN =
  /^(?:<[^<>\n]{1,80}>|[^<>\n]{1,40}\s-\s[^<>\n]{1,40})$/;

export const normalizeRulebookText = (text: string) =>
  text.replace(/\r\n/g, '\n').trim();

const isSectionHeading = (value: string) =>
  SECTION_HEADING_PATTERN.test(value.trim());

export const getRulebookPageHeading = (pageText: string) => {
  const firstLine = pageText
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine && isSectionHeading(firstLine) ? firstLine : null;
};

const findNextSectionHeadingIndex = (text: string, startIndex: number) => {
  let lineStart = 0;

  while (lineStart < text.length) {
    const lineEnd = text.indexOf('\n', lineStart);
    const resolvedLineEnd = lineEnd === -1 ? text.length : lineEnd;
    const line = text.slice(lineStart, resolvedLineEnd);

    if (lineStart > startIndex && isSectionHeading(line)) {
      return lineStart;
    }

    if (lineEnd === -1) {
      break;
    }
    lineStart = lineEnd + 1;
  }

  return -1;
};

const getTextLength = (value: string) => Array.from(value).length;

const estimateVisualLines = (value: string, charsPerLine: number) =>
  value.split('\n').reduce((total, line) => {
    const length = getTextLength(line.trim());
    return total + Math.max(1, Math.ceil(length / charsPerLine));
  }, 0);

const splitLongBlock = (
  block: string,
  linesPerPage: number,
  charsPerLine: number
) => {
  const maxChars = linesPerPage * charsPerLine;
  const characters = Array.from(block);
  if (characters.length <= maxChars) {
    return [block];
  }

  const chunks: string[] = [];
  let index = 0;
  while (index < characters.length) {
    let end = Math.min(index + maxChars, characters.length);
    const flexibleStart = index + Math.floor(maxChars * 0.78);
    const preferredBreak = characters
      .slice(flexibleStart, end)
      .lastIndexOf(' ');

    if (preferredBreak >= 0 && end < characters.length) {
      end = flexibleStart + preferredBreak + 1;
    }

    chunks.push(characters.slice(index, end).join(''));
    index = end;
  }

  return chunks;
};

export const splitRulebookTextPages = (
  text: string,
  fallbackText = '읽을 내용이 없습니다.',
  options: RulebookPaginationOptions = {}
) => {
  const linesPerPage = options.linesPerPage ?? DEFAULT_RULEBOOK_LINES_PER_PAGE;
  const charsPerLine = options.charsPerLine ?? DEFAULT_RULEBOOK_CHARS_PER_LINE;
  const normalized = normalizeRulebookText(text);
  if (!normalized) {
    return [fallbackText];
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((block) => splitLongBlock(block, linesPerPage, charsPerLine));

  const pages: string[] = [];
  let currentBlocks: string[] = [];
  let currentLines = 0;

  const pushPage = () => {
    if (!currentBlocks.length) {
      return;
    }
    pages.push(currentBlocks.join('\n\n'));
    currentBlocks = [];
    currentLines = 0;
  };

  blocks.forEach((block, blockIndex) => {
    const blockLines = estimateVisualLines(block, charsPerLine);
    const separatorLines = currentBlocks.length > 0 ? 1 : 0;
    const nextLines = currentLines + separatorLines + blockLines;

    if (currentBlocks.length > 0 && isSectionHeading(block)) {
      pushPage();
    } else if (
      blockIndex > 0 &&
      currentBlocks.length > 0 &&
      nextLines > linesPerPage
    ) {
      pushPage();
    }

    currentBlocks.push(block);
    currentLines =
      currentLines === 0
        ? blockLines
        : currentLines + separatorLines + blockLines;
  });

  pushPage();

  return pages.length > 0 ? pages : [fallbackText];
};

const doesTextFit = (element: HTMLElement, value: string) => {
  element.textContent = value || ' ';
  return element.scrollHeight <= element.clientHeight + 1;
};

const removePageBoundaryBreaks = (value: string) =>
  value.replace(/^\n+/, '').replace(/\n+$/, '');

const skipPageLeadingBreaks = (value: string, index: number) => {
  let nextIndex = index;
  while (nextIndex < value.length && value[nextIndex] === '\n') {
    nextIndex += 1;
  }
  return nextIndex;
};

const paginateMeasuredRulebookText = (
  text: string,
  element: HTMLElement,
  fallbackText: string
) => {
  const normalized = normalizeRulebookText(text);
  if (!normalized) {
    return [fallbackText];
  }

  if (element.clientWidth <= 0 || element.clientHeight <= 0) {
    return null;
  }

  const pages: string[] = [];
  let start = 0;
  let guard = 0;

  while (start < normalized.length && guard < normalized.length + 5) {
    guard += 1;

    const nextHeadingIndex = findNextSectionHeadingIndex(normalized, start);
    const pageLimit =
      nextHeadingIndex > start ? nextHeadingIndex : normalized.length;

    let low = start + 1;
    let high = pageLimit;
    let best = start;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = normalized.slice(start, mid);

      if (doesTextFit(element, candidate)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (best <= start) {
      best = Math.min(start + 1, normalized.length);
    }

    const pageText = removePageBoundaryBreaks(normalized.slice(start, best));
    if (pageText) {
      pages.push(pageText);
    }
    start = skipPageLeadingBreaks(normalized, best);
  }

  return pages.length > 0 ? pages : [fallbackText];
};

interface UseMeasuredRulebookPagesOptions {
  enabled?: boolean;
  fallbackText?: string;
}

export const useMeasuredRulebookPages = (
  text: string,
  measureRef: RefObject<HTMLElement>,
  options: UseMeasuredRulebookPagesOptions = {}
) => {
  const fallbackText = options.fallbackText ?? '읽을 내용이 없습니다.';
  const enabled = options.enabled ?? true;
  const fallbackPages = useMemo(
    () => splitRulebookTextPages(text, fallbackText),
    [fallbackText, text]
  );
  const [pages, setPages] = useState(fallbackPages);
  const [isPaginating, setIsPaginating] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setPages(fallbackPages);
      setIsPaginating(false);
      return;
    }

    const element = measureRef.current;
    if (!element) {
      setPages(fallbackPages);
      setIsPaginating(true);
      return;
    }

    let cancelled = false;
    let frameId = 0;

    const measure = () => {
      if (cancelled) {
        return;
      }

      const measuredPages = paginateMeasuredRulebookText(
        text,
        element,
        fallbackText
      );

      if (!measuredPages) {
        setPages(fallbackPages);
        setIsPaginating(true);
        return;
      }

      setPages(measuredPages);
      setIsPaginating(false);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(element);

    document.fonts?.ready.then(scheduleMeasure).catch(() => {
      // 폰트 로드 상태는 레이아웃 보정용이므로 실패해도 진행한다.
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [enabled, fallbackPages, fallbackText, measureRef, text]);

  return { pages, isPaginating };
};
