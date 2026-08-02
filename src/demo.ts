import {
  Bar,
  NotationCompilationError,
  NotationRenderError,
  NotationValidationError,
  renderBarToSvg,
  renderPhraseToSvg,
  Phrase,
  standardDrumKit,
} from "./index.js";
import type {
  BarDefinition,
  BarTextAnnotation,
  HitInput,
  Meter,
  PhraseTextAnnotation,
  Position,
  RenderOptions,
  ScorePresentationOptions,
} from "./types.js";

type FixtureName = "straight" | "chord" | "compound" | "triplet" | "quarterGrid" | "articulations";
type RenderFixtureName = FixtureName | "longPhrase";
type PhrasePresetName = "twoBarPhrase" | "mixedMeterPhrase";
type PresetName = FixtureName | PhrasePresetName;
type DemoHits = Record<string, HitInput[]>;
type ResolvedPresentationOptions = Required<ScorePresentationOptions>;

interface DemoBarState {
  meter: string;
  divisions: number;
  grouping: string;
  hits: DemoHits;
  annotations: readonly BarTextAnnotation[];
}

type DemoState =
  | { readonly kind: "bar"; readonly bar: DemoBarState }
  | {
      readonly kind: "phrase";
      readonly bars: readonly DemoBarState[];
      readonly annotations: readonly PhraseTextAnnotation[];
      readonly activeBarIndex: number;
    };

declare global {
  interface Window {
    renderNotationFixture: (name: RenderFixtureName) => Promise<string>;
  }
}

const target = requiredElement<HTMLDivElement>("target");
const meterInput = requiredElement<HTMLInputElement>("meter");
const divisionsInput = requiredElement<HTMLInputElement>("divisions");
const groupingInput = requiredElement<HTMLInputElement>("grouping");
const barForm = requiredElement<HTMLFormElement>("bar-form");
const hitGrid = requiredElement<HTMLDivElement>("hit-grid");
const definitionInput = requiredElement<HTMLTextAreaElement>("definition");
const apiCode = requiredElement<HTMLElement>("api-code");
const musicXmlOutput = requiredElement<HTMLElement>("musicxml");
const status = requiredElement<HTMLParagraphElement>("status");
const issues = requiredElement<HTMLDivElement>("issues");
const applyDefinitionButton = requiredElement<HTMLButtonElement>("apply-definition");
const restoreDefinitionButton = requiredElement<HTMLButtonElement>("restore-definition");
const copyXmlButton = requiredElement<HTMLButtonElement>("copy-xml");
const downloadXmlButton = requiredElement<HTMLButtonElement>("download-xml");
const phraseBars = requiredElement<HTMLDivElement>("phrase-bars");
const phraseHint = requiredElement<HTMLParagraphElement>("phrase-hint");
const addBarButton = requiredElement<HTMLButtonElement>("add-bar");
const duplicateBarButton = requiredElement<HTMLButtonElement>("duplicate-bar");
const removeBarButton = requiredElement<HTMLButtonElement>("remove-bar");
const showClefInput = requiredElement<HTMLInputElement>("show-clef");
const showTimeSignatureInput = requiredElement<HTMLInputElement>("show-time-signature");
const showFinalBarlineInput = requiredElement<HTMLInputElement>("show-final-barline");
const repeatCountInput = requiredElement<HTMLInputElement>("repeat-count");
const definitionHeading = requiredElement<HTMLHeadingElement>("definition-heading");
const definitionDescription = requiredElement<HTMLParagraphElement>("definition-description");

const voiceEntries = Object.entries(standardDrumKit.voices);
const selectedTechniques = new Map<string, readonly string[]>();
let state: DemoState = { kind: "bar", bar: preset("straight") };
let activePreset: PresetName | undefined = "straight";
let presentation: ResolvedPresentationOptions = {
  showClef: true,
  showTimeSignature: true,
  showFinalBarline: true,
};
let repeatCount: number | undefined;
let latestMusicXml = "";
let currentDispose: (() => void) | undefined;
let renderQueue: Promise<void> = Promise.resolve();

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`The playground is missing #${id}.`);
  return element as T;
}

