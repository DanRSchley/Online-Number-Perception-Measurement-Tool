# Behavioral Experiment Platform

This project is a browser-based task platform for numerosity and proportion judgments. It can run:

- locally in a browser
- inside Qualtrics
- with either static JSON configs or task-key-based runtime overrides

## What It Supports

- numerosity estimation
  - `separate_brief`
  - `separate_visible`
  - `joint_brief`
  - `joint_visible`
- proportion estimation
  - `proportion_separate_evaluation`
  - `proportion_joint_evaluation`
  - `proportion_joint_evaluation_constsum`
- one practice round before every task block
- Qualtrics embedded-data handoff
- CSV and JSON export when run locally

## Main Files

- `index.html`
- `app.js`
- `styles.css`
- `qualtrics/qualtrics-snippet.js`
- `configs/*.json`
- `Behavioral Experiment Platform Instructions v2.docx`
- `Qualtrics Task Setup Guide v4.docx`

## Running Locally

Run a local web server from PowerShell:

```powershell
Set-Location "C:\Users\Schley\Erasmus Universiteit Rotterdam Dropbox\Dan Schley\Non-shared Research files\Ongoing\JustDan\ProportionCalibration\Online Tool"
py -m http.server 8000
```

Then open:

- [http://localhost:8000/](http://localhost:8000/)
- [http://localhost:8000/?task=numerosity_joint_visible&number_of_estimates=12&number_of_arrays=4&numerosity_range=10-60](http://localhost:8000/?task=numerosity_joint_visible&number_of_estimates=12&number_of_arrays=4&numerosity_range=10-60)
- [http://localhost:8000/?task=proportion_joint_evaluation&number_of_estimates=24&number_of_boxes=8](http://localhost:8000/?task=proportion_joint_evaluation&number_of_estimates=24&number_of_boxes=8)

Important:

- do not open `index.html` directly with `file://`
- keep DevTools open and check `Disable cache` when testing updated local assets

## Public API

The app is started through:

```js
window.initExperiment({
  mountEl: "#app",
  participantId: "P001",
  sessionId: "S001",
  config: "./configs/sample-combined.json",
  embeddedAssignments: {
    task: "numerosity_joint_visible",
    counterbalancingAssignment: "even",
    numberOfEstimates: 24,
    numberOfArrays: 4,
    numerosityRange: "10-80"
  }
});
```

`config` can be:

- a JSON config path
- an inline config object
- omitted, in which case task-key loading and defaults are used

## Runtime Controls

The current participant-facing control names are:

- `task`
- `participant_id`
- `counterbalance_assignment`
- `number_of_estimates`
- `number_of_arrays`
- `number_of_boxes`
- `numerosity_range`
- `brief_display_ms`

The app still accepts some legacy aliases for backward compatibility, including:

- `number_of_trials`
- camelCase equivalents such as `numberOfEstimates`

### Meaning Of Each Control

- `task`
  - selects the task version to run
- `participant_id`
  - optional external participant identifier
  - if omitted in Qualtrics, the app falls back to the Qualtrics response/session identifier
- `counterbalance_assignment`
  - controls within-person order mappings such as whether joint proportion uses `A = smallest` or `A = largest`
- `number_of_estimates`
  - the participant-facing workload setting
  - for joint tasks, the app converts this into fewer screens by dividing by the number of groups or boxes and rounding up
- `number_of_arrays`
  - numerosity joint-task control
  - allowed values: `2`, `4`, `6`
- `number_of_boxes`
  - joint proportion control
  - allowed values: `2` through `10`
- `numerosity_range`
  - explicit range such as `10-80`
  - single-value shorthand such as `40` means `10-40` by default
- `brief_display_ms`
  - brief numerosity display duration override in milliseconds

### Current Defaults

- `number_of_estimates`
  - `40` in Qualtrics when not supplied
- `number_of_arrays`
  - `4`
- `number_of_boxes`
  - `5`
- `numerosity_range`
  - `10-100` unless the safe upper bound for the current array layout is lower

## Task Keys

Supported task keys:

- `combined_session`
- `numerosity_only`
- `numerosity_separate_brief`
- `numerosity_separate_visible`
- `numerosity_joint_brief`
- `numerosity_joint_visible`
- `proportion_only`
- `proportion_separate_evaluation`
- `proportion_joint_evaluation`
- `proportion_joint_evaluation_constsum`

## Practice Structure

Every task block begins with one practice round.

- the practice round is visually labeled `Practice Round` or `Practice Trial`
- practice rows are logged with `practice = true`
- practice stimuli are sampled without replacement from the scored pool logic, so the same item should not immediately reappear as a counted item

## Data Logging

### Qualtrics output fields

Create these Embedded Data fields in Survey Flow:

- `experiment_data_json`
- `experiment_metadata_json`
- `experiment_complete`

Do not manually set those output fields. The task writes them automatically.

### Metadata currently recorded

The app records runtime metadata including:

- requested estimate count
- requested number of arrays
- requested number of boxes
- numerosity range minimum and maximum
- safe numerosity maximum for the current layout
- brief display duration
- joint proportion label-order mapping

### Important row-level fields

Numerosity rows include fields such as:

- `task_family`
- `evaluation_mode`
- `availability_mode`
- `number_of_arrays`
- `array_label`
- `numerosity_true_value`
- `response`
- `practice`

Proportion rows include fields such as:

- `task_family`
- `format`
- `number_of_boxes`
- `proportion_joint_label_order`
- `target_label`
- `target_true_proportion`
- `response`
- `joint_total_response`
- `practice`

## Qualtrics Setup

1. Add a Text / Graphic question.
2. Set the question HTML to:

```html
<div id="behavioral-experiment-root"></div>
```

3. Paste the contents of `qualtrics/qualtrics-snippet.js` into the question JavaScript editor.
4. Create the Embedded Data fields listed above.
5. Set at least:

- `task`
- `number_of_estimates`

6. Add task-specific fields only when needed:

- numerosity joint tasks:
  - `number_of_arrays`
  - `numerosity_range`
  - `brief_display_ms` for brief versions
- joint proportion tasks:
  - `number_of_boxes`

### Task-specific notes

- `proportion_joint_evaluation`
  - no running total box
  - responses do not need to sum to 100
- `proportion_joint_evaluation_constsum`
  - shows a total box
  - enforces a 100-total response
- joint proportion tasks keep the label-size ordering fixed within person
  - one participant may get `A = smallest`
  - another may get `A = largest`
  - this is recorded as `proportion_joint_label_order`

### Qualtrics caching advice

If a preview seems stale:

1. open DevTools
2. go to `Network`
3. check `Disable cache`
4. hard refresh with `Ctrl+F5`

For GitHub-hosted assets, prefer either:

- a commit-pinned jsDelivr URL, or
- a version query string such as `?v=20260421a`

The current README and the newest Word guides are the authoritative setup docs. Older `.docx` guides in the folder are legacy references.

## Config Notes

- numerosity JSON configs may still contain older fixed trial examples, but the runtime now rescales and expands them based on the current Embedded Data controls
- proportion joint tasks are procedurally generated and then sorted into a fixed within-person label order
- minimum visible proportion is constrained so a section should render at at least about 2 pixels wide in the configured bar width

## Status

This README reflects the current runtime behavior more closely than the older Word guides. If a Word guide and this README disagree, trust the README and current source first.
