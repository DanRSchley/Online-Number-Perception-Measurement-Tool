# Comprehensive Agent Handoff

This file is the best single reference to give another Codex agent. It is meant to explain:

- the purpose of the app
- the supported task keys
- the meaning of all runtime parameters and aliases
- the defaults currently used by the app
- the main output fields written into Qualtrics
- the structure of the row-level logged data

Repository root:

`C:\Users\Schley\Erasmus Universiteit Rotterdam Dropbox\Dan Schley\Non-shared Research files\Ongoing\JustDan\ProportionCalibration\Online Tool`

## 1. What This App Is

This is a browser-based task platform for eliciting visual judgments about:

- absolute quantities, mainly dot numerosity
- percentages / proportions, mainly segmented bars

It can run:

- locally in a browser via `index.html`
- inside Qualtrics via `qualtrics/qualtrics-snippet.js`

It supports:

- separate tasks, where answers are given one item at a time on separate pages
- joint tasks, where multiple estimates are entered together on one page
- one practice round before the scored trials

Core files:

- `app.js`: main task logic
- `styles.css`: shared app styling
- `index.html`: local launcher
- `configs/*.json`: task presets
- `qualtrics/qualtrics-snippet.js`: Qualtrics loader

## 2. Supported Task Keys

Defined in `TASK_CONFIG_MAP` in `app.js`.

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

## 3. What Each Task Means

### Absolute / numerosity tasks

- `numerosity_separate_brief`
  - one group of dots at a time
  - shown briefly
  - then answered on its own screen

- `numerosity_separate_visible`
  - one group of dots at a time
  - stays visible while the participant answers

- `numerosity_joint_brief`
  - multiple groups of dots shown together
  - shown briefly
  - then answered together on one response screen

- `numerosity_joint_visible`
  - multiple groups of dots shown together
  - remain visible while the participant answers together on one response screen

- `numerosity_only`
  - legacy entry point for absolute judgments
  - effectively uses the separate numerosity family

### Percentage / proportion tasks

- `proportion_separate_evaluation`
  - one bar at a time
  - answered on separate screens

- `proportion_joint_evaluation`
  - one bar split into several labeled colored sections
  - all estimates entered on the same page
  - responses do not need to total 100

- `proportion_joint_evaluation_constsum`
  - same joint segmented-bar format
  - responses must total 100

- `proportion_only`
  - legacy entry point for percentage judgments
  - effectively uses the separate proportion family

### Combined session

- `combined_session`
  - legacy combined numerosity + proportion flow
  - not the usual single-task deployment path

## 4. Runtime Parameters

The app accepts parameters from:

- Qualtrics Embedded Data
- query parameters in the URL
- some legacy aliases

### Primary current parameter names

- `task`
- `participant_id`
- `counterbalance_assignment`
- `number_of_trials_joint_evaluation`
- `number_of_trials_separate_evaluation`
- `number_of_arrays`
- `number_of_boxes`
- `numerosity_range`
- `brief_display_ms`

### Legacy aliases still accepted

These are still resolved in `app.js` for backward compatibility:

- `number_of_estimates`
- `numberOfEstimates`
- `number_of_trials`
- `numberOfTrials`
- camelCase equivalents for the newer parameters:
  - `numberOfTrialsJointEvaluation`
  - `numberOfTrialsSeparateEvaluation`
  - `numberOfArrays`
  - `numberOfBoxes`
  - `numerosityRange`
  - `briefDisplayMs`

## 5. Meaning Of Each Parameter

### `task`

Selects the task key to run.

Examples:

- `numerosity_joint_visible`
- `proportion_joint_evaluation`

### `participant_id`

Optional external participant identifier.

If omitted in Qualtrics, the app can fall back to the Qualtrics `ResponseID` as the participant/session identifier.

### `counterbalance_assignment`

Mainly relevant for joint proportion tasks.

Used for within-person label-order mapping, specifically whether the participant gets the version where:

- `A` corresponds to the smallest section
- or `A` corresponds to the largest section

Internally, the app derives a proportion label order mode and records it as:

- `proportion_joint_label_order`

### `number_of_trials_joint_evaluation`

Exact number of scored joint-task screens.

Used by:

- `numerosity_joint_brief`
- `numerosity_joint_visible`
- `proportion_joint_evaluation`
- `proportion_joint_evaluation_constsum`

### `number_of_trials_separate_evaluation`

Exact number of scored separate-task screens.

Used by:

- `numerosity_separate_brief`
- `numerosity_separate_visible`
- `numerosity_only`
- `proportion_separate_evaluation`
- `proportion_only`

### `number_of_arrays`

Numerosity joint-task control only.

Supported values:

- `2`
- `4`
- `6`

Default:

- `4`

This changes:

- the number of dot groups shown together
- the response-grid arrangement
- the safe maximum numerosity that can fit in the available area

### `number_of_boxes`

Joint proportion control only.

Allowed range:

- minimum `2`
- maximum `10`

Default:

- `5`

This changes:

- the number of labeled sections in the joint proportion bar

### `numerosity_range`

Range override for numerosity tasks.

Accepted as a string, typically:

- `10-80`
- `20-100`

The app ultimately resolves:

- `numerosity_range_min`
- `numerosity_range_max`
- `numerosity_range_safe_max`

### `brief_display_ms`

Display duration override in milliseconds for brief numerosity tasks.

Used by:

- `numerosity_separate_brief`
- `numerosity_joint_brief`

## 6. Default Values

Defined in `app.js`.

- default separate trials in Qualtrics:
  - `40`
- default joint trials in Qualtrics:
  - `10`
- default number of arrays:
  - `4`
