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
- `App Code Modification Guide.docx`
- `Qualtrics Embedding Guide.docx`

## Running Locally

Run a local web server from PowerShell:

```powershell
Set-Location "C:\Users\Schley\Erasmus Universiteit Rotterdam Dropbox\Dan Schley\Non-shared Research files\Ongoing\JustDan\ProportionCalibration\Online Tool"
py -m http.server 8000
```

Then open:

- [http://localhost:8000/](http://localhost:8000/)
- [http://localhost:8000/?task=numerosity_joint_visible&number_of_trials_joint_evaluation=12&number_of_arrays=4&numerosity_range=10-60](http://localhost:8000/?task=numerosity_joint_visible&number_of_trials_joint_evaluation=12&number_of_arrays=4&numerosity_range=10-60)
- [http://localhost:8000/?task=proportion_joint_evaluation&number_of_trials_joint_evaluation=24&number_of_boxes=8](http://localhost:8000/?task=proportion_joint_evaluation&number_of_trials_joint_evaluation=24&number_of_boxes=8)

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
    numberOfTrialsJointEvaluation: 12,
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
- `number_of_trials_joint_evaluation`
- `number_of_trials_separate_evaluation`
- `number_of_arrays`
- `number_of_boxes`
- `numerosity_range`
- `brief_display_ms`

The app still accepts some legacy aliases for backward compatibility, including:

- `number_of_estimates`
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
- `number_of_trials_joint_evaluation`
  - exact number of scored joint-task screens to run
- `number_of_trials_separate_evaluation`
  - exact number of scored separate-task screens to run
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

- `number_of_trials_joint_evaluation`
  - `10` in Qualtrics when not supplied
- `number_of_trials_separate_evaluation`
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

### Embedded Data field map

The app uses two categories of Embedded Data fields in Qualtrics:

- researcher-set runtime controls
- app-written output fields

#### Researcher-set runtime controls

These are set in Survey Flow before the task question appears.

- `task`
  - task key to run for this participant
  - examples:
    - `numerosity_separate_brief`
    - `numerosity_joint_visible`
    - `proportion_joint_evaluation`
- `participant_id`
  - optional external participant identifier
  - if omitted, the app falls back to the Qualtrics response/session identifier
- `counterbalance_assignment`
  - participant-level counterbalancing flag
  - used most importantly for joint proportion label ordering
  - current app logic treats values other than the legacy `odd` large-first rule as the `A = smallest` style mapping unless explicitly customized
- `number_of_trials_joint_evaluation`
  - exact number of scored joint-task screens
  - applies to:
    - `numerosity_joint_brief`
    - `numerosity_joint_visible`
    - `proportion_joint_evaluation`
    - `proportion_joint_evaluation_constsum`
- `number_of_trials_separate_evaluation`
  - exact number of scored separate-task screens
  - applies to:
    - `numerosity_only`
    - `numerosity_separate_brief`
    - `numerosity_separate_visible`
    - `proportion_only`
    - `proportion_separate_evaluation`
- `number_of_arrays`
  - number of groups shown on joint numerosity screens
  - supported values: `2`, `4`, `6`
- `number_of_boxes`
  - number of colored sections shown on joint proportion screens
  - supported values: `2` through `10`
- `numerosity_range`
  - requested numerosity range as a string
  - typical format: `20-80`
  - the app may impose a lower safe maximum depending on layout density
- `brief_display_ms`
  - display duration in milliseconds for brief numerosity tasks

#### App-written metadata fields

These are written automatically by the app. Create them in Survey Flow, but do not manually assign values.

- `experiment_metadata_session_json`
  - session-level identifiers and persistent assignment information
  - currently includes:
    - experiment version
    - date/time
    - participant id
    - session id
    - counterbalancing assignment
- `experiment_metadata_runtime_json`
  - runtime override information actually used by the app
  - currently includes fields such as:
    - requested task
    - requested joint trial count
    - requested separate trial count
    - legacy estimate count if a legacy alias was supplied
    - requested array count
    - requested box count
    - requested numerosity range min/max
    - safe numerosity max for the chosen layout
    - brief display duration
- `experiment_metadata_environment_json`
  - browser and display environment information
  - currently includes:
    - browser info string
    - screen width and height
    - viewport width and height
    - full-screen status
- `experiment_metadata_settings_json`
  - full resolved task settings/config object used for the run

#### App-written chunk count fields

These fields tell you how many chunks were needed for each large JSON family.

- `experiment_response_rows_numerosity_json_count`
  - number of chunk fields used for numerosity response rows
- `experiment_response_rows_proportion_json_count`
  - number of chunk fields used for proportion response rows
- `experiment_stimuli_numerosity_json_count`
  - number of chunk fields used for numerosity stimulus definitions
- `experiment_stimuli_proportion_json_count`
  - number of chunk fields used for proportion stimulus definitions

#### App-written chunked payload fields

These hold the actual large JSON payloads. Predeclare several chunk slots in Survey Flow.

- `experiment_response_rows_numerosity_json_1`, `_2`, `_3`, ...
  - row-level response logs for numerosity tasks
- `experiment_response_rows_proportion_json_1`, `_2`, `_3`, ...
  - row-level response logs for proportion tasks
- `experiment_stimuli_numerosity_json_1`, `_2`, `_3`, ...
  - stimulus catalog for numerosity screens
  - this stores the shared stimulus definitions once instead of repeating them in every row
- `experiment_stimuli_proportion_json_1`, `_2`, `_3`, ...
  - stimulus catalog for proportion screens
  - this stores bar label values and related stimulus descriptors once instead of repeating them in every row

#### Completion flag

- `experiment_complete`
  - written as `1` when the embedded app reaches its completion event

### What the row sections contain

The row logs are intentionally slimmer than earlier versions of the app.

Numerosity response rows include fields such as:

- `task_family`
- `trial_index`
- `block_index`
- `block_name`
- `practice`
- `condition`
- `random_seed`
- `reaction_time_ms`
- `timeout`
- `evaluation_mode`
- `availability_mode`
- `number_of_arrays`
- `stimulus_id`
- `array_label`
- `numerosity_true_value`
- `response`
- `intended_display_duration`
- `measured_display_duration`

Proportion response rows include fields such as:

- `task_family`
- `trial_index`
- `block_index`
- `block_name`
- `practice`
- `condition`
- `trial_start_time`
- `trial_end_time`
- `reaction_time_ms`
- `timeout`
- `format`
- `judgment_type`
- `number_of_boxes`
- `proportion_joint_label_order`
- `target_label`
- `target_true_proportion`
- `displayed_target_value`
- `response`
- `response_normalized`
- `response_method`
- `accuracy`
- `stimulus_id`
- `joint_total_response` for constant-sum joint tasks

### What the stimulus sections contain

Numerosity stimulus entries include:

- `stimulus_id`
- `condition`
- `evaluation_mode`
- `availability_mode`
- `number_of_arrays`
- `arrays`
  - one entry per displayed group with:
    - `label`
    - `numerosity`
    - `setType`
    - `seed`

Proportion stimulus entries include:

- `stimulus_id`
- `format`
- `number_of_boxes`
- `target_label`
- `random_seed`
- `label_values`
  - the displayed percentage/proportion values for the labels shown on that bar

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
- `number_of_trials_joint_evaluation`
- `number_of_trials_separate_evaluation`

6. Add task-specific fields only when needed:

- numerosity joint tasks:
  - `number_of_arrays`
  - `numerosity_range`
  - `brief_display_ms` for brief versions
- joint proportion tasks:
  - `number_of_boxes`

7. Also create the app-written output fields:

- `experiment_metadata_session_json`
- `experiment_metadata_runtime_json`
- `experiment_metadata_environment_json`
- `experiment_metadata_settings_json`
- `experiment_response_rows_numerosity_json_count`
- `experiment_response_rows_proportion_json_count`
- `experiment_stimuli_numerosity_json_count`
- `experiment_stimuli_proportion_json_count`
- `experiment_complete`

8. Predeclare chunk slots for the large JSON families. A safe starting set is:

- `experiment_response_rows_numerosity_json_1` through `_6`
- `experiment_response_rows_proportion_json_1` through `_6`
- `experiment_stimuli_numerosity_json_1` through `_3`
- `experiment_stimuli_proportion_json_1` through `_3`

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
