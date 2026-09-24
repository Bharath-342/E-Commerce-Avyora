/* ==================================================
   AVYORA - AI SHOPPING CONCIERGE & STYLIST ENGINE
   File: src/ai-agent.js
   ================================================== */

const GEMINI_KEY_STORAGE = "avyora-gemini-api-key";
const GEMINI_MODEL_STORAGE = "avyora-gemini-model";
const CHAT_HISTORY_STORAGE = "avyora-ai-chat-history";
const AI_DISABLED_STORAGE = "avyora-ai-disabled";

const DEFAULT_MODEL = "gemini-1.5-flash";
const USD_TO_INR = 83.5;

/**
 * Format USD price to INR string
 */
function formatPriceINR(usd) {
  const inr = Math.round(Number(usd || 0) * USD_TO_INR);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(inr);
}

/**
 * Escape HTML to prevent injection
 */
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * High-precision Catalog NLP Search Engine
 */
function searchCatalog(rawQuery, catalog, options = {}) {
  if (!catalog || !catalog.length) return [];
  const query = String(rawQuery || "").toLowerCase().trim();
  if (!query) {
    if (options.maxPriceINR !== undefined || options.minPriceINR !== undefined) {
      return catalog.filter(p => {
        const inr = Math.round((p.price || 0) * USD_TO_INR);
        if (options.maxPriceINR !== undefined && inr > options.maxPriceINR) return false;
        if (options.minPriceINR !== undefined && inr < options.minPriceINR) return false;
        return true;
      });
    }
    return catalog.slice(0, 4);
  }

  // Common e-commerce synonyms and intent mappings
  const synonyms = {
    "phone": ["smartphones", "phone", "iphone", "mobile", "android", "cell"],
    "mobile": ["smartphones", "mobile", "phone", "iphone"],
    "laptop": ["laptops", "laptop", "macbook", "computer", "pc", "notebook"],
    "computer": ["laptops", "laptop", "pc"],
    "headphone": ["headphone", "audio", "earphone", "wireless", "sound", "music"],
    "earphone": ["headphone", "audio", "earbuds", "wireless"],
    "audio": ["headphone", "speaker", "audio", "sound"],
    "speaker": ["speaker", "audio", "sound", "home"],
    "sound": ["audio", "speaker", "headphone"],
    "watch": ["watch", "chronos", "timepiece", "gold", "watches"],
    "timepiece": ["watch", "chronos", "timepiece"],
    "shoes": ["shoes", "sneakers", "footwear", "running", "casual"],
    "sneakers": ["shoes", "sneakers", "footwear"],
    "footwear": ["shoes", "sneakers"],
    "shirt": ["shirt", "tee", "t-shirt", "top", "oxford", "casual"],
    "tee": ["shirt", "tee", "t-shirt", "top"],
    "dress": ["dress", "frock", "gown", "clothing", "womenswear"],
    "bag": ["bag", "handbag", "purse", "backpack", "carry", "tote"],
    "handbag": ["bag", "handbag", "purse"],
    "purse": ["bag", "handbag", "purse"],
    "perfume": ["fragrance", "perfume", "scent", "cologne", "beauty"],
    "cologne": ["fragrance", "perfume", "scent", "cologne"],
    "fragrance": ["fragrance", "perfume", "scent", "beauty"],
    "skincare": ["skin", "skincare", "cream", "moisturizer", "serum", "beauty", "face"],
    "cream": ["skin", "skincare", "cream", "beauty"],
    "moisturizer": ["skin", "skincare", "cream", "beauty"],
    "makeup": ["beauty", "lipstick", "mascara", "cosmetics", "eyeliner"],
    "cosmetics": ["beauty", "makeup", "skincare"],
    "jewel": ["jewelry", "jewelery", "ring", "necklace", "earring", "gold", "pearl", "silver"],
    "jewelry": ["jewelry", "jewelery", "ring", "necklace", "earring", "gold", "pearl", "silver"],
    "jewelery": ["jewelry", "jewelery", "ring", "necklace", "earring", "gold", "pearl"],
    "ring": ["ring", "jewelry", "jewelery", "gold"],
    "earrings": ["earring", "earrings", "pearl", "jewelry", "gold"],
    "gold": ["gold", "jewelry", "watch", "ring"],
    "pearl": ["pearl", "jewelry", "earring", "necklace"],
    "sunglasses": ["sunglass", "sunglasses", "glasses", "shades", "eyewear"],
    "shades": ["sunglasses", "sunglass"],
    "furniture": ["furniture", "sofa", "table", "chair", "bed", "home", "decor"],
    "lamp": ["lighting", "lamp", "light", "home"],
    "light": ["lighting", "lamp", "light"],
    "lighting": ["lighting", "lamp", "light"],
    "decor": ["home", "decor", "decoration", "ceramic", "lamp"],
    "coffee": ["groceries", "coffee", "beverage"],
    "groceries": ["groceries", "food", "kitchen", "snack"],
    "jacket": ["jacket", "coat", "outerwear", "menswear", "womenswear"],
    "coat": ["jacket", "coat", "outerwear"],
    "sweater": ["sweater", "knit", "cardigan", "warm", "alpaca"]
  };

  // Stop words to ignore for pure keyword matching
  const stopWords = new Set([
    "show", "me", "find", "looking", "for", "i", "want", "do", "you", "have", "any", "some",
    "the", "a", "an", "of", "in", "to", "and", "or", "is", "are", "can", "please", "what",
    "which", "with", "good", "best", "give", "display", "tell", "about", "need", "like",
    "curate", "suggest", "available", "store", "shop", "items", "item", "products", "product"
  ]);

  const rawTokens = query
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w));

  // Expand with synonyms
  const searchTokens = [...rawTokens];
  rawTokens.forEach(w => {
    if (synonyms[w]) {
      searchTokens.push(...synonyms[w]);
    }
  });

  const scored = catalog.map(p => {
    let score = 0;
    const title = (p.title || "").toLowerCase();
    const brand = (p.brand || "").toLowerCase();
    const cat = (p.category || "").toLowerCase();
    const dispCat = (p.displayCategory || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();
    const tags = Array.isArray(p.tags) ? p.tags.join(" ").toLowerCase() : "";

    // Full query matches
    if (title.includes(query)) score += 90;
    if (brand.includes(query)) score += 60;
    if (cat.includes(query) || dispCat.includes(query)) score += 50;
    if (tags.includes(query)) score += 40;

    // Token matches
    for (const token of searchTokens) {
      if (title.includes(token)) score += 30;
      if (brand.includes(token)) score += 20;
      if (cat.includes(token) || dispCat.includes(token)) score += 25;
      if (tags.includes(token)) score += 20;
      if (desc.includes(token)) score += 10;
    }

    // Rating boost (only for products that actually matched query keywords!)
    if (score > 0) {
      const rate = Number(p.rating?.rate || 4);
      score += rate * 2;
    }


    // Price constraints
    if (options.maxPriceINR !== undefined) {
      const inr = Math.round((p.price || 0) * USD_TO_INR);
      if (inr > options.maxPriceINR) score = -1;
    }
    if (options.minPriceINR !== undefined) {
      const inr = Math.round((p.price || 0) * USD_TO_INR);
      if (inr < options.minPriceINR) score = -1;
    }

    return { product: p, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.product);
}

class AvyoraAiAgent {
  constructor() {
    this.isOpen = false;
    this.isThinking = false;
    this.history = [];
    this.apiKey = localStorage.getItem(GEMINI_KEY_STORAGE) || "";
    this.model = localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_MODEL;
    this.hasUnread = !localStorage.getItem("avyora-ai-visited");
    this.isDisabled = localStorage.getItem(AI_DISABLED_STORAGE) === "true";

    this.init();
  }

  init() {
    this.renderWidget();
    this.bindEvents();
    this.loadHistory();
    this.updateStatusBadge();
    this.updateFooterEnableLink();

    if (this.isDisabled) {
      const widget = document.getElementById("avyoraAiWidget");
      if (widget) widget.style.display = "none";
    }
  }

  getStore() {
    return window.AvyoraStoreBridge || null;
  }

  getProducts() {
    const store = this.getStore();
    if (store && typeof store.getProducts === "function") {
      const items = store.getProducts();
      if (items && items.length) return items;
    }
    if (typeof window !== "undefined" && window.products && window.products.length) {
      return window.products;
    }
    return [
      { id: 1, title: "The Everyday Carry Bag", price: 89, category: "womenswear", displayCategory: "womens-bags", brand: "Avyora Studio", rating: { rate: 4.8, count: 124 }, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85", description: "Water-resistant canvas and vegetable-tanned leather trim.", tags: ["bag", "luxury", "canvas"] },
      { id: 2, title: "Studio Wireless Headphones", price: 100, category: "electronics", displayCategory: "audio", brand: "Acoustic Aura", rating: { rate: 4.9, count: 98 }, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85", description: "Active noise cancelling with 40-hour battery and spatial audio.", tags: ["headphones", "audio", "wireless"] },
      { id: 3, title: "Minimalist Gold Watch", price: 74, category: "accessories", displayCategory: "mens-watches", brand: "Chronos", rating: { rate: 4.7, count: 86 }, image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=85", description: "18k gold plated stainless steel casing with sapphire glass.", tags: ["watch", "gold", "luxury"] },
      { id: 4, title: "Relaxed Premium Tee", price: 36, category: "menswear", displayCategory: "mens-shirts", brand: "Atelier", rating: { rate: 4.6, count: 71 }, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85", description: "Heavyweight 240 GSM organic cotton with relaxed drop shoulders.", tags: ["shirt", "cotton", "t-shirt"] },
      { id: 5, title: "Cloud Knit Sweater", price: 58, category: "womenswear", displayCategory: "womens-dresses", brand: "Solace", rating: { rate: 4.8, count: 112 }, image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=85", description: "Ultra-soft alpaca blend knit for cold winter mornings.", tags: ["sweater", "knit", "warm"] },
      { id: 6, title: "Smart Home Speaker", price: 69, category: "electronics", displayCategory: "audio", brand: "Acoustic Aura", rating: { rate: 4.5, count: 64 }, image: "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=800&q=85", description: "360-degree room-filling acoustic sound with smart voice assistant.", tags: ["speaker", "smart", "home"] },
      { id: 7, title: "Pearl Accent Earrings", price: 42, category: "accessories", displayCategory: "womens-jewellery", brand: "Lumière", rating: { rate: 4.7, count: 55 }, image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=85", description: "Freshwater cultured pearls hand-set in sterling silver.", tags: ["earrings", "pearl", "jewelry"] },
      { id: 8, title: "Classic Oxford Shirt", price: 49, category: "menswear", displayCategory: "mens-shirts", brand: "Avyora Studio", rating: { rate: 4.6, count: 48 }, image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=85", description: "Tailored fit breathable Egyptian cotton for smart-casual wear.", tags: ["shirt", "oxford", "formal"] }
    ];
  }

  getCart() {
    const store = this.getStore();
    if (store && typeof store.getCart === "function") {
      return store.getCart();
    }
    try {
      return JSON.parse(localStorage.getItem("avyora-cart") || "[]");
    } catch (e) {
      return [];
    }
  }

  renderWidget() {
    if (document.getElementById("avyoraAiWidget")) return;

    const widget = document.createElement("div");
    widget.id = "avyoraAiWidget";
    widget.innerHTML = `
      <!-- Launcher Button -->
      <button type="button" class="avyora-ai-launcher" id="avyoraAiLauncher" aria-label="Open AI Shopping Concierge">
        <div class="avyora-ai-launcher-icon">
          <i class="bi bi-stars"></i>
          ${this.hasUnread ? '<span class="avyora-ai-launcher-dot" id="avyoraAiUnreadDot"></span>' : ""}
        </div>
        <div class="avyora-ai-launcher-label">
          <span class="avyora-ai-launcher-title">Avyora Concierge</span>
          <span class="avyora-ai-launcher-subtitle">Smart Shopping Assistant</span>
        </div>
      </button>

      <!-- Chat Dialog -->
      <div class="avyora-ai-dialog" id="avyoraAiDialog" role="dialog" aria-modal="true" aria-label="Avyora AI Chat">
        <!-- Header -->
        <div class="avyora-ai-header">
          <div class="avyora-ai-header-brand">
            <div class="avyora-ai-avatar">
              <i class="bi bi-robot"></i>
            </div>
            <div class="avyora-ai-header-info">
              <span class="avyora-ai-header-title">Avyora Concierge</span>
              <span class="avyora-ai-header-badge" id="avyoraAiStatus">
                <i class="bi bi-circle-fill"></i>
                <span id="avyoraAiStatusText">Live Catalog Ready</span>
              </span>
            </div>
          </div>
          <div class="avyora-ai-header-actions">
            <button type="button" class="avyora-ai-tool-btn" id="avyoraAiSettingsBtn" title="AI Settings">
              <i class="bi bi-gear-fill"></i>
            </button>
            <button type="button" class="avyora-ai-tool-btn" id="avyoraAiResetBtn" title="Reset Conversation">
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
            <button type="button" class="avyora-ai-tool-btn text-danger" id="avyoraAiDisableBtn" title="Turn Off AI Concierge">
              <i class="bi bi-power"></i>
            </button>
            <button type="button" class="avyora-ai-tool-btn" id="avyoraAiCloseBtn" title="Minimize Chat">
              <i class="bi bi-chevron-down"></i>
            </button>
          </div>
        </div>

        <!-- Quick Prompt Chips -->
        <div class="avyora-ai-chips-wrap">
          <div class="avyora-ai-chips">
            <button type="button" class="avyora-ai-chip" data-prompt="✨ What are your top trending products today?">
              <i class="bi bi-fire text-warning"></i> Trending
            </button>
            <button type="button" class="avyora-ai-chip" data-prompt="🎁 Find me curated gifts under ₹3,000">
              <i class="bi bi-gift text-primary"></i> Under ₹3k
            </button>
            <button type="button" class="avyora-ai-chip" data-prompt="📱 Show me smartphones and tech essentials">
              <i class="bi bi-phone text-info"></i> Phones &amp; Tech
            </button>
            <button type="button" class="avyora-ai-chip" data-prompt="⌚ Recommend luxury watches and jewelry">
              <i class="bi bi-gem" style="color:#eab308;"></i> Watches &amp; Gems
            </button>
            <button type="button" class="avyora-ai-chip" data-prompt="🏷️ What discount promo codes can I use today?">
              <i class="bi bi-tag text-success"></i> Discounts
            </button>
            <button type="button" class="avyora-ai-chip" data-prompt="📦 What is your shipping delivery time and return policy?">
              <i class="bi bi-truck text-secondary"></i> Delivery &amp; Returns
            </button>
            <button type="button" class="avyora-ai-chip" data-prompt="🛍️ What is in my shopping bag right now?">
              <i class="bi bi-bag"></i> My Bag
            </button>
          </div>
        </div>

        <!-- Body / Message stream -->
        <div class="avyora-ai-body" id="avyoraAiBody">
          <!-- Initial Welcome Message -->
          <div class="avyora-ai-msg avyora-ai-msg-bot">
            <div class="avyora-ai-msg-avatar">
              <i class="bi bi-stars"></i>
            </div>
            <div class="avyora-ai-msg-content">
              <div class="avyora-ai-bubble">
                <p><strong>Welcome to Avyora!</strong> I am your personal shopping concierge and catalog stylist.</p>
                <p>Ask me to find products by budget, style, category, check your cart, or answer shipping &amp; discount questions. How can I assist you today?</p>
              </div>
              <span class="avyora-ai-time">Just now</span>
            </div>
          </div>
        </div>

        <!-- Footer / Input Form -->
        <div class="avyora-ai-footer">
          <form class="avyora-ai-input-form" id="avyoraAiForm">
            <input 
              type="text" 
              class="avyora-ai-input" 
              id="avyoraAiInput" 
              placeholder="Ask about products, gifts, orders, discounts..." 
              autocomplete="off"
              maxlength="400"
            />
            <button type="submit" class="avyora-ai-send-btn" id="avyoraAiSendBtn" title="Send message">
              <i class="bi bi-send-fill"></i>
            </button>
          </form>
          <div class="avyora-ai-footer-note">
            <span class="avyora-ai-footer-engine" id="avyoraAiEngineToggle">
              <i class="bi bi-shield-check text-success"></i> <span id="avyoraAiEngineLabel">Smart Catalog Engine</span>
            </span>
            <span class="avyora-ai-turnoff-link" id="avyoraAiQuickTurnoff">
              <i class="bi bi-eye-slash"></i> Turn off AI
            </span>
          </div>
        </div>

        <!-- Settings Modal Overlay -->
        <div class="avyora-ai-settings-modal" id="avyoraAiSettingsModal">
          <div class="avyora-ai-settings-header">
            <div class="avyora-ai-settings-title">
              <i class="bi bi-sliders text-primary"></i> AI Concierge Settings
            </div>
            <button type="button" class="avyora-ai-tool-btn" id="avyoraAiSettingsCloseBtn">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="avyora-ai-settings-body">
            <div class="avyora-ai-settings-group">
              <label class="avyora-ai-settings-label">Visibility Control</label>
              <span class="avyora-ai-settings-desc">
                If you prefer browsing without the floating assistant, you can turn it off completely.
              </span>
              <button type="button" class="avyora-ai-btn-disable" id="avyoraAiDisableFromSettingsBtn">
                <i class="bi bi-power"></i> Turn Off AI Concierge
              </button>
            </div>

            <div class="avyora-ai-settings-group">
              <label class="avyora-ai-settings-label" for="avyoraGeminiKeyInput">Optional: Google Gemini API Key</label>
              <span class="avyora-ai-settings-desc">
                The smart built-in catalog engine works instantly with 0 setup. If you want full generative conversational reasoning, you can add an API key.
              </span>
              <input 
                type="password" 
                class="avyora-ai-settings-input" 
                id="avyoraGeminiKeyInput" 
                placeholder="AIzaSy..." 
                value="${escapeHtml(this.apiKey)}"
              />
            </div>

            <div class="avyora-ai-settings-group">
              <label class="avyora-ai-settings-label" for="avyoraGeminiModelSelect">Model</label>
              <select class="avyora-ai-model-select" id="avyoraGeminiModelSelect">
                <option value="gemini-1.5-flash" ${this.model === "gemini-1.5-flash" ? "selected" : ""}>Gemini 1.5 Flash (Fast)</option>
                <option value="gemini-2.0-flash" ${this.model === "gemini-2.0-flash" ? "selected" : ""}>Gemini 2.0 Flash (Next-Gen)</option>
              </select>
            </div>

            <div class="avyora-ai-settings-actions">
              <button type="button" class="avyora-ai-btn-save" id="avyoraAiSaveSettingsBtn">Save Settings</button>
              <button type="button" class="avyora-ai-btn-clear" id="avyoraAiClearKeyBtn">Clear Key</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);
  }

  bindEvents() {
    const launcher = document.getElementById("avyoraAiLauncher");
    const dialog = document.getElementById("avyoraAiDialog");
    const closeBtn = document.getElementById("avyoraAiCloseBtn");
    const resetBtn = document.getElementById("avyoraAiResetBtn");
    const disableBtn = document.getElementById("avyoraAiDisableBtn");
    const quickTurnoff = document.getElementById("avyoraAiQuickTurnoff");
    const disableFromSettingsBtn = document.getElementById("avyoraAiDisableFromSettingsBtn");
    const settingsBtn = document.getElementById("avyoraAiSettingsBtn");
    const settingsCloseBtn = document.getElementById("avyoraAiSettingsCloseBtn");
    const saveSettingsBtn = document.getElementById("avyoraAiSaveSettingsBtn");
    const clearKeyBtn = document.getElementById("avyoraAiClearKeyBtn");
    const settingsModal = document.getElementById("avyoraAiSettingsModal");
    const form = document.getElementById("avyoraAiForm");
    const input = document.getElementById("avyoraAiInput");
    const engineToggle = document.getElementById("avyoraAiEngineToggle");

    // Open / Close
    launcher?.addEventListener("click", () => this.toggleChat());
    closeBtn?.addEventListener("click", () => this.closeChat());

    // Disable / Turn Off
    const handleDisable = () => {
      if (confirm("Turn off the AI Concierge? You can re-enable it anytime from the footer of any page.")) {
        this.disableConcierge();
      }
    };

    disableBtn?.addEventListener("click", handleDisable);
    quickTurnoff?.addEventListener("click", handleDisable);
    disableFromSettingsBtn?.addEventListener("click", () => {
      settingsModal?.classList.remove("is-active");
      this.disableConcierge();
    });

    // Settings Modal
    settingsBtn?.addEventListener("click", () => settingsModal?.classList.add("is-active"));
    settingsCloseBtn?.addEventListener("click", () => settingsModal?.classList.remove("is-active"));
    engineToggle?.addEventListener("click", () => settingsModal?.classList.add("is-active"));

    // Save Settings
    saveSettingsBtn?.addEventListener("click", () => {
      const keyVal = document.getElementById("avyoraGeminiKeyInput").value.trim();
      const modelVal = document.getElementById("avyoraGeminiModelSelect").value;
      this.apiKey = keyVal;
      this.model = modelVal;
      if (keyVal) {
        localStorage.setItem(GEMINI_KEY_STORAGE, keyVal);
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE);
      }
      localStorage.setItem(GEMINI_MODEL_STORAGE, modelVal);
      settingsModal?.classList.remove("is-active");
      this.updateStatusBadge();
      this.appendBotMessage(
        keyVal
          ? `🌟 **Gemini API Connected!** Now running on **${modelVal}** with live reasoning.`
          : `✨ **Smart Catalog Engine Active!** Fast, private, local catalog intelligence.`
      );
    });

    clearKeyBtn?.addEventListener("click", () => {
      this.apiKey = "";
      localStorage.removeItem(GEMINI_KEY_STORAGE);
      const keyInput = document.getElementById("avyoraGeminiKeyInput");
      if (keyInput) keyInput.value = "";
      settingsModal?.classList.remove("is-active");
      this.updateStatusBadge();
      this.appendBotMessage("🔄 Switched back to instant built-in Smart Catalog engine.");
    });

    // Reset Chat
    resetBtn?.addEventListener("click", () => {
      if (confirm("Clear chat history and start fresh?")) {
        this.resetHistory();
      }
    });

    // Quick chips
    document.querySelectorAll(".avyora-ai-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const prompt = chip.dataset.prompt;
        if (prompt) {
          this.handleUserInput(prompt);
        }
      });
    });

    // Form submit
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || this.isThinking) return;
      input.value = "";
      this.handleUserInput(text);
    });

    // Delegate inline clicks (Add to Bag / Action Buttons)
    dialog?.addEventListener("click", (e) => {
      // Add to bag
      const addBtn = e.target.closest(".avyora-ai-product-btn");
      if (addBtn) {
        const prodId = Number(addBtn.dataset.productId);
        this.executeAddToCart(prodId, addBtn);
        return;
      }

      // Custom action buttons inside message bubbles
      const actionBtn = e.target.closest("[data-ai-action]");
      if (actionBtn) {
        const action = actionBtn.dataset.aiAction;
        if (action === "show-all-in-catalog") {
          const term = actionBtn.dataset.searchTerm || "";
          let ids = [];
          try {
            ids = JSON.parse(actionBtn.dataset.productIds || "[]");
          } catch (err) {
            ids = [];
          }
          this.showAllInCatalog(term, ids);
        } else if (action === "show-budget-usd") {
          const budget = Number(actionBtn.dataset.budgetUsd || 100);
          const term = actionBtn.dataset.searchTerm || "";
          this.handleUserInput(`under $${budget} ${term}`.trim());
        } else if (action === "disable-concierge") {
          this.disableConcierge();
        } else if (action === "open-cart") {
          this.executeOpenCart();
        } else if (action === "browse-catalog") {
          this.showAllInCatalog("");
        } else if (action === "view-checkout") {
          window.location.href = "checkout.html";
        }
      }
    });

    // Global listener for footer enable links
    document.addEventListener("click", (e) => {
      const enableTrigger = e.target.closest("#avyoraAiEnableLink, #avyoraAiFooterOpenLink");
      if (enableTrigger) {
        e.preventDefault();
        this.enableConcierge();
      }
    });
  }

  toggleChat() {
    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    this.isOpen = true;
    const dialog = document.getElementById("avyoraAiDialog");
    if (dialog) dialog.classList.add("is-open");

    // Remove unread dot
    if (this.hasUnread) {
      this.hasUnread = false;
      localStorage.setItem("avyora-ai-visited", "true");
      const dot = document.getElementById("avyoraAiUnreadDot");
      if (dot) dot.remove();
    }

    this.scrollToBottom();

    setTimeout(() => {
      const input = document.getElementById("avyoraAiInput");
      if (input && window.innerWidth > 576) input.focus();
    }, 200);
  }

  closeChat() {
    this.isOpen = false;
    const dialog = document.getElementById("avyoraAiDialog");
    if (dialog) dialog.classList.remove("is-open");
    const settingsModal = document.getElementById("avyoraAiSettingsModal");
    if (settingsModal) settingsModal.classList.remove("is-active");
  }

  showAllInCatalog(searchTerm = "", productIds = []) {
    this.closeChat();
    const cleanTerm = String(searchTerm || "").trim();

    const store = this.getStore();
    if (store && typeof store.showProductList === "function") {
      store.showProductList(productIds, cleanTerm);
      return;
    }

    if (store && typeof store.searchProducts === "function") {
      store.searchProducts(cleanTerm);
      return;
    }

    const productSearch = document.getElementById("productSearch");
    if (productSearch) {
      if (productIds && productIds.length) {
        sessionStorage.setItem("avyora-filtered-ids", JSON.stringify(productIds));
      } else {
        sessionStorage.removeItem("avyora-filtered-ids");
      }
      productSearch.value = cleanTerm;
      document.querySelectorAll("[data-product-search-form] input").forEach(input => { input.value = cleanTerm; });
      productSearch.dispatchEvent(new Event("input", { bubbles: true }));
      const gridSection = document.getElementById("product-edit") || document.getElementById("productGrid");
      if (gridSection) {
        gridSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      if (productIds && productIds.length) {
        sessionStorage.setItem("avyora-filtered-ids", JSON.stringify(productIds));
      }
      const targetUrl = cleanTerm
        ? `index.html?search=${encodeURIComponent(cleanTerm)}#product-edit`
        : `index.html#product-edit`;
      window.location.href = targetUrl;
    }
  }

  disableConcierge() {
    this.closeChat();
    this.isDisabled = true;
    localStorage.setItem(AI_DISABLED_STORAGE, "true");

    const widget = document.getElementById("avyoraAiWidget");
    if (widget) {
      widget.style.display = "none";
    }

    this.updateFooterEnableLink();
    this.showToast("AI Concierge turned off. You can re-enable it from the footer anytime.");
  }

  enableConcierge() {
    this.isDisabled = false;
    localStorage.removeItem(AI_DISABLED_STORAGE);

    const widget = document.getElementById("avyoraAiWidget");
    if (widget) {
      widget.style.display = "";
      this.openChat();
    } else {
      this.renderWidget();
      this.bindEvents();
      this.openChat();
    }

    this.updateFooterEnableLink();
    this.showToast("AI Concierge re-enabled!");
  }

  updateFooterEnableLink() {
    // Add or update an unobtrusive assistant trigger in footer
    const footerBottom = document.querySelector(".footer-bottom .container, .footer-container, footer .container");
    if (!footerBottom) return;

    let linkWrap = document.getElementById("avyoraAiFooterWrap");
    if (!linkWrap) {
      linkWrap = document.createElement("div");
      linkWrap.id = "avyoraAiFooterWrap";
      linkWrap.className = "text-center mt-2 small";
      footerBottom.appendChild(linkWrap);
    }

    if (this.isDisabled) {
      linkWrap.innerHTML = `
        <span style="color:var(--text-muted);font-size:0.75rem;">
          AI Shopping Concierge: <a href="#" id="avyoraAiEnableLink" style="color:var(--primary-color);text-decoration:underline;font-weight:600;">Enable Assistant</a>
        </span>
      `;
    } else {
      linkWrap.innerHTML = `
        <span style="color:var(--text-muted);font-size:0.75rem;">
          <a href="#" id="avyoraAiFooterOpenLink" style="color:var(--text-muted);text-decoration:none;">
            <i class="bi bi-stars" style="color:var(--primary-color)"></i> Need help? Chat with AI Concierge
          </a>
        </span>
      `;
    }
  }

  showToast(message) {
    const store = this.getStore();
    if (store && typeof store.showCartMessage === "function") {
      store.showCartMessage(message);
    } else {
      let toast = document.getElementById("avyoraAiToast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "avyoraAiToast";
        toast.className = "cart-toast";
        document.body.appendChild(toast);
      }
      toast.innerHTML = `<i class="bi bi-info-circle text-primary"></i> ${escapeHtml(message)}`;
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
      toast.style.pointerEvents = "auto";
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(12px)";
        toast.style.pointerEvents = "none";
      }, 3500);
    }
  }

  updateStatusBadge() {
    const statusText = document.getElementById("avyoraAiStatusText");
    const engineLabel = document.getElementById("avyoraAiEngineLabel");
    if (this.apiKey) {
      const label = this.model.includes("2.0") ? "Gemini 2.0" : "Gemini 1.5";
      if (statusText) statusText.textContent = `${label} Active`;
      if (engineLabel) engineLabel.textContent = `Powered by ${label}`;
    } else {
      if (statusText) statusText.textContent = "Live Catalog Ready";
      if (engineLabel) engineLabel.textContent = "Smart Catalog Engine";
    }
  }

  scrollToBottom() {
    const body = document.getElementById("avyoraAiBody");
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }

  appendUserMessage(text) {
    const body = document.getElementById("avyoraAiBody");
    if (!body) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const msgEl = document.createElement("div");
    msgEl.className = "avyora-ai-msg avyora-ai-msg-user";
    msgEl.innerHTML = `
      <div class="avyora-ai-msg-content">
        <div class="avyora-ai-bubble">
          <p>${escapeHtml(text)}</p>
        </div>
        <span class="avyora-ai-time">${now}</span>
      </div>
    `;

    body.appendChild(msgEl);
    this.scrollToBottom();
    this.saveHistory();
  }

  appendBotMessage(markdownText, productIds = [], actionBadge = null, customButtons = []) {
    const body = document.getElementById("avyoraAiBody");
    if (!body) return;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const formattedHtml = this.renderMarkdown(markdownText);

    // Build product cards HTML
    let productsHtml = "";
    if (productIds && productIds.length) {
      const catalog = this.getProducts();
      const matched = productIds
        .map(id => catalog.find(p => p.id === Number(id)))
        .filter(Boolean);

      if (matched.length) {
        productsHtml = `
          <div class="avyora-ai-product-cards">
            ${matched.map(product => `
              <div class="avyora-ai-product-card" data-product-id="${product.id}">
                <img src="${product.image}" alt="${escapeHtml(product.title)}" class="avyora-ai-product-img" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=120&q=80'" />
                <div class="avyora-ai-product-info">
                  <div class="d-flex align-items-center justify-content-between">
                    <span class="avyora-ai-product-brand">${escapeHtml(product.brand || product.category || "Avyora")}</span>
                    <span class="avyora-ai-product-rating text-muted" style="font-size:0.65rem;">
                      <i class="bi bi-star-fill text-warning"></i> ${product.rating?.rate || 4.7}
                    </span>
                  </div>
                  <a href="product.html?id=${product.id}" class="avyora-ai-product-title" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</a>
                  <div class="avyora-ai-product-meta">
                    <span class="avyora-ai-product-price">${formatPriceINR(product.price)}</span>
                    <button type="button" class="avyora-ai-product-btn" data-product-id="${product.id}">
                      <i class="bi bi-bag-plus"></i> Add to Bag
                    </button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        `;
      }
    }

    let buttonsHtml = "";
    if (customButtons && customButtons.length) {
      buttonsHtml = `
        <div class="avyora-ai-buttons-group">
          ${customButtons.map(btn => `
            <button type="button" 
              class="avyora-ai-action-btn ${btn.className || ""}" 
              data-ai-action="${escapeHtml(btn.action)}"
              ${btn.searchTerm !== undefined ? `data-search-term="${escapeHtml(btn.searchTerm)}"` : ""}
              ${btn.productIds ? `data-product-ids='${JSON.stringify(btn.productIds)}'` : ""}
              ${btn.budgetUSD !== undefined ? `data-budget-usd="${escapeHtml(btn.budgetUSD)}"` : ""}
            >
              ${btn.icon ? `<i class="${escapeHtml(btn.icon)} me-1"></i>` : ""}${escapeHtml(btn.label)}
            </button>
          `).join("")}
        </div>
      `;
    }

    const actionBadgeHtml = actionBadge
      ? `<div class="avyora-ai-action-badge"><i class="bi bi-check2-circle"></i> ${escapeHtml(actionBadge)}</div>`
      : "";

    const msgEl = document.createElement("div");
    msgEl.className = "avyora-ai-msg avyora-ai-msg-bot";
    msgEl.innerHTML = `
      <div class="avyora-ai-msg-avatar">
        <i class="bi bi-stars"></i>
      </div>
      <div class="avyora-ai-msg-content">
        <div class="avyora-ai-bubble">
          ${formattedHtml}
          ${actionBadgeHtml}
          ${productsHtml}
          ${buttonsHtml}
        </div>
        <span class="avyora-ai-time">${now}</span>
      </div>
    `;

    body.appendChild(msgEl);
    this.scrollToBottom();
    this.saveHistory();
  }

  showTyping() {
    if (document.getElementById("avyoraAiTypingIndicator")) return;
    const body = document.getElementById("avyoraAiBody");
    if (!body) return;
    const typing = document.createElement("div");
    typing.id = "avyoraAiTypingIndicator";
    typing.className = "avyora-ai-msg avyora-ai-msg-bot";
    typing.innerHTML = `
      <div class="avyora-ai-msg-avatar"><i class="bi bi-stars"></i></div>
      <div class="avyora-ai-typing">
        <div class="avyora-ai-typing-dot"></div>
        <div class="avyora-ai-typing-dot"></div>
        <div class="avyora-ai-typing-dot"></div>
      </div>
    `;
    body.appendChild(typing);
    this.scrollToBottom();
  }

  hideTyping() {
    const typing = document.getElementById("avyoraAiTypingIndicator");
    if (typing) typing.remove();
  }

  renderMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);

    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Italics: *text*
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary text-decoration-underline" target="_blank" rel="noopener">$1</a>');

    const lines = html.split("\n");
    let inList = false;
    let result = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        if (!inList) {
          result.push("<ul>");
          inList = true;
        }
        result.push(`<li>${trimmed.substring(2)}</li>`);
      } else {
        if (inList) {
          result.push("</ul>");
          inList = false;
        }
        if (trimmed) {
          result.push(`<p>${trimmed}</p>`);
        }
      }
    }
    if (inList) result.push("</ul>");

    return result.join("");
  }

  async handleUserInput(userText) {
    this.appendUserMessage(userText);
    this.isThinking = true;
    this.showTyping();

    try {
      if (this.apiKey) {
        await this.generateGeminiResponse(userText);
      } else {
        await this.generateLocalResponse(userText);
      }
    } catch (err) {
      console.warn("AI fallback triggered:", err);
      await this.generateLocalResponse(userText, true);
    } finally {
      this.hideTyping();
      this.isThinking = false;
    }
  }

  /**
   * Gemini Generative AI Engine with Live Catalog & Action Commands
   */
  async generateGeminiResponse(userText) {
    const catalog = this.getProducts().slice(0, 30);
    const cart = this.getCart();

    const catalogSummary = catalog
      .map(p => `ID:${p.id} | "${p.title}" | Cat:${p.category} (${p.displayCategory || ""}) | Price:${formatPriceINR(p.price)} ($${p.price}) | Rate:${p.rating?.rate || 4.5}`)
      .join("\n");

    const cartSummary = cart.length
      ? cart.map(i => `${i.quantity || 1}x ${i.title} (${formatPriceINR(i.price)})`).join(", ")
      : "Cart is empty.";

    const systemPrompt = `You are the Avyora AI Shopping Concierge & Stylist.
Currencies: Display prices in Indian Rupees (₹ INR).
Store policies:
- Flat standard shipping: ₹249 (free on orders over ₹2,500).
- 30-day hassle-free return guarantee with full refund.
- Active coupon codes: "WELCOME10" (10% off entire order), "SAVE15" (15% off 3-item bundles).
- Live Cart: ${cartSummary}

CATALOG SUMMARY:
${catalogSummary}

ACTION COMMANDS:
You can append action commands at the end of your response:
- To show interactive product cards: [[ACTION:SHOW_PRODUCTS:id1,id2,id3]]
- To add a product to cart: [[ACTION:ADD_TO_CART:productId]]
- To open the shopping bag: [[ACTION:OPEN_CART]]
- If user wants to disable or turn off the AI: [[ACTION:DISABLE_CONCIERGE]]

Keep replies concise, helpful, elegant, and formatted with markdown. ALWAYS include [[ACTION:SHOW_PRODUCTS:id1,id2]] when recommending products so product cards display!`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\nCustomer query: ${userText}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I apologize, I could not generate a response.";

    this.processAiResponseWithActions(rawText);
  }

  processAiResponseWithActions(rawText) {
    let cleanText = rawText;
    let productIds = [];
    let actionBadge = null;
    let customButtons = [];

    // 1. SHOW_PRODUCTS
    const showMatch = cleanText.match(/\[\[ACTION:SHOW_PRODUCTS:([0-9, ]+)\]\]/);
    if (showMatch) {
      productIds = showMatch[1].split(",").map(s => Number(s.trim())).filter(Boolean);
      cleanText = cleanText.replace(showMatch[0], "").trim();
    }

    // 2. ADD_TO_CART
    const addMatch = cleanText.match(/\[\[ACTION:ADD_TO_CART:([0-9]+)\]\]/);
    if (addMatch) {
      const prodId = Number(addMatch[1].trim());
      this.executeAddToCart(prodId);
      const product = this.getProducts().find(p => p.id === prodId);
      actionBadge = `Added "${product?.title || "Product"}" to your bag`;
      cleanText = cleanText.replace(addMatch[0], "").trim();
    }

    // 3. OPEN_CART
    const openCartMatch = cleanText.match(/\[\[ACTION:OPEN_CART\]\]/);
    if (openCartMatch) {
      this.executeOpenCart();
      actionBadge = "Shopping bag opened";
      cleanText = cleanText.replace(openCartMatch[0], "").trim();
    }

    // 4. DISABLE_CONCIERGE
    if (cleanText.includes("[[ACTION:DISABLE_CONCIERGE]]")) {
      cleanText = cleanText.replace("[[ACTION:DISABLE_CONCIERGE]]", "").trim();
      customButtons.push({
        label: "Turn Off AI Concierge Now",
        action: "disable-concierge",
        icon: "bi bi-eye-slash",
        className: "btn-outline-danger"
      });
    }

    this.appendBotMessage(cleanText, productIds, actionBadge, customButtons);
  }

  /**
   * Smart Local Catalog Engine (Works Offline / No API Key / Live Catalog Scored Search)
   */
  async generateLocalResponse(userText, isFallbackNotice = false) {
    // Conversational pacing delay
    await new Promise(r => setTimeout(r, 450));

    const q = userText.toLowerCase().trim();
    const catalog = this.getProducts();
    const cart = this.getCart();

    let reply = "";
    let productIds = [];
    let actionBadge = null;
    let customButtons = [];

    // 1. User wants to disable, remove, or turn off the AI
    if (
      q.includes("remove") ||
      q.includes("turn off") ||
      q.includes("disable") ||
      q.includes("delete") ||
      q.includes("hide") ||
      q.includes("get rid") ||
      q.includes("stop ai") ||
      q.includes("close ai")
    ) {
      reply = `I understand! If you prefer shopping without the AI Assistant, you can turn it off anytime. You can re-enable it whenever you need from the link in the footer.\n\nWould you like to turn it off right now?`;
      customButtons.push({
        label: "Turn Off AI Concierge",
        action: "disable-concierge",
        icon: "bi bi-power",
        className: "btn-outline-danger"
      });
      this.appendBotMessage(reply, [], null, customButtons);
      return;
    }

    // 2. Cart & Bag Inquiries
    if (q.includes("cart") || q.includes("bag") || q.includes("basket") || q.includes("checkout") || q.includes("total")) {
      // Check if user specifically asked to ADD to cart
      if (q.includes("add") || q.includes("buy") || q.includes("put in")) {
        // Handled in Add to Cart section below
      } else {
        if (!cart || !cart.length) {
          reply = `Your shopping bag is currently empty. Would you like me to recommend some of our verified bestsellers today?`;
          productIds = catalog.slice(0, 3).map(p => p.id);
          customButtons.push({
            label: "Explore Catalog",
            action: "browse-catalog",
            icon: "bi bi-grid"
          });
        } else {
          const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
          const subtotalUSD = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
          const bundleCount = Math.floor(totalCount / 3) * 3;
          const savingsNote = bundleCount >= 3 ? " (15% Bundle Discount applied!)" : " *(Tip: Add 3 items to get 15% automatic Bundle Savings)*";

          reply = `You have **${totalCount} item${totalCount === 1 ? "" : "s"}** in your shopping bag totaling **${formatPriceINR(subtotalUSD)}**:\n\n` +
            cart.map(i => `• **${i.quantity || 1}x ${i.title}** — ${formatPriceINR(i.price)}`).join("\n") +
            `\n\n${savingsNote}`;

          this.executeOpenCart();
          actionBadge = "Shopping bag opened";
          customButtons.push({
            label: "Proceed to Checkout",
            action: "view-checkout",
            icon: "bi bi-credit-card",
            className: "btn-primary"
          });
        }
        this.appendBotMessage(reply, productIds, actionBadge, customButtons);
        return;
      }
    }

    // 3. Add to Cart by query
    if (q.includes("add") || q.includes("buy")) {
      const cleanTerms = q
        .replace(/add|to|my|cart|bag|the|buy|please|now|put/gi, "")
        .trim();

      const matched = searchCatalog(cleanTerms, catalog);
      if (matched.length) {
        const topProduct = matched[0];
        this.executeAddToCart(topProduct.id);
        reply = `I have added **${topProduct.title}** (${formatPriceINR(topProduct.price)}) to your shopping bag!`;
        productIds = [topProduct.id];
        actionBadge = `Added "${topProduct.title}" to bag`;
        customButtons.push({
          label: "View Bag & Checkout",
          action: "open-cart",
          icon: "bi bi-bag-check"
        });
        this.appendBotMessage(reply, productIds, actionBadge, customButtons);
        return;
      }
    }

    // 4. Promo Codes & Discounts
    if (q.includes("discount") || q.includes("coupon") || q.includes("promo") || q.includes("voucher") || q.includes("code") || q.includes("sale") || q.includes("offer")) {
      reply = `**Active Promo Rewards at Avyora:**\n\n` +
        `• **WELCOME10**: **10% OFF** your entire order as a welcome guest.\n` +
        `• **SAVE15**: Automatic **15% OFF** when you select any 3 items together in the bundle builder.\n` +
        `• **CELESTIAL**: Special aura collection styling reward.\n` +
        `• **Free Standard Shipping** on all orders over ₹2,500!\n\n` +
        `Here are some featured favorites eligible for these offers:`;
      productIds = catalog.slice(0, 3).map(p => p.id);
      this.appendBotMessage(reply, productIds);
      return;
    }

    // 5. Shipping, Delivery & Tracking
    if (q.includes("shipping") || q.includes("delivery") || q.includes("deliver") || q.includes("courier") || q.includes("track") || q.includes("order status")) {
      reply = `**Avyora Delivery & Tracking Guarantee:**\n\n` +
        `• **Express Delivery:** Ships across India in **2–3 business days** via premium courier partners.\n` +
        `• **Shipping Fee:** Complimentary **Free Shipping** on orders over ₹2,500 (flat ₹249 on smaller orders).\n` +
        `• **Live Tracking:** Real-time tracking numbers and milestone updates are provided on your **Account** page immediately after dispatch.`;
      this.appendBotMessage(reply);
      return;
    }

    // 6. Returns, Refunds & Guarantees
    if (q.includes("return") || q.includes("refund") || q.includes("exchange") || q.includes("warranty") || q.includes("policy")) {
      reply = `**Avyora 30-Day Sanctuary Guarantee:**\n\n` +
        `• **30-Day Hassle-Free Returns:** If an item is not the perfect fit for your lifestyle, return it within 30 days for a 100% full refund.\n` +
        `• **Instant Refunds:** Refunds are initiated to your original payment method (or UPI) within 24 hours of item pickup.\n` +
        `• **Easy Initiation:** Start an instant return anytime directly from your order details on the Account page.`;
      this.appendBotMessage(reply);
      return;
    }

    // 7. Payment Methods
    if (q.includes("payment") || q.includes("upi") || q.includes("cash on delivery") || q.includes("cod") || q.includes("card") || q.includes("netbanking")) {
      reply = `**Accepted Payment Methods:**\n\n` +
        `• **UPI:** Instant payment via Google Pay, PhonePe, Paytm, or BHIM.\n` +
        `• **Cards:** Visa, MasterCard, RuPay, and American Express (Credit & Debit).\n` +
        `• **Net Banking:** Supported across all major Indian banks.\n` +
        `• **Cash on Delivery (COD):** Available nationwide with quick security captcha verification.`;
      this.appendBotMessage(reply);
      return;
    }

    // 8. Price & Budget Searches (e.g. "under 2000", "below 100", "under 100", "below 50", "below ₹3000", "gifts")
    const budgetRegex = /(?:under|below|less\s+than|cheaper\s+than|up\s+to|max|budget|within|<|<=)\s*(?:₹|rs\.?|inr|\$|usd)?\s*([0-9,]+)/i;
    const budgetMatch = q.match(budgetRegex);
    if (budgetMatch) {
      const rawNumber = Number(budgetMatch[1].replace(/,/g, ""));
      const isExplicitDollar = q.includes("$") || q.includes("usd") || q.includes("dollar");
      const isExplicitRupee = q.includes("₹") || q.includes("rs") || q.includes("inr");

      // In the store, prices in catalog are displayed in INR
      const maxINR = isExplicitDollar ? Math.round(rawNumber * USD_TO_INR) : rawNumber;
      const cleanKeyword = q
        .replace(/(?:under|below|less\s+than|cheaper\s+than|up\s+to|max|budget|within|<|<=)\s*(?:₹|rs\.?|inr|\$|usd)?\s*[0-9,]+/gi, "")
        .replace(/gifts?|items?|products?|pieces?|find|show\s+me/gi, "")
        .trim();

      const matched = searchCatalog(cleanKeyword, catalog, { maxPriceINR: maxINR });

      if (matched.length > 0) {
        const formattedBudget = isExplicitDollar 
          ? `$${rawNumber} USD (~₹${maxINR})` 
          : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(maxINR);
        const topCount = Math.min(3, matched.length);
        productIds = matched.slice(0, topCount).map(p => p.id);

        if (matched.length > 3) {
          reply = `I found **${matched.length} products** under **${formattedBudget}**${cleanKeyword ? ` matching "${escapeHtml(cleanKeyword)}"` : ""}. Here are 3 suggestions—click **Show All** below to see all ${matched.length} in the products section:`;
        } else {
          reply = `I found **${matched.length} product${matched.length === 1 ? "" : "s"}** under **${formattedBudget}**${cleanKeyword ? ` matching "${escapeHtml(cleanKeyword)}"` : ""}:`;
        }

        customButtons.push({
          label: `Show All (${matched.length}) Products in Products Section`,
          action: "show-all-in-catalog",
          searchTerm: cleanKeyword,
          productIds: matched.map(p => p.id),
          icon: "bi bi-grid-3x3-gap-fill",
          className: "btn-primary avyora-ai-show-all-btn"
        });
      } else {
        // Absolutely NO products found strictly under this price!
        // DO NOT show any products that exceed this price!
        const sorted = [...catalog].sort((a, b) => (a.price || 0) - (b.price || 0));
        const lowestItem = sorted[0];
        const formattedBudget = isExplicitDollar 
          ? `$${rawNumber} USD (~${formatPriceINR(rawNumber)})` 
          : `₹${rawNumber}`;

        reply = `I didn't find any products under **${formattedBudget}** in our catalog.\n\n` +
          `Our lowest-priced item in stock is **${lowestItem ? escapeHtml(lowestItem.title) : "available"}** starting at **${lowestItem ? formatPriceINR(lowestItem.price) : "₹167"}**.`;

        // If user typed e.g. "below 100" without currency, maybe they meant $100 USD?
        if (!isExplicitDollar && !isExplicitRupee && rawNumber <= 150) {
          const dollarINR = Math.round(rawNumber * USD_TO_INR);
          const dollarMatches = searchCatalog(cleanKeyword, catalog, { maxPriceINR: dollarINR });
          if (dollarMatches.length > 0) {
            customButtons.push({
              label: `Did you mean $${rawNumber} USD (${formatPriceINR(rawNumber)})? Click to view`,
              action: "show-budget-usd",
              searchTerm: cleanKeyword,
              budgetUSD: rawNumber,
              icon: "bi bi-currency-dollar",
              className: "btn-outline-primary"
            });
          }
        }

        customButtons.push({
          label: "View All Products in Products Section",
          action: "browse-catalog",
          icon: "bi bi-grid"
        });

        // productIds remains completely empty!
        productIds = [];
      }

      this.appendBotMessage(reply, productIds, null, customButtons);
      return;
    }

    // 9. Specific Product Price Inquiry (e.g. "how much is...", "price of...")
    if (q.includes("price") || q.includes("how much") || q.includes("cost")) {
      const productQuery = q.replace(/how\s+much\s+is|what\s+is\s+the\s+price\s+of|price\s+of|cost\s+of/gi, "").trim();
      const matched = searchCatalog(productQuery, catalog);
      if (matched.length) {
        const p = matched[0];
        reply = `**${p.title}** is available for **${formatPriceINR(p.price)}**.\n\n` +
          `• **Brand:** ${p.brand || "Avyora Select"}\n` +
          `• **Rating:** ★ ${p.rating?.rate || 4.8} (${p.rating?.count || 80} reviews)\n` +
          `• **Stock:** ${p.stock > 0 ? `${p.stock} units available` : "In stock"}\n` +
          `• **Description:** ${p.description}`;
        productIds = [p.id];
        customButtons.push({
          label: "View in Products Section",
          action: "show-all-in-catalog",
          searchTerm: p.title,
          productIds: [p.id],
          icon: "bi bi-grid-3x3-gap-fill",
          className: "btn-primary avyora-ai-show-all-btn"
        });
        this.appendBotMessage(reply, productIds, null, customButtons);
        return;
      }
    }

    // 10. Catalog Scored Search (handles all queries: phones, laptops, shoes, watches, perfume, dresses, etc.)
    const matchedProducts = searchCatalog(userText, catalog);
    if (matchedProducts.length > 0) {
      const topCount = Math.min(3, matchedProducts.length);
      const chosen = matchedProducts.slice(0, topCount);
      productIds = chosen.map(p => p.id);

      const categoryName = chosen[0]?.displayCategory || chosen[0]?.category || "pieces";
      if (matchedProducts.length > 3) {
        reply = `I found **${matchedProducts.length} products** matching **"${escapeHtml(userText)}"**. Here are 3 top recommendations—click **Show All** below to see all ${matchedProducts.length} in the products section:`;
      } else {
        reply = `I found **${matchedProducts.length} product${matchedProducts.length === 1 ? "" : "s"}** matching **"${escapeHtml(userText)}"**:`;
      }

      customButtons.push({
        label: `Show All (${matchedProducts.length}) Products in Products Section`,
        action: "show-all-in-catalog",
        searchTerm: userText,
        productIds: matchedProducts.map(p => p.id),
        icon: "bi bi-grid-3x3-gap-fill",
        className: "btn-primary avyora-ai-show-all-btn"
      });

      this.appendBotMessage(reply, productIds, null, customButtons);
      return;
    }

    // 11. Friendly Greetings
    if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("who are you") || q.includes("help")) {
      reply = `Hello! I am your **Avyora AI Concierge**.\n\n` +
        `I have complete knowledge of our live product catalog and store services. Here is what I can do for you:\n\n` +
        `• **Find Products:** Search by category (Phones, Laptops, Watches, Dresses, Shoes, Audio), brand, or keywords\n` +
        `• **Price & Gifts:** Filter pieces by your budget (e.g., *"gifts under ₹3,000"*)\n` +
        `• **Cart & Checkout:** Add products to your bag or view your live total\n` +
        `• **Store Guidance:** Answer questions about coupons, express shipping, and returns\n\n` +
        `What can I help you discover today?`;
      productIds = catalog.slice(0, 3).map(p => p.id);
      customButtons.push({
        label: "Browse Products Section",
        action: "browse-catalog",
        icon: "bi bi-grid-3x3-gap"
      });
      this.appendBotMessage(reply, productIds, null, customButtons);
      return;
    }

    // 12. Honest fallback when no products match
    reply = `I didn't find any products matching **"${escapeHtml(userText)}"** in our catalog.\n\n` +
      `Try searching for categories like *phones*, *laptops*, *watches*, *dresses*, *shoes*, or *jewelry*.`;
    productIds = [];
    customButtons.push({
      label: "Browse All Products in Products Section",
      action: "browse-catalog",
      icon: "bi bi-grid-3x3-gap"
    });
    this.appendBotMessage(reply, productIds, null, customButtons);
  }

  executeAddToCart(productId, btnElement = null) {
    const store = this.getStore();
    const catalog = this.getProducts();
    const product = catalog.find(p => p.id === Number(productId));

    if (!product) return;

    if (store && typeof store.addToCart === "function") {
      store.addToCart(product, false);
    } else {
      let cart = [];
      try {
        cart = JSON.parse(localStorage.getItem("avyora-cart") || "[]");
      } catch (e) {
        cart = [];
      }
      const existing = cart.find(item => item.id === product.id);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
        existing.selected = true;
      } else {
        cart.push({
          id: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          quantity: 1,
          selected: true
        });
      }
      localStorage.setItem("avyora-cart", JSON.stringify(cart));
      this.showToast(`${product.title} added to bag!`);
    }

    if (btnElement) {
      btnElement.classList.add("added");
      btnElement.innerHTML = `<i class="bi bi-check-lg"></i> Added!`;
      setTimeout(() => {
        btnElement.classList.remove("added");
        btnElement.innerHTML = `<i class="bi bi-bag-plus"></i> Add to Bag`;
      }, 2000);
    }
  }

  executeOpenCart() {
    const store = this.getStore();
    if (store && typeof store.openCartDrawer === "function") {
      store.openCartDrawer();
    } else {
      const trigger = document.querySelector("[data-cart-trigger]");
      if (trigger) trigger.click();
    }
  }

  saveHistory() {
    const body = document.getElementById("avyoraAiBody");
    if (!body) return;
    try {
      const msgs = Array.from(body.querySelectorAll(".avyora-ai-msg")).slice(-25);
      const data = msgs.map(el => el.outerHTML);
      localStorage.setItem(CHAT_HISTORY_STORAGE, JSON.stringify(data));
    } catch (e) {
      // Storage quota guard
    }
  }

  loadHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAT_HISTORY_STORAGE) || "[]");
      if (saved && saved.length) {
        const body = document.getElementById("avyoraAiBody");
        if (body) {
          body.innerHTML = saved.join("");
          this.scrollToBottom();
        }
      }
    } catch (e) {
      // Fresh start
    }
  }

  resetHistory() {
    localStorage.removeItem(CHAT_HISTORY_STORAGE);
    const body = document.getElementById("avyoraAiBody");
    if (body) {
      body.innerHTML = `
        <div class="avyora-ai-msg avyora-ai-msg-bot">
          <div class="avyora-ai-msg-avatar">
            <i class="bi bi-stars"></i>
          </div>
          <div class="avyora-ai-msg-content">
            <div class="avyora-ai-bubble">
              <p><strong>Conversation refreshed.</strong> How can I assist your sanctuary shopping today?</p>
            </div>
            <span class="avyora-ai-time">Just now</span>
          </div>
        </div>
      `;
    }
  }
}

// Global initialization
export function initAvyoraAiAgent() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.avyoraAiInstance = new AvyoraAiAgent();
    });
  } else {
    window.avyoraAiInstance = new AvyoraAiAgent();
  }
}
