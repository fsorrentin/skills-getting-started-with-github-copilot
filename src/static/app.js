function buildParticipantsMarkup(name, participants) {
  if (participants.length === 0) {
    return `<p class="no-participants">No participants yet - be the first!</p>`;
  }

  return `<ul class="participants-list">${participants
    .map(
      (participant) =>
        `<li><span class="participant-email">${participant}</span><button class="delete-btn" data-activity="${name}" data-email="${participant}" title="Unregister" aria-label="Unregister ${participant}">&#x1F5D1;</button></li>`
    )
    .join("")}</ul>`;
}

function renderActivities(activities, elements) {
  const { activitiesList, activitySelect } = elements;

  activitiesList.innerHTML = "";
  activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

  Object.entries(activities).forEach(([name, details]) => {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const spotsLeft = details.max_participants - details.participants.length;
    const participantsMarkup = buildParticipantsMarkup(name, details.participants);

    activityCard.innerHTML = `
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p><strong>Schedule:</strong> ${details.schedule}</p>
      <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
      <div class="participants-section">
        <p><strong>Participants:</strong></p>
        ${participantsMarkup}
      </div>
    `;

    activitiesList.appendChild(activityCard);

    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    activitySelect.appendChild(option);
  });
}

function showMessage(messageDiv, variant, text) {
  messageDiv.textContent = text;
  messageDiv.className = variant;
  messageDiv.classList.remove("hidden");
}

export function createApp({
  doc = document,
  fetchImpl = fetch,
  alertImpl = window.alert.bind(window),
  timerImpl = window.setTimeout.bind(window),
} = {}) {
  const activitiesList = doc.getElementById("activities-list");
  const activitySelect = doc.getElementById("activity");
  const signupForm = doc.getElementById("signup-form");
  const messageDiv = doc.getElementById("message");
  const emailInput = doc.getElementById("email");
  const elements = { activitiesList, activitySelect };

  async function fetchActivities() {
    try {
      const response = await fetchImpl("/activities");
      const activities = await response.json();
      renderActivities(activities, elements);

      activitiesList.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
          const activity = button.dataset.activity;
          const email = button.dataset.email;

          try {
            const response = await fetchImpl(
              `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
              { method: "DELETE" }
            );

            if (response.ok) {
              await fetchActivities();
              return;
            }

            const result = await response.json();
            alertImpl(result.detail || "Failed to unregister");
          } catch (error) {
            console.error("Error unregistering:", error);
          }
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();

    const email = emailInput.value;
    const activity = activitySelect.value;

    try {
      const response = await fetchImpl(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, "success", result.message);
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(messageDiv, "error", result.detail || "An error occurred");
      }

      timerImpl(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      showMessage(messageDiv, "error", "Failed to sign up. Please try again.");
      console.error("Error signing up:", error);
    }
  }

  signupForm.addEventListener("submit", handleSignup);

  return {
    fetchActivities,
    handleSignup,
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const app = createApp();
  await app.fetchActivities();
});
