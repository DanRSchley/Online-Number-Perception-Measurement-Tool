(function () {
  "use strict";

  const DEFAULT_CONFIG = {
    experiment: {
      version: "1.0.0",
      title: "Behavioral Experiment Platform",
      instructionsTitle: "Behavioral Estimation Task",
      instructionsText: [
        "In this task, you will complete one or more judgment tasks.",
        "Please respond carefully and use only your own judgment.",
        "Do not use calculators, notes, or any other aids."
      ],
      endTitle: "Finished",
      endText: "The task is complete. Your data have been prepared for export."
    },
    ui: {
      backgroundColor: "#FFFFFF",
      textColor: "#1E2430",
      dotColor: "#22303C",
      numerosityCanvasWidth: 1280,
      numerosityCanvasHeight: 900,
      proportionSvgWidth: 1220,
      proportionSvgHeight: 520,
      showFullscreenPrompt: true,
      allowParticipantIdEntry: false
    },
    timing: {
      readyMs: 2000,
      fixationMs: 400,
      briefDisplayMs: 500,
      blankMs: 200,
      postResponseBlankMs: 0,
      feedbackMs: 1000,
      fixationEnabled: true,
      unlimitedResponseTime: true,
      responseDeadlineMs: null
    },
    export: {
      autoDownload: true,
      disableAutoDownloadInQualtrics: true,
      downloadCsv: true,
      downloadJson: true,
      filePrefix: "behavioral-experiment"
    },
    qualtrics: {
      enabled: true,
      embeddedDataField: "experiment_data",
      metadataField: "experiment_metadata",
      completionField: "experiment_complete"
    },
    blocks: [],
    taskSettings: {
      numerosity: {
        instructionsTitle: "Dot Estimation Task",
        instructionsText: [
          "You will see groups of dots on the screen.",
          "Estimate how many dots were shown.",
          "Please use your best quick estimate and do not try to count.",
          "Enter whole numbers only."
        ],
        readyText: "Get ready for the next set of dots",
        promptSeparate: "How many dots were shown?",
        promptJoint: "How many dots were shown in each array?",
        randomizeTrialSets: true,
        randomizeConditionWhenMissing: true,
        practiceTrialSets: [],
        trialSets: []
      },
      proportion: {
        instructionsTitle: "Proportion Judgment Task",
        instructionsText: [
          "You will judge percentages shown in bar charts.",
          "Enter open-ended percentages from 0 to 100.",
          "Decimals are allowed. Use your best visual estimate and do not calculate."
        ],
        jointPrompt: "What percentage of the full bar is each block?",
        jointHelperText: "Enter percentages for A through E so that they total 100. Use your best visual estimate. Decimals are allowed.",
        separatePrompt: "What percentage of the full bar is shaded?",
        separateHelperText: "Type a number from 0 to 100. Use your best visual estimate. Decimals are allowed.",
        showJointTotalBox: true,
        requireJointTotal100: true,
        showTargetLabelInSeparate: false,
        colorPalette: {
          A: "#0072B2",
          B: "#E69F00",
          C: "#009E73",
          D: "#CC79A7",
          E: "#56B4E9"
        },
        grayscalePalette: {
          A: "#EFEFEF",
          B: "#D8D8D8",
          C: "#BFBFBF",
          D: "#9C9C9C",
          E: "#757575"
        },
        useGrayscale: false,
        responseMethod: "numeric",
        formats: ["joint", "separate"],
        proceduralGenerator: null,
        trialList: []
      }
    }
  };

  const HOSTED_BASE_URL = "https://danrschley.github.io/Online-Number-Perception-Measurement-Tool/";

  function hostedPath(path) {
    return new URL(path, HOSTED_BASE_URL).toString();
  }

  const NUMEROSITY_CONDITIONS = [
    "separate_brief",
    "separate_visible",
    "joint_brief",
    "joint_visible"
  ];

  const TASK_CONFIG_MAP = {
    combined_session: hostedPath("configs/sample-combined.json"),
    numerosity_only: hostedPath("configs/numerosity-only.json"),
    numerosity_separate_brief: hostedPath("configs/numerosity-separate-brief.json"),
    numerosity_separate_visible: hostedPath("configs/numerosity-separate-visible.json"),
    numerosity_joint_brief: hostedPath("configs/numerosity-joint-brief.json"),
    numerosity_joint_visible: hostedPath("configs/numerosity-joint-visible.json"),
    proportion_only: hostedPath("configs/proportion-only.json"),
    proportion_joint_evaluation: hostedPath("configs/proportion-joint-only.json"),
    proportion_joint_evaluation_constsum: hostedPath("configs/proportion-joint-constsum.json"),
    proportion_separate_evaluation: hostedPath("configs/proportion-separate-only.json")
  };

  // Online numerical-cognition studies commonly use roughly 40-64 test trials.
  // Use 40 as the conservative default for Qualtrics deployments unless overridden.
  const DEFAULT_QUALTRICS_TRIALS = 40;
  const NUMEROSITY_RANGE_MIN = 4;
  const NUMEROSITY_RANGE_CELL_PX = 19;

  function parsePositiveInteger(value) {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    const parsed = Number.parseInt(String(value).trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  function cloneTrialSet(trialSet) {
    return deepClone(trialSet);
  }

  function cloneTrial(trial) {
    return deepClone(trial);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeDeep(base, overrides) {
    const result = Array.isArray(base) ? [...base] : { ...base };
    if (!overrides || typeof overrides !== "object") {
      return result;
    }
    Object.keys(overrides).forEach((key) => {
      const existing = result[key];
      const next = overrides[key];
      if (
        existing &&
        next &&
        typeof existing === "object" &&
        typeof next === "object" &&
        !Array.isArray(existing) &&
        !Array.isArray(next)
      ) {
        result[key] = mergeDeep(existing, next);
      } else {
        result[key] = deepClone(next);
      }
    });
    return result;
  }

  function parseJsonSafe(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function resolveTaskConfig(taskKey) {
    if (!taskKey) {
      return null;
    }
    return TASK_CONFIG_MAP[String(taskKey).trim()] || null;
  }

  function createSeededRng(seed) {
    let t = Number(seed) || 1;
    return function () {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), t | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function nextFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame((timestamp) => resolve(timestamp));
    });
  }

  async function waitRafDuration(ms) {
    const onset = await nextFrame();
    let now = onset;
    while (now - onset < ms) {
      now = await nextFrame();
    }
    return { onset, offset: now, actualDuration: now - onset };
  }

  function shuffleWithRng(items, rng) {
    const list = [...items];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value, digits) {
    const places = digits === undefined ? 4 : digits;
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
  }

  function parsePercentageInput(raw) {
    const text = String(raw || "").trim();
    if (!/^\d+(\.\d+)?$/.test(text)) {
      return null;
    }
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return null;
    }
    return value;
  }

  function parseRangeOverride(raw, fallbackMax) {
    if (raw === undefined || raw === null || raw === "") {
      return { min: NUMEROSITY_RANGE_MIN, max: fallbackMax };
    }
    const text = String(raw).trim();
    const rangeMatch = text.match(/^(\d+)\s*[-,:]\s*(\d+)$/);
    let maxValue = null;
    if (rangeMatch) {
      maxValue = Number(rangeMatch[2]);
    } else {
      maxValue = Number(text);
    }
    if (!Number.isFinite(maxValue)) {
      return { min: NUMEROSITY_RANGE_MIN, max: fallbackMax };
    }
    return {
      min: NUMEROSITY_RANGE_MIN,
      max: clamp(Math.round(maxValue), NUMEROSITY_RANGE_MIN, fallbackMax)
    };
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function isFullscreen() {
    return Boolean(document.fullscreenElement);
  }

  function getEnvironmentSnapshot() {
    return {
      browser_info: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      full_screen_status: isFullscreen()
    };
  }

  function parseQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const output = {};
    params.forEach((value, key) => {
      output[key] = value;
    });
    return output;
  }

  function normalizeParticipantId(value) {
    return String(value || "").trim();
  }

  function computeSafeNumerosityMax(config) {
    const jointWidth = (config.ui.numerosityCanvasWidth - 70 * 2 - 72) / 2;
    const jointHeight = (config.ui.numerosityCanvasHeight - 70 * 2 - 72) / 2;
    const usableWidth = jointWidth - 48;
    const usableHeight = jointHeight - 82 - 24;
    const squareCap = Math.floor(Math.min(usableWidth, usableHeight) / NUMEROSITY_RANGE_CELL_PX);
    return Math.max(NUMEROSITY_RANGE_MIN, squareCap * squareCap);
  }

  function rescaleNumerosityTrialSets(trialSets, targetMin, targetMax) {
    const originalValues = trialSets.flatMap((trialSet) =>
      trialSet.arrays.map((arrayDef) => Number(arrayDef.numerosity))
    );
    const originalMin = Math.min(...originalValues);
    const originalMax = Math.max(...originalValues);
    if (targetMin <= originalMin && targetMax >= originalMax) {
      return trialSets.map(cloneTrialSet);
    }
    const span = Math.max(1, originalMax - originalMin);
    return trialSets.map((trialSet) => {
      const nextTrialSet = cloneTrialSet(trialSet);
      nextTrialSet.arrays = nextTrialSet.arrays.map((arrayDef) => {
        const ratio = (Number(arrayDef.numerosity) - originalMin) / span;
        const scaled = targetMin + ratio * (targetMax - targetMin);
        return {
          ...arrayDef,
          numerosity: clamp(Math.round(scaled), targetMin, targetMax)
        };
      });
      return nextTrialSet;
    });
  }

  function expandNumerosityTrialSets(trialSets, desiredCount) {
    if (!desiredCount || desiredCount <= 0 || !trialSets.length) {
      return trialSets.map(cloneTrialSet);
    }
    const output = [];
    for (let index = 0; index < desiredCount; index += 1) {
      const source = cloneTrialSet(trialSets[index % trialSets.length]);
      const cycle = Math.floor(index / trialSets.length);
      if (cycle > 0) {
        source.trialSetId = `${source.trialSetId}_R${cycle + 1}`;
        source.arrays = source.arrays.map((arrayDef, arrayIndex) => ({
          ...arrayDef,
          seed: Number(arrayDef.seed) + cycle * 100000 + arrayIndex * 1000
        }));
      }
      output.push(source);
    }
    return output;
  }

  function expandTrials(trials, desiredCount) {
    if (!desiredCount || desiredCount <= 0 || !trials.length) {
      return trials.map(cloneTrial);
    }
    const output = [];
    for (let index = 0; index < desiredCount; index += 1) {
      const source = cloneTrial(trials[index % trials.length]);
      const cycle = Math.floor(index / trials.length);
      if (cycle > 0) {
        source.trial_id = `${source.trial_id || source.stimulus_id || "trial"}_R${cycle + 1}_${index + 1}`;
        source.stimulus_id = `${source.stimulus_id || source.trial_id || "stim"}_R${cycle + 1}`;
        source.random_seed = Number(source.random_seed || hashString(source.trial_id || source.stimulus_id || index)) + cycle * 100000;
      }
      output.push(source);
    }
    return output;
  }

  function deriveParityAssignment(participantId) {
    const digits = String(participantId || "").replace(/\D/g, "");
    if (digits) {
      return Number(digits[digits.length - 1]) % 2 === 0 ? "even" : "odd";
    }
    return hashString(String(participantId || "default")) % 2 === 0 ? "even" : "odd";
  }

  function csvEscape(value) {
    if (value === null || value === undefined) {
      return "";
    }
    const text = String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function rowsToCsv(rows) {
    if (!rows.length) {
      return "";
    }
    const keys = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set())
    );
    const header = keys.join(",");
    const body = rows.map((row) => keys.map((key) => csvEscape(row[key])).join(","));
    return [header, ...body].join("\n");
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function formatConditionParts(condition) {
    if (!condition) {
      return { evaluationMode: null, availabilityMode: null };
    }
    const parts = String(condition).split("_");
    return { evaluationMode: parts[0], availabilityMode: parts[1] };
  }

  function ensureLabels(labels, expected) {
    const list = labels.map((item) => item.label);
    if (list.length !== expected.length || expected.some((label) => !list.includes(label))) {
      throw new Error(`Expected labels ${expected.join(", ")} but received ${list.join(", ")}`);
    }
  }

  function validateNumerosityTrialSets(trialSets, pathLabel) {
    if (!Array.isArray(trialSets)) {
      throw new Error(`${pathLabel} must be an array`);
    }
    trialSets.forEach((trialSet, index) => {
      if (!trialSet || typeof trialSet !== "object") {
        throw new Error(`${pathLabel}[${index}] must be an object`);
      }
      if (!Array.isArray(trialSet.arrays) || trialSet.arrays.length !== 4) {
        throw new Error(`${pathLabel}[${index}] must contain exactly 4 arrays`);
      }
      ensureLabels(trialSet.arrays, ["A", "B", "C", "D"]);
      trialSet.arrays.forEach((arrayDef, arrayIndex) => {
        ["numerosity", "setType", "seed"].forEach((field) => {
          if (arrayDef[field] === undefined || arrayDef[field] === null || arrayDef[field] === "") {
            throw new Error(`${pathLabel}[${index}].arrays[${arrayIndex}] is missing ${field}`);
          }
        });
      });
    });
  }

  function sumProportions(trial) {
    return ["A", "B", "C", "D", "E"].reduce((sum, key) => sum + Number(trial[key] || 0), 0);
  }

  function validateProportionTrialList(trials, pathLabel) {
    if (!Array.isArray(trials)) {
      throw new Error(`${pathLabel} must be an array`);
    }
    trials.forEach((trial, index) => {
      if (!trial || typeof trial !== "object") {
        throw new Error(`${pathLabel}[${index}] must be an object`);
      }
      ["target_label", "format"].forEach((field) => {
        if (!trial[field]) {
          throw new Error(`${pathLabel}[${index}] is missing ${field}`);
        }
      });
      const sum = sumProportions(trial);
      if (Math.abs(sum - 1) > 0.0001) {
        throw new Error(`${pathLabel}[${index}] proportions must sum to 1. Received ${sum}`);
      }
      if (!["joint", "separate"].includes(trial.format)) {
        throw new Error(`${pathLabel}[${index}] has invalid format ${trial.format}`);
      }
      if (!["A", "B", "C", "D", "E"].includes(trial.target_label)) {
        throw new Error(`${pathLabel}[${index}] has invalid target_label ${trial.target_label}`);
      }
    });
  }

  function validateConfig(config) {
    if (!Array.isArray(config.blocks) || !config.blocks.length) {
      throw new Error("Config must include at least one block");
    }
    validateNumerosityTrialSets(
      config.taskSettings.numerosity.practiceTrialSets || [],
      "taskSettings.numerosity.practiceTrialSets"
    );
    validateNumerosityTrialSets(
      config.taskSettings.numerosity.trialSets || [],
      "taskSettings.numerosity.trialSets"
    );
    validateProportionTrialList(
      config.taskSettings.proportion.trialList || [],
      "taskSettings.proportion.trialList"
    );
  }

  class QualtricsAdapter {
    constructor(config) {
      this.config = config;
      this.api = window.Qualtrics && window.Qualtrics.SurveyEngine ? window.Qualtrics.SurveyEngine : null;
      this.store = {};
    }

    isAvailable() {
      return Boolean(this.api);
    }

    setEmbeddedData(name, value) {
      this.store[name] = value;
      if (this.api && typeof this.api.setEmbeddedData === "function") {
        this.api.setEmbeddedData(name, value);
      }
    }

    writeResults(rows, metadata) {
      const dataField = this.config.qualtrics.embeddedDataField;
      const metadataField = this.config.qualtrics.metadataField;
      const completionField = this.config.qualtrics.completionField;
      this.setEmbeddedData(dataField, JSON.stringify(rows));
      this.setEmbeddedData(metadataField, JSON.stringify(metadata));
      this.setEmbeddedData(completionField, "1");
      window.dispatchEvent(
        new CustomEvent("behavioral-experiment:complete", {
          detail: { rows, metadata }
        })
      );
    }
  }

  class DataLogger {
    constructor(sessionInfo) {
      this.sessionInfo = sessionInfo;
      this.rows = [];
      this.metadata = {
        experiment_version: sessionInfo.experimentVersion,
        date_time: nowIso(),
        counterbalancing_assignment: sessionInfo.counterbalancingAssignment || null,
        settings_used: sessionInfo.settingsUsed
      };
    }

    log(row) {
      this.rows.push({
        participant_id: this.sessionInfo.participantId,
        session_id: this.sessionInfo.sessionId,
        ...row
      });
    }

    getRows() {
      return this.rows.slice();
    }

    getMetadata() {
      return { ...this.metadata };
    }
  }

  class ScreenManager {
    constructor(root, config) {
      this.root = root;
      this.config = config;
    }

    clear() {
      this.root.innerHTML = "";
    }

    render(node) {
      this.clear();
      this.root.appendChild(node);
    }

    createScreen(className) {
      const node = document.createElement("div");
      node.className = className || "screen screen--stack";
      return node;
    }

    async showMessage(message, durationMs, extraClass) {
      const screen = this.createScreen(`screen screen--stack ${extraClass || ""}`.trim());
      const text = document.createElement("div");
      text.className = "message";
      text.textContent = message;
      screen.appendChild(text);
      this.render(screen);
      if (durationMs !== null && durationMs !== undefined) {
        await sleep(durationMs);
      }
      return screen;
    }

    async showInstructions(title, paragraphs, buttonText) {
      const screen = this.createScreen();
      const panel = document.createElement("div");
      panel.className = "panel";
      const heading = document.createElement("h1");
      heading.textContent = title;
      panel.appendChild(heading);
      paragraphs.forEach((paragraph) => {
        const p = document.createElement("p");
        p.textContent = paragraph;
        panel.appendChild(p);
      });
      const buttonRow = document.createElement("div");
      buttonRow.className = "button-row";
      const button = document.createElement("button");
      button.textContent = buttonText || "Next";
      buttonRow.appendChild(button);
      panel.appendChild(buttonRow);
      screen.appendChild(panel);
      this.render(screen);
      await waitForButton(button);
    }

    async showParticipantSetup(participantIdDefault) {
      const screen = this.createScreen();
      const panel = document.createElement("div");
      panel.className = "panel";
      panel.innerHTML = `
        <h1>Participant Setup</h1>
        <p>Enter a participant ID if one was not provided by Qualtrics or the launch URL.</p>
      `;
      const row = document.createElement("div");
      row.className = "input-row";
      const input = document.createElement("input");
      input.type = "text";
      input.value = participantIdDefault || "";
      input.placeholder = "Participant ID";
      const button = document.createElement("button");
      button.textContent = "Continue";
      const error = document.createElement("div");
      error.className = "error";
      row.appendChild(input);
      row.appendChild(button);
      panel.appendChild(row);
      panel.appendChild(error);
      screen.appendChild(panel);
      this.render(screen);
      input.focus();
      return new Promise((resolve) => {
        const submit = () => {
          const value = normalizeParticipantId(input.value);
          if (!value) {
            error.textContent = "Please enter a participant ID.";
            return;
          }
          resolve(value);
        };
        button.addEventListener("click", submit);
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            submit();
          }
        });
      });
    }

    async showEndScreen(title, message, onDownload) {
      const screen = this.createScreen();
      const panel = document.createElement("div");
      panel.className = "panel";
      const heading = document.createElement("h1");
      heading.textContent = title;
      const text = document.createElement("p");
      text.textContent = message;
      panel.appendChild(heading);
      panel.appendChild(text);
      if (onDownload) {
        const buttons = document.createElement("div");
        buttons.className = "button-row";
        const download = document.createElement("button");
        download.textContent = "Download Data";
        download.addEventListener("click", onDownload);
        buttons.appendChild(download);
        panel.appendChild(buttons);
      }
      screen.appendChild(panel);
      this.render(screen);
    }
  }

  function waitForButton(button) {
    return new Promise((resolve) => {
      button.addEventListener("click", () => resolve(), { once: true });
    });
  }

  class NumerosityRenderer {
    constructor(screenManager, config) {
      this.screenManager = screenManager;
      this.config = config;
      this.canvasWidth = config.ui.numerosityCanvasWidth;
      this.canvasHeight = config.ui.numerosityCanvasHeight;
    }

    createCanvasStage() {
      const screen = this.screenManager.createScreen("screen");
      const stage = document.createElement("div");
      stage.className = "canvas-stage";
      const canvas = document.createElement("canvas");
      canvas.className = "stimulus-canvas";
      canvas.width = this.canvasWidth * window.devicePixelRatio;
      canvas.height = this.canvasHeight * window.devicePixelRatio;
      canvas.style.width = `${this.canvasWidth}px`;
      canvas.style.height = `${this.canvasHeight}px`;
      const context = canvas.getContext("2d");
      context.scale(window.devicePixelRatio, window.devicePixelRatio);
      stage.appendChild(canvas);
      screen.appendChild(stage);
      return { screen, stage, canvas, context };
    }

    drawBackground(context) {
      context.fillStyle = this.config.ui.backgroundColor;
      context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    drawArray(context, points, label, region) {
      points.forEach((point) => {
        context.beginPath();
        context.fillStyle = this.config.ui.dotColor;
        context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        context.fill();
      });
      if (label) {
        context.fillStyle = this.config.ui.textColor;
        context.font = "bold 42px Segoe UI";
        context.fillText(label, region.x + 16, region.y + 46);
      }
    }

    renderSingle(arrayStimulus) {
      const view = this.createCanvasStage();
      this.drawBackground(view.context);
      this.drawArray(view.context, arrayStimulus.points, null, arrayStimulus.region);
      this.screenManager.render(view.screen);
      return view;
    }

    renderJoint(stimuli) {
      const view = this.createCanvasStage();
      this.drawBackground(view.context);
      stimuli.forEach((stimulus) => {
        this.drawArray(view.context, stimulus.points, stimulus.label, stimulus.region);
      });
      this.screenManager.render(view.screen);
      return view;
    }
  }

  class ProportionRenderer {
    constructor(screenManager, config) {
      this.screenManager = screenManager;
      this.config = config;
    }

    renderTrial(trial, options) {
      const screen = this.screenManager.createScreen("screen");
      const stage = document.createElement("div");
      stage.className = `bar-stage ${options.format === "joint" ? "bar-stage--joint" : "bar-stage--separate"}`;
      const heading = document.createElement("div");
      heading.className = "bar-heading";
      const title = document.createElement("h2");
      title.textContent = options.format === "joint"
        ? this.config.taskSettings.proportion.jointPrompt
        : this.config.taskSettings.proportion.separatePrompt;
      const helper = document.createElement("p");
      helper.textContent = options.format === "joint"
        ? this.config.taskSettings.proportion.jointHelperText
        : this.config.taskSettings.proportion.separateHelperText;
      heading.appendChild(title);
      heading.appendChild(helper);
      const svg = createSvgElement("svg", {
        class: "bar-svg",
        viewBox: `0 0 ${this.config.ui.proportionSvgWidth} ${this.config.ui.proportionSvgHeight}`,
        role: "img"
      });

      const palette = this.config.taskSettings.proportion.useGrayscale
        ? this.config.taskSettings.proportion.grayscalePalette
        : this.config.taskSettings.proportion.colorPalette;

      const totalWidth = this.config.ui.proportionSvgWidth - 180;
      const x0 = 90;
      const targetY = options.format === "joint" ? 260 : 200;
      const height = options.format === "joint" ? 78 : 68;
      const targetLabel = trial.target_label;
      const showLabels = options.format === "joint" || options.showTargetLabelInSeparate;

      if (options.format === "joint") {
        let cursor = x0;
        const centers = {};
        ["A", "B", "C", "D", "E"].forEach((label) => {
          const width = totalWidth * Number(trial[label]);
          createSvgElement("rect", {
            x: cursor,
            y: targetY,
            width,
            height,
            fill: palette[label] || "#DDDDDD",
            stroke: "#8A94A6",
            "stroke-width": 1.6
          }, svg);
          centers[label] = cursor + width / 2;
          cursor += width;
        });
        createSvgElement("rect", {
          x: x0,
          y: targetY,
          width: totalWidth,
          height,
          fill: "none",
          stroke: "#8590A3",
          "stroke-width": 1.5
        }, svg);

        const jointLabels = ["A", "B", "C", "D", "E"];
        const slotGap = totalWidth / (jointLabels.length - 1);
        const slotAnchors = jointLabels.reduce((map, label, index) => {
          map[label] = x0 + slotGap * index;
          return map;
        }, {});
        jointLabels.forEach((label) => {
          const labelX = slotAnchors[label];
          const topY = 92;
          const elbowY = 184;
          const labelY = 78;
          createSvgElement("line", {
            x1: labelX,
            y1: labelY + 20,
            x2: labelX,
            y2: elbowY,
            stroke: "#9AA3B2",
            "stroke-width": 2
          }, svg);
          createSvgElement("line", {
            x1: labelX,
            y1: elbowY,
            x2: centers[label],
            y2: elbowY,
            stroke: "#9AA3B2",
            "stroke-width": 2
          }, svg);
          createSvgElement("line", {
            x1: centers[label],
            y1: elbowY,
            x2: centers[label],
            y2: targetY,
            stroke: "#9AA3B2",
            "stroke-width": 2
          }, svg);
          if (showLabels) {
            createSvgElement("rect", {
              x: labelX - 18,
              y: topY - 18,
              width: 18,
              height: 18,
              fill: palette[label] || "#DDDDDD",
              stroke: "#8A94A6",
              "stroke-width": 1.2
            }, svg);
            const text = createSvgElement("text", {
              x: labelX + 10,
              y: topY - 2,
              "text-anchor": "start",
              fill: "#2A3240",
              "font-size": 32,
              "font-family": "Segoe UI, sans-serif",
              "font-weight": "600"
            }, svg);
            text.textContent = label;
          }
        });
      } else {
        const width = totalWidth * Number(trial[targetLabel]);
        createSvgElement("rect", {
          x: x0,
          y: targetY,
          width,
          height,
          fill: palette[targetLabel] || "#DDDDDD",
          stroke: "none"
        }, svg);
        createSvgElement("rect", {
          x: x0 + width,
          y: targetY,
          width: totalWidth - width,
          height,
          fill: "#FFFFFF",
          stroke: "none"
        }, svg);
        createSvgElement("rect", {
          x: x0,
          y: targetY,
          width: totalWidth,
          height,
          fill: "none",
          stroke: "#B3BCCB",
          "stroke-width": 1.5
        }, svg);
        if (showLabels) {
          const text = createSvgElement("text", {
            x: x0 + width / 2,
            y: targetY - 28,
            "text-anchor": "middle",
            fill: "#2A3240",
            "font-size": 26,
            "font-family": "Segoe UI, sans-serif",
            "font-weight": "700"
          }, svg);
          text.textContent = targetLabel;
        }
      }

      stage.appendChild(heading);
      stage.appendChild(svg);
      screen.appendChild(stage);
      this.screenManager.render(screen);
      return { screen, stage, svg };
    }
  }

  function createSvgElement(name, attrs, parent) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    if (parent) {
      parent.appendChild(element);
    }
    return element;
  }

  class ResponseManager {
    constructor(screenManager) {
      this.screenManager = screenManager;
    }

    createResponsePanel(promptText) {
      const panel = document.createElement("div");
      panel.className = "response-panel response-panel--compact";
      if (promptText) {
        const prompt = document.createElement("div");
        prompt.className = "message";
        prompt.textContent = promptText;
        panel.appendChild(prompt);
      }
      return panel;
    }

    async collectSingleIntegerResponse(promptText, submitLabel) {
      const screen = this.screenManager.createScreen();
      const panel = this.createResponsePanel(promptText);
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      input.min = "0";
      input.inputMode = "numeric";
      const button = document.createElement("button");
      button.textContent = submitLabel || "Continue";
      const error = document.createElement("div");
      error.className = "error";
      panel.appendChild(input);
      panel.appendChild(button);
      panel.appendChild(error);
      screen.appendChild(panel);
      this.screenManager.render(screen);
      input.focus();
      const start = performance.now();
      return new Promise((resolve) => {
        const submit = () => {
          const value = input.value.trim();
          if (!/^\d+$/.test(value)) {
            error.textContent = "Please enter a whole number.";
            return;
          }
          const responseTime = performance.now();
          resolve({
            response: Number(value),
            responseTime,
            reactionTimeMs: responseTime - start
          });
        };
        button.addEventListener("click", submit);
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            submit();
          }
        });
      });
    }

    async collectSingleIntegerResponseEmbedded(host, promptText, submitLabel) {
      const panel = this.createResponsePanel(promptText);
      const input = document.createElement("input");
      input.type = "number";
      input.step = "1";
      input.min = "0";
      input.inputMode = "numeric";
      const button = document.createElement("button");
      button.textContent = submitLabel || "Continue";
      const error = document.createElement("div");
      error.className = "error";
      panel.appendChild(input);
      panel.appendChild(button);
      panel.appendChild(error);
      host.appendChild(panel);
      input.focus();
      const start = performance.now();
      return new Promise((resolve) => {
        const submit = () => {
          const value = input.value.trim();
          if (!/^\d+$/.test(value)) {
            error.textContent = "Please enter a whole number.";
            return;
          }
          const responseTime = performance.now();
          resolve({
            response: Number(value),
            responseTime,
            reactionTimeMs: responseTime - start
          });
        };
        button.addEventListener("click", submit);
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            submit();
          }
        });
      });
    }

    async collectJointIntegerResponses(labels, promptText) {
      const screen = this.screenManager.createScreen();
      const panel = this.createResponsePanel(promptText);
      const grid = document.createElement("div");
      grid.className = "response-grid";
      const inputs = {};
      labels.forEach((label) => {
        const wrapper = document.createElement("div");
        wrapper.className = "response-field";
        const caption = document.createElement("label");
        caption.textContent = label;
        const input = document.createElement("input");
        input.type = "number";
        input.step = "1";
        input.min = "0";
        input.inputMode = "numeric";
        wrapper.appendChild(caption);
        wrapper.appendChild(input);
        inputs[label] = input;
        grid.appendChild(wrapper);
      });
      const button = document.createElement("button");
      button.textContent = "Continue";
      const error = document.createElement("div");
      error.className = "error";
      panel.appendChild(grid);
      panel.appendChild(button);
      panel.appendChild(error);
      screen.appendChild(panel);
      this.screenManager.render(screen);
      inputs[labels[0]].focus();
      const start = performance.now();
      return new Promise((resolve) => {
        const submit = () => {
          const output = {};
          for (const label of labels) {
            const value = inputs[label].value.trim();
            if (!/^\d+$/.test(value)) {
              error.textContent = "Please fill every field with a whole number.";
              return;
            }
            output[label] = Number(value);
          }
          const responseTime = performance.now();
          resolve({
            responses: output,
            responseTime,
            reactionTimeMs: responseTime - start
          });
        };
        button.addEventListener("click", submit);
        panel.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            submit();
          }
        });
      });
    }

    async collectJointIntegerResponsesEmbedded(host, labels, promptText) {
      const panel = this.createResponsePanel(promptText);
      const grid = document.createElement("div");
      grid.className = "response-grid";
      const inputs = {};
      labels.forEach((label) => {
        const wrapper = document.createElement("div");
        wrapper.className = "response-field";
        const caption = document.createElement("label");
        caption.textContent = label;
        const input = document.createElement("input");
        input.type = "number";
        input.step = "1";
        input.min = "0";
        input.inputMode = "numeric";
        wrapper.appendChild(caption);
        wrapper.appendChild(input);
        inputs[label] = input;
        grid.appendChild(wrapper);
      });
      const button = document.createElement("button");
      button.textContent = "Continue";
      const error = document.createElement("div");
      error.className = "error";
      panel.appendChild(grid);
      panel.appendChild(button);
      panel.appendChild(error);
      host.appendChild(panel);
      inputs[labels[0]].focus();
      const start = performance.now();
      return new Promise((resolve) => {
        const submit = () => {
          const output = {};
          for (const label of labels) {
            const value = inputs[label].value.trim();
            if (!/^\d+$/.test(value)) {
              error.textContent = "Please fill every field with a whole number.";
              return;
            }
            output[label] = Number(value);
          }
          const responseTime = performance.now();
          resolve({
            responses: output,
            responseTime,
            reactionTimeMs: responseTime - start
          });
        };
        button.addEventListener("click", submit);
        panel.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            submit();
          }
        });
      });
    }

    async collectEstimateResponse(promptText, responseMethod) {
      const screen = this.screenManager.createScreen();
      const panel = this.createResponsePanel(promptText);
      const readout = document.createElement("div");
      readout.className = "value-readout";
      const button = document.createElement("button");
      button.textContent = "Continue";
      const error = document.createElement("div");
      error.className = "error";
      let control;
      if (responseMethod === "slider") {
        control = document.createElement("input");
        control.type = "range";
        control.min = "0";
        control.max = "100";
        control.step = "1";
        control.value = "50";
        readout.textContent = "50";
        control.addEventListener("input", () => {
          readout.textContent = control.value;
        });
      } else {
        control = document.createElement("input");
        control.type = "number";
        control.min = "0";
        control.max = "100";
        control.step = "1";
        control.inputMode = "numeric";
        readout.textContent = "Enter a value from 0 to 100";
      }
      panel.appendChild(control);
      panel.appendChild(readout);
      panel.appendChild(button);
      panel.appendChild(error);
      screen.appendChild(panel);
      this.screenManager.render(screen);
      control.focus();
      const start = performance.now();
      return new Promise((resolve) => {
        const submit = () => {
          const raw = control.value.trim();
          if (!/^\d+$/.test(raw)) {
            error.textContent = "Please enter a whole number from 0 to 100.";
            return;
          }
          const value = Number(raw);
          if (value < 0 || value > 100) {
            error.textContent = "Value must be between 0 and 100.";
            return;
          }
          const responseTime = performance.now();
          resolve({
            response: value,
            responseNormalized: round(value / 100, 4),
            responseTime,
            reactionTimeMs: responseTime - start
          });
        };
        button.addEventListener("click", submit);
        panel.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            submit();
          }
        });
      });
    }

    async collectEstimateResponseEmbedded(host, promptText, responseMethod) {
      const panel = this.createResponsePanel(promptText);
      const readout = document.createElement("div");
      readout.className = "value-readout";
      const button = document.createElement("button");
      button.textContent = "Continue";
      const error = document.createElement("div");
      error.className = "error";
      let control;
      if (responseMethod === "slider") {
        control = document.createElement("input");
        control.type = "range";
        control.min = "0";
        control.max = "100";
        control.step = "1";
        control.value = "50";
        readout.textContent = "50";
        control.addEventListener("input", () => {
          readout.textContent = control.value;
        });
      } else {
        control = document.createElement("input");
        control.type = "number";
        control.min = "0";
        control.max = "100";
        control.step = "1";
        control.inputMode = "numeric";
        readout.textContent = "Enter a value from 0 to 100";
      }
      panel.appendChild(control);
      panel.appendChild(readout);
      panel.appendChild(button);
      panel.appendChild(error);
      host.appendChild(panel);
      control.focus();
      const start = performance.now();
      return new Promise((resolve) => {
        const submit = () => {
          const raw = control.value.trim();
          if (!/^\d+$/.test(raw)) {
            error.textContent = "Please enter a whole number from 0 to 100.";
            return;
          }
          const value = Number(raw);
          if (value < 0 || value > 100) {
            error.textContent = "Value must be between 0 and 100.";
            return;
          }
          const responseTime = performance.now();
          resolve({
            response: value,
            responseNormalized: round(value / 100, 4),
            responseTime,
            reactionTimeMs: responseTime - start
          });
        };
        button.addEventListener("click", submit);
        panel.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            submit();
          }
        });
      });
    }

    async collectPercentageResponseEmbedded(host, promptText) {
      const panel = this.createResponsePanel(promptText);
      const row = document.createElement("div");
      row.className = "percent-input-row";
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "100";
      input.step = "0.01";
      input.inputMode = "decimal";
      const unit = document.createElement("span");
      unit.className = "percent-unit";
      unit.textContent = "% of bar";
      row.appendChild(input);
      row.appendChild(unit);
      const button = document.createElement("button");
      button.textContent = "Continue";
      const error = document.createElement("div");
      error.className = "error";
      panel.appendChild(row);
      panel.appendChild(button);
      panel.appendChild(error);
      host.appendChild(panel);
      input.focus();
      const start = performance.now();
      return new Promise((resolve) => {
        const submit = () => {
          const value = parsePercentageInput(input.value);
          if (value === null) {
            error.textContent = "Please enter a number from 0 to 100. Decimals are allowed.";
            return;
          }
          const responseTime = performance.now();
          resolve({
            response: value,
            responseNormalized: round(value / 100, 4),
            responseTime,
            reactionTimeMs: responseTime - start
          });
        };
        button.addEventListener("click", submit);
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            submit();
          }
        });
      });
    }

    async collectJointPercentageResponsesEmbedded(host, labels, promptText, options) {
      const settings = options || {};
      const panel = this.createResponsePanel(promptText);
      const grid = document.createElement("div");
      grid.className = "percentage-grid";
      const inputs = {};
      const totalWrap = document.createElement("div");
      totalWrap.className = "percentage-total-wrap";
      const totalLabel = document.createElement("div");
      totalLabel.className = "percentage-total-label";
      totalLabel.textContent = "Total";
      const totalValue = document.createElement("div");
      totalValue.className = "percentage-total-value";
      totalValue.textContent = "0";
      totalWrap.appendChild(totalLabel);
      totalWrap.appendChild(totalValue);

      const updateTotal = () => {
        const sum = labels.reduce((total, label) => {
          const value = parseFloat(inputs[label].value);
          return total + (Number.isFinite(value) ? value : 0);
        }, 0);
        totalValue.textContent = round(sum, 2).toFixed(2).replace(/\.00$/, "");
      };

      labels.forEach((label) => {
        const row = document.createElement("div");
        row.className = "percentage-row";
        const caption = document.createElement("label");
        caption.textContent = `Block ${label}`;
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "100";
        input.step = "0.01";
        input.inputMode = "decimal";
        input.addEventListener("input", updateTotal);
        const suffix = document.createElement("div");
        suffix.className = "percentage-suffix";
        suffix.textContent = "% of bar chart";
        row.appendChild(caption);
        row.appendChild(input);
        row.appendChild(suffix);
        grid.appendChild(row);
        inputs[label] = input;
      });

      const button = document.createElement("button");
      button.textContent = "Continue";
      const error = document.createElement("div");
      error.className = "error";
      panel.appendChild(grid);
      if (settings.showTotalBox !== false) {
        panel.appendChild(totalWrap);
      }
      panel.appendChild(button);
      panel.appendChild(error);
      host.appendChild(panel);
      inputs[labels[0]].focus();
      const start = performance.now();
      updateTotal();
      return new Promise((resolve) => {
        const submit = () => {
          const responses = {};
          for (const label of labels) {
            const value = parsePercentageInput(inputs[label].value);
            if (value === null) {
              error.textContent = "Please enter numbers from 0 to 100 for all blocks. Decimals are allowed.";
              return;
            }
            responses[label] = value;
          }
          const total = labels.reduce((sum, label) => sum + responses[label], 0);
          if (settings.requireTotal100 !== false && Math.abs(total - 100) > 0.5) {
            error.textContent = "Please make the five percentages total 100.";
            return;
          }
          const responseTime = performance.now();
          resolve({
            responses,
            total: round(total, 2),
            responseTime,
            reactionTimeMs: responseTime - start
          });
        };
        button.addEventListener("click", submit);
        panel.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            submit();
          }
        });
      });
    }
  }

  class NumerosityStimulusGenerator {
    constructor(config) {
      this.config = config;
      this.canvasWidth = config.ui.numerosityCanvasWidth;
      this.canvasHeight = config.ui.numerosityCanvasHeight;
    }

    generateArray(arrayDef, region) {
      const numerosity = Number(arrayDef.numerosity);
      const setType = Number(arrayDef.setType);
      const rng = createSeededRng(Number(arrayDef.seed));
      const hasLabelReserve = Boolean(arrayDef.label && region.labelReservedTop);
      let regionBox = {
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height
      };
      if (hasLabelReserve) {
        regionBox = {
          x: region.x + 24,
          y: region.y + region.labelReservedTop,
          width: region.width - 48,
          height: region.height - region.labelReservedTop - 24
        };
      }
      const area = regionBox.width * regionBox.height;
      const baseRadius = Math.max(8, Math.min(24, Math.sqrt(area / 3600)));
      const radius =
        setType === 1
          ? clamp(baseRadius * Math.sqrt(24 / Math.max(numerosity, 1)), 5, 24)
          : clamp(baseRadius, 8, 22);
      const maxAttempts = numerosity * 250;
      const points = [];
      if (setType === 3) {
        const scale = clamp(Math.sqrt(numerosity / 30), 0.55, 1.2);
        const width = regionBox.width * scale;
        const height = regionBox.height * scale;
        regionBox = {
          x: regionBox.x + (regionBox.width - width) / 2,
          y: regionBox.y + (regionBox.height - height) / 2,
          width,
          height
        };
      }
      const cols = Math.max(4, Math.ceil(Math.sqrt(numerosity)));
      const rows = Math.max(4, Math.ceil(numerosity / cols));
      const cellWidth = regionBox.width / cols;
      const cellHeight = regionBox.height / rows;
      const positions = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          positions.push({ row, col });
        }
      }
      const shuffled = shuffleWithRng(positions, rng).slice(0, numerosity);
      shuffled.forEach((gridCell) => {
        let accepted = false;
        let attempt = 0;
        while (!accepted && attempt < maxAttempts) {
          attempt += 1;
          const jitterX = (rng() - 0.5) * cellWidth * 0.45;
          const jitterY = (rng() - 0.5) * cellHeight * 0.45;
          const x = regionBox.x + (gridCell.col + 0.5) * cellWidth + jitterX;
          const y = regionBox.y + (gridCell.row + 0.5) * cellHeight + jitterY;
          if (
            x - radius < regionBox.x ||
            x + radius > regionBox.x + regionBox.width ||
            y - radius < regionBox.y ||
            y + radius > regionBox.y + regionBox.height
          ) {
            continue;
          }
          const overlaps = points.some((point) => {
            const dx = point.x - x;
            const dy = point.y - y;
            return Math.sqrt(dx * dx + dy * dy) < point.radius + radius + 2;
          });
          if (!overlaps) {
            points.push({ x, y, radius });
            accepted = true;
          }
        }
      });
      if (points.length !== numerosity) {
        throw new Error(`Could not place ${numerosity} non-overlapping dots for seed ${arrayDef.seed}`);
      }
      return {
        label: arrayDef.label,
        numerosity,
        setType,
        seed: arrayDef.seed,
        points,
        region
      };
    }

    createRegion(condition, label) {
      if (condition.startsWith("joint")) {
        const margin = 70;
        const gap = 72;
        const width = (this.canvasWidth - margin * 2 - gap) / 2;
        const height = (this.canvasHeight - margin * 2 - gap) / 2;
        const slots = {
          A: { x: margin, y: margin, width, height, labelReservedTop: 82 },
          B: { x: margin + width + gap, y: margin, width, height, labelReservedTop: 82 },
          C: { x: margin, y: margin + height + gap, width, height, labelReservedTop: 82 },
          D: { x: margin + width + gap, y: margin + height + gap, width, height, labelReservedTop: 82 }
        };
        return slots[label];
      }
      return {
        x: 140,
        y: 100,
        width: this.canvasWidth - 280,
        height: this.canvasHeight - 200
      };
    }
  }

  class ProportionTrialFactory {
    constructor(config) {
      this.config = config;
    }

    buildTrialPool() {
      const explicitTrials = this.config.taskSettings.proportion.trialList || [];
      const generated = this.generateProceduralTrials();
      return [...explicitTrials, ...generated];
    }

    generateProceduralTrials() {
      const generator = this.config.taskSettings.proportion.proceduralGenerator;
      if (!generator) {
        return [];
      }
      const rng = createSeededRng(generator.seed || 1);
      const labels = ["A", "B", "C", "D", "E"];
      const formats = generator.formats || ["joint", "separate"];
      const targetBins = generator.targetBins || [
        [0.05, 0.15],
        [0.16, 0.3],
        [0.31, 0.45]
      ];
      const minChunk = generator.minChunk || 0.05;
      const maxChunk = generator.maxChunk || 0.55;
      const trialsPerBin = generator.trialsPerBin || 2;
      const output = [];
      const fingerprints = new Set();
      let trialIndex = 0;

      formats.forEach((format) => {
        targetBins.forEach((bin, binIndex) => {
          labels.forEach((targetLabel, labelIndex) => {
            for (let repeat = 0; repeat < trialsPerBin; repeat += 1) {
              let safety = 0;
              while (safety < 500) {
                safety += 1;
                const target = round(bin[0] + (bin[1] - bin[0]) * rng(), 3);
                const remainder = round(1 - target, 3);
                const otherLabels = labels.filter((label) => label !== targetLabel);
                const raw = otherLabels.map(() => rng());
                const rawSum = raw.reduce((sum, value) => sum + value, 0);
                const scaled = raw.map((value) => round((value / rawSum) * remainder, 3));
                const corrected = scaled.slice();
                const scaledSum = corrected.reduce((sum, value) => sum + value, 0);
                corrected[corrected.length - 1] = round(corrected[corrected.length - 1] + (remainder - scaledSum), 3);
                if (corrected.some((value) => value < minChunk || value > maxChunk)) {
                  continue;
                }
                const trial = {
                  trial_id: `proc_${format}_${binIndex}_${labelIndex}_${repeat}_${trialIndex}`,
                  stimulus_id: `proc_${format}_${binIndex}_${labelIndex}`,
                  block: null,
                  format,
                  target_label: targetLabel
                };
                trial[targetLabel] = target;
                otherLabels.forEach((label, index) => {
                  trial[label] = corrected[index];
                });
                const fingerprint = labels.map((label) => `${label}:${trial[label]}`).join("|");
                if (fingerprints.has(fingerprint)) {
                  continue;
                }
                if (Math.abs(sumProportions(trial) - 1) > 0.0001) {
                  continue;
                }
                fingerprints.add(fingerprint);
                output.push(trial);
                trialIndex += 1;
                break;
              }
            }
          });
        });
      });
      return output;
    }
  }

  class ExperimentController {
    constructor({ mountEl, participantId, sessionId, config, qualtricsAdapter, embeddedAssignments }) {
      this.mountEl = mountEl;
      this.config = mergeDeep(DEFAULT_CONFIG, config || {});
      validateConfig(this.config);
      this.queryParams = parseQueryParams();
      this.qualtricsAdapter = qualtricsAdapter || new QualtricsAdapter(this.config);
      this.embeddedAssignments = embeddedAssignments || {};
      this.screenManager = new ScreenManager(mountEl, this.config);
      this.responseManager = new ResponseManager(this.screenManager);
      this.numerosityRenderer = new NumerosityRenderer(this.screenManager, this.config);
      this.proportionRenderer = new ProportionRenderer(this.screenManager, this.config);
      this.numerosityStimulusGenerator = new NumerosityStimulusGenerator(this.config);
      this.proportionTrialFactory = new ProportionTrialFactory(this.config);
      this.isQualtricsRuntime = this.config.qualtrics.enabled && this.qualtricsAdapter.isAvailable();
      this.safeNumerosityMax = computeSafeNumerosityMax(this.config);
      this.participantId = normalizeParticipantId(
        participantId ||
          this.embeddedAssignments.participantId ||
          this.queryParams.participantId ||
          window.__BEHAVIORAL_EXPERIMENT_PARTICIPANT_ID
      );
      this.sessionId =
        sessionId ||
        this.embeddedAssignments.sessionId ||
        this.queryParams.sessionId ||
        `session-${Date.now()}`;
      if (this.mountEl && this.mountEl.classList) {
        this.mountEl.classList.add("behavioral-experiment-root");
        if (this.isQualtricsRuntime) {
          this.mountEl.classList.add("qualtrics-embed");
        }
      }
      this.counterbalancingAssignment =
        this.embeddedAssignments.counterbalancingAssignment ||
        this.queryParams.counterbalancingAssignment ||
        deriveParityAssignment(this.participantId || this.sessionId);
      this.requestedTrialCount =
        parsePositiveInteger(this.embeddedAssignments.numberOfTrials) ||
        parsePositiveInteger(this.embeddedAssignments.number_of_trials) ||
        parsePositiveInteger(this.queryParams.number_of_trials) ||
        (this.isQualtricsRuntime ? DEFAULT_QUALTRICS_TRIALS : null);
      this.requestedNumerosityRange = parseRangeOverride(
        this.embeddedAssignments.numerosityRange ||
          this.embeddedAssignments.numerosity_range ||
          this.queryParams.numerosity_range,
        this.safeNumerosityMax
      );
      this.requestedBriefDisplayMs =
        parsePositiveInteger(this.embeddedAssignments.briefDisplayMs) ||
        parsePositiveInteger(this.embeddedAssignments.brief_display_ms) ||
        parsePositiveInteger(this.queryParams.brief_display_ms) ||
        null;
      if (this.requestedBriefDisplayMs) {
        this.config.timing.briefDisplayMs = this.requestedBriefDisplayMs;
      }
      this.logger = new DataLogger({
        participantId: this.participantId || null,
        sessionId: this.sessionId,
        experimentVersion: this.config.experiment.version,
        counterbalancingAssignment: this.counterbalancingAssignment,
        settingsUsed: this.config
      });
      this.logger.metadata.qualtrics_overrides = {
        task: this.embeddedAssignments.task || this.queryParams.task || null,
        number_of_trials: this.requestedTrialCount,
        numerosity_range_min: this.requestedNumerosityRange.min,
        numerosity_range_max: this.requestedNumerosityRange.max,
        numerosity_range_safe_max: this.safeNumerosityMax,
        brief_display_ms: this.requestedBriefDisplayMs || this.config.timing.briefDisplayMs
      };
      this.globalTrialIndex = 0;
      this.proportionTrialPool = this.proportionTrialFactory.buildTrialPool();
    }

    async run() {
      if (!this.participantId && this.isQualtricsRuntime) {
        this.participantId = this.sessionId;
        this.logger.sessionInfo.participantId = this.participantId;
      }
      // Participant entry is intentionally disabled for now so Qualtrics owns identity handling.
      // else if (!this.participantId && this.config.ui.allowParticipantIdEntry) {
      //   this.participantId = await this.screenManager.showParticipantSetup("");
      //   this.logger.sessionInfo.participantId = this.participantId;
      // }
      await this.showInstructions();
      const blocks = this.resolveBlocks();
      for (let index = 0; index < blocks.length; index += 1) {
        await this.runBlock(blocks[index], index);
      }
      this.finish();
    }

    async showInstructions() {
      const paragraphs = [
        ...this.config.experiment.instructionsText,
        ...(this.config.ui.showFullscreenPrompt
          ? ["Full-screen mode is recommended for best display consistency."]
          : [])
      ];
      await this.screenManager.showInstructions(
        this.config.experiment.instructionsTitle,
        paragraphs,
        "Begin"
      );
    }

    resolveBlocks() {
      const blocks = this.config.blocks.map((block) => ({ ...block }));
      if (blocks.some((block) => block.counterbalanceGroup)) {
        const parity = this.counterbalancingAssignment;
        return blocks
          .filter((block) => {
            if (!block.counterbalanceGroup || block.counterbalanceGroup === "all") {
              return true;
            }
            if (Array.isArray(block.counterbalanceGroup)) {
              return block.counterbalanceGroup.includes(parity);
            }
            return String(block.counterbalanceGroup) === parity;
          })
          .sort((a, b) => (a.order || 0) - (b.order || 0));
      }
      return blocks.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    async runBlock(block, blockIndex) {
      if (block.instructionsTitle || block.instructionsText) {
        await this.screenManager.showInstructions(
          block.instructionsTitle || block.name,
          block.instructionsText || [],
          "Continue"
        );
      }
      if (block.breakMessage) {
        await this.screenManager.showInstructions(
          block.name || "Break",
          [block.breakMessage],
          "Continue"
        );
      }
      if (block.taskFamily === "numerosity") {
        await this.runNumerosityBlock(block, blockIndex);
      } else if (block.taskFamily === "proportion") {
        await this.runProportionBlock(block, blockIndex);
      } else {
        throw new Error(`Unsupported task family ${block.taskFamily}`);
      }
    }

    resolveNumerosityCondition(block) {
      const assigned =
        block.condition ||
        this.embeddedAssignments.condition ||
        this.queryParams.condition ||
        null;
      if (assigned) {
        if (!NUMEROSITY_CONDITIONS.includes(assigned)) {
          throw new Error(`Invalid numerosity condition ${assigned}`);
        }
        return assigned;
      }
      if (this.config.taskSettings.numerosity.randomizeConditionWhenMissing) {
        const rng = createSeededRng(hashString(`${this.participantId}-${this.sessionId}-condition`));
        return NUMEROSITY_CONDITIONS[Math.floor(rng() * NUMEROSITY_CONDITIONS.length)];
      }
      return "separate_brief";
    }

    getNumerosityTrialSets(sourceKey) {
      const source = this.config.taskSettings.numerosity[sourceKey];
      if (!Array.isArray(source)) {
        throw new Error(`Numerosity source ${sourceKey} is not defined`);
      }
      return source;
    }

    getDesiredNumerosityTrialSetCount(block) {
      if (block.practice) {
        return null;
      }
      if (block.maxTrials) {
        return block.maxTrials;
      }
      if (this.requestedTrialCount) {
        return Math.max(1, Math.ceil(this.requestedTrialCount / 4));
      }
      return null;
    }

    getProportionTrials(block) {
      let trials;
      if (Array.isArray(block.trials)) {
        trials = block.trials;
      } else {
        trials = this.proportionTrialPool.filter((trial) => {
          const matchesFormat = !block.format || trial.format === block.format;
          const matchesBlock = !block.trialFilter || trial.block === block.trialFilter;
          return matchesFormat && matchesBlock;
        });
      }
      const desiredCount = block.practice ? block.maxTrials : (this.requestedTrialCount || block.maxTrials || null);
      if (desiredCount) {
        trials = expandTrials(trials, desiredCount);
        const rng = createSeededRng(hashString(`${this.participantId}-${block.name}`));
        trials = shuffleWithRng(trials, rng).slice(0, desiredCount);
      }
      if (block.randomize !== false) {
        const rng = createSeededRng(hashString(`${this.sessionId}-${block.name}-proportion-order`));
        trials = shuffleWithRng(trials, rng);
      }
      return trials;
    }

    async runNumerosityBlock(block, blockIndex) {
      const condition = this.resolveNumerosityCondition(block);
      const parts = formatConditionParts(condition);
      const sourceKey = block.practice ? "practiceTrialSets" : block.trialSource || "trialSets";
      let trialSets = this.getNumerosityTrialSets(sourceKey);
      trialSets = rescaleNumerosityTrialSets(
        trialSets,
        this.requestedNumerosityRange.min,
        this.requestedNumerosityRange.max
      );
      const desiredTrialSetCount = this.getDesiredNumerosityTrialSetCount(block);
      if (desiredTrialSetCount) {
        trialSets = expandNumerosityTrialSets(trialSets, desiredTrialSetCount);
      }
      if (block.randomize !== false) {
        const rng = createSeededRng(hashString(`${this.participantId}-${block.name}-order`));
        trialSets = shuffleWithRng(trialSets, rng);
      }
      for (let trialSetIndex = 0; trialSetIndex < trialSets.length; trialSetIndex += 1) {
        const trialSet = trialSets[trialSetIndex];
        if (parts.evaluationMode === "separate") {
          await this.runSeparateNumerosityTrialSet({
            block,
            blockIndex,
            condition,
            evaluationMode: parts.evaluationMode,
            availabilityMode: parts.availabilityMode,
            trialSet,
            trialSetIndex
          });
        } else {
          await this.runJointNumerosityTrialSet({
            block,
            blockIndex,
            condition,
            evaluationMode: parts.evaluationMode,
            availabilityMode: parts.availabilityMode,
            trialSet,
            trialSetIndex
          });
        }
      }
    }

    async runSeparateNumerosityTrialSet(context) {
      for (let subtrialIndex = 0; subtrialIndex < context.trialSet.arrays.length; subtrialIndex += 1) {
        const arrayDef = context.trialSet.arrays[subtrialIndex];
        const region = this.numerosityStimulusGenerator.createRegion(context.condition, arrayDef.label);
        const stimulus = this.numerosityStimulusGenerator.generateArray(arrayDef, region);
        const trialStartTime = nowIso();
        await this.screenManager.showMessage(this.config.taskSettings.numerosity.readyText, this.config.timing.readyMs);
        if (this.config.timing.fixationEnabled) {
          await this.screenManager.showMessage("+", this.config.timing.fixationMs, "fixation");
        }
        let stimulusOnsetTime = null;
        let displayOffsetTime = null;
        let measuredDisplayDuration = null;
        if (context.availabilityMode === "brief") {
          this.numerosityRenderer.renderSingle(stimulus);
          const timing = await waitRafDuration(this.config.timing.briefDisplayMs);
          stimulusOnsetTime = timing.onset;
          displayOffsetTime = timing.offset;
          measuredDisplayDuration = timing.actualDuration;
          await this.screenManager.showMessage("", this.config.timing.blankMs);
        } else {
          const view = this.numerosityRenderer.renderSingle(stimulus);
          stimulusOnsetTime = performance.now();
          const responseInfo = await this.responseManager.collectSingleIntegerResponseEmbedded(
            view.stage,
            this.config.taskSettings.numerosity.promptSeparate
          );
          displayOffsetTime = responseInfo.responseTime;
          measuredDisplayDuration = displayOffsetTime - stimulusOnsetTime;
          this.logger.log({
            ...getEnvironmentSnapshot(),
            task_family: "numerosity",
            trial_index: this.globalTrialIndex,
            block_index: context.blockIndex,
            block_name: context.block.name,
            practice: Boolean(context.block.practice),
            condition: context.condition,
            random_seed: arrayDef.seed,
            trial_start_time: trialStartTime,
            trial_end_time: nowIso(),
            stimulus_onset_time: stimulusOnsetTime,
            response_time: responseInfo.responseTime,
            reaction_time_ms: round(responseInfo.reactionTimeMs, 2),
            timeout: false,
            evaluation_mode: context.evaluationMode,
            availability_mode: context.availabilityMode,
            trialSetId: context.trialSet.trialSetId,
            array_label: arrayDef.label,
            numerosity_true_value: arrayDef.numerosity,
            setType: arrayDef.setType,
            seed: arrayDef.seed,
            response: responseInfo.response,
            display_offset_time: displayOffsetTime,
            intended_display_duration: null,
            measured_display_duration: measuredDisplayDuration ? round(measuredDisplayDuration, 2) : null
          });
          this.globalTrialIndex += 1;
          if (this.config.timing.postResponseBlankMs > 0) {
            await this.screenManager.showMessage("", this.config.timing.postResponseBlankMs);
          }
          continue;
        }
        const responseInfo = await this.responseManager.collectSingleIntegerResponse(
          this.config.taskSettings.numerosity.promptSeparate
        );
        if (context.availabilityMode === "visible") {
          displayOffsetTime = responseInfo.responseTime;
          measuredDisplayDuration = displayOffsetTime - stimulusOnsetTime;
        }
        this.logger.log({
          ...getEnvironmentSnapshot(),
          task_family: "numerosity",
          trial_index: this.globalTrialIndex,
          block_index: context.blockIndex,
          block_name: context.block.name,
          practice: Boolean(context.block.practice),
          condition: context.condition,
          random_seed: arrayDef.seed,
          trial_start_time: trialStartTime,
          trial_end_time: nowIso(),
          stimulus_onset_time: stimulusOnsetTime,
          response_time: responseInfo.responseTime,
          reaction_time_ms: round(responseInfo.reactionTimeMs, 2),
          timeout: false,
          evaluation_mode: context.evaluationMode,
          availability_mode: context.availabilityMode,
          trialSetId: context.trialSet.trialSetId,
          array_label: arrayDef.label,
          numerosity_true_value: arrayDef.numerosity,
          setType: arrayDef.setType,
          seed: arrayDef.seed,
          response: responseInfo.response,
          display_offset_time: displayOffsetTime,
          intended_display_duration: context.availabilityMode === "brief" ? this.config.timing.briefDisplayMs : null,
          measured_display_duration: measuredDisplayDuration ? round(measuredDisplayDuration, 2) : null
        });
        this.globalTrialIndex += 1;
        if (this.config.timing.postResponseBlankMs > 0) {
          await this.screenManager.showMessage("", this.config.timing.postResponseBlankMs);
        }
      }
    }

    async runJointNumerosityTrialSet(context) {
      const stimuli = context.trialSet.arrays.map((arrayDef) => {
        const region = this.numerosityStimulusGenerator.createRegion(context.condition, arrayDef.label);
        return this.numerosityStimulusGenerator.generateArray(arrayDef, region);
      });
      const trialStartTime = nowIso();
      await this.screenManager.showMessage(this.config.taskSettings.numerosity.readyText, this.config.timing.readyMs);
      if (this.config.timing.fixationEnabled) {
        await this.screenManager.showMessage("+", this.config.timing.fixationMs, "fixation");
      }
      let stimulusOnsetTime = null;
      let displayOffsetTime = null;
      let measuredDisplayDuration = null;
      if (context.availabilityMode === "brief") {
        this.numerosityRenderer.renderJoint(stimuli);
        const timing = await waitRafDuration(this.config.timing.briefDisplayMs);
        stimulusOnsetTime = timing.onset;
        displayOffsetTime = timing.offset;
        measuredDisplayDuration = timing.actualDuration;
        await this.screenManager.showMessage("", this.config.timing.blankMs);
      } else {
        const view = this.numerosityRenderer.renderJoint(stimuli);
        stimulusOnsetTime = performance.now();
        const responseInfo = await this.responseManager.collectJointIntegerResponsesEmbedded(
          view.stage,
          ["A", "B", "C", "D"],
          this.config.taskSettings.numerosity.promptJoint
        );
        displayOffsetTime = responseInfo.responseTime;
        measuredDisplayDuration = displayOffsetTime - stimulusOnsetTime;
        context.trialSet.arrays.forEach((arrayDef) => {
          this.logger.log({
            ...getEnvironmentSnapshot(),
            task_family: "numerosity",
            trial_index: this.globalTrialIndex,
            block_index: context.blockIndex,
            block_name: context.block.name,
            practice: Boolean(context.block.practice),
            condition: context.condition,
            random_seed: arrayDef.seed,
            trial_start_time: trialStartTime,
            trial_end_time: nowIso(),
            stimulus_onset_time: stimulusOnsetTime,
            response_time: responseInfo.responseTime,
            reaction_time_ms: round(responseInfo.reactionTimeMs, 2),
            timeout: false,
            evaluation_mode: context.evaluationMode,
            availability_mode: context.availabilityMode,
            trialSetId: context.trialSet.trialSetId,
            array_label: arrayDef.label,
            numerosity_true_value: arrayDef.numerosity,
            setType: arrayDef.setType,
            seed: arrayDef.seed,
            response: responseInfo.responses[arrayDef.label],
            display_offset_time: displayOffsetTime,
            intended_display_duration: null,
            measured_display_duration: measuredDisplayDuration ? round(measuredDisplayDuration, 2) : null
          });
          this.globalTrialIndex += 1;
        });
        if (this.config.timing.postResponseBlankMs > 0) {
          await this.screenManager.showMessage("", this.config.timing.postResponseBlankMs);
        }
        return;
      }
      const responseInfo = await this.responseManager.collectJointIntegerResponses(
        ["A", "B", "C", "D"],
        this.config.taskSettings.numerosity.promptJoint
      );
      if (context.availabilityMode === "visible") {
        displayOffsetTime = responseInfo.responseTime;
        measuredDisplayDuration = displayOffsetTime - stimulusOnsetTime;
      }
      context.trialSet.arrays.forEach((arrayDef) => {
        this.logger.log({
          ...getEnvironmentSnapshot(),
          task_family: "numerosity",
          trial_index: this.globalTrialIndex,
          block_index: context.blockIndex,
          block_name: context.block.name,
          practice: Boolean(context.block.practice),
          condition: context.condition,
          random_seed: arrayDef.seed,
          trial_start_time: trialStartTime,
          trial_end_time: nowIso(),
          stimulus_onset_time: stimulusOnsetTime,
          response_time: responseInfo.responseTime,
          reaction_time_ms: round(responseInfo.reactionTimeMs, 2),
          timeout: false,
          evaluation_mode: context.evaluationMode,
          availability_mode: context.availabilityMode,
          trialSetId: context.trialSet.trialSetId,
          array_label: arrayDef.label,
          numerosity_true_value: arrayDef.numerosity,
          setType: arrayDef.setType,
          seed: arrayDef.seed,
          response: responseInfo.responses[arrayDef.label],
          display_offset_time: displayOffsetTime,
          intended_display_duration: context.availabilityMode === "brief" ? this.config.timing.briefDisplayMs : null,
          measured_display_duration: measuredDisplayDuration ? round(measuredDisplayDuration, 2) : null
        });
        this.globalTrialIndex += 1;
      });
      if (this.config.timing.postResponseBlankMs > 0) {
        await this.screenManager.showMessage("", this.config.timing.postResponseBlankMs);
      }
    }

    async runProportionBlock(block, blockIndex) {
      const trials = this.getProportionTrials(block);
      for (let trialIndex = 0; trialIndex < trials.length; trialIndex += 1) {
        await this.runSingleProportionTrial({ block, blockIndex, trial: trials[trialIndex] });
      }
    }

    async runSingleProportionTrial({ block, blockIndex, trial }) {
      const startTime = nowIso();
      const format = block.format || trial.format;
      if (this.config.timing.fixationEnabled && this.config.timing.fixationMs > 0) {
        await this.screenManager.showMessage("+", this.config.timing.fixationMs, "fixation");
      }
      const view = this.proportionRenderer.renderTrial(trial, {
        format,
        showTargetLabelInSeparate: this.config.taskSettings.proportion.showTargetLabelInSeparate
      });
      const stimulusOnset = performance.now();
      if (format === "joint") {
        const responseInfo = await this.responseManager.collectJointPercentageResponsesEmbedded(
          view.stage,
          ["A", "B", "C", "D", "E"],
          "",
          {
            showTotalBox: this.config.taskSettings.proportion.showJointTotalBox,
            requireTotal100: this.config.taskSettings.proportion.requireJointTotal100
          }
        );
        ["A", "B", "C", "D", "E"].forEach((label) => {
          const targetValue = Number(trial[label]);
          this.logger.log({
            ...getEnvironmentSnapshot(),
            task_family: "proportion",
            trial_index: this.globalTrialIndex,
            block_index: blockIndex,
            block_name: block.name,
            practice: Boolean(block.practice),
            condition: block.condition || format,
            random_seed: trial.random_seed || null,
            trial_start_time: startTime,
            trial_end_time: nowIso(),
            stimulus_onset_time: stimulusOnset,
            response_time: responseInfo.responseTime,
            reaction_time_ms: round(responseInfo.reactionTimeMs, 2),
            timeout: false,
            format,
            judgment_type: "estimate",
            target_label: label,
            A: trial.A,
            B: trial.B,
            C: trial.C,
            D: trial.D,
            E: trial.E,
            target_true_proportion: targetValue,
            displayed_target_value: round(targetValue * 100, 2),
            response: responseInfo.responses[label],
            response_normalized: round(responseInfo.responses[label] / 100, 4),
            response_method: "numeric_open",
            accuracy: null,
            stimulus_id: trial.stimulus_id || trial.trial_id || null,
            joint_total_response:
              this.config.taskSettings.proportion.showJointTotalBox !== false ? responseInfo.total : null
          });
          this.globalTrialIndex += 1;
        });
      } else {
        const responseInfo = await this.responseManager.collectPercentageResponseEmbedded(view.stage, "");
        const targetValue = Number(trial[trial.target_label]);
        this.logger.log({
          ...getEnvironmentSnapshot(),
          task_family: "proportion",
          trial_index: this.globalTrialIndex,
          block_index: blockIndex,
          block_name: block.name,
          practice: Boolean(block.practice),
          condition: block.condition || format,
          random_seed: trial.random_seed || null,
          trial_start_time: startTime,
          trial_end_time: nowIso(),
          stimulus_onset_time: stimulusOnset,
          response_time: responseInfo.responseTime,
          reaction_time_ms: round(responseInfo.reactionTimeMs, 2),
          timeout: false,
          format,
          judgment_type: "estimate",
          target_label: trial.target_label,
          A: trial.A,
          B: trial.B,
          C: trial.C,
          D: trial.D,
          E: trial.E,
          target_true_proportion: targetValue,
          displayed_target_value: round(targetValue * 100, 2),
          response: responseInfo.response,
          response_normalized: responseInfo.responseNormalized,
          response_method: "numeric_open",
          accuracy: null,
          stimulus_id: trial.stimulus_id || trial.trial_id || null
        });
        this.globalTrialIndex += 1;
      }
      if (this.config.timing.postResponseBlankMs > 0) {
        await this.screenManager.showMessage("", this.config.timing.postResponseBlankMs);
      }
    }

    finish() {
      const rows = this.logger.getRows();
      const metadata = this.logger.getMetadata();
      const runningInQualtrics = this.config.qualtrics.enabled && this.qualtricsAdapter.isAvailable();
      if (this.config.qualtrics.enabled) {
        this.qualtricsAdapter.writeResults(rows, metadata);
      }
      const doDownload = () => {
        const prefix = `${this.config.export.filePrefix}_${this.participantId || this.sessionId}`;
        if (this.config.export.downloadCsv) {
          downloadFile(`${prefix}.csv`, rowsToCsv(rows), "text/csv;charset=utf-8");
        }
        if (this.config.export.downloadJson) {
          downloadFile(
            `${prefix}.json`,
            JSON.stringify({ metadata, rows }, null, 2),
            "application/json;charset=utf-8"
          );
        }
      };
      const shouldAutoDownload =
        this.config.export.autoDownload &&
        !(runningInQualtrics && this.config.export.disableAutoDownloadInQualtrics !== false);
      if (shouldAutoDownload) {
        doDownload();
      }
      this.screenManager.showEndScreen(
        this.config.experiment.endTitle,
        this.config.experiment.endText,
        runningInQualtrics ? null : doDownload
      );
    }
  }

  async function loadConfigFromSource(configInput) {
    if (!configInput) {
      return deepClone(DEFAULT_CONFIG);
    }
    if (typeof configInput === "object") {
      return mergeDeep(DEFAULT_CONFIG, configInput);
    }
    const response = await fetch(configInput);
    if (!response.ok) {
      throw new Error(`Could not load config from ${configInput}`);
    }
    const parsed = await response.json();
    return mergeDeep(DEFAULT_CONFIG, parsed);
  }

  async function initExperiment({
    mountEl,
    participantId,
    sessionId,
    config,
    qualtricsAdapter,
    embeddedAssignments
  }) {
    const root =
      typeof mountEl === "string" ? document.querySelector(mountEl) : mountEl || document.getElementById("app");
    if (!root) {
      throw new Error("Could not find mount element");
    }
    const query = parseQueryParams();
    const inlineConfig = window.__BEHAVIORAL_EXPERIMENT_CONFIG || null;
    const queryConfig = query.configInline ? parseJsonSafe(query.configInline, null) : null;
    const assignments =
      embeddedAssignments ||
      window.__BEHAVIORAL_EXPERIMENT_ASSIGNMENTS ||
      {
        participantId: query.participantId,
        sessionId: query.sessionId,
        condition: query.condition,
        counterbalancingAssignment: query.counterbalancingAssignment,
        task: query.task,
        number_of_trials: query.number_of_trials,
        numerosity_range: query.numerosity_range,
        brief_display_ms: query.brief_display_ms
      };
    const taskConfig =
      resolveTaskConfig(assignments.task) ||
      resolveTaskConfig(query.task) ||
      null;
    const sourceConfig =
      config ||
      queryConfig ||
      inlineConfig ||
      query.config ||
      taskConfig ||
      hostedPath("configs/sample-combined.json");
    const loadedConfig = await loadConfigFromSource(sourceConfig);
    const controller = new ExperimentController({
      mountEl: root,
      participantId,
      sessionId,
      config: loadedConfig,
      qualtricsAdapter,
      embeddedAssignments: assignments
    });
    await controller.run();
    return controller;
  }

  window.initExperiment = initExperiment;
  window.BehavioralExperimentPlatform = {
    initExperiment,
    defaults: DEFAULT_CONFIG
  };

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("app");
    if (!root || window.__BEHAVIORAL_EXPERIMENT_DISABLE_AUTO_START) {
      return;
    }
    initExperiment({ mountEl: root }).catch((error) => {
      root.innerHTML = `
        <div class="screen">
          <div class="panel">
            <h1>Experiment Error</h1>
            <p>${error.message}</p>
          </div>
        </div>
      `;
      throw error;
    });
  });
})();
