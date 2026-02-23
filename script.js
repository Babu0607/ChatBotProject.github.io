console.log("Hello WebChat.");

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("userInput");
const sendBtn = document.getElementById("btnSend");
const resetBtn = document.getElementById("btnReset");

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
        { id: "del_time", label: "What is the delivery time?", answer: "Delivery usually takes 3–5 business days." },
        { id: "free_ship", label: "Do you offer free shipping?", answer: "Yes, we offer free shipping on orders over €50." },
        { id: "track_order", label: "How can I track my order?", answer: "You can track your order using the tracking link sent to your email." },
        { id: "intl_ship", label: "Do you ship internationally?", answer: "Yes, we ship to over 50 countries! International delivery takes 7–14 business days." }
      ]
    },
    returns: {
      title: "Returns & Refunds",
      questions: [
        { id: "return_item", label: "How can I return an item?", answer: "You can return items within 14 days. Please fill out the form on our site." },
        { id: "refund_time", label: "When will I receive my refund?", answer: "Refunds are processed within 5 business days after receipt." },
        { id: "exchange_item", label: "Can I exchange an item?", answer: "Yes! Request an exchange through our return portal within 14 days." }
      ]
    },
    size: {
      title: "Size Guide",
      questions: [
        { id: "know_size", label: "How do I know my size?", answer: "Check our size guide available on each product page." },
        { id: "between_sizes", label: "What if I'm between sizes?", answer: "We recommend sizing up for a more comfortable fit." }
      ]
    },
    orders: {
      title: "Orders",
      questions: [
        { id: "cancel_order", label: "Can I cancel my order?", answer: "Orders can be cancelled within 1 hour after purchase." },
        { id: "change_address", label: "Can I change my shipping address?", answer: "Contact us within 1 hour of ordering to update your details." }
      ]
    },
    payments: {
      title: "Payments",
      questions: [
        { id: "methods", label: "What payment methods do you accept?", answer: "We accept Visa, MasterCard, PayPal, and Apple Pay." },
        { id: "installments", label: "Can I pay in installments?", answer: "We are currently working on adding installment options soon!" }
      ]
    },
    contact: {
      title: "Contact Support",
      questions: [
        { id: "contact_how", label: "How can I contact support?", answer: SUPPORT_INFO },
        { id: "store_location", label: "Do you have physical stores?", answer: "We are 100% online. Our HQ is in Dublin, Ireland." }
      ]
    }
  }
    
};

let state = {
  currentCategoryId: null,
  waitingForContinue: false
};

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
  
  msg.innerHTML = `
    ${sender === "bot" ? `<img class="avatar" src="${avatarSrc}">` : ""}
    <div class="bubble">${escapeHtml(text)}</div>
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
  // REMOVE: chatEl.innerHTML = ""; <--- Delete this line if it's there!
  
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

  const btns = cat.questions.map((q) => ({
    label: q.label,
    onClick: () => handleQuestion(categoryId, q.id)
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

async function handleQuestion(categoryId, questionId) {
  const cat = DATA.categories[categoryId];
  const q = cat.questions.find((x) => x.id === questionId);

  await addMessage("user", q.label);
  await addMessage("bot", q.answer, 1200);
  await askContinue();
}

async function askContinue() {
  state.waitingForContinue = true;
  await addMessage("bot", "Do you need help with anything else?", 800);
  addButtons([
    { label: "Yes (Main Menu)", onClick: () => showWelcome() },
    { label: "No (End Chat)", onClick: () => endChat() }
  ]);
}

async function endChat() {
  state.waitingForContinue = false;
  await addMessage("bot", "Thanks! Have a great day! 😊", 1000);
}

async function handleTypedMessage(rawText) {
  const text = (rawText || "").toLowerCase().trim();
  if (!text) return;

  await addMessage("user", rawText);

  //Expanded Keyword matching
  if (text.includes("delivery") || text.includes("ship")) { await handleCategory("delivery"); return; }
  if (text.includes("return") || text.includes("refund") || text.includes("exchange")) { await handleCategory("returns"); return; }
  if (text.includes("size") || text.includes("fit")) { await handleCategory("size"); return; }
  if (text.includes("order") || text.includes("address")) { await handleCategory("orders"); return; }
  if (text.includes("pay") || text.includes("visa") || text.includes("money")) { await handleCategory("payments"); return; }
  if (text.includes("contact") || text.includes("support") || text.includes("location")) { await handleCategory("contact"); return; }
  
  await addMessage("bot", "I'm not sure I understand. Try picking a topic below!", 1000);
  showMainMenu();
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

wireEvents();
showWelcome();