# Behavioral Experiment Platform

This project is a standalone browser-based experiment platform designed to run locally or inside Qualtrics. It supports:

- numerosity estimation with a 2 x 2 `separate/joint` x `brief/visible` design
- proportion judgments with `joint/separate` bar displays and estimate-mode responses
- shared configuration, timing, logging, export, and Qualtrics handoff

## Files

- `index.html`
- `app.js`
- `styles.css`
- `Behavioral Experiment Platform Instructions.docx`
- `configs/sample-combined.json`
- `configs/numerosity-only.json`
- `configs/proportion-only.json`
- `trials/sample-proportion-trials.json`
- `qualtrics/qualtrics-snippet.js`

The Word guide `Behavioral Experiment Platform Instructions.docx` contains step-by-step usage notes for local running, internal configuration, and Qualtrics integration.

## Running locally

Because this is a browser app that loads JSON configs, run it from a local web server rather than double-clicking the HTML file.

Simple PowerShell option:

```powershell
Set-Location "C:\Users\Schley\Erasmus Universiteit Rotterdam Dropbox\Dan Schley\Non-shared Research files\Ongoing\JustDan\ProportionCalibration\Online Tool"
python -m http.server 8000
```

Then open:

- `http://localhost:8000/`
- `http://localhost:8000/?config=./configs/numerosity-only.json`
- `http://localhost:8000/?config=./configs/proportion-only.json`

## Public API

The browser global `window.initExperiment()` starts the experiment.

```js
window.initExperiment({
  mountEl: "#app",
  participantId: "P001",
  sessionId: "S001",
  config: "./configs/sample-combined.json",
  embeddedAssignments: {
    condition: "joint_brief",
    counterbalancingAssignment: "even"
  }
});
```

`config` may be a path to a JSON config file or an inline config object.

## Config structure

Top-level sections:

- `experiment`
- `ui`
- `timing`
- `export`
- `qualtrics`
- `blocks`
- `taskSettings.numerosity`
- `taskSettings.proportion`

### Numerosity config

Numerosity trial-sets must live in:

- `taskSettings.numerosity.practiceTrialSets`
- `taskSettings.numerosity.trialSets`

Each trial-set must contain exactly four arrays labeled `A`, `B`, `C`, and `D`.

Supported conditions:

- `separate_brief`
- `separate_visible`
- `joint_brief`
- `joint_visible`

### Proportion config

Proportion trials can come from:

- `taskSettings.proportion.trialList`
- `taskSettings.proportion.proceduralGenerator`

Each proportion trial includes:

- `trial_id`
- `format`
- `target_label`
- `A`, `B`, `C`, `D`, `E`

All five proportions must sum to `1`.

Supported response method in the current build:

- `numeric`

## Data export

At the end of the session the app can:

- auto-download CSV
- auto-download JSON
- write serialized rows and metadata into Qualtrics embedded data fields
- suppress local downloads automatically when running inside Qualtrics

Numerosity exports one row per array judgment. Joint numerosity trials still become four rows so they match separate conditions cleanly.

Proportion separate trials export one row per displayed target. Joint proportion trials export one row per labeled block `A-E` for each bar stimulus.

## Qualtrics use

1. Host `index.html`, `app.js`, `styles.css`, and your config JSON somewhere Qualtrics can reach.
2. Create embedded data fields in Qualtrics for participant ID, task assignment, and saved results.
3. Use the example in `qualtrics/qualtrics-snippet.js` as a starting point.
4. Pass the desired task with one embedded-data value such as `task = numerosity_separate_brief`, `task = proportion_joint_evaluation`, or `task = proportion_joint_evaluation_constsum`.
5. In Qualtrics, the app now suppresses the participant-ID entry screen and uses the Qualtrics session/response identifier automatically when no explicit `participant_id` field is supplied.
6. For the Qualtrics question HTML, use only `<div id="behavioral-experiment-root"></div>` so the task can take over the full question container cleanly.
7. If you update `app.js` and Qualtrics still appears to use an older version, add a temporary query suffix to the script URL in the survey question, such as `app.js?v=20260417c`, then hard refresh the preview with `Ctrl+F5`.
8. Survey Flow can also control:
   - `number_of_trials`
   - `numerosity_range`
   - `brief_display_ms`

Behavior of the extra Qualtrics fields:

- `number_of_trials`: default is `40` in Qualtrics if not supplied. This is a conservative online default based on common 40-64 trial counts in numerical-cognition tasks.
- `numerosity_range`: interpreted as the maximum numerosity to use, with a fixed lower bound of `4`. The app clamps this at a computed safe upper limit of `144` for the joint-visible dot layout.
- `brief_display_ms`: overrides the brief dot-presentation duration for `separate_brief` and `joint_brief`.

The adapter writes to:

- `experiment_data_json`
- `experiment_metadata_json`
- `experiment_complete`

These names are configurable in the JSON config.

Supported task keys for Survey Flow:

- `combined_session`
- `numerosity_only`
- `numerosity_separate_brief`
- `numerosity_separate_visible`
- `numerosity_joint_brief`
- `numerosity_joint_visible`
- `proportion_only`
- `proportion_joint_evaluation`
- `proportion_joint_evaluation_constsum`
- `proportion_separate_evaluation`

## Current scope

Implemented now:

- shared experiment controller
- shared config validation
- numerosity task with all four conditions
- proportion task with `joint/separate` percentage-entry mode
- open-ended numeric percentage responses
- Qualtrics embedded-data adapter
- local CSV/JSON export
- sample configs and sample trial file

Planned extension points already left in place:

- compare/category proportion judgments
- CSV trial-file loading
- resume interrupted sessions
- server POST saving
- richer feedback and attention checks

## Notes

- The app is dependency-free and does not require Node or npm.
- Numerosity uses canvas rendering and seeded dot generation.
- Proportion uses SVG so bars stay crisp and consistently scaled.
- Timing uses `performance.now()` and requestAnimationFrame-based display windows for brief numerosity presentations.