function preset(name: FixtureName): DemoBarState {
  switch (name) {
    case "straight":
      return {
        meter: "4/4",
        divisions: 8,
        grouping: "",
        hits: {
          bassDrum: ["1.0", "3.0"],
          snare: ["2.0", "4.0"],
          hiHat: ["1.0", "1.1", "2.0", "2.1", "3.0", "3.1", "4.0", "4.1"],
        },
        annotations: [],
      };
    case "chord":
      return {
        meter: "4/4",
        divisions: 8,
        grouping: "",
        hits: {
          bassDrum: ["1.0", "3.0"],
          snare: ["2.0", "4.0"],
          crash: ["1.0"],
          hiHat: ["2.0", "3.0", "4.0"],
        },
        annotations: [],
      };
    case "compound":
      return {
        meter: "6/8",
        divisions: 6,
        grouping: "3, 3",
        hits: {
          bassDrum: ["1.0", "4.0"],
          snare: ["3.0", "6.0"],
          hiHat: ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0"],
        },
        annotations: [],
      };
    case "triplet":
      return {
        meter: "4/4",
        divisions: 12,
        grouping: "",
        hits: {
          bassDrum: ["1.0", "3.0"],
          snare: ["2.0", "4.0"],
          hiHat: ["1.0", "1.1", "1.2", "2.0", "2.1", "2.2", "3.0", "3.1", "3.2", "4.0", "4.1", "4.2"],
        },
        annotations: [],
      };
    case "quarterGrid":
      return {
        meter: "4/4",
        divisions: 16,
        grouping: "",
        hits: {
          bassDrum: ["1.0", "3.0"],
          snare: ["2.0", "4.0"],
          hiHat: ["1.0", "2.0", "3.0", "4.0"],
        },
        annotations: [],
      };
    case "articulations":
      return {
        meter: "4/4",
        divisions: 8,
        grouping: "",
        hits: {
          snare: [{ at: "2.0", articulations: ["flam"] }, { at: "4.0", articulations: ["rim"] }],
          hiHat: [{ at: "1.0", articulations: ["open"] }, { at: "3.0", articulations: ["pedal"] }],
        },
        annotations: [],
      };
  }
}

function cloneHits(hits: DemoHits): DemoHits {
  return Object.fromEntries(
    Object.entries(hits).map(([voice, voiceHits]) => [
      voice,
      voiceHits.map((hit) =>
        typeof hit === "string" ? hit : { at: hit.at, ...(hit.articulations ? { articulations: [...hit.articulations] } : {}) },
      ),
    ]),
  );
}

function cloneBarState(source: DemoBarState): DemoBarState {
  return {
    ...source,
    hits: cloneHits(source.hits),
    annotations: source.annotations.map((annotation) => ({ ...annotation })),
  };
}

function activeBarState(): DemoBarState {
  return state.kind === "bar" ? state.bar : state.bars[state.activeBarIndex]!;
}

function barsInState(): readonly DemoBarState[] {
  return state.kind === "bar" ? [state.bar] : state.bars;
}

function updateActiveBar(update: (bar: DemoBarState) => DemoBarState): void {
  const currentState = state;
  if (currentState.kind === "bar") {
    state = { kind: "bar", bar: update(currentState.bar) };
    return;
  }
  state = {
    kind: "phrase",
    bars: currentState.bars.map((bar, index) => index === currentState.activeBarIndex ? update(bar) : bar),
    annotations: currentState.annotations,
    activeBarIndex: currentState.activeBarIndex,
  };
}

function newEmptyBarLike(source: DemoBarState): DemoBarState {
  return {
    meter: source.meter,
    divisions: source.divisions,
    grouping: source.grouping,
    hits: {},
    annotations: [],
  };
}

