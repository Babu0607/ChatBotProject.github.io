console.log("Hello WebChat.");

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("btnSend");
const resetBtn = document.getElementById("btnReset");
const timerEl = document.getElementById("timer");

let appData = null; // Single data source coming from the JSON

// --- Data Loading ---
async function LoadChatData() {
  try {
    const response = await fetch("./questionsData.json");
    appData = await response.json();
    console.log("Chat data loaded successfully.");
  } catch (error) {
    console.error("Failed to load chat data:", error);
  }
}

let state = {
  currentCategoryId: null,
  waitingForContinue: false,
  lastProcessedMessage: "",
  lastQuestionId: null
};

// --- Helper Functions (Timer, HTML, etc) ---
function updateTimer() {
  if (!timerEl) return;
  const now = new Date();
  const options = { 
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  };
  timerEl.textContent = now.toLocaleString('en-US', options);
}

function startTimer() {
  updateTimer(); 
  setInterval(updateTimer, 1000);
}

function escapeHtml(str) {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// --- Message Engine ---
async function addMessage(sender, text, delay = 0) {
  if (sender === "bot" && delay > 0) {
    const indicator = document.createElement("div");
    indicator.className = "msg bot typing-indicator";
    indicator.innerHTML = `
      <img class="avatar" src="images/bot.png">
      <div class="bubble typing-dots"><span></span><span></span><span></span></div>
    `;
    chatEl.appendChild(indicator);
    chatEl.scrollTop = chatEl.scrollHeight;

    await new Promise(resolve => setTimeout(resolve, delay));
    indicator.remove();
  } 
  
  if (sender === "user") {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  renderMessage(sender, text);
}

function renderMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `msg ${sender}`;
  const avatarSrc = sender === "bot" ? "images/bot.png" : "images/user.png";
  
  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  msg.innerHTML = `
    ${sender === "bot" ? `<img class="avatar" src="${avatarSrc}">` : ""}
    <div class="bubble">
      <div class="message-text">${escapeHtml(text)}</div>
      <div class="timestamp">${timeString}</div>
    </div>
    ${sender === "user" ? `<img class="avatar" src="${avatarSrc}">` : ""}
  `;

  chatEl.appendChild(msg);
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
}

function addButtons(buttons) {
  const wrap = document.createElement("div");
  wrap.className = "quick-actions";

  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = b.label;
    btn.addEventListener("click", () => b.onClick());
    wrap.appendChild(btn);
  });

  chatEl.appendChild(wrap);
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
}

// --- Application Logic (Refactored for appData) ---

async function showWelcome() {
  state.currentCategoryId = null;
  state.waitingForContinue = false;
  state.lastProcessedMessage = "";
  state.lastQuestionId = null;
  chatEl.innerHTML = ""; 

  await addMessage("bot", "Welcome to the Online Store Assistant!", 600);
  
  addButtons([
    { 
      label: "Get Started", 
      onClick: async () => {
        await addMessage("user", "Get Started");
        await addMessage("bot", "Great! How can I help you today? Please choose a topic:", 1000);
        showMainMenu(); 
      } 
    }
  ]);
}

function showMainMenu() {
  if (!appData || !appData.mainMenu) {
    console.error("Menu data not found. Ensure LoadChatData finished successfully.");
    return;
  }

  const btns = appData.mainMenu.map((item) => ({
    label: item.label,
    onClick: () => handleCategory(item.id)
  }));

  addButtons(btns);
}

async function handleCategory(categoryId) {
  state.currentCategoryId = categoryId;
  const cat = appData.categories[categoryId];

  await addMessage("user", cat.title);
  await addMessage("bot", `Here are the questions for ${cat.title}:`, 1000);

  showCategoryQuestions(categoryId);
}

function showCategoryQuestions(categoryId) {
  const cat = appData.categories[categoryId];
  
  const btns = cat.questions.map((q) => ({
    label: q.label,
    onClick: () => handleQuestion(categoryId, q.id, true)
  }));

  btns.push({ 
    label: "Other Topics", 
    onClick: () => {
        addMessage("bot", "What else can I help with?");
        showMainMenu(); 
    } 
  });
  
  addButtons(btns);
}

async function handleQuestion(categoryId, questionId, fromButton = false) {
  if (state.lastQuestionId === questionId) return;
  state.lastQuestionId = questionId;

  const cat = appData.categories[categoryId];
  const q = cat.questions.find((x) => x.id === questionId);

  if (fromButton) {
    await addMessage("user", q.label);
  }
  
  await addMessage("bot", q.answer, 1200);
  await askContinue(categoryId);
}

async function askContinue(categoryId) {
  state.waitingForContinue = true;
  await addMessage("bot", "Do you need help with anything else?", 800);
  addButtons([
    { label: "Yes (Main Menu)", onClick: () => showWelcome() },
    { label: "No (End Chat)", onClick: () => endChat() },
    { label: "Back to " + appData.categories[categoryId].title, onClick: () => {
      addMessage("bot", `Here are the questions for ${appData.categories[categoryId].title}:`, 1000);
      showCategoryQuestions(categoryId);
    }}
  ]);
}

async function endChat() {
  state.waitingForContinue = false;
  await addMessage("bot", "Thanks! Have a great day! 😊", 1000);
}

async function handleTypedMessage(rawText) {
  const text = (rawText || "").toLowerCase().trim();
  if (!text || !appData) return;

  if (state.lastProcessedMessage === text) return;
  state.lastProcessedMessage = text;

  await addMessage("user", rawText);

  if (state.currentCategoryId) {
    const currentCategory = appData.categories[state.currentCategoryId];
    const matchedQuestion = currentCategory.questions.find(q => 
      q.label.toLowerCase() === text || 
      text.includes(q.label.toLowerCase()) ||
      (q.keywords && q.keywords.some(keyword => text.includes(keyword)))
    );
    
    if (matchedQuestion) {
      await handleQuestion(state.currentCategoryId, matchedQuestion.id, false);
      return;
    }
  }

  // Smart search across categories
  const categories = ["delivery", "returns", "size", "orders", "payments", "contact"];
  for (const catId of categories) {
    if (text.includes(catId) && state.currentCategoryId !== catId) {
      await showCategoryQuestionsFromTyped(catId);
      return;
    }
  }
  
  if (state.currentCategoryId) {
    await addMessage("bot", "I didn't understand that question. Please choose from the options below:", 1000);
    showCategoryQuestions(state.currentCategoryId);
    return;
  }
  
  await addMessage("bot", "I'm not sure I understand. Try picking a topic below!", 1000);
  showMainMenu();
}

async function showCategoryQuestionsFromTyped(categoryId) {
  state.currentCategoryId = categoryId;
  const cat = appData.categories[categoryId];
  await addMessage("bot", `Here are the questions for ${cat.title}:`, 1000);
  showCategoryQuestions(categoryId);
}

function wireEvents() {
  sendBtn.addEventListener("click", async () => {
    const v = inputEl.value;
    inputEl.value = "";
    await handleTypedMessage(v);
  });

  inputEl.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const v = inputEl.value;
      inputEl.value = "";
      await handleTypedMessage(v);
    }
  });

  resetBtn.addEventListener("click", () => {
    if (confirm("Are you sure you would like to restart the chat?")) showWelcome();
  });
}

// --- Initialization ---
LoadChatData().then(() => {
  startTimer();
  wireEvents();
  showWelcome();
});