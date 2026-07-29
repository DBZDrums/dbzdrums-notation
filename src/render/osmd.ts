import { Bar } from "../bar.js";
import { NotationRenderError } from "../errors.js";
import { compileMusicXml } from "../musicxml.js";
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
      lines.push({ y: y1, length: Math.abs(x2 - x1) });
    }
  }
  return lines;
}

/** Counts full-length horizontal staff lines without relying on OSMD CSS classes. */
export function countStaffLines(svg: SVGSVGElement): number {
  const horizontal: HorizontalLine[] = [];
  for (const line of svg.querySelectorAll("line")) {
    const x1 = Number(line.getAttribute("x1"));
    const y1 = Number(line.getAttribute("y1"));
    const x2 = Number(line.getAttribute("x2"));
    const y2 = Number(line.getAttribute("y2"));
    if (Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(x2) && Number.isFinite(y2) && Math.abs(y1 - y2) < 0.1) {
      horizontal.push({ y: y1, length: Math.abs(x2 - x1) });
    }
  }
  for (const path of svg.querySelectorAll("path")) {
    horizontal.push(...parsePathLines(path.getAttribute("d") ?? ""));
  }
  const longest = Math.max(0, ...horizontal.map((line) => line.length));
  const fullLength = horizontal.filter((line) => line.length >= longest * 0.7);
  const yValues = new Set(fullLength.map((line) => Math.round(line.y * 10) / 10));
  return yValues.size;
}

/** Renders a Bar into an owned browser container using a lazily loaded OSMD. */
export async function renderBarToSvg(
  bar: Bar<any>,
  container: HTMLElement,
  options: RenderOptions = {},
): Promise<RenderResult> {
  if (!container.isConnected || container.getBoundingClientRect().width <= 0) {
    throw new NotationRenderError(
      "RENDER_TARGET_INVALID",
      "renderBarToSvg requires a connected target with a positive width.",
    );
  }
  const compiled = compileMusicXml(bar, options);
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
      "OpenSheetMusicDisplay could not render the drum bar.",
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
  const staffLineCount = countStaffLines(svg);
  if (staffLineCount !== 5) {
    display.clear();
    container.replaceChildren();
    throw new NotationRenderError(
      "STAFF_LINE_COUNT_INVALID",
      `Expected exactly five full-length staff lines; OSMD rendered ${staffLineCount}.`,
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