function meterNumerator(meter: string): number | undefined {
  const match = /^([1-9]\d*)\/(?:1|2|4|8|16|32)$/.exec(meter);
  if (!match) return undefined;
  const numerator = Number(match[1]);
  return Number.isSafeInteger(numerator) ? numerator : undefined;
}

function positionsForGrid(): readonly Position[] {
  const activeBar = activeBarState();
  const numerator = meterNumerator(activeBar.meter);
  if (!numerator || !Number.isSafeInteger(activeBar.divisions) || activeBar.divisions <= 0 || activeBar.divisions % numerator !== 0) {
    return [];
  }
  const subdivisions = activeBar.divisions / numerator;
  if (!Number.isInteger(subdivisions) || subdivisions < 1 || subdivisions > 32) return [];
  const positions: Position[] = [];
  for (let unit = 1; unit <= numerator; unit += 1) {
    for (let subdivision = 0; subdivision < subdivisions; subdivision += 1) {
      positions.push(`${unit}.${subdivision}` as Position);
    }
  }
  return positions;
}

function parseGrouping(value: string): number[] | undefined {
  if (value.trim() === "") return undefined;
  return value.split(",").map((group) => Number(group.trim()));
}

function definitionFor(source: DemoBarState): BarDefinition {
  const grouping = parseGrouping(source.grouping);
  return {
    meter: source.meter as Meter,
    divisions: source.divisions,
    ...(grouping === undefined ? {} : { grouping }),
    hits: source.hits,
    ...(source.annotations.length === 0 ? {} : { annotations: source.annotations }),
  };
}

interface DemoPhraseDefinition {
  readonly bars: readonly BarDefinition[];
  readonly annotations?: readonly PhraseTextAnnotation[];
}

function definitionForState(source: DemoState): BarDefinition | DemoPhraseDefinition {
  if (source.kind === "bar") return definitionFor(source.bar);
  return {
    bars: source.bars.map((bar) => definitionFor(bar)),
    ...(source.annotations.length === 0 ? {} : { annotations: source.annotations }),
  };
}

function techniqueKey(articulations: readonly string[]): string {
  return articulations.join("|");
}

function techniqueOptions(voiceId: string): readonly { readonly label: string; readonly articulations: readonly string[] }[] {
  if (voiceId === "snare") {
    return [
      { label: "normal", articulations: ["normal"] },
      { label: "flam", articulations: ["flam"] },
      { label: "rim", articulations: ["rim"] },
    ];
  }
  if (voiceId === "hiHat") {
    return [
      { label: "closed", articulations: ["closed"] },
      { label: "open", articulations: ["open"] },
      { label: "pedal", articulations: ["pedal"] },
    ];
  }
  return [];
}

function usesDefaultArticulation(voiceId: string, articulations: readonly string[]): boolean {
  const voice = standardDrumKit.voices[voiceId as keyof typeof standardDrumKit.voices];
  return voice !== undefined &&
    articulations.length === voice.defaultArticulations.length &&
    articulations.every((articulation, index) => articulation === voice.defaultArticulations[index]);
}

function hitPosition(hit: HitInput): string {
  return typeof hit === "string" ? hit : hit.at;
}

function hitWithArticulations(
  voiceId: string,
  position: Position,
  articulations: readonly string[],
): HitInput {
  return usesDefaultArticulation(voiceId, articulations)
    ? position
    : { at: position, articulations };
}

function applyTechniqueToVoice(voiceId: string, articulations: readonly string[]): void {
  const activeBar = activeBarState();
  const currentHits = activeBar.hits[voiceId] ?? [];
  if (currentHits.length === 0) {
    setStatus("Technique selected. Add a hit to this row to use it.");
    return;
  }
  const nextHits = cloneHits(activeBar.hits);
  nextHits[voiceId] = currentHits.map((hit) =>
    hitWithArticulations(voiceId, hitPosition(hit) as Position, articulations),
  );
  updateActiveBar((bar) => ({ ...bar, hits: nextHits }));
  activePreset = undefined;
  syncInterface();
  void enqueueRender();
}

