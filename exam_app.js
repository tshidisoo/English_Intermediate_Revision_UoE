// exam_app.js — shared grading + submission logic for the revision test forms.
// Expects each HTML page to define, before including this file:
//   const ANSWER_KEY = { "1": "A", "2": "C", ... };
//   const TOTAL_QUESTIONS = 40;
//   const TEST_NAME = "Sample Paper 1";
//   const FORM_ENDPOINT = "https://formspree.io/f/mgogvleo";

document.addEventListener("DOMContentLoaded", function () {
  // Highlight the selected option visually
  document.querySelectorAll(".opt input[type=radio]").forEach(function (input) {
    input.addEventListener("change", function () {
      var name = input.name;
      document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
        r.closest(".opt").classList.toggle("answered", r.checked);
      });
    });
  });

  var form = document.getElementById("examForm");
  var submitBtn = document.getElementById("submitBtn");
  var resultsPanel = document.getElementById("resultsPanel");
  var statusMsg = document.getElementById("statusMsg");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Clear previous "missing" highlights
    document.querySelectorAll(".q-block.missing").forEach(function (el) {
      el.classList.remove("missing");
    });

    var missing = [];
    var answers = {};
    for (var i = 1; i <= TOTAL_QUESTIONS; i++) {
      var selected = form.querySelector('input[name="q' + i + '"]:checked');
      if (!selected) {
        missing.push(i);
        var block = document.getElementById("qblock-" + i);
        if (block) block.classList.add("missing");
      } else {
        answers[i] = selected.value;
      }
    }

    if (missing.length > 0) {
      alert(
        "Please answer all questions before submitting.\nMissing question(s): " +
          missing.join(", ")
      );
      var firstBlock = document.getElementById("qblock-" + missing[0]);
      if (firstBlock) firstBlock.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    var studentName = document.getElementById("studentName").value.trim() || "(no name entered)";
    var studentNumber = document.getElementById("studentNumber")
      ? document.getElementById("studentNumber").value.trim()
      : "";

    // Grade
    var correct = 0;
    var breakdown = [];
    for (var n = 1; n <= TOTAL_QUESTIONS; n++) {
      var isCorrect = answers[n] === ANSWER_KEY[String(n)];
      if (isCorrect) correct++;
      breakdown.push(n + ":" + answers[n] + (isCorrect ? " (correct)" : " (wrong, key=" + ANSWER_KEY[String(n)] + ")"));
    }
    var pct = Math.round((correct / TOTAL_QUESTIONS) * 1000) / 10;

    // Show results immediately
    resultsPanel.style.display = "block";
    document.getElementById("scoreText").textContent = correct + " / " + TOTAL_QUESTIONS;
    document.getElementById("pctText").textContent = pct + "% correct";
    resultsPanel.scrollIntoView({ behavior: "smooth", block: "center" });

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitted";
    statusMsg.textContent = "Sending your results to your teacher...";
    statusMsg.className = "status-msg";

    // Build submission payload
    var fd = new FormData();
    fd.append("test_name", TEST_NAME);
    fd.append("student_name", studentName);
    if (studentNumber) fd.append("student_number", studentNumber);
    fd.append("score", correct + " / " + TOTAL_QUESTIONS);
    fd.append("percentage", pct + "%");
    fd.append("submitted_at", new Date().toString());
    fd.append("_subject", "Test result: " + studentName + " — " + TEST_NAME + " (" + correct + "/" + TOTAL_QUESTIONS + ")");
    fd.append(
      "message",
      "Student: " + studentName + (studentNumber ? " (" + studentNumber + ")" : "") +
        "\nTest: " + TEST_NAME +
        "\nScore: " + correct + " / " + TOTAL_QUESTIONS + " (" + pct + "%)" +
        "\n\nFull answer breakdown:\n" + breakdown.join("\n")
    );

    fetch(FORM_ENDPOINT, {
      method: "POST",
      body: fd,
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        if (response.ok) {
          statusMsg.textContent = "✓ Your results have been sent to your teacher.";
          statusMsg.className = "status-msg ok";
        } else {
          throw new Error("Bad response");
        }
      })
      .catch(function () {
        statusMsg.textContent =
          "⚠ Could not send your results automatically (no internet connection or the form couldn't be reached). Please tell your teacher your score shown above.";
        statusMsg.className = "status-msg err";
        submitBtn.disabled = false;
        submitBtn.textContent = "Try sending again";
      });
  });
});
