console.log("Hello WebChat.");

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("btnSend");
const resetBtn = document.getElementById("btnReset");
const timerEl = document.getElementById("timer"); // Add this to your HTML

const SUPPORT_INFO = "You can contact us at support@store.com or call +353 123 4567 during business hours (Mon–Fri, 9:00–17:00).";

const DATA = {
  mainMenu: [
    { id: "delivery", label: "Delivery" },
    { id: "returns", label: "Returns" },
    { id: "size", label: "Size Guide" },
    { id: "orders", label: "Orders" },
    { id: "payments", label: "Payments" },
    { id: "contact", label: "Contact Support" },
  ],

  categories: {
    delivery: {
      title: "Delivery",
      questions: [
        { id: "del_time", label: "What is the delivery time?", answer: "Delivery usually takes 3–5 business days.", keywords: ["delivery time", "how long", "shipping time"] },
        { id: "free_ship", label: "Do you offer free shipping?", answer: "Yes, we offer free shipping on orders over €50.", keywords: ["free shipping", "free delivery"] },
        { id: "track_order", label: "How can I track my order?", answer: "You can track your order using the tracking link sent to your email.", keywords: ["track", "tracking"] },
        { id: "intl_ship", label: "Do you ship internationally?", answer: "Yes, we ship to over 50 countries! International delivery takes 7–14 business days.", keywords: ["international", "worldwide", "abroad"] }
      ]
    },
    returns: {
      title: "Returns & Refunds",
      questions: [
        { id: "return_item", label: "How can I return an item?", answer: "You can return items within 14 days. Please fill out the form on our site.", keywords: ["return item", "how to return"] },
        { id: "refund_time", label: "When will I receive my refund?", answer: "Refunds are processed within 5 business days after receipt.", keywords: ["refund time", "refund status"] },
        { id: "exchange_item", label: "Can I exchange an item?", answer: "Yes! Request an exchange through our return portal within 14 days.", keywords: ["exchange", "swap"] }
      ]
    },
    size: {
      title: "Size Guide",
      questions: [
        { id: "know_size", label: "How do I know my size?", answer: "Check our size guide available on each product page.", keywords: ["my size", "what size", "size guide"] },
        { id: "between_sizes", label: "What if I'm between sizes?", answer: "We recommend sizing up for a more comfortable fit.", keywords: ["between sizes", "in between", "size up"] }
      ]
    },
    orders: {
      title: "Orders",
      questions: [
        { id: "cancel_order", label: "Can I cancel my order?", answer: "Orders can be cancelled within 1 hour after purchase.", keywords: ["cancel order", "cancellation"] },
        { id: "change_address", label: "Can I change my shipping address?", answer: "Contact us within 1 hour of ordering to update your details.", keywords: ["change address", "update address"] }
      ]
    },
    payments: {
      title: "Payments",
      questions: [
        { id: "methods", label: "What payment methods do you accept?", answer: "We accept Visa, MasterCard, PayPal, and Apple Pay.", keywords: ["payment methods", "what payment", "credit card"] },
        { id: "installments", label: "Can I pay in installments?", answer: "We are currently working on adding installment options soon!", keywords: ["installments", "pay in parts", "split payment"] }
      ]
    },
    contact: {
      title: "Contact Support",
      questions: [
        { id: "contact_how", label: "How can I contact support?", answer: SUPPORT_INFO, keywords: ["contact support", "customer service", "talk to someone"] },
        { id: "store_location", label: "Do you have physical stores?", answer: "We are 100% online. Our HQ is in Dublin, Ireland.", keywords: ["physical store", "store location", "dublin"] }
      ]
    }
  }
    
};

let state = {
  currentCategoryId: null,
  waitingForContinue: false,
  lastProcessedMessage: "",
  lastQuestionId: null
};

// Timer function - English format
function updateTimer() {
  if (!timerEl) return;
  
  const now = new Date();
  
  // English format: "March 10, 2026 23:26"
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  };
  
  const englishDate = now.toLocaleString('en-US', options);
  timerEl.textContent = englishDate;
}

// Start timer and update every second
function startTimer() {
  updateTimer(); 
  setInterval(updateTimer, 1000); // Update every second
}

function escapeHtml(str) {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// --- The Core Messaging Engine ---
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
  
  // Add timestamp to each message
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

// --- App Logic ---
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
  const btns = DATA.mainMenu.map((item) => ({
    label: item.label,
    onClick: () => handleCategory(item.id)
  }));
  addButtons(btns);
}