function renderGrid(): void {
  const positions = positionsForGrid();
  hitGrid.replaceChildren();
  if (positions.length === 0) {
    const message = document.createElement("p");
    message.className = "hint";
    message.textContent = "Enter a valid time signature and a division count that is a multiple of the top number.";
    hitGrid.append(message);
    return;
  }

  const table = document.createElement("table");
  table.className = "hit-grid";
  const head = table.createTHead().insertRow();
  const voiceHead = document.createElement("th");
  voiceHead.className = "voice-heading";
  voiceHead.scope = "col";
  voiceHead.textContent = "Instrument / technique";
  head.append(voiceHead);
  for (const position of positions) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = position;
    head.append(cell);
  }

  const body = table.createTBody();
  for (const [voiceId, voice] of voiceEntries) {
    const row = body.insertRow();
    const heading = document.createElement("th");
    heading.scope = "row";
    const control = document.createElement("div");
    control.className = "voice-control";
    const label = document.createElement("label");
    label.textContent = voice.name;
    control.append(label);
    const techniques = techniqueOptions(voiceId);
    if (techniques.length > 1) {
      const select = document.createElement("select");
      select.id = `technique-${voiceId}`;
      select.dataset.voice = voiceId;
      label.htmlFor = select.id;
      const selected = selectedTechniques.get(voiceId) ?? standardDrumKit.voices[voiceId as keyof typeof standardDrumKit.voices].defaultArticulations;
      for (const option of techniques) {
        const optionElement = document.createElement("option");
        optionElement.value = techniqueKey(option.articulations);
        optionElement.textContent = option.label;
        optionElement.selected = optionElement.value === techniqueKey(selected);
        select.append(optionElement);
      }
      select.addEventListener("change", () => {
        const articulations = select.value.split("|");
        selectedTechniques.set(voiceId, articulations);
        applyTechniqueToVoice(voiceId, articulations);
      });
      control.append(select);
    }
    heading.append(control);
    row.append(heading);

    const voiceHits = activeBarState().hits[voiceId] ?? [];
    for (const position of positions) {
      const cell = row.insertCell();
      const existing = voiceHits.find((hit) => hitPosition(hit) === position);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hit-cell";
      button.dataset.voice = voiceId;
      button.dataset.position = position;
      button.setAttribute("aria-pressed", String(existing !== undefined));
      button.setAttribute("aria-label", `${existing ? "Remove" : "Add"} ${voice.name} at ${position}`);
      button.textContent = existing ? "●" : "+";
      button.addEventListener("click", () => toggleHit(voiceId, position));
      cell.append(button);
    }
  }
  hitGrid.append(table);
}

function toggleHit(voiceId: string, position: Position): void {
  const activeBar = activeBarState();
  const hits = [...(activeBar.hits[voiceId] ?? [])];
  const existingIndex = hits.findIndex((hit) => hitPosition(hit) === position);
  if (existingIndex >= 0) {
    hits.splice(existingIndex, 1);
  } else {
    const voice = standardDrumKit.voices[voiceId as keyof typeof standardDrumKit.voices];
    const articulations = selectedTechniques.get(voiceId) ?? voice.defaultArticulations;
    hits.push(hitWithArticulations(voiceId, position, articulations));
  }
  const nextHits = cloneHits(activeBar.hits);
  if (hits.length === 0) delete nextHits[voiceId];
  else nextHits[voiceId] = hits;
  updateActiveBar((bar) => ({ ...bar, hits: nextHits }));
  activePreset = undefined;
  syncInterface();
  void enqueueRender();
}

type DemoRenderOptions = Pick<RenderOptions, "presentation" | "repeatCount">;

