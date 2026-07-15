(() => {
  const SUPPORT_EMAIL = "customersupport@dynamicecohome.com";

  function getVisitorId() {
    let visitorId = localStorage.getItem("dynamicDanVisitorId");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("dynamicDanVisitorId", visitorId);
    }
    return visitorId;
  }

  function linkify(text) {
    const escaped = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    return escaped.replace(/(https:\/\/dynamicecohome\.com[^\s]*)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function createWidget() {
    const launcher = document.createElement("button");
    launcher.className = "dd-launcher";
    launcher.setAttribute("aria-label", "Open Dynamic Dan chat");
    launcher.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 5.75A3.75 3.75 0 0 1 7.75 2h8.5A3.75 3.75 0 0 1 20 5.75v6.5A3.75 3.75 0 0 1 16.25 16H11l-5.3 4.24A1 1 0 0 1 4 19.46V5.75Z" fill="currentColor"/>
      </svg>
    `;

    const widget = document.createElement("section");
    widget.className = "dd-widget";
    widget.setAttribute("aria-label", "Dynamic Dan chat widget");

    widget.innerHTML = `
      <header class="dd-header">
        <div class="dd-avatar" aria-hidden="true">🌿</div>
        <div class="dd-title-wrap">
          <p class="dd-title">Dynamic Dan</p>
          <div class="dd-subtitle">Dynamic EcoHome Support</div>
        </div>
        <button class="dd-close" aria-label="Close chat">×</button>
      </header>

      <div class="dd-messages" id="ddMessages">
        <div class="dd-message dd-agent-message">
          <div class="dd-bubble">Hi, I’m Dynamic Dan. How can I help with Dynamic EcoHome services today?</div>
        </div>
        <div class="dd-typing" id="ddTyping" aria-hidden="true">
          <span class="dd-dot"></span>
          <span class="dd-dot"></span>
          <span class="dd-dot"></span>
        </div>
      </div>

      <form class="dd-lead-form" id="ddLeadForm">
        <div class="dd-small">For pricing, please share your name and phone number so a Dynamic EcoHome teammate can follow up with accurate details.</div>
        <div class="dd-lead-row">
          <input id="ddLeadName" name="name" placeholder="Your name" autocomplete="name" required />
          <input id="ddLeadPhone" name="phone" placeholder="Phone number" autocomplete="tel" required />
        </div>
        <button type="submit">Send my info</button>
      </form>

      <form class="dd-form" id="ddForm">
        <input class="dd-input" id="ddInput" placeholder="Ask a question..." autocomplete="off" />
        <button class="dd-send" type="submit">Send</button>
      </form>
    `;

    document.body.appendChild(widget);
    document.body.appendChild(launcher);
    return { widget, launcher };
  }

  const { widget, launcher } = createWidget();
  const closeButton = widget.querySelector(".dd-close");
  const messages = widget.querySelector("#ddMessages");
  const typing = widget.querySelector("#ddTyping");
  const form = widget.querySelector("#ddForm");
  const input = widget.querySelector("#ddInput");
  const leadForm = widget.querySelector("#ddLeadForm");
  const leadName = widget.querySelector("#ddLeadName");
  const leadPhone = widget.querySelector("#ddLeadPhone");
  let lastPricingQuestion = "";

  function openWidget() {
    widget.classList.add("dd-open");
    input.focus();
  }

  function addMessage(text, sender = "agent") {
    const row = document.createElement("div");
    row.className = `dd-message dd-${sender}-message`;
    const bubble = document.createElement("div");
    bubble.className = "dd-bubble";
    if (sender === "agent") bubble.innerHTML = linkify(text);
    else bubble.textContent = text;
    row.appendChild(bubble);
    messages.insertBefore(row, typing);
    messages.scrollTop = messages.scrollHeight;
  }

  function setTyping(isTyping) {
    typing.classList.toggle("dd-visible", isTyping);
    messages.scrollTop = messages.scrollHeight;
  }

  async function askDynamicDan(message) {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, pageUrl: window.location.href, visitorId: getVisitorId() })
    });
    if (!response.ok) throw new Error("Chat request failed.");
    return response.json();
  }

  async function sendLead(name, phone) {
    const response = await fetch("/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, question: lastPricingQuestion, pageUrl: window.location.href, visitorId: getVisitorId() })
    });
    if (!response.ok) throw new Error("Lead request failed.");
    return response.json();
  }

  launcher.addEventListener("click", () => {
    widget.classList.toggle("dd-open");
    if (widget.classList.contains("dd-open")) input.focus();
  });

  closeButton.addEventListener("click", () => widget.classList.remove("dd-open"));

  document.querySelectorAll("[data-question]").forEach((button) => {
    button.addEventListener("click", () => {
      openWidget();
      input.value = button.dataset.question;
      form.requestSubmit();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = input.value.trim();
    if (!message) return;

    input.value = "";
    addMessage(message, "user");
    setTyping(true);

    try {
      const result = await askDynamicDan(message);
      setTyping(false);
      addMessage(result.answer || `I'm not completely sure about that, but let me connect you with a human teammate. You can reach us at ${SUPPORT_EMAIL}.`, "agent");

      if (result.action === "collect_lead") {
        lastPricingQuestion = message;
        leadForm.classList.add("dd-visible");
        leadName.focus();
      }
    } catch {
      setTyping(false);
      addMessage(`I'm not completely sure about that, but let me connect you with a human teammate. You can reach us at ${SUPPORT_EMAIL}.`, "agent");
    }
  });

  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = leadName.value.trim();
    const phone = leadPhone.value.trim();

    if (!name || !phone) return;

    try {
      await sendLead(name, phone);
      addMessage("Thanks. A Dynamic EcoHome teammate can follow up with accurate details.", "agent");
      leadForm.classList.remove("dd-visible");
      leadName.value = "";
      leadPhone.value = "";
    } catch {
      addMessage(`I could not save that just now. Please contact us at ${SUPPORT_EMAIL}.`, "agent");
    }
  });
})();