- supported number of arrays:
  - `2`, `4`, `6`
- default number of boxes:
  - `5`
- allowed number of boxes:
  - `2` to `10`
- default numerosity range:
  - minimum `10`
  - maximum `100`
- absolute hard minimum numerosity lower bound:
  - `4`
- fixation symbol:
  - empty triangle `△`

There is also a computed safe numerosity maximum that depends on layout size and number of arrays:

- `numerosity_range_safe_max`

## 7. How Trial Counts Behave

### Separate tasks

For separate tasks, the requested separate-trial count is the number of scored estimate screens.

Example:

- `number_of_trials_separate_evaluation = 10`
- one practice round
- then `10` scored separate estimate screens

### Joint tasks

For joint tasks, the requested joint-trial count is the number of scored joint screens.

Example:

- `number_of_trials_joint_evaluation = 5`
- one practice joint screen
- then `5` scored joint screens

Important:

- joint tasks log multiple rows per screen, because each label / group / block gets its own logged record

## 8. Practice Structure

Every task block starts with one practice round.

Practice rows are explicitly logged with:

- `practice = true`

Main scored rows use:

- `practice = false`

Practice screens are introduced with:

- a practice-start screen
- the practice trial itself
- a short transition into the real task

## 9. Main Output Fields Written Into Qualtrics

The Qualtrics snippet writes:

- `experiment_data_json`
- `experiment_metadata_json`
- `experiment_complete`

### `experiment_data_json`

A JSON array of row-level task records.

This is the main analyzable log.

### `experiment_metadata_json`

A JSON object with run-level metadata, including:

- `settings_used`
- `qualtrics_overrides`
- session and environment details

### `experiment_complete`

Usually written as `"1"` when the app finishes and the snippet hands data back to Qualtrics.

## 10. Important Metadata Fields

The app explicitly records the effective Qualtrics/runtime overrides in metadata:

- `task`
- `number_of_estimates_legacy`
- `number_of_trials_separate_evaluation`
- `number_of_trials_joint_evaluation`
- `number_of_arrays`
- `number_of_boxes`
- `proportion_joint_label_order`
- `numerosity_range_min`
- `numerosity_range_max`
- `numerosity_range_safe_max`
- `brief_display_ms`

These are stored under:

- `experiment_metadata_json -> qualtrics_overrides`

The metadata also stores:

- `settings_used`

which is useful when debugging the exact config the app actually ran.

## 11. Row-Level Output Fields

The exact row schema varies by task family and whether the task is joint or separate, but these are the most important fields.

### Common fields

Commonly present across logged rows:

- `participant_id`
- `session_id`
- `task_family`
- `trial_index`
- `block_index`
- `block_name`
- `practice`
- `condition`
- `trial_start_time`
- `trial_end_time`
- `stimulus_onset_time`
- `response_time`
- `reaction_time_ms`
- `timeout`
- `judgment_type`
- `response`
- `response_method`
- `accuracy`
- `stimulus_id`

### Numerosity-specific fields

Common numerosity fields include:

- `task_family = "numerosity"`
- `number_of_arrays`
- `array_label`
- `numerosity_true_value`
- `display_intended_value`
- `display_measured_value`
- `setType`
- `seed`

Joint numerosity rows include one row per displayed array label.

### Proportion-specific fields

Common proportion fields include:

- `task_family = "proportion"`
- `format`
- `number_of_boxes`
- `proportion_joint_label_order`
- `target_label`
- `target_true_proportion`
- `displayed_target_value`
- `response_normalized`

Joint proportion rows also include:

- `joint_total_response` when the total box is shown

### Label value fields

For joint proportion rows, there are also per-label fields like:

- `A`
- `B`
- `C`
- and so on

These store the underlying true proportions for the labeled sections.

## 12. Current Config Files

Config files in `configs/`:

- `numerosity-joint-brief.json`
- `numerosity-joint-visible.json`
- `numerosity-only.json`
- `numerosity-separate-brief.json`
- `numerosity-separate-visible.json`
- `proportion-joint-constsum.json`
- `proportion-joint-only.json`
- `proportion-only.json`
- `proportion-separate-only.json`
- `sample-combined.json`

These are presets and examples, but the app also overrides behavior dynamically from Qualtrics Embedded Data or URL parameters.

## 13. Qualtrics Loader Expectations

The current Qualtrics loader file is:

- `qualtrics/qualtrics-snippet.js`

It expects Embedded Data fields with names such as:

- `task`
- `counterbalance_assignment`
- `number_of_trials_joint_evaluation`
- `number_of_trials_separate_evaluation`
- `number_of_arrays`
- `number_of_boxes`
- `numerosity_range`
- `brief_display_ms`

It writes:

- `experiment_data_json`
- `experiment_metadata_json`
- `experiment_complete`

## 14. Best File Set To Give Another Agent

If only one file can be shared, use:

- `COMPREHENSIVE_AGENT_HANDOFF.md`

If multiple files can be shared, the best set is:

- `COMPREHENSIVE_AGENT_HANDOFF.md`
- `README.md`
- `app.js`
- `qualtrics/qualtrics-snippet.js`

## 15. Important Caveats For Another Agent

- The app still accepts legacy parameter names, so an agent should check whether a surprising behavior is coming from a legacy alias rather than the newer fields.
- Qualtrics CSV exports can look messy in Excel because the JSON columns are long; that does not necessarily mean the JSON is malformed.
- Joint tasks generate multiple row records per visual screen.
- Separate and joint trial counts are now controlled separately and should not be inferred from the old `number_of_estimates` behavior unless the study is using legacy fields on purpose.