function renderOptionsForCode(): DemoRenderOptions | undefined {
  const presentationOptions =
    presentation.showClef && presentation.showTimeSignature && presentation.showFinalBarline
      ? undefined
      : presentation;
  if (!presentationOptions && repeatCount === undefined) return undefined;
  return {
    ...(presentationOptions ? { presentation: presentationOptions } : {}),
    ...(repeatCount === undefined ? {} : { repeatCount }),
  };
}

function codeFor(
  definition: BarDefinition,
  renderOptions: DemoRenderOptions | undefined,
): string {
  const code = [
    'import { Bar, renderBarToSvg } from "@dbzdrums/notation";',
    "",
    `const bar = new Bar(${JSON.stringify(definition, null, 2)});`,
  ];
  if (renderOptions) {
    code.push("", `const renderOptions = ${JSON.stringify(renderOptions, null, 2)};`);
  }
  code.push(
    "",
    'const chart = document.querySelector<HTMLElement>("#chart");',
    "if (!chart) throw new Error(\"Missing chart target.\");",
    `const { musicXml, svg, dispose } = await renderBarToSvg(bar, chart${
      renderOptions ? ", renderOptions" : ""
    });`,
  );
  return code.join("\n");
}

function codeForPhrase(
  definition: DemoPhraseDefinition,
  renderOptions: DemoRenderOptions | undefined,
): string {
  const phraseDefinition = definition.annotations
    ? `{
  bars,
  annotations: ${JSON.stringify(definition.annotations, null, 2).replaceAll("\n", "\n  ")},
}`
    : "{ bars }";
  const code = [
    'import { Bar, Phrase, renderPhraseToSvg } from "@dbzdrums/notation";',
    "",
    "const bars = [",
    ...definition.bars.map((bar) => `  new Bar(${JSON.stringify(bar, null, 2).replaceAll("\n", "\n  ")}),`),
    "];",
    `const phrase = new Phrase(${phraseDefinition});`,
  ];
  if (renderOptions) {
    code.push("", `const renderOptions = ${JSON.stringify(renderOptions, null, 2)};`);
  }
  code.push(
    "",
    'const chart = document.querySelector<HTMLElement>("#chart");',
    "if (!chart) throw new Error(\"Missing chart target.\");",
    `const { musicXml, svg, dispose } = await renderPhraseToSvg(phrase, chart${
      renderOptions ? ", renderOptions" : ""
    });`,
  );
  return code.join("\n");
}

function renderPhraseBuilder(): void {
  phraseBars.replaceChildren();
  if (state.kind === "bar") {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "phrase-bar";
    bar.setAttribute("aria-pressed", "true");
    bar.textContent = `Bar 1 · ${state.bar.meter}`;
    phraseBars.append(bar);
    phraseHint.textContent = "Add or duplicate a bar to turn this groove into a phrase.";
    removeBarButton.disabled = true;
    return;
  }

  for (const [index, barState] of state.bars.entries()) {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "phrase-bar";
    bar.dataset.barIndex = String(index);
    bar.setAttribute("aria-pressed", String(index === state.activeBarIndex));
    bar.textContent = `Bar ${index + 1} · ${barState.meter}`;
    bar.addEventListener("click", () => {
      if (state.kind !== "phrase") return;
      state = { ...state, activeBarIndex: index };
      syncInterface();
    });
    phraseBars.append(bar);
  }
  phraseHint.textContent = "Each bar can have its own time signature and grid. Select a bar to edit it below.";
  removeBarButton.disabled = state.bars.length === 1;
}

