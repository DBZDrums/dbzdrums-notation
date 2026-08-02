import { Bar } from "../bar.js";
import { NotationRenderError } from "../errors.js";
import { compileMusicXml } from "../musicxml.js";
import { Phrase } from "../phrase.js";
import type { RenderOptions, RenderResult } from "../types.js";

interface OsmdInstance {
  readonly EngravingRules: {
    PageBottomMargin: number;
    PageRightMargin: number;
    PercussionOneLineCutoff: number;
    RenderClefsAtBeginningOfStaffline: boolean;
    RenderTimeSignatures: boolean;
    SetWantedStemDirectionByXml: boolean;
  };
  zoom: number;
  clear(): void;
  load(musicXml: string): Promise<unknown>;
  render(): void;
}

interface OsmdModule {
  readonly OpenSheetMusicDisplay: new (
    container: HTMLElement,
    options: Record<string, unknown>
  ) => OsmdInstance;
}

interface HorizontalLine {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly length: number;
}

interface SvgBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

function parsePathLines(path: string): readonly HorizontalLine[] {
  const lines: HorizontalLine[] = [];
  const expression =
    /[Mm]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*[Ll]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g;
  for (const match of path.matchAll(expression)) {
    const x1 = Number(match[1]);
    const y1 = Number(match[2]);
    const x2 = Number(match[3]);
    const y2 = Number(match[4]);
    if (
      Number.isFinite(x1) &&
      Number.isFinite(y1) &&
      Number.isFinite(x2) &&
      Number.isFinite(y2) &&
      Math.abs(y1 - y2) < 0.1
    ) {
      lines.push({ x1, x2, y: y1, length: Math.abs(x2 - x1) });
    }
  }
  return lines;
}

function horizontalLines(svg: SVGSVGElement): readonly HorizontalLine[] {
  const horizontal: HorizontalLine[] = [];
  for (const line of svg.querySelectorAll("line")) {
    const x1 = Number(line.getAttribute("x1"));
    const y1 = Number(line.getAttribute("y1"));
    const x2 = Number(line.getAttribute("x2"));
    const y2 = Number(line.getAttribute("y2"));
    if (
      Number.isFinite(x1) &&
      Number.isFinite(y1) &&
      Number.isFinite(x2) &&
      Number.isFinite(y2) &&
      Math.abs(y1 - y2) < 0.1
    ) {
      horizontal.push({ x1, x2, y: y1, length: Math.abs(x2 - x1) });
    }
  }
  for (const path of svg.querySelectorAll("path")) {
    horizontal.push(...parsePathLines(path.getAttribute("d") ?? ""));
  }
  return horizontal;
}

/**
 * Finds the number of staff lines in every rendered staff span without relying
 * on OSMD CSS classes. Five parallel lines with matching endpoints are treated
 * as one span; OSMD may use one span per measure or per visual system.
 */
export function countStaffLineSystems(svg: SVGSVGElement): readonly number[] {
  const horizontal = horizontalLines(svg);
  const longest = Math.max(0, ...horizontal.map((line) => line.length));
  const candidates = horizontal.filter((line) => line.length >= longest * 0.3);
  const systems = new Map<string, Set<number>>();
  for (const line of candidates) {
    const left = Math.round(Math.min(line.x1, line.x2) * 10) / 10;
    const right = Math.round(Math.max(line.x1, line.x2) * 10) / 10;
    const key = `${left}:${right}`;
    const yValues = systems.get(key) ?? new Set<number>();
    yValues.add(Math.round(line.y * 10) / 10);
    systems.set(key, yValues);
  }
  return Object.freeze([...systems.values()].map((yValues) => yValues.size));
}

/** Counts full-length horizontal staff lines without relying on OSMD CSS classes. */
export function countStaffLines(svg: SVGSVGElement): number {
  return countStaffLineSystems(svg).reduce(
    (total, lineCount) => total + lineCount,
    0
  );
}

type NotationInput = Bar<any> | Phrase<any>;

function validateRenderOptions(options: RenderOptions): void {
  if (
    options.repeatCount !== undefined &&
    (!Number.isSafeInteger(options.repeatCount) || options.repeatCount < 2)
  ) {
    throw new NotationRenderError(
      "RENDER_OPTIONS_INVALID",
      "repeatCount must be a safe integer greater than or equal to 2."
    );
  }
}

