/* Qualtrics integration snippet.
   Use this inside a Text / Graphic question whose HTML is exactly:
   <div id="behavioral-experiment-root"></div>

   Recommended Embedded Data fields:
   - participant_id
   - task
   - counterbalance_assignment
   - number_of_trials_joint_evaluation
   - number_of_trials_separate_evaluation
   - number_of_arrays
   - number_of_boxes
   - numerosity_range
   - brief_display_ms
   - experiment_data_json
   - experiment_metadata_json
   - experiment_complete
*/

Qualtrics.SurveyEngine.addOnload(function () {
  var assetVersion = String(Date.now());
  var assetBase = "https://cdn.jsdelivr.net/gh/DanRSchley/Online-Number-Perception-Measurement-Tool@main/";
  var q = this;
  var container = document.createElement("div");
  var inlineStyle = document.createElement("style");

  inlineStyle.id = "behavioral-experiment-inline-overrides";
  inlineStyle.textContent =
    ".QuestionOuter,.QuestionBody,.QuestionText{max-width:100% !important;width:100% !important;}" +
    "#behavioral-experiment-root{width:min(1200px,88vw);max-width:88vw;margin:0 auto;overflow-x:hidden;}" +
    "#behavioral-experiment-root .screen{width:100% !important;max-width:100% !important;overflow:hidden;display:flex !important;flex-direction:column !important;align-items:center !important;justify-content:flex-start !important;}" +
    "#behavioral-experiment-root .screen--stack{align-items:center !important;justify-content:flex-start !important;}" +
    "#behavioral-experiment-root .panel{width:min(860px,84vw) !important;max-width:84vw !important;margin:0 auto !important;box-sizing:border-box !important;}" +
    "#behavioral-experiment-root .screen--message{min-height:clamp(240px,44vh,500px) !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:0 !important;}" +
    "#behavioral-experiment-root .screen--message.fixation{min-height:clamp(340px,62vh,700px) !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:0 !important;}" +
    "#behavioral-experiment-root .message{width:100% !important;text-align:center !important;margin-left:auto !important;margin-right:auto !important;}" +
    "#behavioral-experiment-root .fixation{display:flex !important;align-items:center !important;justify-content:center !important;width:100% !important;min-height:clamp(340px,62vh,700px) !important;text-align:center !important;font-size:clamp(2rem,3.8vw,3rem) !important;line-height:1 !important;}" +
    "#behavioral-experiment-root .canvas-stage{width:min(820px,78vw) !important;max-width:100% !important;overflow:hidden !important;margin:0 auto !important;}" +
    "#behavioral-experiment-root .stimulus-canvas{display:block !important;width:min(820px,78vw) !important;max-width:100% !important;height:auto !important;margin:0 auto !important;}" +
    "#behavioral-experiment-root .bar-stage{width:min(860px,78vw) !important;max-width:100% !important;margin:0 auto !important;}" +
    "#behavioral-experiment-root .bar-svg{display:block !important;width:min(860px,78vw) !important;max-width:100% !important;height:auto !important;margin:0 auto !important;}" +
    "#behavioral-experiment-root .bar-heading{max-width:min(860px,78vw) !important;margin:0 auto !important;text-align:left !important;}" +
    "#behavioral-experiment-root .response-panel{width:min(640px,80vw) !important;max-width:100% !important;margin:0 auto !important;}" +
    "#behavioral-experiment-root .response-grid{width:min(640px,80vw) !important;max-width:100% !important;margin:0 auto !important;}" +
    "#behavioral-experiment-root .response-input-row{display:flex !important;align-items:center !important;justify-content:center !important;gap:8px !important;}" +
    "#behavioral-experiment-root .response-input-row input{width:min(92px,100%) !important;min-width:0 !important;}" +
    "#behavioral-experiment-root .response-unit{font-size:0.92rem !important;color:#5f6979 !important;white-space:nowrap !important;}" +
    "#behavioral-experiment-root h1,#behavioral-experiment-root h2{font-size:calc(100% - 2pt) !important;text-align:center !important;margin-left:auto !important;margin-right:auto !important;}" +
    "#behavioral-experiment-root .bar-heading h2,#behavioral-experiment-root .bar-heading p{text-align:left !important;}" +
    "#behavioral-experiment-root input[type='number']::-webkit-outer-spin-button," +
    "#behavioral-experiment-root input[type='number']::-webkit-inner-spin-button{-webkit-appearance:none !important;margin:0 !important;}" +
    "#behavioral-experiment-root input[type='number']{-moz-appearance:textfield !important;appearance:textfield !important;}";
  document.head.appendChild(inlineStyle);

  container.id = "behavioral-experiment-root";
  q.getQuestionContainer().innerHTML = "";
  q.getQuestionContainer().appendChild(container);
  q.hideNextButton();

  window.__BEHAVIORAL_EXPERIMENT_DISABLE_AUTO_START = true;

  window.__BEHAVIORAL_EXPERIMENT_ASSIGNMENTS = {
    participantId: "${e://Field/participant_id}",
    sessionId: "${e://Field/ResponseID}",
    counterbalancingAssignment: "${e://Field/counterbalance_assignment}",
    task: "${e://Field/task}",
    numberOfTrialsJointEvaluation: "${e://Field/number_of_trials_joint_evaluation}",
    numberOfTrialsSeparateEvaluation: "${e://Field/number_of_trials_separate_evaluation}",
    numberOfArrays: "${e://Field/number_of_arrays}",
    numberOfBoxes: "${e://Field/number_of_boxes}",
    numerosityRange: "${e://Field/numerosity_range}",
    briefDisplayMs: "${e://Field/brief_display_ms}"
  };

  function sanitizeInputs() {
    var root = document.getElementById("behavioral-experiment-root");
    if (!root) return;
    var numericInputs = root.querySelectorAll("input[type='number']");
    numericInputs.forEach(function (input) {
      var currentValue = input.value;
      var decimalMode = input.step && String(input.step) !== "1";
      input.type = "text";
      input.inputMode = decimalMode ? "decimal" : "numeric";
      input.value = currentValue;
      input.setAttribute("autocomplete", "off");
    });
  }

  function handleComplete(event) {
    if (!event || !event.detail) return;
    Qualtrics.SurveyEngine.setEmbeddedData("experiment_data_json", JSON.stringify(event.detail.rows));
    Qualtrics.SurveyEngine.setEmbeddedData("experiment_metadata_json", JSON.stringify(event.detail.metadata));
    Qualtrics.SurveyEngine.setEmbeddedData("experiment_complete", "1");
    q.showNextButton();
    window.removeEventListener("behavioral-experiment:complete", handleComplete);
  }

  function startExperiment() {
    window.initExperiment({
      mountEl: "#behavioral-experiment-root"
    }).then(function () {
      sanitizeInputs();
    }).catch(function (error) {
      container.innerHTML =
        '<div class="panel"><h1>Experiment Error</h1><p>' +
        String(error && error.message ? error.message : error) +
        "</p></div>";
      throw error;
    });
  }

  window.removeEventListener("behavioral-experiment:complete", handleComplete);
  window.addEventListener("behavioral-experiment:complete", handleComplete);

  var oldCss = document.getElementById("behavioral-experiment-styles");
  if (oldCss) oldCss.remove();
  var oldScript = document.getElementById("behavioral-experiment-script");
  if (oldScript) oldScript.remove();

  try {
    delete window.initExperiment;
    delete window.BehavioralExperimentPlatform;
  } catch (error) {
    window.initExperiment = undefined;
    window.BehavioralExperimentPlatform = undefined;
  }

  var css = document.createElement("link");
  css.id = "behavioral-experiment-styles";
  css.rel = "stylesheet";
  css.href = assetBase + "styles.css?v=" + assetVersion;
  document.head.appendChild(css);

  var script = document.createElement("script");
  script.id = "behavioral-experiment-script";
  script.src = assetBase + "app.js?v=" + assetVersion;
  script.onload = startExperiment;
  document.body.appendChild(script);

  sanitizeInputs();
  var observer = new MutationObserver(function () {
    sanitizeInputs();
  });
  observer.observe(container, { childList: true, subtree: true });
  window.__BEHAVIORAL_EXPERIMENT_INPUT_OBSERVER = observer;
});

Qualtrics.SurveyEngine.addOnUnload(function () {
  var css = document.getElementById("behavioral-experiment-styles");
  if (css) css.remove();
  var script = document.getElementById("behavioral-experiment-script");
  if (script) script.remove();
  var overrides = document.getElementById("behavioral-experiment-inline-overrides");
  if (overrides) overrides.remove();
  if (window.__BEHAVIORAL_EXPERIMENT_INPUT_OBSERVER) {
    window.__BEHAVIORAL_EXPERIMENT_INPUT_OBSERVER.disconnect();
    window.__BEHAVIORAL_EXPERIMENT_INPUT_OBSERVER = null;
  }
  window.__BEHAVIORAL_EXPERIMENT_DISABLE_AUTO_START = true;
});