function syncInterface(options: { readonly updateDefinition?: boolean } = {}): void {
  const activeBar = activeBarState();
  meterInput.value = activeBar.meter;
  divisionsInput.value = String(activeBar.divisions);
  groupingInput.value = activeBar.grouping;
  const definition = definitionForState(state);
  if (options.updateDefinition ?? true) definitionInput.value = JSON.stringify(definition, null, 2);
  const renderOptions = renderOptionsForCode();
  apiCode.textContent = state.kind === "bar"
    ? codeFor(definitionFor(state.bar), renderOptions)
    : codeForPhrase(definition as DemoPhraseDefinition, renderOptions);
  definitionHeading.textContent = state.kind === "bar" ? "5. Edit the bar definition" : "5. Edit the phrase definition";
  definitionDescription.innerHTML = state.kind === "bar"
    ? "the same data passed to <code>new Bar(...)</code>"
    : "an ordered list of the bars passed to <code>new Phrase(...)</code>";
  definitionInput.setAttribute("aria-label", state.kind === "bar" ? "Bar definition as JSON" : "Phrase definition as JSON");
  showClefInput.checked = presentation.showClef;
  showTimeSignatureInput.checked = presentation.showTimeSignature;
  showFinalBarlineInput.checked = presentation.showFinalBarline;
  repeatCountInput.value = repeatCount === undefined ? "" : String(repeatCount);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
    button.setAttribute("aria-pressed", String(button.dataset.preset === activePreset));
  }
  renderPhraseBuilder();
  renderGrid();
}

function setStatus(message: string, tone: "neutral" | "success" | "error" = "neutral"): void {
  status.textContent = message;
  status.dataset.tone = tone;
}

function clearIssues(): void {
  issues.replaceChildren();
}

function showError(error: unknown): void {
  clearIssues();
  const problemList = error instanceof NotationValidationError
    ? error.issues
    : error instanceof NotationCompilationError
      ? error.diagnostics
      : [];
  if (problemList.length === 0) {
    const issue = document.createElement("div");
    issue.className = "issue";
    issue.textContent = error instanceof Error ? error.message : String(error);
    issues.append(issue);
    return;
  }
  for (const problem of problemList) {
    const issue = document.createElement("div");
    issue.className = "issue";
    issue.textContent = `${problem.code}${problem.path ? ` · ${problem.path}` : ""}: ${problem.message}`;
    issues.append(issue);
  }
}

function enqueueRender(): Promise<string | undefined> {
  const render = async (): Promise<string | undefined> => {
    clearIssues();
    setStatus("Updating score…");
    try {
      const bars = barsInState().map((barState) => new Bar(definitionFor(barState)));
      const notation = state.kind === "phrase"
        ? new Phrase({ bars, annotations: state.annotations })
        : bars[0]!;
      const renderOptions: RenderOptions = {
        presentation,
        ...(repeatCount === undefined ? {} : { repeatCount }),
      };
      currentDispose?.();
      currentDispose = undefined;
      const result = notation instanceof Phrase
        ? await renderPhraseToSvg(notation, target, renderOptions)
        : await renderBarToSvg(notation, target, renderOptions);
      currentDispose = result.dispose;
      latestMusicXml = result.musicXml;
      musicXmlOutput.textContent = latestMusicXml;
      if (result.diagnostics.length > 0) {
        setStatus(`This pattern has ${result.diagnostics.length} notation warning(s).`, "error");
        for (const diagnostic of result.diagnostics) {
          const issue = document.createElement("div");
          issue.className = "issue";
          issue.textContent = `${diagnostic.code}: ${diagnostic.message}`;
          issues.append(issue);
        }
      } else {
        setStatus("Score updated.", "success");
      }
      return latestMusicXml;
    } catch (error) {
      if (error instanceof NotationRenderError) target.replaceChildren();
      latestMusicXml = "";
      musicXmlOutput.textContent = "";
      setStatus("Could not render this score. Check the definition and try again.", "error");
      showError(error);
      return undefined;
    }
  };
  const pending = renderQueue.then(render, render);
  renderQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

function barStateFromBar(bar: Bar<any>): DemoBarState {
  const hits: DemoHits = {};
  for (const event of bar.events) {
    const existing = hits[event.voice] ?? [];
    hits[event.voice] = [...existing, { at: event.at, articulations: [...event.articulations] }];
  }
  return {
    meter: bar.meter,
    divisions: bar.divisions,
    grouping: bar.grouping?.join(", ") ?? "",
    hits,
    annotations: bar.annotations.map((annotation) => ({ ...annotation })),
  };
}

function stateFromDefinition(value: unknown): DemoState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("The definition must be a JSON object.");
  }
  const definition = value as Record<string, unknown>;
  if ("kit" in definition) {
    throw new Error("This playground supports the standard drum kit only. Use a custom kit in your own project.");
  }
  if ("bars" in definition) {
    if (!Array.isArray(definition.bars)) {
      throw new Error("Phrase bars must be an array of bar definitions.");
    }
    const bars = definition.bars.map((barDefinition, index) => {
      if (typeof barDefinition !== "object" || barDefinition === null || Array.isArray(barDefinition)) {
        throw new Error(`Phrase bar ${index + 1} must be a JSON object.`);
      }
      if ("kit" in barDefinition) {
        throw new Error("This playground supports the standard drum kit only. Use a custom kit in your own project.");
      }
      return new Bar(barDefinition as BarDefinition);
    });
    const phrase = new Phrase({
      bars,
      ...(definition.annotations === undefined
        ? {}
        : { annotations: definition.annotations as readonly PhraseTextAnnotation[] }),
    });
    return {
      kind: "phrase",
      bars: bars.map(barStateFromBar),
      annotations: phrase.annotations.map((annotation) => ({ ...annotation })),
      activeBarIndex: 0,
    };
  }
  return { kind: "bar", bar: barStateFromBar(new Bar(definition as unknown as BarDefinition)) };
}