async function handleCategory(categoryId) {
  state.currentCategoryId = categoryId;
  const cat = DATA.categories[categoryId];

  //Add the user's choice to the history
  await addMessage("user", cat.title);
  
  //Add the bot's response below it
  await addMessage("bot", `Here are the questions for ${cat.title}:`, 1000);

  showCategoryQuestions(categoryId);
}

function showCategoryQuestions(categoryId) {
  const cat = DATA.categories[categoryId];
  
  const btns = cat.questions.map((q) => ({
    label: q.label,
    onClick: () => handleQuestion(categoryId, q.id, true) // true = from button click
  }));

  // Add a "Main Menu" button so they can switch topics without a reset
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
  // Prevent duplicate question handling
  if (state.lastQuestionId === questionId) {
    console.log("Duplicate question detected, skipping");
    return;
  }
  state.lastQuestionId = questionId;

  const cat = DATA.categories[categoryId];
  const q = cat.questions.find((x) => x.id === questionId);

  // Only add user message if it came from a button click
  // If it came from typed input, the user message is already added
  if (fromButton) {
    await addMessage("user", q.label);
  }
  
  await addMessage("bot", q.answer, 1200);
  await askContinue(categoryId);
}
//
async function askContinue(categoryId) {
  state.waitingForContinue = true;
  await addMessage("bot", "Do you need help with anything else?", 800);
  addButtons([
    { label: "Yes (Main Menu)", onClick: () => showWelcome() },
    { label: "No (End Chat)", onClick: () => endChat() },
    { label: "Back to " + DATA.categories[categoryId].title, onClick: () => {
      addMessage("bot", `Here are the questions for ${DATA.categories[categoryId].title}:`, 1000);
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
  if (!text) return;

  // Check if this message was just processed (prevents double processing)
  if (state.lastProcessedMessage === text) {
    console.log("Duplicate message detected, skipping");
    return;
  }
  state.lastProcessedMessage = text;

  // Add the user message once
  await addMessage("user", rawText);

  // If we're in a category, first check if the typed message matches any question in that category
  if (state.currentCategoryId) {
    const currentCategory = DATA.categories[state.currentCategoryId];
    
    //labels check for matching questions
    const matchedQuestion = currentCategory.questions.find(q => 
      q.label.toLowerCase() === text || 
      text.includes(q.label.toLowerCase()) ||
      (q.keywords && q.keywords.some(keyword => text.includes(keyword)))
    );
    
    if (matchedQuestion) {
      await handleQuestion(state.currentCategoryId, matchedQuestion.id, false); // false = from typed input
      return;
    }
  }

  // If no match in current category or no current category, check main categories
  // But only if we're not already in that category (prevents showing category questions twice)
  if ((text.includes("delivery") || text.includes("ship")) && state.currentCategoryId !== "delivery") { 
    await showCategoryQuestionsFromTyped("delivery");
    return; 
  }
  
  if ((text.includes("return") || text.includes("refund") || text.includes("exchange")) && state.currentCategoryId !== "returns") { 
    await showCategoryQuestionsFromTyped("returns");
    return; 
  }
  
  if ((text.includes("size") || text.includes("fit")) && state.currentCategoryId !== "size") { 
    await showCategoryQuestionsFromTyped("size");
    return; 
  }
  
  if ((text.includes("order") || text.includes("address") || text.includes("cancel")) && state.currentCategoryId !== "orders") { 
    await showCategoryQuestionsFromTyped("orders");
    return; 
  }
  
  if ((text.includes("pay") || text.includes("visa") || text.includes("money") || text.includes("card")) && state.currentCategoryId !== "payments") { 
    await showCategoryQuestionsFromTyped("payments");
    return; 
  }
  
  if ((text.includes("contact") || text.includes("support") || text.includes("location") || text.includes("store")) && state.currentCategoryId !== "contact") { 
    await showCategoryQuestionsFromTyped("contact");
    return; 
  }
  
  // If we're already in a category and none of the questions matched, show a helpful message
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
  const cat = DATA.categories[categoryId];
  
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
    if (confirm("Are you sure you would like to restart chat?")) showWelcome();
  });
}

// Start the timer when the page loads
startTimer();
wireEvents();
showWelcome();