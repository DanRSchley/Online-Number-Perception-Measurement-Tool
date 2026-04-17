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

Numerosity exports one row per array judgment. Joint numerosity trials still become four rows so they match separate conditions cleanly.

Proportion exports one row per trial with the target chunk metadata and normalized response.

## Qualtrics use

1. Host `index.html`, `app.js`, `styles.css`, and your config JSON somewhere Qualtrics can reach.
2. Create embedded data fields in Qualtrics for participant ID, condition assignment, and saved results.
3. Use the example in `qualtrics/qualtrics-snippet.js` as a starting point.
4. Pass condition assignment from Qualtrics for numerosity and block/session assignment as needed.

The adapter writes to:

- `experiment_data`
- `experiment_metadata`
- `experiment_complete`

These names are configurable in the JSON config.

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
