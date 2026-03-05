// Logs an initial message for debugging purposes
console.log("Hello WebChat.");

// DOM element selection for chat interaction
const chatEl = document.getElementById("chat");       // The container where messages are rendered
const inputEl = document.getElementById("userInput"); // The text input field
const sendBtn = document.getElementById("btnSend");   // The submit button
const resetBtn = document.getElementById("btnReset"); // The restart/clear button

// Knowledge base containing the menu structure, categories, and specific Q&As
//  Global variable to store JSON data
let appData = null;

//  Main function to load data before starting the chat
async function LoadChatData() {
  try {
    const response = await fetch("./questionsData.json");
    appData = await response.json(); // Store JSON content in the global variable
    
  } catch (error) {
    console.error("Failed to load chat data:", error);
  }
}

// State management to track the current conversation context
let state = {
  currentCategoryId: null,
  waitingForContinue: false
};

// Helper function to sanitize strings and prevent XSS (Cross-Site Scripting)
function escapeHtml(str) {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// --- The Core Messaging Engine ---

// Handles the logic of adding messages to the chat, including simulated typing delays
async function addMessage(sender, text, delay = 0) {
  if (sender === "bot" && delay > 0) {
    // Create and show a typing indicator (the three dots animation)
    const indicator = document.createElement("div");
    indicator.className = "msg bot typing-indicator";
    indicator.innerHTML = `
      <img class="avatar" src="images/bot.png">
      <div class="bubble typing-dots"><span></span><span></span><span></span></div>
    `;
    chatEl.appendChild(indicator);
    chatEl.scrollTop = chatEl.scrollHeight;

    // Pause execution to simulate the bot "thinking/typing"
    await new Promise(resolve => setTimeout(resolve, delay));
    indicator.remove(); // Remove indicator once the delay is over
  } 
  
  if (sender === "user") {
    // Slight delay for user messages to make transitions smoother
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  renderMessage(sender, text);
}

// Injects the message HTML into the DOM and handles the layout (avatars, bubbles)
function renderMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = `msg ${sender}`;
  const avatarSrc = sender === "bot" ? "images/bot.png" : "images/user.png";
  
  // Set the inner HTML based on whether the sender is the bot or the user
  msg.innerHTML = `
    ${sender === "bot" ? `<img class="avatar" src="${avatarSrc}">` : ""}
    <div class="bubble">${escapeHtml(text)}</div>
    ${sender === "user" ? `<img class="avatar" src="${avatarSrc}">` : ""}
  `;
  
  chatEl.appendChild(msg);
  // Auto-scroll to the bottom of the chat with a smooth animation
  chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' });
}

// Dynamically generates and displays clickable action buttons in the chat area
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

// --- App Logic ---

// Initializes the chat, clears history, and shows the initial welcome button
async function showWelcome() {
  state.currentCategoryId = null;
  state.waitingForContinue = false;
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

// Lists the main categories from the global appData as buttons
function showMainMenu() {
  if (!appData) {
    console.error("Menu data not found. Ensure LoadChatData finished successfully.");
    return;
  }

  // Use .map to transform each JSON item into a button object
  const btns = appData.mainMenu.map((item) => ({
    label: item.label,
    onClick: () => handleCategory(item.id)
  }));

  // Call addButtons once with the complete list
  addButtons(btns);
}

// Handles the transition when a user selects a main category (e.g., Returns)
async function handleCategory(categoryId) {
  state.currentCategoryId = categoryId;
  const cat = appData.categories[categoryId];

  // Log user choice and bot response)
  
  await addMessage("user", cat.title);
  await addMessage("bot", `Here are the questions for ${cat.title}:`, 1000);

  // Map category questions to buttons
  const btns = cat.questions.map((q) => ({
    label: q.label,
    onClick: () => handleQuestion(categoryId, q.id)
  }));

  // Append a navigation button to allow users to switch topics easily
  btns.push({ 
    label: "Other Topics", 
    onClick: async () => {
       await addMessage("bot", "What Can I Help You With?", 800);
       showMainMenu(); 
       state.currentCategoryId = null; // Reset category context to allow new selection
    } 
  });
  
  addButtons(btns);
}

// Retrieves and displays the answer for a specific question ID
async function handleQuestion(categoryId, questionId) {
  const cat = appData.categories[categoryId];
  const q = cat.questions.find((x) => x.id === questionId);

  await addMessage("user", q.label);
  await addMessage("bot", q.answer, 1200);
  await askContinue();
}

// Prompts the user to decide if they want to keep chatting or stop
async function askContinue() {
  state.waitingForContinue = true;
  await addMessage("bot", "Do you need help with anything else?", 800);
  addButtons([
    { label: "Yes (Main Menu)", onClick: () => showWelcome() },
    { label: "No (End Chat)", onClick: () => endChat() }
  ]);
}

// Ends the conversation flow
async function endChat() {
  state.waitingForContinue = false;
  state.currentCategoryId = null;
  await addMessage("bot", "Thanks! Have a great day! 😊", 1000);
}

// Processes manual text input by matching keywords against the available categories
async function handleTypedMessage(rawText) {
  // Normalize input: convert to lowercase and remove leading/trailing whitespace
  const text = (rawText || "").toLowerCase().trim();
  if (!text) return; // Exit if the input is empty or just spaces

  // Display the user's typed message in the chat UI
  await addMessage("user", rawText);
  
  // KEYWORD MATCHING LOGIC
  // Case 1: The user is at the Root level (No category selected yet)
  if (state.currentCategoryId == null) {
    // Check for broad keywords to trigger specific category flows
    if (text.includes("delivery") || text.includes("ship")) { await handleCategory("delivery"); return; }
    if (text.includes("return") || text.includes("refund") || text.includes("exchange")) { await handleCategory("returns"); return; }
    if (text.includes("size") || text.includes("fit")) { await handleCategory("size"); return; }
    if (text.includes("order") || text.includes("address")) { await handleCategory("orders"); return; }
    if (text.includes("pay") || text.includes("visa") || text.includes("money")) { await handleCategory("payments"); return; }
    if (text.includes("contact") || text.includes("support") || text.includes("location")) { await handleCategory("contact"); return; }
  }
  // Case 2: The user is already inside a specific category (Context-aware search)
  else {
    // Retrieve the current category data from the global object
    const cat = appData.categories[state.currentCategoryId];
    
    // Attempt to find a question within this category that matches the typed text
    // It compares the user's input against the labels defined in the JSON
    const matchedQuestion = cat.questions.find(q => text.includes(q.label.toLowerCase()));
    
    if (matchedQuestion) {
      // If a match is found, trigger the question handler automatically
      await handleQuestion(state.currentCategoryId, matchedQuestion.id);
      return;
    }
  }
  
  // Default fallback if no keywords match
  if (state.currentCategoryId == null) {
    await addMessage("bot", "Hi!, Please choose a topic so I can help you!", 1000);
    showMainMenu(); // Redirect to main menu if no category is selected
  }
  else if (text.includes("other") || text.includes("topic")) {
    await addMessage("bot", "Please choose a topic below so I can help you!", 1000);
    state.currentCategoryId = null; // Reset category context to allow new selection
    showMainMenu();
  }
  else {
    await addMessage("bot", "I'm not sure I understand. You may have typed something incorrectly.", 1000);
    handleCategory(state.currentCategoryId);
  }
}

// Attaches event listeners to the UI elements (Button clicks and keyboard 'Enter')
function wireEvents() {
  // Submit button click listener
  sendBtn.addEventListener("click", async () => {
    const v = inputEl.value;
    inputEl.value = "";
    await handleTypedMessage(v);
  });

  // Keyboard 'Enter' key listener
  inputEl.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const v = inputEl.value;
      inputEl.value = "";
      await handleTypedMessage(v);
    }
  });

  // Reset button click listener with confirmation dialog
  resetBtn.addEventListener("click", () => {
    if (confirm("Are you sure you would like to restart chat?")) showWelcome();
  });
}

// Execution Start
LoadChatData().then(() => {
  wireEvents();
  showWelcome();
});