function setPreset(name: PresetName): void {
  if (name === "twoBarPhrase") {
    state = {
      kind: "phrase",
      bars: [
        cloneBarState(preset("straight")),
        cloneBarState(preset("chord")),
      ],
      annotations: [],
      activeBarIndex: 0,
    };
  } else if (name === "mixedMeterPhrase") {
    state = {
      kind: "phrase",
      bars: [
        cloneBarState(preset("straight")),
        cloneBarState(preset("compound")),
      ],
      annotations: [],
      activeBarIndex: 0,
    };
  } else {
    state = { kind: "bar", bar: cloneBarState(preset(name)) };
  }
  selectedTechniques.clear();
  activePreset = name;
  syncInterface();
  void enqueueRender();
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
  button.addEventListener("click", () => setPreset(button.dataset.preset as PresetName));
}

function updatePresentation(): void {
  presentation = {
    showClef: showClefInput.checked,
    showTimeSignature: showTimeSignatureInput.checked,
    showFinalBarline: showFinalBarlineInput.checked,
  };
  syncInterface({ updateDefinition: false });
  void enqueueRender();
}

for (const input of [showClefInput, showTimeSignatureInput, showFinalBarlineInput]) {
  input.addEventListener("change", updatePresentation);
}

repeatCountInput.addEventListener("change", () => {
  const value = repeatCountInput.value.trim();
  if (value === "") {
    repeatCount = undefined;
  } else {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 2) {
      setStatus("Repeat count must be a whole number of 2 or greater.", "error");
      showError(new Error("Enter a repeat count of 2 or greater, or leave the field empty."));
      return;
    }
    repeatCount = parsed;
  }
  syncInterface({ updateDefinition: false });
  void enqueueRender();
});

function updatePhraseStructure(next: DemoState): void {
  state = next;
  activePreset = undefined;
  syncInterface();
  void enqueueRender();
}

addBarButton.addEventListener("click", () => {
  const activeBar = activeBarState();
  if (state.kind === "bar") {
    updatePhraseStructure({
      kind: "phrase",
      bars: [cloneBarState(activeBar), newEmptyBarLike(activeBar)],
      annotations: [],
      activeBarIndex: 1,
    });
    return;
  }
  updatePhraseStructure({
    kind: "phrase",
    bars: [...state.bars, newEmptyBarLike(activeBar)],
    annotations: state.annotations,
    activeBarIndex: state.bars.length,
  });
});

