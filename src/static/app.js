document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const teacherControls = document.getElementById("teacher-controls");
  const loginToggle = document.getElementById("teacher-login-toggle");
  const loginPanel = document.getElementById("login-panel");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");
  const teacherStatus = document.getElementById("teacher-status");
  const messageDiv = document.getElementById("message");
  let isTeacher = false;

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  function setTeacherState(authenticated, username = "") {
    isTeacher = authenticated;
    teacherControls.classList.toggle("hidden", !authenticated);
    loginToggle.classList.toggle("hidden", authenticated);
    logoutButton.classList.toggle("hidden", !authenticated);
    teacherStatus.textContent = authenticated ? `Signed in as ${username}` : "";
  }

  function appendTextElement(parent, tagName, text) {
    const element = document.createElement(tagName);
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) throw new Error("Activity request failed");
      const activities = await response.json();

      activitiesList.replaceChildren();
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        appendTextElement(activityCard, "h4", name);
        appendTextElement(activityCard, "p", details.description);
        const schedule = appendTextElement(activityCard, "p", "");
        appendTextElement(schedule, "strong", "Schedule: ");
        schedule.append(details.schedule);
        appendTextElement(
          activityCard,
          "p",
          `Availability: ${details.max_participants - details.participants.length} spots left`
        );

        const participantsContainer = document.createElement("div");
        participantsContainer.className = "participants-container";
        appendTextElement(participantsContainer, "h5", "Participants:");
        if (details.participants.length === 0) {
          appendTextElement(participantsContainer, "p", "No participants yet");
        } else {
          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";
          details.participants.forEach((email) => {
            const participant = document.createElement("li");
            appendTextElement(participant, "span", email).className =
              "participant-email";
            if (isTeacher) {
              const removeButton = appendTextElement(participant, "button", "Remove");
              removeButton.type = "button";
              removeButton.className = "delete-btn";
              removeButton.dataset.activity = name;
              removeButton.dataset.email = email;
              removeButton.addEventListener("click", handleUnregister);
            }
            participantsList.appendChild(participant);
          });
          participantsContainer.appendChild(participantsList);
        }
        activityCard.appendChild(participantsContainer);
        activitiesList.appendChild(activityCard);

        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.textContent =
        "Failed to load activities. Please try again later.";
      console.error("Error fetching activities:", error);
    }
  }

  async function handleUnregister(event) {
    const button = event.currentTarget;
    const activity = button.dataset.activity;
    const email = button.dataset.email;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "An error occurred", "error");
        return;
      }

      showMessage(result.message, "success");
      await fetchActivities();
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  loginToggle.addEventListener("click", () => {
    const isHidden = loginPanel.classList.toggle("hidden");
    loginToggle.setAttribute("aria-expanded", String(!isHidden));
    if (!isHidden) loginForm.elements.username.focus();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const credentials = {
      username: loginForm.elements.username.value,
      password: loginForm.elements.password.value,
    };

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "Login failed", "error");
        return;
      }

      loginForm.reset();
      loginPanel.classList.add("hidden");
      loginToggle.setAttribute("aria-expanded", "false");
      setTeacherState(true, result.username);
      showMessage("Teacher login successful", "success");
      await fetchActivities();
    } catch (error) {
      showMessage("Failed to log in. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "Logout failed", "error");
        return;
      }

      setTeacherState(false);
      showMessage(result.message, "success");
      await fetchActivities();
    } catch (error) {
      showMessage("Failed to log out. Please try again.", "error");
      console.error("Error logging out:", error);
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const activity = activitySelect.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "An error occurred", "error");
        return;
      }

      showMessage(result.message, "success");
      signupForm.reset();
      await fetchActivities();
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  async function initialize() {
    try {
      const response = await fetch("/auth/session");
      if (!response.ok) throw new Error("Session request failed");
      const session = await response.json();
      setTeacherState(session.authenticated, session.username);
    } catch (error) {
      showMessage("Could not verify teacher login status.", "error");
      console.error("Error checking teacher session:", error);
    }
    await fetchActivities();
  }

  initialize();
});
