/* Example Qualtrics integration snippet.
   Paste inside Qualtrics question JavaScript and host app files where Qualtrics can reach them. */

Qualtrics.SurveyEngine.addOnload(function () {
  var container = document.createElement("div");
  container.id = "behavioral-experiment-root";
  this.getQuestionContainer().appendChild(container);

  window.__BEHAVIORAL_EXPERIMENT_ASSIGNMENTS = {
    participantId: "${e://Field/participant_id}",
    sessionId: "${e://Field/ResponseID}",
    condition: "${e://Field/numerosity_condition}",
    counterbalancingAssignment: "${e://Field/counterbalance_assignment}"
  };

  window.initExperiment({
    mountEl: "#behavioral-experiment-root",
    config: "https://your-hosted-files.example.com/configs/sample-combined.json"
  });
});