duplicateBarButton.addEventListener("click", () => {
  const activeBar = activeBarState();
  const currentState = state;
  if (currentState.kind === "bar") {
    updatePhraseStructure({
      kind: "phrase",
      bars: [cloneBarState(activeBar), cloneBarState(activeBar)],
      annotations: [],
      activeBarIndex: 1,
    });
    return;
  }
  const insertionIndex = currentState.activeBarIndex + 1;
  updatePhraseStructure({
    kind: "phrase",
    bars: [
      ...currentState.bars.slice(0, insertionIndex),
      cloneBarState(activeBar),
      ...currentState.bars.slice(insertionIndex),
    ],
    annotations: currentState.annotations.map((annotation) => ({
      ...annotation,
      bar: annotation.bar >= insertionIndex ? annotation.bar + 1 : annotation.bar,
    })),
    activeBarIndex: insertionIndex,
  });
});

removeBarButton.addEventListener("click", () => {
  const currentState = state;
  if (currentState.kind !== "phrase" || currentState.bars.length === 1) return;
  const remaining = currentState.bars.filter((_, index) => index !== currentState.activeBarIndex);
  updatePhraseStructure({
    kind: "phrase",
    bars: remaining,
    annotations: currentState.annotations
      .filter((annotation) => annotation.bar !== currentState.activeBarIndex)
      .map((annotation) => ({
        ...annotation,
        bar: annotation.bar > currentState.activeBarIndex ? annotation.bar - 1 : annotation.bar,
      })),
    activeBarIndex: Math.min(currentState.activeBarIndex, remaining.length - 1),
  });
});

barForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateActiveBar((activeBar) => ({
    ...activeBar,
    meter: meterInput.value.trim(),
    divisions: Number(divisionsInput.value),
    grouping: groupingInput.value.trim(),
  }));
  activePreset = undefined;
  syncInterface();
  void enqueueRender();
});

applyDefinitionButton.addEventListener("click", () => {
  try {
    state = stateFromDefinition(JSON.parse(definitionInput.value));
    activePreset = undefined;
    syncInterface();
    void enqueueRender();
  } catch (error) {
    setStatus("This JSON definition is not valid.", "error");
    showError(error);
  }
});

restoreDefinitionButton.addEventListener("click", () => {
  definitionInput.value = JSON.stringify(definitionForState(state), null, 2);
  setStatus("Definition restored from the grid.");
});

copyXmlButton.addEventListener("click", async () => {
  if (latestMusicXml === "") {
    setStatus("Render a score before copying MusicXML.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(latestMusicXml);
    setStatus("MusicXML copied to your clipboard.", "success");
  } catch {
    setStatus("Your browser could not copy MusicXML automatically. Select it below to copy.", "error");
  }
});

downloadXmlButton.addEventListener("click", () => {
  if (latestMusicXml === "") {
    setStatus("Render a score before downloading MusicXML.", "error");
    return;
  }
  const url = URL.createObjectURL(new Blob([latestMusicXml], { type: "application/vnd.recordare.musicxml+xml" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = state.kind === "phrase" ? "drum-phrase.musicxml" : "drum-bar.musicxml";
  anchor.click();
  URL.revokeObjectURL(url);
});

window.renderNotationFixture = async (name: RenderFixtureName): Promise<string> => {
  state = name === "longPhrase"
    ? {
        kind: "phrase",
        bars: Array.from({ length: 8 }, (_, index) =>
          cloneBarState(preset(index % 2 === 0 ? "straight" : "chord")),
        ),
        annotations: [],
        activeBarIndex: 0,
      }
    : { kind: "bar", bar: cloneBarState(preset(name)) };
  activePreset = name === "longPhrase" ? undefined : name;
  syncInterface();
  const musicXml = await enqueueRender();
  if (musicXml === undefined) throw new Error(`Fixture '${name}' did not render.`);
  return musicXml;
};

syncInterface();
void enqueueRender();
