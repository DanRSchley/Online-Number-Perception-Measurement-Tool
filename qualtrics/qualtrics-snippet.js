/* Example Qualtrics integration snippet.
   Paste inside Qualtrics question JavaScript and host app files where Qualtrics can reach them. */

Qualtrics.SurveyEngine.addOnload(function () {
  var assetVersion = "20260420a";
  var assetBase = "https://cdn.jsdelivr.net/gh/DanRSchley/Online-Number-Perception-Measurement-Tool@main/";
  var q = this;
  var container = document.createElement("div");
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

  function startExperiment() {
    window.initExperiment({
      mountEl: "#behavioral-experiment-root"
    });
  }

  window.addEventListener("behavioral-experiment:complete", function handler(event) {
    if (!event || !event.detail) return;
    Qualtrics.SurveyEngine.setEmbeddedData("experiment_data_json", JSON.stringify(event.detail.rows));
    Qualtrics.SurveyEngine.setEmbeddedData("experiment_metadata_json", JSON.stringify(event.detail.metadata));
    Qualtrics.SurveyEngine.setEmbeddedData("experiment_complete", "1");
    q.showNextButton();
    window.removeEventListener("behavioral-experiment:complete", handler);
  });

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
});
