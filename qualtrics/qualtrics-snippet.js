/* Example Qualtrics integration snippet.
   Paste inside Qualtrics question JavaScript and host app files where Qualtrics can reach them. */

Qualtrics.SurveyEngine.addOnload(function () {
  var assetVersion = "20260420e";
  var assetBase = "https://cdn.jsdelivr.net/gh/DanRSchley/Online-Number-Perception-Measurement-Tool@main/";
  var q = this;
  var container = document.createElement("div");
  var inlineStyle = document.createElement("style");

  inlineStyle.id = "behavioral-experiment-inline-overrides";
  inlineStyle.textContent =
    "#behavioral-experiment-root{width:100%;max-width:100%;overflow-x:hidden;}" +
    "#behavioral-experiment-root .screen{width:100% !important;max-width:100% !important;overflow:hidden;}" +
    "#behavioral-experiment-root .screen--message{min-height:clamp(220px,46vh,380px) !important;display:flex !important;align-items:center !important;justify-content:center !important;padding:0 !important;}" +
    "#behavioral-experiment-root .screen--message.fixation{min-height:clamp(260px,54vh,440px) !important;}" +
    "#behavioral-experiment-root .message{width:100% !important;text-align:center !important;}" +
    "#behavioral-experiment-root .fixation{display:block !important;width:100% !important;text-align:center !important;font-size:clamp(2.4rem,4vw,3.4rem) !important;line-height:1 !important;}" +
    "#behavioral-experiment-root .canvas-stage{width:min(680px,82vw) !important;max-width:100% !important;overflow:hidden !important;margin:0 auto !important;}" +
    "#behavioral-experiment-root .stimulus-canvas{display:block !important;width:min(680px,82vw) !important;max-width:100% !important;height:auto !important;margin:0 auto !important;}" +
    "#behavioral-experiment-root .bar-stage{width:min(760px,88vw) !important;max-width:100% !important;margin:0 auto !important;}" +
    "#behavioral-experiment-root .bar-svg{width:min(760px,88vw) !important;max-width:100% !important;height:auto !important;}" +
    "#behavioral-experiment-root .response-panel{width:min(640px,88vw) !important;max-width:100% !important;}" +
    "#behavioral-experiment-root .response-grid{width:min(640px,88vw) !important;max-width:100% !important;}" +
    "#behavioral-experiment-root .response-input-row{display:flex !important;align-items:center !important;justify-content:center !important;gap:8px !important;}" +
    "#behavioral-experiment-root .response-input-row input{width:min(150px,100%) !important;min-width:0 !important;}" +
    "#behavioral-experiment-root .response-unit{font-size:0.95rem !important;color:#5f6979 !important;white-space:nowrap !important;}" +
    "#behavioral-experiment-root input[type='number']::-webkit-outer-spin-button," +
    "#behavioral-experiment-root input[type='number']::-webkit-inner-spin-button{-webkit-appearance:none !important;margin:0 !important;}" +
    "#behavioral-experiment-root input[type='number']{-moz-appearance:textfield !important;appearance:textfield !important;}";
  document.head.appendChild(inlineStyle);

  container.id = "behavioral-experiment-root";
  this.getQuestionContainer().innerHTML = "";
  this.getQuestionContainer().appendChild(container);
  this.hideNextButton();

  window.__BEHAVIORAL_EXPERIMENT_DISABLE_AUTO_START = true;

  window.__BEHAVIORAL_EXPERIMENT_ASSIGNMENTS = {
    participantId: "${e://Field/participant_id}",
    sessionId: "${e://Field/ResponseID}",
    condition: "${e://Field/task_condition}",
    counterbalancingAssignment: "${e://Field/counterbalance_assignment}",
    task: "${e://Field/task}",
    numberOfTrials: "${e://Field/number_of_trials}",
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

  function startExperiment() {
    window.initExperiment({
      mountEl: "#behavioral-experiment-root"
    }).then(function () {
      sanitizeInputs();
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

  window.addEventListener("behavioral-experiment:complete", handleComplete);

  if (window.initExperiment) {
    startExperiment();
  } else {
    var css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = assetBase + "styles.css?v=" + assetVersion;
    document.head.appendChild(css);

    var script = document.createElement("script");
    script.src = assetBase + "app.js?v=" + assetVersion;
    script.onload = startExperiment;
    document.body.appendChild(script);
  }

  sanitizeInputs();
  var observer = new MutationObserver(function () {
    sanitizeInputs();
  });
  observer.observe(container, { childList: true, subtree: true });
  window.__BEHAVIORAL_EXPERIMENT_INPUT_OBSERVER = observer;
});