function boundsInSvg(
  svg: SVGSVGElement,
  element: SVGGraphicsElement
): SvgBounds | undefined {
  const screenMatrix = svg.getScreenCTM();
  if (!screenMatrix) return undefined;
  let inverse: DOMMatrix;
  try {
    inverse = screenMatrix.inverse();
  } catch {
    return undefined;
  }
  const rect = element.getBoundingClientRect();
  const corners = [
    [rect.left, rect.top],
    [rect.right, rect.top],
    [rect.left, rect.bottom],
    [rect.right, rect.bottom],
  ].map(([x, y]) => {
    const point = svg.createSVGPoint();
    point.x = x!;
    point.y = y!;
    return point.matrixTransform(inverse);
  });
  const xValues = corners.map((point) => point.x);
  const yValues = corners.map((point) => point.y);
  const left = Math.min(...xValues);
  const right = Math.max(...xValues);
  const top = Math.min(...yValues);
  const bottom = Math.max(...yValues);
  if (![left, right, top, bottom].every(Number.isFinite)) return undefined;
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function appendRepeatLabel(svg: SVGSVGElement, repeatCount: number): void {
  const staffLines = [...svg.querySelectorAll<SVGGElement>("g.staffline")];
  const finalStaffLine = staffLines.at(-1);
  const measures = finalStaffLine
    ? [...finalStaffLine.querySelectorAll<SVGGElement>(":scope > g.vf-measure")]
    : [];
  const finalMeasure = measures.at(-1);
  if (!finalMeasure) {
    throw new NotationRenderError(
      "REPEAT_LABEL_RENDER_FAILED",
      "Could not locate the final rendered measure for the repeat label."
    );
  }

  const pathBounds = [...finalMeasure.querySelectorAll<SVGGraphicsElement>(":scope > path")]
    .map((path) => boundsInSvg(svg, path))
    .filter((bounds): bounds is SvgBounds =>
      bounds !== undefined && bounds.width > Math.max(1, bounds.height * 5)
    );
  const longestPath = Math.max(0, ...pathBounds.map((bounds) => bounds.width));
  const staffLineBounds = pathBounds.filter((bounds) => bounds.width >= longestPath * 0.8);
  if (staffLineBounds.length !== 5) {
    throw new NotationRenderError(
      "REPEAT_LABEL_RENDER_FAILED",
      `Expected five final staff lines for the repeat label; found ${staffLineBounds.length}.`
    );
  }

  const centers = staffLineBounds
    .map((bounds) => (bounds.top + bounds.bottom) / 2)
    .sort((left, right) => left - right);
  const distances = centers.slice(1).map((center, index) => center - centers[index]!);
  const staffSpace = distances.reduce((total, distance) => total + distance, 0) /
    distances.length;
  if (!Number.isFinite(staffSpace) || staffSpace <= 0) {
    throw new NotationRenderError(
      "REPEAT_LABEL_RENDER_FAILED",
      "Could not derive final staff spacing for the repeat label."
    );
  }

  const staffRight = Math.max(...staffLineBounds.map((bounds) => bounds.right));
  const barlineBounds = [...finalMeasure.querySelectorAll<SVGGraphicsElement>(":scope > rect")]
    .map((rect) => boundsInSvg(svg, rect))
    .filter((bounds): bounds is SvgBounds => bounds !== undefined);
  const visualEnd = Math.max(
    staffRight,
    ...barlineBounds.map((bounds) => bounds.right)
  );
  const bottomLine = Math.max(...centers);
  const fontSize = staffSpace * 2.0;
  const horizontalGap = staffSpace * 0.6;
  const baselineOffset = staffSpace * 0.0;

  const namespace = "http://www.w3.org/2000/svg";
  const group = document.createElementNS(namespace, "g");
  group.dataset.dbzRepeatLabel = "true";
  group.setAttribute("pointer-events", "none");
  const text = document.createElementNS(namespace, "text");
  text.dataset.repeatCount = String(repeatCount);
  text.setAttribute("x", String(visualEnd + horizontalGap));
  text.setAttribute("y", String(bottomLine + baselineOffset));
  text.setAttribute("fill", "#000000");
  text.setAttribute("font-family", "Times New Roman, serif");
  text.setAttribute("font-size", String(fontSize));
  text.setAttribute("font-style", "normal");
  text.setAttribute("font-weight", "normal");
  text.textContent = `x${repeatCount}`;
  group.append(text);
  svg.append(group);

  const labelBounds = boundsInSvg(svg, text);
  const viewBox = svg.viewBox.baseVal;
  const tolerance = 0.5;
  if (
    !labelBounds ||
    labelBounds.left < viewBox.x - tolerance ||
    labelBounds.top < viewBox.y - tolerance ||
    labelBounds.right > viewBox.x + viewBox.width + tolerance ||
    labelBounds.bottom > viewBox.y + viewBox.height + tolerance
  ) {
    group.remove();
    throw new NotationRenderError(
      "REPEAT_LABEL_RENDER_FAILED",
      "The repeat label did not fit inside the rendered SVG viewport."
    );
  }
}

function clearOwnedRender(
  container: HTMLElement,
  display: OsmdInstance | undefined
): void {
  try {
    display?.clear();
  } catch {
    // Container ownership still requires cleanup even if OSMD teardown fails.
  } finally {
    container.replaceChildren();
  }
}

function throwIfRenderAborted(
  signal: AbortSignal | undefined,
  container: HTMLElement,
  display: OsmdInstance | undefined
): void {
  if (!signal?.aborted) return;
  clearOwnedRender(container, display);
  throw new NotationRenderError(
    "RENDER_ABORTED",
    "The notation render was aborted before it could publish a result."
  );
}

function isRenderAborted(error: unknown): error is NotationRenderError {
  return (
    error instanceof NotationRenderError && error.code === "RENDER_ABORTED"
  );
}

async function renderNotationToSvg(
  notation: NotationInput,
  container: HTMLElement,
  options: RenderOptions = {}
): Promise<RenderResult> {
  throwIfRenderAborted(options.signal, container, undefined);
  validateRenderOptions(options);
  if (!container.isConnected || container.getBoundingClientRect().width <= 0) {
    throw new NotationRenderError(
      "RENDER_TARGET_INVALID",
      "A notation render target must be connected and have a positive width."
    );
  }
  const compiled = compileMusicXml(notation, options);
  throwIfRenderAborted(options.signal, container, undefined);
  container.replaceChildren();
  let display: OsmdInstance | undefined;
  try {
    const module = (await import(
      "opensheetmusicdisplay"
    )) as unknown as OsmdModule;
    throwIfRenderAborted(options.signal, container, display);
    display = new module.OpenSheetMusicDisplay(container, {
      autoResize: false,
      backend: "svg",
      drawingParameters: "compacttight",
      drawComposer: false,
      drawLyricist: false,
      drawMeasureNumbers: false,
      drawPartNames: false,
      drawSubtitle: false,
      drawTitle: false,
      pageBackgroundColor: "transparent",
    });
    display.EngravingRules.SetWantedStemDirectionByXml = true;
    display.EngravingRules.RenderClefsAtBeginningOfStaffline =
      options.presentation?.showClef !== false;
    display.EngravingRules.RenderTimeSignatures =
      options.presentation?.showTimeSignature !== false;
    // compacttight sets this margin to zero, which can clip the bottom staff
    // line at particular browser zoom levels. OSMD recommends a small margin.
    display.EngravingRules.PageBottomMargin = options.repeatCount === undefined ? 0.3 : 2.2;
    if (options.repeatCount !== undefined) {
      const currentRightMargin = Number.isFinite(display.EngravingRules.PageRightMargin)
        ? display.EngravingRules.PageRightMargin
        : 0;
      display.EngravingRules.PageRightMargin = Math.max(
        currentRightMargin,
        `x${options.repeatCount}`.length * 0.8 + 1.5
      );
    }
    // OSMD otherwise collapses sparse percussion, including an empty Bar, to a
    // one-line staff. This package always promises five-line drum notation.
    display.EngravingRules.PercussionOneLineCutoff = 0;
    display.zoom = options.zoom ?? 1;
    await display.load(compiled.musicXml);
    throwIfRenderAborted(options.signal, container, display);
    display.render();
  } catch (cause) {
    if (isRenderAborted(cause)) throw cause;
    if (options.signal?.aborted) {
      throwIfRenderAborted(options.signal, container, display);
    }
    clearOwnedRender(container, display);
    throw new NotationRenderError(
      "OSMD_RENDER_FAILED",
      "OpenSheetMusicDisplay could not render the drum notation.",
      { cause }
    );
  }

  const svg = container.querySelector("svg");
  if (!(svg instanceof SVGSVGElement)) {
    clearOwnedRender(container, display);
    throw new NotationRenderError(
      "OSMD_RENDER_FAILED",
      "OpenSheetMusicDisplay completed without producing an SVG element."
    );
  }
  const staffLineSystems = countStaffLineSystems(svg);
  if (
    staffLineSystems.length === 0 ||
    staffLineSystems.some((lineCount) => lineCount !== 5)
  ) {
    clearOwnedRender(container, display);
    throw new NotationRenderError(
      "STAFF_LINE_COUNT_INVALID",
      `Expected exactly five full-length staff lines in every staff span; OSMD rendered ${
        staffLineSystems.join(", ") || "none"
      }.`
    );
  }

  if (options.repeatCount !== undefined) {
    try {
      appendRepeatLabel(svg, options.repeatCount);
    } catch (error) {
      clearOwnedRender(container, display);
      if (error instanceof NotationRenderError) throw error;
      throw new NotationRenderError(
        "REPEAT_LABEL_RENDER_FAILED",
        "Could not add the repeat label to the rendered SVG.",
        { cause: error }
      );
    }
  }

  throwIfRenderAborted(options.signal, container, display);

  return Object.freeze({
    ...compiled,
    svg,
    dispose(): void {
      clearOwnedRender(container, display);
    },
  });
}

/** Renders a Bar into an owned browser container using a lazily loaded OSMD. */
export async function renderBarToSvg(
  bar: Bar<any>,
  container: HTMLElement,
  options: RenderOptions = {}
): Promise<RenderResult> {
  return renderNotationToSvg(bar, container, options);
}

/** Renders an ordered Phrase into an owned browser container using a lazily loaded OSMD. */
export async function renderPhraseToSvg(
  phrase: Phrase<any>,
  container: HTMLElement,
  options: RenderOptions = {}
): Promise<RenderResult> {
  return renderNotationToSvg(phrase, container, options);
}
