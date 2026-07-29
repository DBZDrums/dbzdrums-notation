import {
  Bar,
  NotationCompilationError,
  NotationRenderError,
  NotationValidationError,
  renderBarToSvg,
  standardDrumKit,
} from "./index.js";
import type { BarDefinition, HitInput, Meter, Position } from "./types.js";

type FixtureName = "straight" | "chord" | "compound" | "triplet" | "quarterGrid" | "articulations";
type DemoHits = Record<string, HitInput[]>;

interface DemoState {
  meter: string;
  divisions: number;
  grouping: string;
  hits: DemoHits;
}

declare global {
  interface Window {
    renderNotationFixture: (name: FixtureName) => Promise<string>;
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

const voiceEntries = Object.entries(standardDrumKit.voices);
const selectedTechniques = new Map<string, readonly string[]>();
let state = preset("straight");
let activePreset: FixtureName | undefined = "straight";
let latestMusicXml = "";
let currentDispose: (() => void) | undefined;
let renderQueue: Promise<void> = Promise.resolve();

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`The playground is missing #${id}.`);
  return element as T;
}

function preset(name: FixtureName): DemoState {
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

function cloneState(source: DemoState): DemoState {
  return { ...source, hits: cloneHits(source.hits) };
}

function meterNumerator(meter: string): number | undefined {
  const match = /^([1-9]\d*)\/(?:1|2|4|8|16|32)$/.exec(meter);
  if (!match) return undefined;
  const numerator = Number(match[1]);
  return Number.isSafeInteger(numerator) ? numerator : undefined;
}

function positionsForGrid(): readonly Position[] {
  const numerator = meterNumerator(state.meter);
  if (!numerator || !Number.isSafeInteger(state.divisions) || state.divisions <= 0 || state.divisions % numerator !== 0) {
    return [];
  }
  const subdivisions = state.divisions / numerator;
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

function definitionFor(source: DemoState): BarDefinition {
  const grouping = parseGrouping(source.grouping);
  return {
    meter: source.meter as Meter,
    divisions: source.divisions,
    ...(grouping === undefined ? {} : { grouping }),
    hits: source.hits,
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
  const currentHits = state.hits[voiceId] ?? [];
  if (currentHits.length === 0) {
    setStatus("Technique selected. Add a hit to this row to use it.");
    return;
  }
  const nextHits = cloneHits(state.hits);
  nextHits[voiceId] = currentHits.map((hit) =>
    hitWithArticulations(voiceId, hitPosition(hit) as Position, articulations),
  );
  state = { ...state, hits: nextHits };
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

    const voiceHits = state.hits[voiceId] ?? [];
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
  const hits = [...(state.hits[voiceId] ?? [])];
  const existingIndex = hits.findIndex((hit) => hitPosition(hit) === position);
  if (existingIndex >= 0) {
    hits.splice(existingIndex, 1);
  } else {
    const voice = standardDrumKit.voices[voiceId as keyof typeof standardDrumKit.voices];
    const articulations = selectedTechniques.get(voiceId) ?? voice.defaultArticulations;
    hits.push(hitWithArticulations(voiceId, position, articulations));
  }
  const nextHits = cloneHits(state.hits);
  if (hits.length === 0) delete nextHits[voiceId];
  else nextHits[voiceId] = hits;
  state = { ...state, hits: nextHits };
  activePreset = undefined;
  syncInterface();
  void enqueueRender();
}

function codeFor(definition: BarDefinition): string {
  return [
    'import { Bar, renderBarToSvg } from "@dbzdrums/notation";',
    "",
    `const bar = new Bar(${JSON.stringify(definition, null, 2)});`,
    "",
    'const chart = document.querySelector<HTMLElement>("#chart");',
    "if (!chart) throw new Error(\"Missing chart target.\");",
    "const { musicXml, svg, dispose } = await renderBarToSvg(bar, chart);",
  ].join("\n");
}

function syncInterface(options: { readonly updateDefinition?: boolean } = {}): void {
  meterInput.value = state.meter;
  divisionsInput.value = String(state.divisions);
  groupingInput.value = state.grouping;
  const definition = definitionFor(state);
  if (options.updateDefinition ?? true) definitionInput.value = JSON.stringify(definition, null, 2);
  apiCode.textContent = codeFor(definition);
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
    button.setAttribute("aria-pressed", String(button.dataset.preset === activePreset));
  }
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
      const bar = new Bar(definitionFor(state));
      currentDispose?.();
      currentDispose = undefined;
      const result = await renderBarToSvg(bar, target);
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
      setStatus("Could not render this bar. Check the definition and try again.", "error");
      showError(error);
      return undefined;
    }
  };
  const pending = renderQueue.then(render, render);
  renderQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

function stateFromDefinition(value: unknown): DemoState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("The definition must be a JSON object.");
  }
  const definition = value as Record<string, unknown>;
  if ("kit" in definition) {
    throw new Error("This playground supports the standard drum kit only. Use a custom kit in your own project.");
  }
  const bar = new Bar(definition as unknown as BarDefinition);
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
  };
}

function setPreset(name: FixtureName): void {
  state = cloneState(preset(name));
  selectedTechniques.clear();
  activePreset = name;
  syncInterface();
  void enqueueRender();
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-preset]")) {
  button.addEventListener("click", () => setPreset(button.dataset.preset as FixtureName));
}

barForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state = {
    ...state,
    meter: meterInput.value.trim(),
    divisions: Number(divisionsInput.value),
    grouping: groupingInput.value.trim(),
  };
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
  definitionInput.value = JSON.stringify(definitionFor(state), null, 2);
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
  anchor.download = "drum-bar.musicxml";
  anchor.click();
  URL.revokeObjectURL(url);
});

window.renderNotationFixture = async (name: FixtureName): Promise<string> => {
  state = cloneState(preset(name));
  activePreset = name;
  syncInterface();
  const musicXml = await enqueueRender();
  if (musicXml === undefined) throw new Error(`Fixture '${name}' did not render.`);
  return musicXml;
};

syncInterface();
void enqueueRender();
