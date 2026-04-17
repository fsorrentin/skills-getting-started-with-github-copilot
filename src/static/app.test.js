import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "./app.js";

function buildDom() {
  document.body.innerHTML = `
    <main>
      <section id="activities-container">
        <div id="activities-list"><p>Loading activities...</p></div>
      </section>
      <section id="signup-container">
        <form id="signup-form">
          <input type="email" id="email" required />
          <select id="activity" required>
            <option value="">-- Select an activity --</option>
          </select>
          <button type="submit">Sign Up</button>
        </form>
        <div id="message" class="hidden"></div>
      </section>
    </main>
  `;
}

function createResponse(payload, ok = true) {
  return {
    ok,
    async json() {
      return payload;
    },
  };
}

const initialActivities = {
  "Chess Club": {
    description: "Learn strategies and compete in chess tournaments",
    schedule: "Fridays, 3:30 PM - 5:00 PM",
    max_participants: 12,
    participants: ["michael@mergington.edu"],
  },
};

describe("frontend activity flows", () => {
  beforeEach(() => {
    buildDom();
  });

  it("refreshes the activity card after a successful signup", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(initialActivities))
      .mockResolvedValueOnce(
        createResponse({ message: "Signed up newstudent@mergington.edu for Chess Club" })
      )
      .mockResolvedValueOnce(
        createResponse({
          "Chess Club": {
            ...initialActivities["Chess Club"],
            participants: ["michael@mergington.edu", "newstudent@mergington.edu"],
          },
        })
      );

    const app = createApp({
      doc: document,
      fetchImpl: fetchMock,
      alertImpl: vi.fn(),
      timerImpl: vi.fn(),
    });

    await app.fetchActivities();

    document.getElementById("email").value = "newstudent@mergington.edu";
    document.getElementById("activity").value = "Chess Club";
    document
      .getElementById("signup-form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    await Promise.resolve();
    await Promise.resolve();

    const participants = Array.from(document.querySelectorAll(".participant-email")).map(
      (element) => element.textContent
    );

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/activities/Chess%20Club/signup?email=newstudent%40mergington.edu", { method: "POST" });
    expect(participants).toContain("newstudent@mergington.edu");
    expect(document.getElementById("activity").options).toHaveLength(2);
  });

  it("unregisters a participant from the activity card without a page refresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse({
          "Chess Club": {
            ...initialActivities["Chess Club"],
            participants: ["michael@mergington.edu", "newstudent@mergington.edu"],
          },
        })
      )
      .mockResolvedValueOnce(createResponse({ message: "Unregistered newstudent@mergington.edu from Chess Club" }))
      .mockResolvedValueOnce(createResponse(initialActivities));

    const app = createApp({
      doc: document,
      fetchImpl: fetchMock,
      alertImpl: vi.fn(),
      timerImpl: vi.fn(),
    });

    await app.fetchActivities();
    document.querySelector('[data-email="newstudent@mergington.edu"]').click();

    await Promise.resolve();
    await Promise.resolve();

    const participants = Array.from(document.querySelectorAll(".participant-email")).map(
      (element) => element.textContent
    );

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/activities/Chess%20Club/signup?email=newstudent%40mergington.edu", { method: "DELETE" });
    expect(participants).not.toContain("newstudent@mergington.edu");
  });
});