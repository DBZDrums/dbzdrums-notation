import { Bar } from "../bar.js";
import { NotationRenderError } from "../errors.js";
import { compileMusicXml } from "../musicxml.js";
import { Phrase } from "../phrase.js";
import type { RenderOptions, RenderResult } from "../types.js";

interface OsmdInstance {
  readonly EngravingRules: {
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
    options: Record<string, unknown>,
  ) => OsmdInstance;
}

interface HorizontalLine {
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
  readonly length: number;
}

function parsePathLines(path: string): readonly HorizontalLine[] {
  const lines: HorizontalLine[] = [];
  const expression = /[Mm]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*[Ll]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/g;
  for (const match of path.matchAll(expression)) {
    const x1 = Number(match[1]);
    const y1 = Number(match[2]);
    const x2 = Number(match[3]);
    const y2 = Number(match[4]);
    if (Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(x2) && Number.isFinite(y2) && Math.abs(y1 - y2) < 0.1) {
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
    if (Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(x2) && Number.isFinite(y2) && Math.abs(y1 - y2) < 0.1) {
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
  return Object.freeze(
    [...systems.values()].map((yValues) => yValues.size),
  );
}

/** Counts full-length horizontal staff lines without relying on OSMD CSS classes. */
export function countStaffLines(svg: SVGSVGElement): number {
  return countStaffLineSystems(svg).reduce((total, lineCount) => total + lineCount, 0);
}

type NotationInput = Bar<any> | Phrase<any>;

async function renderNotationToSvg(
  notation: NotationInput,
  container: HTMLElement,
  options: RenderOptions = {},
): Promise<RenderResult> {
  if (!container.isConnected || container.getBoundingClientRect().width <= 0) {
    throw new NotationRenderError(
      "RENDER_TARGET_INVALID",
      "A notation render target must be connected and have a positive width.",
    );
  }
  const compiled = compileMusicXml(notation, options);
  container.replaceChildren();
  let display: OsmdInstance | undefined;
  try {
    const module = (await import("opensheetmusicdisplay")) as unknown as OsmdModule;
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
    display.zoom = options.zoom ?? 1;
    await display.load(compiled.musicXml);
    display.render();
  } catch (cause) {
    container.replaceChildren();
    throw new NotationRenderError(
      "OSMD_RENDER_FAILED",
      "OpenSheetMusicDisplay could not render the drum notation.",
      { cause },
    );
  }

  const svg = container.querySelector("svg");
  if (!(svg instanceof SVGSVGElement)) {
    display.clear();
    container.replaceChildren();
    throw new NotationRenderError(
      "OSMD_RENDER_FAILED",
      "OpenSheetMusicDisplay completed without producing an SVG element.",
    );
  }
  const staffLineSystems = countStaffLineSystems(svg);
  if (staffLineSystems.length === 0 || staffLineSystems.some((lineCount) => lineCount !== 5)) {
    display.clear();
    container.replaceChildren();
    throw new NotationRenderError(
      "STAFF_LINE_COUNT_INVALID",
      `Expected exactly five full-length staff lines in every staff span; OSMD rendered ${staffLineSystems.join(", ") || "none"}.`,
    );
  }

  return Object.freeze({
    ...compiled,
    svg,
    dispose(): void {
      try {
        display?.clear();
      } finally {
        container.replaceChildren();
      }
    },
  });
}

/** Renders a Bar into an owned browser container using a lazily loaded OSMD. */
export async function renderBarToSvg(
  bar: Bar<any>,
  container: HTMLElement,
  options: RenderOptions = {},
): Promise<RenderResult> {
  return renderNotationToSvg(bar, container, options);
}

/** Renders an ordered Phrase into an owned browser container using a lazily loaded OSMD. */
export async function renderPhraseToSvg(
  phrase: Phrase<any>,
  container: HTMLElement,
  options: RenderOptions = {},
): Promise<RenderResult> {
  return renderNotationToSvg(phrase, container, options);
}
