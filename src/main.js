/* ==================================================
   AVYORA - MAIN JAVASCRIPT
   File: src/main.js
   ================================================== */

import "./style.css";

const PRODUCT_API_URL = "https://dummyjson.com/products?limit=0";
const USD_TO_INR = 83.5;
const SHIPPING_FEE_INR = 249;
const BUNDLE_DISCOUNT_RATE = 0.15;
const BUNDLE_VISIBLE_COUNT = 3;
const FALLBACK_PRODUCTS = [
   { id: 1, title: "The Everyday Carry Bag", price: 89, category: "women's clothing", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85", rating: { rate: 4.8, count: 124 } },
   { id: 2, title: "Studio Wireless Headphones", price: 100, category: "electronics", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85", rating: { rate: 4.9, count: 98 } },
   { id: 3, title: "Minimalist Gold Watch", price: 74, category: "jewelery", image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=85", rating: { rate: 4.7, count: 86 } },
   { id: 4, title: "Relaxed Premium Tee", price: 36, category: "men's clothing", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85", rating: { rate: 4.6, count: 71 } },
   { id: 5, title: "Cloud Knit Sweater", price: 58, category: "women's clothing", image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=85", rating: { rate: 4.8, count: 112 } },
   { id: 6, title: "Smart Home Speaker", price: 69, category: "electronics", image: "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=800&q=85", rating: { rate: 4.5, count: 64 } },
   { id: 7, title: "Pearl Accent Earrings", price: 42, category: "jewelery", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=85", rating: { rate: 4.7, count: 55 } },
   { id: 8, title: "Classic Oxford Shirt", price: 49, category: "men's clothing", image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=85", rating: { rate: 4.6, count: 48 } }
];

let products = [];
let activeCategory = "all";
let searchTerm = "";
let sortOrder = "featured";
let cartItems = JSON.parse(localStorage.getItem("avyora-cart") || "[]");
let wishlistItems = normalizeWishlistIds(JSON.parse(localStorage.getItem("avyora-wishlist") || "[]"));
let wishlistProducts = JSON.parse(localStorage.getItem("avyora-wishlist-products") || "{}");
let styleQuizAnswers = [];
let bundleSelection = [];
let bundleRotationTimer;
let bundleRotationOffset = 0;

let activeAura = localStorage.getItem("avyora-active-aura") || "harmony";

const CELESTIAL_AURAS = {
   "harmony": {
      id: "harmony",
      name: "All Sanctuary",
      kicker: "WELCOME TO AVYORA",
      titleAccent: "Made Simple.",
      description: "Discover products you'll love with easy shopping, secure payments, and reliable delivery.",
      tag: "Sanctuary Essential",
      tagClass: "aura-tag-harmony",
      icon: "bi-gem",
      matcher: () => true
   },
   "golden-dawn": {
      id: "golden-dawn",
      name: "Golden Dawn",
      kicker: "SOLAR RADIANCE & LUXURY",
      titleAccent: "Bathed in Golden Light.",
      description: "Luminous timepieces, shimmering jewelry, and sunlit statement accessories crafted for brilliance.",
      tag: "Golden Dawn Pick",
      tagClass: "aura-tag-golden",
      icon: "bi-sun-fill",
      matcher: (product) => {
         const text = `${product.category} ${product.displayCategory} ${product.title} ${product.description || ""} ${product.tags.join(" ")}`.toLowerCase();
         return product.category === "accessories" || product.category === "jewelery" || product.category === "beauty" ||
            text.includes("watch") || text.includes("gold") || text.includes("jewel") || text.includes("ring") || text.includes("bag") || text.includes("perfume") || text.includes("sunglass");
      }
   },
   "midnight-serenity": {
      id: "midnight-serenity",
      name: "Midnight Serenity",
      kicker: "ACOUSTIC CALM & OBSIDIAN TECH",
      titleAccent: "Deep Rest & Focus.",
      description: "Acoustic wireless audio, precision engineering, and nocturnal lifestyle essentials for undisturbed calm.",
      tag: "Midnight Serenity Pick",
      tagClass: "aura-tag-midnight",
      icon: "bi-moon-stars-fill",
      matcher: (product) => {
         const text = `${product.category} ${product.displayCategory} ${product.title} ${product.description || ""} ${product.tags.join(" ")}`.toLowerCase();
         return product.category === "electronics" || product.category === "menswear" ||
            text.includes("headphone") || text.includes("speaker") || text.includes("wireless") || text.includes("audio") || text.includes("laptop") || text.includes("smart") || text.includes("phone");
      }
   },
   "artisanal-zen": {
      id: "artisanal-zen",
      name: "Artisanal Zen",
      kicker: "MINDFUL LIVING & ORGANIC EARTH",
      titleAccent: "Serenity in Every Corner.",
      description: "Organic textures, handcrafted ceramics, and restful home decor designed for peaceful sanctuaries.",
      tag: "Artisanal Zen Favorite",
      tagClass: "aura-tag-zen",
      icon: "bi-flower1",
      matcher: (product) => {
         const text = `${product.category} ${product.displayCategory} ${product.title} ${product.description || ""} ${product.tags.join(" ")}`.toLowerCase();
         return product.category === "home" || product.category === "womenswear" ||
            text.includes("home") || text.includes("decor") || text.includes("furniture") || text.includes("ceramic") || text.includes("knit") || text.includes("sweater") || text.includes("lighting") || text.includes("lamp");
      }
   }
};

function normalizeWishlistIds(ids) {
   const normalized = (Array.isArray(ids) ? ids : [])
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && id > 0);

   return [...new Set(normalized)];
}

document.addEventListener("DOMContentLoaded", function () {
   bindProductControls();
   initCelestialAuraEngine();
   bindNavigationConfirmation();
   initAuthNavigation();
   updateCartCount();
   updateWishlistCount();
   bindWishlistDrawer();
   bindCartDrawer();
   bindStyleQuiz();
   initCartPage();
   initCheckoutPage();
   initFavoritesPage();
   initSuccessPage();
   initAccountPage();
   initAuthPages();
   initProductDetailPage();
   renderWishlistDrawer();
   loadProducts();
});

function bindNavigationConfirmation() {
   const dialog = document.createElement("div");
   dialog.className = "navigation-confirm-backdrop";
   dialog.hidden = true;
   dialog.innerHTML = `<div class="navigation-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="navigationConfirmTitle"><i class="bi bi-arrow-left-circle"></i><h2 id="navigationConfirmTitle">Leave this page?</h2><p>Do you want to redirect to the selected page?</p><div class="navigation-confirm-actions"><button type="button" class="navigation-confirm-no">No</button><button type="button" class="btn btn-avyora navigation-confirm-yes">Yes</button></div></div>`;
   document.body.appendChild(dialog);

   const closeDialog = function () {
      dialog.hidden = true;
   };

   dialog.querySelector(".navigation-confirm-no").addEventListener("click", closeDialog);
   dialog.addEventListener("click", function (event) {
      if (event.target === dialog) closeDialog();
   });

   document.addEventListener("click", function (event) {
      const link = event.target.closest(".cart-page-breadcrumb a, .product-detail-breadcrumb a, .categories-back-link, .product-detail-nav > a");
      if (!link) return;

      event.preventDefault();
      dialog.hidden = false;
      dialog.querySelector(".navigation-confirm-yes").onclick = function () {
         window.location.href = link.href;
      };
      dialog.querySelector(".navigation-confirm-no").focus();
   });
}

function updateNavbarAvatar(photo) {
   document.querySelectorAll('a[href="account.html"]').forEach(function (link) {
      if (link.classList.contains("icon-btn") || link.closest(".navbar-nav")) {
         if (photo) {
            link.innerHTML = `<img src="${photo}" alt="Account profile" class="nav-avatar-img">`;
            link.title = "My Account";
         } else {
            link.innerHTML = `<i class="bi bi-person-circle"></i>`;
            link.title = "Account";
         }
      }
   });
}

function initAuthNavigation() {
   const signedIn = Boolean(localStorage.getItem("avyora-session"));
   const savedProfile = JSON.parse(localStorage.getItem("avyora-profile") || "null");
   document.querySelectorAll('a[href="account.html"]').forEach(function (link) {
      if (!signedIn) {
         link.href = "register.html";
         link.title = "Create account";
         link.setAttribute("aria-label", "Create account");
      }
   });
   if (signedIn && savedProfile?.photo) {
      updateNavbarAvatar(savedProfile.photo);
   }
}

async function loadProducts() {
   try {
      const response = await fetch(PRODUCT_API_URL);
      if (!response.ok) throw new Error(`Product API returned ${response.status}`);
      const data = await response.json();
      products = normalizeProducts(data.products);
   } catch (error) {
      console.warn("Using fallback products because the product API is unavailable.", error);
      products = normalizeProducts(FALLBACK_PRODUCTS);
   }

   wishlistItems.forEach(function (id) {
      const product = products.find(item => item.id === id);
      if (product && !wishlistProducts[id]) wishlistProducts[id] = product;
   });
   localStorage.setItem("avyora-wishlist-products", JSON.stringify(wishlistProducts));

   syncAuraSelector();
   renderProducts();
   renderBundle(products);
   startBundleRotation(products);
   renderWishlistDrawer();
   renderFavoritesPage();
   updateWishlistCount();
   if (typeof updateQuizRelatedProducts === "function") {
      updateQuizRelatedProducts();
   }
   if (typeof initCheckoutBundleOffer === "function") {
      initCheckoutBundleOffer();
   }
}

let updateQuizRelatedProducts;
let initCheckoutBundleOffer;

function bindStyleQuiz() {
   const quiz = document.getElementById("styleQuiz");
   const question = document.getElementById("styleQuizQuestion");
   const options = document.getElementById("styleQuizOptions");
   const step = document.getElementById("styleQuizStep");
   const progressFill = document.getElementById("styleQuizProgressFill");
   const result = document.getElementById("styleQuizResult");
   if (!quiz || !question || !options || !step || !result) return;

   const optionDescriptions = {
      electronics: "Phones, gadgets, and smart upgrades",
      womenswear: "Clothing and polished everyday pieces",
      home: "Comfortable finds for your space",
      accessories: "Small details with personality"
   };

   const questions = [
      {
         text: "What are you shopping for today?",
         choices: [
            ["power", "electronics", "bi-lightning-charge", "Useful upgrades"],
            ["style", "womenswear", "bi-stars", "A little polish"],
            ["home", "home", "bi-house-heart", "Make home better"]
         ]
      },
      {
         text: "What should your picks feel like?",
         choices: [
            ["smart", "electronics", "bi-cpu", "Smart and capable"],
            ["soft", "womenswear", "bi-cloud", "Soft and considered"],
            ["fresh", "home", "bi-brightness-high", "Fresh and calm"]
         ]
      },
      {
         text: "What matters most right now?",
         choices: [
            ["function", "electronics", "bi-check2-circle", "Everyday function"],
            ["expression", "accessories", "bi-palette", "Personal expression"],
            ["comfort", "home", "bi-heart", "More comfort"]
         ]
      }
   ];

   function getRecommendedProductsForQuiz(categoryFilter, intentKeyword) {
      if (!products || !products.length) return [];
      let matches = products.filter(item => {
         if (categoryFilter && categoryFilter !== "all" && item.category === categoryFilter) return true;
         const text = `${item.title} ${item.brand} ${item.category} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
         if (intentKeyword && text.includes(intentKeyword.toLowerCase())) return true;
         return false;
      });

      if (matches.length < 2) {
         const remaining = products.filter(p => !matches.some(m => m.id === p.id));
         matches = matches.concat(remaining);
      }

      matches.sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
      return matches.slice(0, 2);
   }

   updateQuizRelatedProducts = function (categoryFilter = "electronics", intentKeyword = "upgrade", titleOverride) {
      const container = document.getElementById("quizRelatedProducts");
      const titleEl = document.getElementById("quizRelatedTitle");
      const linkEl = document.getElementById("quizRelatedAllLink");
      if (!container) return;

      const titleMap = {
         electronics: "Curated for High-Tech Living",
         womenswear: "Curated for Everyday Polish",
         home: "Curated for Mindful Comfort",
         accessories: "Curated for Personal Expression"
      };

      if (titleEl) {
         titleEl.textContent = titleOverride || titleMap[categoryFilter] || "Handpicked for Your Taste";
      }

      if (linkEl) {
         linkEl.href = `index.html?category=${encodeURIComponent(categoryFilter)}#product-edit`;
         linkEl.innerHTML = `Explore all ${categoryFilter} <i class="bi bi-arrow-right"></i>`;
      }

      const items = getRecommendedProductsForQuiz(categoryFilter, intentKeyword);
      if (!items.length) {
         container.innerHTML = `<div class="col-12 text-center py-4 text-muted"><i class="bi bi-hourglass-split"></i> Loading curated recommendations...</div>`;
         return;
      }

      container.innerHTML = items.map((product, idx) => {
         const matchScore = 98 - idx * 3;
         return `
            <div class="col-12 col-sm-6">
               <article class="quiz-product-card" data-product-id="${product.id}">
                  <div>
                     <div class="quiz-product-image-wrap">
                        <span class="quiz-match-badge"><i class="bi bi-sparkles"></i> ${matchScore}% Match</span>
                        <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
                     </div>
                     <div class="quiz-product-info">
                        <span class="quiz-product-category">${escapeHtml(product.brand || product.displayCategory)}</span>
                        <a href="product.html?id=${product.id}" class="quiz-product-title" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</a>
                        <div class="quiz-product-rating">
                           <i class="bi bi-star-fill"></i>
                           <strong>${product.rating.rate}</strong>
                           <span>(${product.rating.count} reviews)</span>
                        </div>
                     </div>
                  </div>
                  <div class="quiz-product-bottom">
                     <span class="quiz-product-price">${formatPrice(product.price)}</span>
                     <button type="button" class="quiz-product-btn" data-quiz-add-id="${product.id}">
                        <i class="bi bi-bag-plus"></i> Add
                     </button>
                  </div>
               </article>
            </div>
         `;
      }).join("");

      container.querySelectorAll("[data-quiz-add-id]").forEach(btn => {
         btn.addEventListener("click", function (e) {
            e.stopPropagation();
            const pid = Number(btn.dataset.quizAddId);
            const prod = products.find(p => p.id === pid);
            if (prod) {
               addToCart(prod, false);
               btn.innerHTML = `<i class="bi bi-check-lg"></i> Added`;
               setTimeout(() => {
                  btn.innerHTML = `<i class="bi bi-bag-plus"></i> Add`;
               }, 1800);
            }
         });
      });
   };

   function renderQuestion() {
      const currentQuestion = questions[styleQuizAnswers.length];
      const stepNum = styleQuizAnswers.length + 1;
      step.textContent = `Step ${stepNum} of ${questions.length}`;
      if (progressFill) progressFill.style.width = `${(stepNum / questions.length) * 100}%`;
      question.textContent = currentQuestion.text;
      options.innerHTML = currentQuestion.choices.map(choice => `<button type="button" data-quiz-value="${choice[0]}" data-quiz-filter="${choice[1]}"><i class="bi ${choice[2]}"></i><span class="style-quiz-option-copy"><strong>${choice[3]}</strong><small>${optionDescriptions[choice[1]] || "Curated picks for you"}</small></span><i class="bi bi-arrow-right style-quiz-option-arrow"></i></button>`).join("");

      options.querySelectorAll("button").forEach(button => button.addEventListener("click", function () {
         const chosenFilter = button.dataset.quizFilter;
         const chosenValue = button.dataset.quizValue;
         styleQuizAnswers.push(chosenFilter);

         // Immediately update right side recommendations
         updateQuizRelatedProducts(chosenFilter, chosenValue);

         if (styleQuizAnswers.length < questions.length) {
            renderQuestion();
            return;
         }

         const filter = styleQuizAnswers.sort((a, b) => styleQuizAnswers.filter(item => item === b).length - styleQuizAnswers.filter(item => item === a).length)[0];
         const label = { electronics: "capable upgrades", womenswear: "polished favorites", accessories: "expressive details", home: "comfort-first finds" }[filter] || "everyday favorites";
         result.hidden = false;
         result.innerHTML = `<div><span>Your personalized capsule is ready:</span> <strong>${label}</strong></div> <button type="button" id="styleQuizShop">Shop Capsule <i class="bi bi-arrow-right"></i></button>`;
         options.innerHTML = `<button type="button" class="style-quiz-restart" id="styleQuizRestart"><i class="bi bi-arrow-counterclockwise"></i><span>Retake quiz</span></button>`;
         step.textContent = "CURATION COMPLETE";
         if (progressFill) progressFill.style.width = "100%";
         question.textContent = "We found the best matches for your routine.";

         // Update right side with final optimal edit
         updateQuizRelatedProducts(filter, "all", `Your Top Capsule: ${label.toUpperCase()}`);

         document.getElementById("styleQuizShop").addEventListener("click", function () {
            document.querySelector(`.product-tab[data-filter="${filter}"]`)?.click();
            document.getElementById("product-edit")?.scrollIntoView({ behavior: "smooth" });
         });
         document.getElementById("styleQuizRestart").addEventListener("click", function () {
            styleQuizAnswers = [];
            result.hidden = true;
            renderQuestion();
            updateQuizRelatedProducts("electronics", "power", "Curated for your lifestyle");
         });
      }));
   }

   renderQuestion();
   updateQuizRelatedProducts("electronics", "power", "Curated for your lifestyle");
}

function normalizeProducts(items) {
   return items.map(function (item) {
      const rawCategory = item.category || "lifestyle";
      const category = getCatalogCategory(rawCategory);

      return {
         ...item,
         category,
         displayCategory: item.category || category,
         brand: item.brand || "Avyora Select",
         image: item.thumbnail || item.image || item.images?.[0],
         images: item.images || [item.image],
         description: item.description || "A considered everyday favorite with practical function and details designed to last.",
         tags: item.tags || [],
         stock: item.stock || 0,
         discountPercentage: item.discountPercentage || 0,
         rating: typeof item.rating === "number"
            ? { rate: item.rating, count: item.reviews?.length || 0 }
            : item.rating || { rate: 0, count: 0 }
      };
   });
}

function getCatalogCategory(category) {
   const normalizedCategory = category.toLowerCase();

   if (["smartphones", "laptops", "tablets"].includes(normalizedCategory)) {
      return "electronics";
   }

   if (normalizedCategory === "electronics") {
      return "electronics";
   }

   if (["men's clothing", "menswear"].includes(normalizedCategory)) {
      return "menswear";
   }

   if (["women's clothing", "womenswear"].includes(normalizedCategory)) {
      return "womenswear";
   }

   if (["jewelery", "jewelry", "accessories", "mobile-accessories"].includes(normalizedCategory)) {
      return "accessories";
   }

   if (["beauty", "fragrances", "skin-care"].includes(normalizedCategory)) {
      return "beauty";
   }

   if (["home-decoration", "furniture", "lighting", "kitchen-accessories"].includes(normalizedCategory)) {
      return "home";
   }

   if (normalizedCategory === "groceries") {
      return "groceries";
   }

   if (["sports-accessories", "sports"].includes(normalizedCategory)) {
      return "sports";
   }

   if (["automotive", "motorcycle", "vehicle"].includes(normalizedCategory)) {
      return "automotive";
   }

   if (normalizedCategory.startsWith("men-") || normalizedCategory.startsWith("mens-")) {
      return "menswear";
   }

   if ((normalizedCategory.startsWith("women-") || normalizedCategory.startsWith("womens-")) && !normalizedCategory.includes("jewellery")) {
      return "womenswear";
   }

   if (["womens-jewellery", "mens-watches", "womens-watches", "womens-bags", "sunglasses", "shoes"].includes(normalizedCategory)) {
      return "accessories";
   }

   return "accessories";
}

const UNIVERSAL_PAGES = [
   {
      name: "Home",
      url: "index.html",
      badge: "Main Store",
      icon: "bi-house-door-fill",
      description: "Explore curated sanctuary collections & bestsellers",
      keywords: ["home", "homepage", "store", "shop", "main", "frontpage", "start"]
   },
   {
      name: "Cart",
      url: "cart.html",
      badge: "Shopping Bag",
      icon: "bi-bag-check-fill",
      description: "Review your selected items, apply promo & checkout",
      keywords: ["cart", "bag", "basket", "shopping bag", "items", "trolley", "my cart"]
   },
   {
      name: "My Account",
      url: "account.html",
      badge: "Profile & Orders",
      icon: "bi-person-circle",
      description: "Personal profile, orders, saved shipping & preferences",
      keywords: ["account", "profile", "orders", "history", "user", "settings", "my account", "photo", "sign out", "logout"]
   },
   {
      name: "Wishlist",
      url: "favorites.html",
      badge: "Saved Finds",
      icon: "bi-heart-fill",
      description: "Your saved must-have pieces & inspirations",
      keywords: ["wishlist", "favorites", "saved", "favourite", "hearts", "liked", "collection"]
   },
   {
      name: "Checkout",
      url: "checkout.html",
      badge: "Secure Payment",
      icon: "bi-shield-lock-fill",
      description: "256-bit SSL encrypted order checkout & delivery",
      keywords: ["checkout", "pay", "payment", "order", "billing", "purchase"]
   },
   {
      name: "Categories",
      url: "categories.html",
      badge: "Browse All",
      icon: "bi-grid-fill",
      description: "Browse all 9 curated lifestyle departments",
      keywords: ["categories", "category", "departments", "catalogue", "browse", "all categories"]
   }
];

const UNIVERSAL_CATEGORIES = [
   { id: "electronics", name: "Electronics", icon: "bi-lightning-charge-fill", desc: "Smart upgrades, wireless audio & precision tech", keywords: ["electronics", "electronic", "tech", "gadgets"] },
   { id: "accessories", name: "Accessories", icon: "bi-gem", desc: "Expressive details, watches, sunglasses & gems", keywords: ["accessories", "accessory", "jewelry", "jewellery"] },
   { id: "menswear", name: "Menswear", icon: "bi-person", desc: "Easy essentials, classic shirts & tailored fits", keywords: ["menswear", "mens", "men's fashion", "mens clothing"] },
   { id: "womenswear", name: "Womenswear", icon: "bi-stars", desc: "Polished favorites & modern silhouettes", keywords: ["womenswear", "womens", "women's fashion", "womens clothing"] },
   { id: "beauty", name: "Beauty", icon: "bi-droplet-fill", desc: "Daily rituals, skincare & luxury fragrances", keywords: ["beauty", "cosmetics", "skincare", "fragrance", "fragrances"] },
   { id: "home", name: "Home & Living", icon: "bi-house-heart-fill", desc: "Comfort-first finds & artisanal decor", keywords: ["home", "furniture", "home & living", "home living", "decor"] },
   { id: "groceries", name: "Groceries", icon: "bi-basket-fill", desc: "Pantry essentials & fresh staples", keywords: ["groceries", "grocery", "pantry", "food"] },
   { id: "sports", name: "Sports", icon: "bi-trophy-fill", desc: "Activewear & workout essentials", keywords: ["sports", "sport", "fitness", "athletics"] },
   { id: "automotive", name: "Automotive", icon: "bi-car-front-fill", desc: "Road-ready essentials & vehicle gear", keywords: ["automotive", "auto", "vehicle", "vehicles"] }
];

function resolveUniversalSearchRoute(rawQuery) {
   const query = String(rawQuery || "").trim().toLowerCase();
   if (!query) return null;

   // 1. Exact or keyword match on pages
   const matchedPage = UNIVERSAL_PAGES.find(p => {
      if (p.name.toLowerCase() === query) return true;
      return p.keywords.some(k => k === query);
   });
   if (matchedPage) {
      return { type: "page", url: matchedPage.url };
   }

   // 2. Strong prefix match for pages
   const prefixPage = UNIVERSAL_PAGES.find(p => {
      if (p.name.toLowerCase().startsWith(query)) return true;
      return p.keywords.some(k => k.startsWith(query));
   });
   if (prefixPage && query.length >= 3 && ["cart", "home", "acco", "wish", "chec", "cate"].some(prefix => query.startsWith(prefix))) {
      return { type: "page", url: prefixPage.url };
   }

   // 3. Category match
   const matchedCat = UNIVERSAL_CATEGORIES.find(c => {
      if (c.id === query || c.name.toLowerCase() === query) return true;
      return c.keywords.some(k => k === query);
   });
   if (matchedCat) {
      return { type: "category", categoryId: matchedCat.id, url: `index.html?category=${encodeURIComponent(matchedCat.id)}#product-edit` };
   }

   // 4. Product catalog search
   return {
      type: "product",
      query: rawQuery.trim(),
      url: `index.html?search=${encodeURIComponent(rawQuery.trim())}#product-edit`
   };
}

function executeUniversalNavigation(rawQuery) {
   const route = resolveUniversalSearchRoute(rawQuery);
   if (!route) return;

   const productSearch = document.getElementById("productSearch");

   if (route.type === "page") {
      window.location.href = route.url;
      return;
   }

   if (route.type === "category") {
      if (productSearch) {
         const requestedCategory = document.querySelector(`.product-tab[data-filter="${CSS.escape(route.categoryId)}"]`);
         if (requestedCategory) requestedCategory.click();
         document.getElementById("product-edit")?.scrollIntoView({ behavior: "smooth" });
         return;
      }
      window.location.href = route.url;
      return;
   }

   if (route.type === "product") {
      if (productSearch) {
         productSearch.value = route.query;
         document.querySelectorAll("[data-product-search-form] input").forEach(input => { input.value = route.query; });
         searchTerm = route.query.toLowerCase();
         renderProducts();
         document.getElementById("product-edit")?.scrollIntoView({ behavior: "smooth" });
         return;
      }
      window.location.href = route.url;
   }
}

function bindProductControls() {
   const querySearch = new URLSearchParams(window.location.search).get("search") || "";
   const queryCategory = new URLSearchParams(window.location.search).get("category") || "";
   const productSearch = document.getElementById("productSearch");
   const navbarSearchInputs = document.querySelectorAll("[data-product-search-form] input");

   if (querySearch) {
      if (productSearch) productSearch.value = querySearch;
      navbarSearchInputs.forEach(input => { input.value = querySearch; });
      searchTerm = querySearch.trim().toLowerCase();
   }

   // Close search dropdowns when clicking outside
   document.addEventListener("click", function (event) {
      if (!event.target.closest("[data-product-search-form]")) {
         document.querySelectorAll(".universal-search-dropdown").forEach(dropdown => {
            dropdown.hidden = true;
         });
      }
   });

   // Setup each search form on the page
   document.querySelectorAll("[data-product-search-form]").forEach(function (form) {
      const input = form.querySelector("input");
      if (!input) return;

      // Dropdown container
      let dropdown = form.querySelector(".universal-search-dropdown");
      if (!dropdown) {
         dropdown = document.createElement("div");
         dropdown.className = "universal-search-dropdown";
         dropdown.hidden = true;
         form.appendChild(dropdown);
      }

      const updateSuggestions = function () {
         const val = input.value.trim().toLowerCase();
         const activeProductList = (products && products.length > 0) ? products : normalizeProducts(FALLBACK_PRODUCTS);

         // Pages
         let matchedPages = [];
         if (!val) {
            matchedPages = UNIVERSAL_PAGES.slice(0, 5);
         } else {
            matchedPages = UNIVERSAL_PAGES.filter(p => {
               return p.name.toLowerCase().includes(val) ||
                  p.description.toLowerCase().includes(val) ||
                  p.keywords.some(k => k.includes(val) || val.includes(k));
            });
         }

         // Categories
         let matchedCats = [];
         if (!val) {
            matchedCats = UNIVERSAL_CATEGORIES.slice(0, 4);
         } else {
            matchedCats = UNIVERSAL_CATEGORIES.filter(c => {
               return c.name.toLowerCase().includes(val) ||
                  c.desc.toLowerCase().includes(val) ||
                  c.keywords.some(k => k.includes(val) || val.includes(k));
            });
         }

         // Products
         let matchedProducts = [];
         if (val) {
            matchedProducts = activeProductList.filter(p => {
               const fullText = `${p.title} ${p.brand} ${p.category} ${p.displayCategory} ${p.description || ""} ${p.tags ? p.tags.join(" ") : ""}`.toLowerCase();
               return fullText.includes(val);
            }).slice(0, 4);
         }

         if (val && matchedPages.length === 0 && matchedCats.length === 0 && matchedProducts.length === 0) {
            dropdown.innerHTML = `
               <div class="usd-empty">
                  <i class="bi bi-search"></i>
                  <div>No results for "<strong>${escapeHtml(input.value.trim())}</strong>"</div>
                  <div class="mt-2"><a href="index.html#product-edit" class="btn btn-sm btn-outline-secondary">Browse All Sanctuary Finds</a></div>
               </div>
            `;
            dropdown.hidden = false;
            return;
         }

         let html = "";

         if (matchedPages.length > 0) {
            html += `
               <div class="usd-section">
                  <div class="usd-section-header">
                     <span>${val ? "Pages & Navigation" : "Quick Navigation"}</span>
                     <i class="bi bi-compass"></i>
                  </div>
                  ${matchedPages.map(page => `
                     <a href="${page.url}" class="usd-item usd-page-item" data-destination="${page.url}">
                        <div class="usd-icon-badge"><i class="bi ${page.icon}"></i></div>
                        <div class="usd-item-content">
                           <div class="usd-title-row">
                              <span class="usd-title">${escapeHtml(page.name)}</span>
                              <span class="usd-tag">${escapeHtml(page.badge)}</span>
                           </div>
                           <div class="usd-subtitle">${escapeHtml(page.description)}</div>
                        </div>
                        <i class="bi bi-arrow-right usd-action-arrow"></i>
                     </a>
                  `).join("")}
               </div>
            `;
         }

         if (matchedCats.length > 0) {
            html += `
               <div class="usd-section">
                  <div class="usd-section-header">
                     <span>${val ? "Categories" : "Popular Departments"}</span>
                     <i class="bi bi-tags"></i>
                  </div>
                  <div class="usd-categories-chips">
                     ${matchedCats.map(cat => `
                        <a href="index.html?category=${cat.id}#product-edit" class="usd-cat-chip" data-category="${cat.id}">
                           <i class="bi ${cat.icon}"></i> <span>${escapeHtml(cat.name)}</span>
                        </a>
                     `).join("")}
                  </div>
               </div>
            `;
         }

         if (matchedProducts.length > 0) {
            html += `
               <div class="usd-section">
                  <div class="usd-section-header">
                     <span>Matching Products</span>
                     <span class="text-muted" style="font-size: 0.68rem; font-weight: 500;">${matchedProducts.length} top finds</span>
                  </div>
                  ${matchedProducts.map(p => `
                     <a href="product.html?id=${p.id}" class="usd-item usd-product-item" data-product-id="${p.id}">
                        <img src="${p.image}" alt="${escapeHtml(p.title)}" class="usd-thumb" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=120&q=80'">
                        <div class="usd-item-content">
                           <div class="usd-title-row">
                              <span class="usd-title">${escapeHtml(p.title)}</span>
                              <span class="usd-price">${formatPrice(p.price)}</span>
                           </div>
                           <div class="usd-subtitle">${escapeHtml(p.brand || "Avyora")} · <span style="text-transform: capitalize;">${escapeHtml(p.category || "Sanctuary")}</span></div>
                        </div>
                        <i class="bi bi-chevron-right usd-action-arrow"></i>
                     </a>
                  `).join("")}
               </div>
            `;
         }

         html += `
            <div class="usd-footer">
               <span><i class="bi bi-arrow-return-left me-1"></i> Press <strong>Enter</strong> to open ${val ? `"${escapeHtml(input.value.trim())}"` : "all"}</span>
               <span class="text-muted">Universal Search</span>
            </div>
         `;

         dropdown.innerHTML = html;
         dropdown.hidden = false;

         // Handle internal category clicks when on index.html
         if (productSearch) {
            dropdown.querySelectorAll(".usd-cat-chip").forEach(chip => {
               chip.addEventListener("click", function (ev) {
                  ev.preventDefault();
                  const catId = chip.dataset.category;
                  const targetTab = document.querySelector(`.product-tab[data-filter="${CSS.escape(catId)}"]`);
                  if (targetTab) targetTab.click();
                  dropdown.hidden = true;
                  document.getElementById("product-edit")?.scrollIntoView({ behavior: "smooth" });
               });
            });
         }
      };

      input.addEventListener("focus", function () {
         document.querySelectorAll(".universal-search-dropdown").forEach(d => { if (d !== dropdown) d.hidden = true; });
         updateSuggestions();
      });

      input.addEventListener("input", function (event) {
         const val = event.target.value;
         if (productSearch && productSearch.value !== val) {
            productSearch.value = val;
         }
         navbarSearchInputs.forEach(other => {
            if (other !== event.target && other.value !== val) other.value = val;
         });

         if (productSearch) {
            searchTerm = val.trim().toLowerCase();
            renderProducts();
         }

         updateSuggestions();
      });

      input.addEventListener("keydown", function (event) {
         if (event.key === "Escape") {
            dropdown.hidden = true;
            input.blur();
         }
      });

      form.addEventListener("submit", function (event) {
         event.preventDefault();
         dropdown.hidden = true;
         const val = String(input.value || "").trim();
         executeUniversalNavigation(val);
      });
   });

   // 3. Bidirectional Sync: Catalog Search Input -> Navbar Search Input & Live Filter
   if (productSearch) {
      productSearch.addEventListener("input", function (event) {
         const val = event.target.value;
         navbarSearchInputs.forEach(input => {
            if (input.value !== val) input.value = val;
         });
         searchTerm = val.trim().toLowerCase();
         renderProducts();
      });
   }

   document.querySelectorAll('a[href*="category="]').forEach(function (link) {
      link.addEventListener("click", function () {
         sessionStorage.setItem("avyora-category-navigation", "true");
      });
   });

   document.querySelectorAll(".product-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
         activeCategory = tab.dataset.filter;
         document.querySelectorAll(".product-tab").forEach(function (item) {
            const isActive = item === tab;
            item.classList.toggle("active", isActive);
            item.setAttribute("aria-selected", isActive ? "true" : "false");
         });
         renderProducts();
      });
   });

   const requestedCategory = document.querySelector(`.product-tab[data-filter="${CSS.escape(queryCategory)}"]`);
   if (requestedCategory) requestedCategory.click();

   if (productSearch && querySearch) renderProducts();

   document.getElementById("productSort")?.addEventListener("change", function (event) {
      sortOrder = event.target.value;
      renderProducts();
   });

   document.querySelectorAll(".product-view-toggle").forEach(function (button) {
      button.addEventListener("click", function () {
         document.querySelectorAll(".product-view-toggle").forEach(item => item.classList.toggle("active", item === button));
         document.getElementById("productGrid")?.classList.toggle("product-list-view", button.dataset.view === "list");
      });
   });

}

function getProductAura(product) {
   if (CELESTIAL_AURAS["golden-dawn"].matcher(product)) return CELESTIAL_AURAS["golden-dawn"];
   if (CELESTIAL_AURAS["midnight-serenity"].matcher(product)) return CELESTIAL_AURAS["midnight-serenity"];
   if (CELESTIAL_AURAS["artisanal-zen"].matcher(product)) return CELESTIAL_AURAS["artisanal-zen"];
   return CELESTIAL_AURAS["harmony"];
}

function syncAuraSelector() {
   setCelestialAura(activeAura, false);
}

function setCelestialAura(auraId, shouldScroll = false) {
   if (!CELESTIAL_AURAS[auraId]) auraId = "harmony";
   activeAura = auraId;
   localStorage.setItem("avyora-active-aura", auraId);

   // Update body atmosphere attribute
   if (auraId === "harmony") {
      delete document.body.dataset.aura;
   } else {
      document.body.dataset.aura = auraId;
   }

   const config = CELESTIAL_AURAS[auraId];

   // Update Hero copy
   const heroTitleAccent = document.getElementById("heroTitleAccent");
   const heroDescription = document.getElementById("heroDescription");
   const activeAuraHint = document.getElementById("activeAuraHint");
   if (heroTitleAccent) heroTitleAccent.textContent = config.titleAccent;
   if (heroDescription) heroDescription.textContent = config.description;
   if (activeAuraHint) activeAuraHint.textContent = `Ambient Atmosphere: ${config.name}`;

   // Update Hero & Registration Chips
   document.querySelectorAll(".celestial-aura-chip").forEach(function (chip) {
      const isActive = chip.dataset.aura === auraId;
      chip.classList.toggle("active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
   });

   // Update Hidden Registration Aura Input if present
   const registerAuraInput = document.getElementById("registerAuraInput");
   if (registerAuraInput) {
      registerAuraInput.value = auraId;
   }

   // Update Active Aura Ribbon
   const ribbon = document.getElementById("celestialAuraRibbon");
   if (ribbon) {
      if (auraId === "harmony") {
         ribbon.hidden = true;
      } else {
         ribbon.hidden = false;
         const ribbonKicker = document.getElementById("auraRibbonKicker");
         const ribbonTitle = document.getElementById("auraRibbonTitle");
         const ribbonDesc = document.getElementById("auraRibbonDesc");
         if (ribbonKicker) ribbonKicker.textContent = `ACTIVE SANCTUARY ATMOSPHERE: ${config.kicker}`;
         if (ribbonTitle) ribbonTitle.textContent = config.name;
         if (ribbonDesc) ribbonDesc.textContent = config.description;
      }
   }

   // Update Floating Aura Dock
   const floatingLabel = document.getElementById("floatingAuraLabel");
   if (floatingLabel) floatingLabel.textContent = `Aura: ${config.name}`;
   document.querySelectorAll(".floating-aura-item").forEach(function (item) {
      item.classList.toggle("active", item.dataset.aura === auraId);
   });

   // Rerender products for the new atmosphere
   renderProducts();

   if (shouldScroll) {
      document.getElementById("product-edit")?.scrollIntoView({ behavior: "smooth" });
   }
}

function initCelestialAuraEngine() {
   // Attach Hero Aura chip clicks
   document.querySelectorAll(".celestial-aura-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
         setCelestialAura(chip.dataset.aura, false);
      });
   });

   // Attach Ribbon Reset click
   document.getElementById("auraRibbonReset")?.addEventListener("click", function () {
      setCelestialAura("harmony", false);
   });

   // Attach Floating Aura Dock
   const floatingBtn = document.getElementById("floatingAuraBtn");
   const floatingMenu = document.getElementById("floatingAuraMenu");

   if (floatingBtn && floatingMenu) {
      floatingBtn.addEventListener("click", function (e) {
         e.stopPropagation();
         const isHidden = floatingMenu.hidden;
         floatingMenu.hidden = !isHidden;
         floatingBtn.setAttribute("aria-expanded", String(isHidden));
      });

      document.addEventListener("click", function (e) {
         if (!e.target.closest("#floatingAuraWidget")) {
            floatingMenu.hidden = true;
            floatingBtn.setAttribute("aria-expanded", "false");
         }
      });

      document.querySelectorAll(".floating-aura-item").forEach(function (item) {
         item.addEventListener("click", function () {
            setCelestialAura(item.dataset.aura, true);
            floatingMenu.hidden = true;
            floatingBtn.setAttribute("aria-expanded", "false");
         });
      });
   }

   // Sync on initial load
   setCelestialAura(activeAura, false);
}

function renderProducts() {
   const grid = document.getElementById("productGrid");
   if (!grid) return;

   const auraConfig = CELESTIAL_AURAS[activeAura] || CELESTIAL_AURAS["harmony"];

   let visibleProducts = products.filter(function (product) {
      const matchesCategory = activeCategory === "all" || product.category === activeCategory;
      const searchableText = `${product.title} ${product.brand} ${product.category} ${product.description} ${product.tags.join(" ")}`.toLowerCase();
      const matchesSearch = searchableText.includes(searchTerm);
      const matchesAura = activeAura === "harmony" || auraConfig.matcher(product);

      return matchesCategory && matchesSearch && matchesAura;
   });

   if (sortOrder === "price-low") visibleProducts.sort((a, b) => a.price - b.price);
   if (sortOrder === "price-high") visibleProducts.sort((a, b) => b.price - a.price);
   if (sortOrder === "rating") visibleProducts.sort((a, b) => b.rating.rate - a.rating.rate);

   grid.innerHTML = visibleProducts.map(createProductCard).join("");
   const auraSuffix = activeAura !== "harmony" ? ` in ${auraConfig.name}` : "";
   document.getElementById("productCount").textContent = `${visibleProducts.length} curated products${auraSuffix}`;
   document.getElementById("productEmptyState").hidden = visibleProducts.length !== 0;
   bindCardActions();
}

function createProductCard(product, index) {
   const status = product.discountPercentage > 0 ? `<span class="product-status product-status-sale">-${Math.round(product.discountPercentage)}%</span>` : index < 3 ? `<span class="product-status">New</span>` : "";
   const isWishlisted = wishlistItems.includes(product.id);
   const wishlistIcon = isWishlisted ? "bi bi-heart-fill" : "bi bi-heart";
   const auraInfo = getProductAura(product);
   const auraTag = `<span class="product-aura-tag ${auraInfo.tagClass}"><i class="bi ${auraInfo.icon}"></i> ${auraInfo.tag}</span>`;

   return `<div class="col-6 col-md-4 col-xl-3 product-item" data-category="${product.category}" data-product-id="${product.id}" data-aura="${auraInfo.id}">
      <article class="product-card product-shop-card">
         <div class="product-image-wrap">${status}<button class="product-wishlist${isWishlisted ? " selected" : ""}" type="button" aria-label="Save ${escapeHtml(product.title)}" aria-pressed="${isWishlisted}"><i class="${wishlistIcon}"></i></button><img src="${product.image}" alt="${escapeHtml(product.title)}" class="product-image"></div>
         <div class="product-details">
            ${auraTag}
            <span class="product-category">${escapeHtml(product.brand)} · ${escapeHtml(product.displayCategory)}</span>
            <h3 class="product-name" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h3>
            <div class="product-meta"><span class="product-rating"><i class="bi bi-star-fill"></i> ${product.rating.rate} <small>(${product.rating.count})</small></span><span><del class="product-old-price">${formatPrice(product.price / (1 - product.discountPercentage / 100))}</del> <strong class="product-price">${formatPrice(product.price)}</strong></span></div>
            <div class="product-stock"><i class="bi bi-box-seam"></i> ${product.stock} in stock</div>
            <div class="product-card-actions"><button class="product-cart-button" type="button"><i class="bi bi-cart-plus"></i> Add to cart</button><button class="product-buy-button" type="button">Buy now</button></div>
            <button class="product-quick-link" type="button">Quick view <i class="bi bi-arrow-up-right"></i></button>
         </div>
      </article>
   </div>`;
}

function bindCardActions() {
   document.querySelectorAll(".product-shop-card").forEach(function (card) {
      card.addEventListener("click", function (event) {
         if (event.target.closest("button, a")) return;
         const productItem = card.closest(".product-item");
         if (productItem) window.location.href = `product.html?id=${encodeURIComponent(productItem.dataset.productId)}`;
      });
   });

   document.querySelectorAll(".product-wishlist").forEach(function (button) {
      button.addEventListener("click", function () {
         const isSelected = button.getAttribute("aria-pressed") === "true";
         const productId = Number(button.closest(".product-item").dataset.productId);

         button.setAttribute("aria-pressed", String(!isSelected));
         button.classList.toggle("selected", !isSelected);
         button.querySelector("i").className = isSelected ? "bi bi-heart" : "bi bi-heart-fill";

         if (isSelected) {
            wishlistItems = wishlistItems.filter(id => id !== productId);
            delete wishlistProducts[productId];
         } else if (!wishlistItems.includes(productId)) {
            wishlistItems.push(productId);
            const product = products.find(item => item.id === productId);
            if (product) wishlistProducts[productId] = product;
         }

         localStorage.setItem("avyora-wishlist", JSON.stringify(wishlistItems));
         localStorage.setItem("avyora-wishlist-products", JSON.stringify(wishlistProducts));
         updateWishlistCount();
         renderWishlistDrawer();
         renderFavoritesPage();
      });
   });

   document.querySelectorAll(".product-quick-link").forEach(function (button) {
      button.addEventListener("click", function () {
         const card = button.closest(".product-item");
         const product = products.find(item => String(item.id) === card.dataset.productId);
         if (product) openQuickView(product);
      });
   });

   document.querySelectorAll(".product-cart-button, .product-buy-button").forEach(function (button) {
      button.addEventListener("click", function () {
         const card = button.closest(".product-item");
         const product = products.find(item => String(item.id) === card.dataset.productId);

         if (product) {
            addToCart(product, button.classList.contains("product-buy-button"));
         }
      });
   });
}

function renderBundle(bundle) {
   const container = document.getElementById("bundleProducts");
   if (!container || !bundle.length) return;
   const visibleBundle = bundle.slice(bundleRotationOffset, bundleRotationOffset + BUNDLE_VISIBLE_COUNT);
   if (visibleBundle.length < Math.min(BUNDLE_VISIBLE_COUNT, bundle.length)) {
      visibleBundle.push(...bundle.slice(0, BUNDLE_VISIBLE_COUNT - visibleBundle.length));
   }
   if (!bundleSelection.length) bundleSelection = visibleBundle.slice(0, 3).map(product => product.id);
   container.innerHTML = visibleBundle.map(function (product) {
      const isSelected = bundleSelection.includes(product.id);
      return `<button class="product-bundle-item${isSelected ? " selected" : ""}" type="button" data-bundle-product="${product.id}" aria-pressed="${isSelected}"><img src="${product.image}" alt="${escapeHtml(product.title)}"><span>${escapeHtml(product.title)}</span><strong>${formatPrice(product.price)}</strong><i class="bi ${isSelected ? "bi-check-circle-fill" : "bi-plus-circle"}"></i></button>`;
   }).join("");

   container.querySelectorAll("[data-bundle-product]").forEach(function (button) {
      button.addEventListener("click", function () {
         const productId = Number(button.dataset.bundleProduct);
         if (bundleSelection.includes(productId)) {
            bundleSelection = bundleSelection.filter(id => id !== productId);
         } else if (bundleSelection.length < 3) {
            bundleSelection.push(productId);
         } else {
            showCartMessage("Choose up to three items for your bundle.");
            return;
         }
         renderBundle(bundle);
      });
   });

   const selectedProducts = bundle.filter(product => bundleSelection.includes(product.id));
   document.getElementById("bundleTotal").textContent = formatPrice(selectedProducts.reduce((total, product) => total + product.price, 0) * 0.85);
   document.getElementById("bundleSelectionLabel").textContent = `${selectedProducts.length} item${selectedProducts.length === 1 ? "" : "s"} selected`;
   document.getElementById("claimBundleButton").onclick = function () {
      if (!selectedProducts.length) {
         showCartMessage("Choose at least one item for your bundle.");
         return;
      }
      selectedProducts.forEach(product => addToCart(product, false));
      showCartMessage(`${selectedProducts.length}-item bundle added to cart.`);
   };
}

function startBundleRotation(bundle) {
   window.clearInterval(bundleRotationTimer);
   if (!bundle || bundle.length <= BUNDLE_VISIBLE_COUNT) return;

   bundleRotationTimer = window.setInterval(function () {
      bundleRotationOffset = (bundleRotationOffset + BUNDLE_VISIBLE_COUNT) % bundle.length;
      renderBundle(bundle);
   }, 30000);
}

function openQuickView(product) {
   if (!document.getElementById("productQuickView")) {
      window.location.href = `product.html?id=${encodeURIComponent(product.id)}`;
      return;
   }

   document.getElementById("quickViewImage").src = product.image;
   document.getElementById("quickViewImage").alt = product.title;
   document.getElementById("quickViewCategory").textContent = `${product.brand} · ${product.displayCategory}`;
   document.getElementById("productQuickViewTitle").textContent = product.title;
   document.getElementById("quickViewRating").innerHTML = `<i class="bi bi-star-fill"></i> ${product.rating.rate} from ${product.rating.count} verified shoppers`;
   document.getElementById("quickViewDescription").textContent = `${product.description} ${product.warrantyInformation || "Backed by Avyora quality support."}`;
   document.getElementById("quickViewPrice").textContent = formatPrice(product.price);
   document.querySelector("#productQuickView .product-add-button").onclick = function () {
      addToCart(product, false);
   };
   const modal = document.getElementById("productQuickView");
   if (window.bootstrap?.Modal) window.bootstrap.Modal.getOrCreateInstance(modal).show();
}

function initProductDetailPage() {
   const detailPage = document.getElementById("productDetailPage");
   if (!detailPage) return;

   const productId = Number(new URLSearchParams(window.location.search).get("id"));
   const renderDetail = function () {
      const product = products.find(item => item.id === productId);
      if (!product) {
         detailPage.innerHTML = `<div class="product-detail-not-found"><i class="bi bi-search"></i><h1>We couldn't find that product.</h1><p>It may have moved, or the link may be incomplete.</p><a class="btn btn-avyora" href="index.html#product-edit">Back to the collection</a></div>`;
         return;
      }

      document.title = `${product.title} | AVYORA`;
      const galleryImages = [...new Set([product.image, ...(product.images || [])].filter(Boolean))].slice(0, 4);
      const suggestions = products
         .filter(item => item.id !== product.id)
         .map(item => {
            const sharedWords = `${product.title} ${product.tags.join(" ")}`.toLowerCase().split(/\s+/).filter(word => word.length > 3 && `${item.title} ${item.tags.join(" ")}`.toLowerCase().includes(word));
            const score = (item.category === product.category ? 5 : 0) + sharedWords.length * 2 + (item.brand === product.brand ? 1 : 0);
            return { item, score };
         })
         .sort((a, b) => b.score - a.score || b.item.rating.rate - a.item.rating.rate)
         .slice(0, 4)
         .map(({ item }) => item);

      detailPage.innerHTML = `
         <div class="product-detail-breadcrumb"><a href="index.html">HOME</a><span>/</span><a href="index.html#product-edit">${escapeHtml(product.displayCategory)}</a><span>/</span>${escapeHtml(product.title)}</div>
         <div class="product-detail-layout">
            <div class="product-detail-gallery">
               <div class="product-detail-main-image"><img id="productDetailImage" src="${product.image}" alt="${escapeHtml(product.title)}"></div>
               <div class="product-detail-thumbnails">${galleryImages.map((image, index) => `<button type="button" class="product-detail-thumbnail${index === 0 ? " active" : ""}" data-detail-image="${image}" aria-label="View product image ${index + 1}"><img src="${image}" alt=""></button>`).join("")}</div>
            </div>
            <div class="product-detail-copy">
               <span class="section-kicker">${escapeHtml(product.brand)} · ${escapeHtml(product.displayCategory)}</span>
               <h1>${escapeHtml(product.title)}</h1>
               <div class="product-detail-rating"><i class="bi bi-star-fill"></i> <strong>${product.rating.rate}</strong> <span>${product.rating.count} verified reviews</span></div>
               <div class="product-detail-price"><strong>${formatPrice(product.price)}</strong>${product.discountPercentage ? `<del>${formatPrice(product.price / (1 - product.discountPercentage / 100))}</del><span>-${Math.round(product.discountPercentage)}%</span>` : ""}</div>
               <p class="product-detail-description">${escapeHtml(product.description)}</p>
               <div class="product-detail-stock"><i class="bi bi-check-circle-fill"></i> ${product.stock} available · Ships in 2-3 business days</div>
               ${product.tags.length ? `<div class="product-detail-tags">${product.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
               <div class="product-detail-actions"><button class="btn btn-avyora" type="button" id="productDetailAdd"><i class="bi bi-bag-plus"></i> Add to bag</button><button class="product-detail-wishlist" type="button" id="productDetailWishlist" aria-pressed="${wishlistItems.includes(product.id)}"><i class="bi ${wishlistItems.includes(product.id) ? "bi-heart-fill" : "bi-heart"}"></i> Save</button></div>
               <div class="product-detail-benefits"><span><i class="bi bi-truck"></i> Free shipping</span><span><i class="bi bi-arrow-repeat"></i> 30-day returns</span><span><i class="bi bi-shield-check"></i> Quality checked</span></div>
            </div>
         </div>
         <section class="product-detail-description-block"><span class="section-kicker">GOOD TO KNOW</span><h2>Made for the everyday.</h2><p>${escapeHtml(product.warrantyInformation || "Thoughtful details, reliable function, and support you can count on from Avyora.")}</p></section>
         <section class="product-suggestions"><div class="product-grid-heading"><div><span class="section-kicker">YOU MAY ALSO LIKE</span><h2>Related finds</h2></div><span class="product-grid-note">Picked from similar products and search terms</span></div><div class="row g-4">${suggestions.map(createProductCard).join("")}</div></section>`;

      document.querySelectorAll("[data-detail-image]").forEach(function (thumbnail) {
         thumbnail.addEventListener("click", function () {
            document.getElementById("productDetailImage").src = thumbnail.dataset.detailImage;
            document.querySelectorAll(".product-detail-thumbnail").forEach(item => item.classList.toggle("active", item === thumbnail));
         });
      });
      document.getElementById("productDetailAdd").addEventListener("click", () => addToCart(product, false));
      document.getElementById("productDetailWishlist").addEventListener("click", function () {
         if (wishlistItems.includes(product.id)) removeFromWishlist(product.id);
         else {
            wishlistItems.push(product.id);
            wishlistProducts[product.id] = product;
            localStorage.setItem("avyora-wishlist", JSON.stringify(wishlistItems));
            localStorage.setItem("avyora-wishlist-products", JSON.stringify(wishlistProducts));
            updateWishlistCount();
         }
         renderDetail();
      });
      bindCardActions();
   };

   if (products.length) renderDetail();
   else {
      detailPage.innerHTML = `<div class="product-detail-loading"><i class="bi bi-arrow-repeat"></i> Loading product details...</div>`;
      const loadDetailProducts = async function () {
         try {
            const response = await fetch(PRODUCT_API_URL);
            if (!response.ok) throw new Error("Unable to load products");
            products = normalizeProducts((await response.json()).products);
         } catch (error) {
            products = normalizeProducts(FALLBACK_PRODUCTS);
         }
         renderDetail();
      };
      loadDetailProducts();
   }
}

function formatPrice(priceInUsd) {
   return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
   }).format(Math.round(priceInUsd * USD_TO_INR));
}

function getCartPricing(items = cartItems) {
   const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
   const priceSequence = items.flatMap(item => Array.from({ length: item.quantity || 1 }, () => item.price));
   const eligibleItemCount = Math.floor(itemCount / 3) * 3;
   const eligibleSubtotal = priceSequence.slice(0, eligibleItemCount).reduce((sum, price) => sum + price, 0);
   const savings = eligibleSubtotal * BUNDLE_DISCOUNT_RATE;

   return {
      subtotal: items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
      savings,
      total: items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) - savings,
      eligibleItemCount,
      nextBundleCount: itemCount % 3 === 0 ? 0 : 3 - (itemCount % 3)
   };
}

function getSelectedCartItems() {
   return cartItems.filter(item => item.selected !== false);
}

function initSuccessPage() {
   const orderIdEl = document.getElementById("successOrderId");
   const orderCustomerEl = document.getElementById("successCustomer");
   const orderTotalEl = document.getElementById("successTotal");
   const orderEmailEl = document.getElementById("successEmail");
   const orderItemsEl = document.getElementById("successItems");

   if (!orderIdEl && !orderCustomerEl && !orderTotalEl && !orderEmailEl && !orderItemsEl) return;

   const order = JSON.parse(localStorage.getItem("avyora-last-order") || "null");
   if (!order) {
      orderIdEl.textContent = "No active order";
      return;
   }

   orderIdEl.textContent = order.id;
   orderCustomerEl.textContent = order.customer;
   orderTotalEl.textContent = formatPrice(order.total || 0);
   orderEmailEl.textContent = order.email;
   orderItemsEl.textContent = `${order.items || 0} item${(order.items || 0) === 1 ? "" : "s"} in this order`;
}

function initAccountPage() {
   const accountPage = document.getElementById("accountPage");
   if (!accountPage) return;

   const order = JSON.parse(localStorage.getItem("avyora-last-order") || "null");
   const savedProfile = JSON.parse(localStorage.getItem("avyora-profile") || "null") || {};
   const emptyState = document.getElementById("accountEmpty");
   const orderCard = document.getElementById("accountOrder");
   const profile = {
      fullName: savedProfile.fullName || order?.customer || "",
      email: savedProfile.email || order?.email || "",
      phone: savedProfile.phone || "",
      dateOfBirth: savedProfile.dateOfBirth || "",
      address: savedProfile.address || "",
      city: savedProfile.city || "",
      photo: savedProfile.photo || ""
   };

   const logoutButton = document.getElementById("accountLogoutButton");
   if (logoutButton) {
      logoutButton.addEventListener("click", function () {
         localStorage.removeItem("avyora-session");
         window.location.href = "login.html";
      });
   }
   const profileFields = ["fullName", "email", "phone", "dateOfBirth", "address", "city"];

   const profileForm = document.getElementById("accountProfileForm");
   const profileSummary = document.getElementById("accountProfileSummary");
   const editButton = document.getElementById("accountEditButton");
   const profileMessage = document.getElementById("accountProfileMessage");

   function displayValue(value) {
      return value || "Not added";
   }

   function renderProfileSummary(currentProfile) {
      document.getElementById("accountSummaryName").textContent = displayValue(currentProfile.fullName);
      document.getElementById("accountSummaryEmail").textContent = displayValue(currentProfile.email);
      document.getElementById("accountSummaryPhone").textContent = displayValue(currentProfile.phone);
      document.getElementById("accountSummaryDob").textContent = displayValue(currentProfile.dateOfBirth);
      document.getElementById("accountSummaryAddress").textContent = displayValue(currentProfile.address);
      document.getElementById("accountSummaryCity").textContent = displayValue(currentProfile.city);
   }

   function renderProfilePhoto(photo) {
      const image = document.getElementById("accountAvatarImage");
      const emptyContainer = document.getElementById("accountAvatarEmpty");
      const icon = document.getElementById("accountAvatarIcon");
      const overlayText = document.getElementById("accountAvatarOverlayText");
      const avatarControl = document.getElementById("accountAvatarControl");
      const avatarBadge = document.getElementById("accountAvatarBadge");
      const photoButton = document.getElementById("accountPhotoButton");
      const removeButton = document.getElementById("accountPhotoRemoveButton");

      if (image) {
         image.hidden = !photo;
         if (photo) image.src = photo;
         else image.removeAttribute("src");
      }
      if (emptyContainer) {
         emptyContainer.hidden = Boolean(photo);
      } else if (icon) {
         icon.hidden = Boolean(photo);
      }
      if (overlayText) {
         overlayText.textContent = photo ? "Change pic" : "Add your pic";
      }
      if (avatarControl) {
         const tooltip = photo ? "Change profile photo" : "Add your photo";
         avatarControl.setAttribute("aria-label", tooltip);
         avatarControl.setAttribute("title", tooltip);
      }
      if (avatarBadge) {
         const tooltip = photo ? "Change profile photo" : "Add your photo";
         avatarBadge.setAttribute("aria-label", tooltip);
         avatarBadge.setAttribute("title", tooltip);
      }
      if (photoButton) {
         photoButton.innerHTML = photo
            ? '<i class="bi bi-camera"></i> Change profile photo'
            : '<i class="bi bi-camera"></i> Add profile photo';
      }
      if (removeButton) {
         removeButton.hidden = !photo;
      }
      updateNavbarAvatar(photo);
   }

   function setProfileEditMode(isEditing) {
      profileForm.hidden = !isEditing;
      profileSummary.hidden = isEditing;
      editButton.innerHTML = isEditing
         ? '<i class="bi bi-x-lg"></i> Cancel'
         : '<i class="bi bi-pencil"></i> Edit details';
      if (isEditing) profileForm.elements.fullName.focus();
   }

   profileFields.forEach(function (field) {
      const value = profile[field];
      const input = profileForm.elements[field];
      if (input) input.value = value;
   });
   renderProfileSummary(profile);
   renderProfilePhoto(profile.photo);
   setProfileEditMode(false);

   const avatarControl = document.getElementById("accountAvatarControl");
   const avatarBadge = document.getElementById("accountAvatarBadge");
   const photoInput = document.getElementById("accountPhotoInput");
   const photoButton = document.getElementById("accountPhotoButton");
   const removeButton = document.getElementById("accountPhotoRemoveButton");

   function triggerPhotoUpload() {
      if (photoInput) photoInput.click();
   }

   if (avatarControl) {
      avatarControl.addEventListener("click", triggerPhotoUpload);
   }
   if (avatarBadge) {
      avatarBadge.addEventListener("click", function (e) {
         e.stopPropagation();
         triggerPhotoUpload();
      });
   }
   if (photoButton) {
      photoButton.addEventListener("click", triggerPhotoUpload);
   }
   if (removeButton) {
      removeButton.addEventListener("click", function () {
         profile.photo = "";
         const currentSaved = JSON.parse(localStorage.getItem("avyora-profile") || "{}");
         currentSaved.photo = "";
         localStorage.setItem("avyora-profile", JSON.stringify(currentSaved));
         renderProfilePhoto("");
      });
   }

   if (photoInput) {
      photoInput.addEventListener("change", function (event) {
         const file = event.target.files[0];
         if (!file) return;

         const reader = new FileReader();
         reader.addEventListener("load", function () {
            profile.photo = reader.result;
            const savedProfileWithPhoto = { ...JSON.parse(localStorage.getItem("avyora-profile") || "{}"), photo: profile.photo };
            localStorage.setItem("avyora-profile", JSON.stringify(savedProfileWithPhoto));
            renderProfilePhoto(profile.photo);
         });
         reader.readAsDataURL(file);
         event.target.value = "";
      });
   }

   editButton.addEventListener("click", function () {
      setProfileEditMode(profileForm.hidden);
      profileMessage.textContent = "";
   });

   profileForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(profileForm);
      const updatedProfile = Object.fromEntries(profileFields.map(field => [field, String(formData.get(field) || "").trim()]));
      updatedProfile.photo = profile.photo;

      if (!updatedProfile.fullName || !updatedProfile.email) {
         profileMessage.textContent = "Name and email are required.";
         return;
      }

      localStorage.setItem("avyora-profile", JSON.stringify(updatedProfile));
      if (order) {
         order.customer = updatedProfile.fullName;
         order.email = updatedProfile.email;
         localStorage.setItem("avyora-last-order", JSON.stringify(order));
      }
      document.getElementById("accountCustomer").textContent = updatedProfile.fullName;
      document.getElementById("accountEmail").textContent = updatedProfile.email;
      document.getElementById("accountWelcomeName").textContent = updatedProfile.fullName.split(" ")[0];
      renderProfileSummary(updatedProfile);
      setProfileEditMode(false);
      profileMessage.textContent = "Your details have been saved.";
   });

   if (!order) {
      document.getElementById("accountCustomer").textContent = profile.fullName || "AVYORA shopper";
      document.getElementById("accountEmail").textContent = profile.email || "Your personal shopping space";
      document.getElementById("accountWelcomeName").textContent = profile.fullName ? profile.fullName.split(" ")[0] : "there";
      document.getElementById("accountOrderStatus").innerHTML = '<i class="bi bi-sparkles"></i> Ready when you are';
      document.getElementById("accountOrderId").textContent = "No orders yet";
      document.getElementById("accountOrderDate").textContent = "--";
      document.getElementById("accountOrderItems").textContent = "--";
      document.getElementById("accountOrderTotal").textContent = "--";
      document.getElementById("accountProgress").hidden = true;
      document.getElementById("accountOrderNote").innerHTML = '<i class="bi bi-stars"></i> Your first order will appear here once you check out.';
      document.getElementById("accountOrderLink").href = "index.html";
      document.getElementById("accountOrderLink").innerHTML = 'Start shopping <i class="bi bi-arrow-right"></i>';
      emptyState.hidden = true;
      orderCard.hidden = false;
      return;
   }

   document.getElementById("accountCustomer").textContent = profile.fullName || "AVYORA shopper";
   document.getElementById("accountWelcomeName").textContent = (profile.fullName || "there").split(" ")[0];
   document.getElementById("accountEmail").textContent = profile.email || "";
   document.getElementById("accountOrderId").textContent = order.id || "--";
   document.getElementById("accountOrderTotal").textContent = formatPrice(order.total || 0);
   document.getElementById("accountOrderItems").textContent = `${order.items || 0} item${(order.items || 0) === 1 ? "" : "s"}`;
   document.getElementById("accountOrderDate").textContent = order.placedAt
      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(order.placedAt))
      : "Recently placed";
   document.getElementById("accountOrderStatus").innerHTML = '<i class="bi bi-check-circle"></i> Confirmed';
   document.getElementById("accountProgress").hidden = false;
   document.getElementById("accountOrderNote").innerHTML = '<i class="bi bi-info-circle"></i> Thanks for choosing AVYORA. Your order is being prepared.';
   document.getElementById("accountOrderLink").href = "success.html";
   document.getElementById("accountOrderLink").innerHTML = 'View confirmation <i class="bi bi-arrow-right"></i>';
   emptyState.hidden = true;
   orderCard.hidden = false;
}

function initHeavenlyCanvas() {
   const canvas = document.getElementById("heavenlyCanvas");
   if (!canvas) return;

   const ctx = canvas.getContext("2d");
   if (!ctx) return;

   let width = 0;
   let height = 0;
   let dpr = window.devicePixelRatio || 1;
   let animationFrameId = null;
   let mouse = { x: -1000, y: -1000, active: false };

   const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

   function resize() {
      width = canvas.parentElement ? canvas.parentElement.offsetWidth : window.innerWidth;
      height = canvas.parentElement ? canvas.parentElement.offsetHeight : window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
   }

   resize();
   window.addEventListener("resize", resize);

   // Generate heavenly stardust particles
   const particleCount = Math.min(Math.floor((width * height) / 18000), 55);
   const particles = [];

   const colors = [
      { r: 255, g: 195, b: 85 },  // Warm solar gold
      { r: 255, g: 140, b: 40 },  // Amber glow
      { r: 216, g: 180, b: 254 }, // Lavender haze
      { r: 165, g: 210, b: 255 }, // Celestial sky blue
      { r: 255, g: 245, b: 210 }  // Starlight white
   ];

   for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
         x: Math.random() * width,
         y: Math.random() * height,
         radius: Math.random() * 2.2 + 0.8,
         vx: (Math.random() - 0.5) * 0.45,
         vy: (Math.random() - 0.5) * 0.45 - 0.12, // subtle upward drift
         baseAlpha: Math.random() * 0.55 + 0.25,
         alpha: 0.3,
         pulseSpeed: Math.random() * 0.02 + 0.008,
         pulsePhase: Math.random() * Math.PI * 2,
         color: color
      });
   }

   window.addEventListener("mousemove", function (e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
   });

   window.addEventListener("mouseleave", function () {
      mouse.active = false;
   });

   function render() {
      ctx.clearRect(0, 0, width, height);

      // Draw and update particles
      for (let i = 0; i < particles.length; i++) {
         const p = particles[i];

         if (!prefersReducedMotion) {
            p.x += p.vx;
            p.y += p.vy;

            p.pulsePhase += p.pulseSpeed;
            p.alpha = p.baseAlpha + Math.sin(p.pulsePhase) * 0.2;

            // Wrap around edges gracefully
            if (p.x < -20) p.x = width + 20;
            if (p.x > width + 20) p.x = -20;
            if (p.y < -20) p.y = height + 20;
            if (p.y > height + 20) p.y = -20;
         }

         // Check mouse proximity for celestial constellation aura
         let alphaBoost = 0;
         let mouseRadiusBoost = 0;
         if (mouse.active) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 130) {
               const factor = (1 - dist / 130);
               alphaBoost = factor * 0.5;
               mouseRadiusBoost = factor * 1.5;
            }
         }

         const finalAlpha = Math.min(Math.max(p.alpha + alphaBoost, 0.1), 0.95);
         const finalRadius = p.radius + mouseRadiusBoost;

         // Draw particle glow
         ctx.beginPath();
         const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, finalRadius * 3);
         gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${finalAlpha})`);
         gradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${finalAlpha * 0.35})`);
         gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
         ctx.fillStyle = gradient;
         ctx.arc(p.x, p.y, finalRadius * 3, 0, Math.PI * 2);
         ctx.fill();

         // Draw bright starlight center
         ctx.beginPath();
         ctx.arc(p.x, p.y, Math.max(finalRadius * 0.7, 0.6), 0, Math.PI * 2);
         ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(finalAlpha + 0.2, 1)})`;
         ctx.fill();

         // Draw subtle constellation connections between nearby particles
         for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const cdx = p.x - p2.x;
            const cdy = p.y - p2.y;
            const cdist = Math.sqrt(cdx * cdx + cdy * cdy);

            if (cdist < 95) {
               const connAlpha = (1 - cdist / 95) * 0.18 * finalAlpha;
               ctx.beginPath();
               ctx.moveTo(p.x, p.y);
               ctx.lineTo(p2.x, p2.y);
               ctx.strokeStyle = `rgba(255, 200, 110, ${connAlpha})`;
               ctx.lineWidth = 0.75;
               ctx.stroke();
            }
         }
      }

      if (!document.hidden) {
         animationFrameId = requestAnimationFrame(render);
      }
   }

   document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
         if (animationFrameId) cancelAnimationFrame(animationFrameId);
      } else {
         render();
      }
   });

   render();
}

function initHeavenlyRulesModal() {
   const rulesModal = document.getElementById("heavenlyRulesModal");
   const openTermsLink = document.getElementById("openTermsLink");
   const openPrivacyLink = document.getElementById("openPrivacyLink");
   const closeRulesBtn = document.getElementById("closeRulesBtn");
   const acceptRulesBtn = document.getElementById("acceptRulesBtn");
   const tabTermsBtn = document.getElementById("tabTermsBtn");
   const tabPrivacyBtn = document.getElementById("tabPrivacyBtn");
   const termsPanel = document.getElementById("rulesTermsPanel");
   const privacyPanel = document.getElementById("rulesPrivacyPanel");
   const agreeTermsCheckbox = document.getElementById("agreeTerms");

   if (!rulesModal) return;

   function switchTab(tab) {
      if (tab === "terms") {
         tabTermsBtn?.classList.add("active");
         tabTermsBtn?.setAttribute("aria-selected", "true");
         tabPrivacyBtn?.classList.remove("active");
         tabPrivacyBtn?.setAttribute("aria-selected", "false");
         termsPanel?.classList.remove("d-none");
         privacyPanel?.classList.add("d-none");
      } else {
         tabPrivacyBtn?.classList.add("active");
         tabPrivacyBtn?.setAttribute("aria-selected", "true");
         tabTermsBtn?.classList.remove("active");
         tabTermsBtn?.setAttribute("aria-selected", "false");
         privacyPanel?.classList.remove("d-none");
         termsPanel?.classList.add("d-none");
      }
   }

   function openModal(tab = "terms") {
      switchTab(tab);
      rulesModal.classList.remove("d-none");
      document.body.style.overflow = "hidden";
   }

   function closeModal() {
      rulesModal.classList.add("d-none");
      document.body.style.overflow = "";
   }

   openTermsLink?.addEventListener("click", function (e) {
      e.preventDefault();
      openModal("terms");
   });

   openPrivacyLink?.addEventListener("click", function (e) {
      e.preventDefault();
      openModal("privacy");
   });

   tabTermsBtn?.addEventListener("click", function () {
      switchTab("terms");
   });

   tabPrivacyBtn?.addEventListener("click", function () {
      switchTab("privacy");
   });

   closeRulesBtn?.addEventListener("click", closeModal);

   acceptRulesBtn?.addEventListener("click", function () {
      if (agreeTermsCheckbox) {
         agreeTermsCheckbox.checked = true;
      }
      closeModal();
   });

   rulesModal.addEventListener("click", function (e) {
      if (e.target === rulesModal) {
         closeModal();
      }
   });

   document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !rulesModal.classList.contains("d-none")) {
         closeModal();
      }
   });
}

function initAuthPages() {
   initHeavenlyCanvas();
   initHeavenlyRulesModal();

   const registerForm = document.getElementById("registerForm");
   const loginForm = document.getElementById("loginForm");

   if (registerForm) {
      const passwordInput = document.getElementById("registerPassword");
      const confirmPasswordInput = document.getElementById("registerConfirmPassword");
      const togglePasswordBtn = document.getElementById("togglePasswordBtn");
      const toggleConfirmPasswordBtn = document.getElementById("toggleConfirmPasswordBtn");
      const togglePasswordIcon = document.getElementById("togglePasswordIcon");
      const toggleConfirmPasswordIcon = document.getElementById("toggleConfirmPasswordIcon");
      const strengthBar = document.getElementById("strengthBar");
      const strengthLabel = document.getElementById("strengthLabel");
      const matchLabel = document.getElementById("matchLabel");
      const hintLength = document.getElementById("hintLength");
      const hintNumber = document.getElementById("hintNumber");
      const hintSpecial = document.getElementById("hintSpecial");
      const submitBtn = document.getElementById("registerSubmitBtn");
      const btnText = document.getElementById("btnText");
      const btnIcon = document.getElementById("btnIcon");
      const btnSpinner = document.getElementById("btnSpinner");
      const celebrationModal = document.getElementById("heavenlyCelebrationModal");
      const celebrationName = document.getElementById("celebrationName");

      // Toggle Password Visibility
      if (togglePasswordBtn && passwordInput && togglePasswordIcon) {
         togglePasswordBtn.addEventListener("click", function () {
            const isPassword = passwordInput.type === "password";
            passwordInput.type = isPassword ? "text" : "password";
            togglePasswordIcon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
         });
      }

      if (toggleConfirmPasswordBtn && confirmPasswordInput && toggleConfirmPasswordIcon) {
         toggleConfirmPasswordBtn.addEventListener("click", function () {
            const isPassword = confirmPasswordInput.type === "password";
            confirmPasswordInput.type = isPassword ? "text" : "password";
            toggleConfirmPasswordIcon.className = isPassword ? "bi bi-eye-slash" : "bi bi-eye";
         });
      }

      // Dynamic Heavenly Password Strength Evaluator
      function evaluatePasswordStrength(password) {
         if (!strengthBar || !strengthLabel) return;

         if (!password) {
            strengthBar.className = "heavenly-strength-bar";
            strengthBar.style.width = "0%";
            strengthLabel.textContent = "At least 6 characters";
            strengthLabel.className = "heavenly-strength-label text-secondary";
            if (hintLength) hintLength.classList.remove("valid");
            if (hintNumber) hintNumber.classList.remove("valid");
            if (hintSpecial) hintSpecial.classList.remove("valid");
            return;
         }

         const hasLength = password.length >= 6;
         const hasNumber = /\d/.test(password);
         const hasSpecial = /[^A-Za-z0-9]/.test(password);
         const hasMixed = /[a-z]/.test(password) && /[A-Z]/.test(password);

         if (hintLength) hintLength.classList.toggle("valid", hasLength);
         if (hintNumber) hintNumber.classList.toggle("valid", hasNumber);
         if (hintSpecial) hintSpecial.classList.toggle("valid", hasSpecial);

         let score = 0;
         if (hasLength) score++;
         if (password.length >= 8) score++;
         if (hasNumber) score++;
         if (hasSpecial) score++;
         if (hasMixed) score++;

         strengthBar.className = "heavenly-strength-bar";

         if (password.length < 6) {
            strengthBar.classList.add("strength-weak");
            strengthLabel.textContent = "🌒 Distant Star (Too weak)";
            strengthLabel.style.color = "#ef4444";
         } else if (score <= 2) {
            strengthBar.classList.add("strength-fair");
            strengthLabel.textContent = "🌓 Rising Dawn (Fair)";
            strengthLabel.style.color = "#f59e0b";
         } else if (score <= 4) {
            strengthBar.classList.add("strength-good");
            strengthLabel.textContent = "🌔 Radiant Light (Good)";
            strengthLabel.style.color = "#3b82f6";
         } else {
            strengthBar.classList.add("strength-divine");
            strengthLabel.textContent = "🌟 Divine Sanctuary (Optimal)";
            strengthLabel.style.color = "#10b981";
         }
      }

      // Password Confirmation Real-Time Match
      function checkPasswordMatch() {
         if (!matchLabel || !confirmPasswordInput) return;
         const pwd = passwordInput ? passwordInput.value : "";
         const confirmPwd = confirmPasswordInput.value;

         if (!confirmPwd) {
            matchLabel.textContent = "";
            matchLabel.className = "heavenly-match-label";
            return;
         }

         if (pwd && pwd === confirmPwd) {
            matchLabel.innerHTML = '<i class="bi bi-check-circle-fill"></i> Passwords match';
            matchLabel.className = "heavenly-match-label matched";
         } else {
            matchLabel.innerHTML = '<i class="bi bi-x-circle-fill"></i> Do not match';
            matchLabel.className = "heavenly-match-label mismatched";
         }
      }

      if (passwordInput) {
         passwordInput.addEventListener("input", function () {
            evaluatePasswordStrength(passwordInput.value);
            checkPasswordMatch();
         });
      }

      if (confirmPasswordInput) {
         confirmPasswordInput.addEventListener("input", checkPasswordMatch);
      }

      // Handle Registration Submission with Ascension Celebration
      registerForm.addEventListener("submit", function (event) {
         event.preventDefault();
         const formData = new FormData(registerForm);
         const fullName = String(formData.get("fullName") || "").trim();
         const email = String(formData.get("email") || "").trim().toLowerCase();
         const password = String(formData.get("password") || "");
         const confirmPassword = String(formData.get("confirmPassword") || "");
         const message = document.getElementById("registerMessage");

         if (!fullName || !email || password.length < 6) {
            message.textContent = "Please complete all fields. Your password needs at least 6 characters.";
            return;
         }
         if (password !== confirmPassword) {
            message.textContent = "Your passwords do not match.";
            return;
         }

         const existingUser = JSON.parse(localStorage.getItem("avyora-user") || "null");
         if (existingUser?.email === email) {
            message.textContent = "An account with this email already exists. Please sign in.";
            return;
         }

         message.textContent = "";

         // Show button loading state
         if (submitBtn) {
            submitBtn.disabled = true;
            if (btnText) btnText.textContent = "Ascending...";
            if (btnIcon) btnIcon.classList.add("d-none");
            if (btnSpinner) btnSpinner.classList.remove("d-none");
         }

         const sanctuaryAura = String(formData.get("sanctuaryAura") || activeAura || "harmony");
         const auraConfig = CELESTIAL_AURAS[sanctuaryAura] || CELESTIAL_AURAS["harmony"];

         // Save user session & profile with chosen sanctuary atmosphere
         localStorage.setItem("avyora-active-aura", sanctuaryAura);
         localStorage.setItem("avyora-user", JSON.stringify({ fullName, email, password, aura: sanctuaryAura }));
         localStorage.setItem("avyora-profile", JSON.stringify({ fullName, email, phone: "", dateOfBirth: "", address: "", city: "", photo: "", aura: sanctuaryAura, auraName: auraConfig.name }));
         localStorage.setItem("avyora-session", JSON.stringify({ email, signedInAt: new Date().toISOString() }));

         // Trigger Heavenly Celebration Ascension Portal
         if (celebrationModal) {
            const firstName = fullName.split(" ")[0] || "Friend";
            if (celebrationName) {
               celebrationName.textContent = `Welcome, ${firstName}!`;
            }
            const celebrationDesc = document.getElementById("celebrationDesc");
            if (celebrationDesc) {
               celebrationDesc.textContent = `Your sacred AVYORA account is created with the ${auraConfig.name} atmosphere. Entering a universe of divine luxury...`;
            }
            celebrationModal.classList.remove("d-none");
         }

         // Graceful celestial delay before redirecting to index.html
         setTimeout(function () {
            window.location.href = "index.html";
         }, 2000);
      });
   }

   if (loginForm) {
      const existingUser = JSON.parse(localStorage.getItem("avyora-user") || "null");
      const rememberedEmail = localStorage.getItem("avyora-remembered-email");
      if (rememberedEmail) loginForm.elements.email.value = rememberedEmail;

      loginForm.addEventListener("submit", function (event) {
         event.preventDefault();
         const formData = new FormData(loginForm);
         const email = String(formData.get("email") || "").trim().toLowerCase();
         const password = String(formData.get("password") || "");
         const message = document.getElementById("loginMessage");

         if (!existingUser || existingUser.email !== email || existingUser.password !== password) {
            message.textContent = "We could not match those details. Check your email and password.";
            return;
         }

         if (document.getElementById("rememberMe").checked) localStorage.setItem("avyora-remembered-email", email);
         else localStorage.removeItem("avyora-remembered-email");
         localStorage.setItem("avyora-session", JSON.stringify({ email, signedInAt: new Date().toISOString() }));
         window.location.href = "account.html";
      });
   }
}

function initCartPage() {
   const cartPageItems = document.getElementById("cartPageItems");
   const continueShopping = document.getElementById("continueShopping");

   if (!cartPageItems) return;

   renderCartPage();

   if (continueShopping) {
      continueShopping.addEventListener("click", function () {
         window.location.href = "index.html";
      });
   }
}

function initCheckoutPage() {
   const checkoutForm = document.getElementById("checkoutForm");
   if (!checkoutForm) return;

   const subtotalEl = document.getElementById("checkoutSubtotal");
   const shippingEl = document.getElementById("checkoutShipping");
   const savingsEl = document.getElementById("checkoutSavings");
   const totalEl = document.getElementById("checkoutTotal");
   const checkoutButton = document.getElementById("checkoutButton");
   const checkoutBtnLabel = document.getElementById("checkoutBtnLabel");
   const itemsListEl = document.getElementById("checkoutItemsList");
   const emptyNoticeEl = document.getElementById("checkoutEmptyNotice");
   const mainLayoutEl = document.getElementById("checkoutMainLayout");
   const authNoticeEl = document.getElementById("checkoutAuthNotice");
   const authUserEl = document.getElementById("checkoutAuthUser");
   const errorMessageEl = document.getElementById("checkoutErrorMessage");
   const couponCodeInput = document.getElementById("couponCodeInput");
   const applyCouponBtn = document.getElementById("applyCouponBtn");
   const couponFeedback = document.getElementById("couponFeedback");
   const couponRow = document.getElementById("couponRow");
   const couponTag = document.getElementById("couponTag");
   const checkoutCouponDiscount = document.getElementById("checkoutCouponDiscount");
   const paymentModal = document.getElementById("paymentProcessingModal");
   const gatewayStatusText = document.getElementById("gatewayStatusText");
   const speedStandardLabel = document.getElementById("speedStandardLabel");
   const speedExpressLabel = document.getElementById("speedExpressLabel");
   const standardSpeedPrice = document.getElementById("standardSpeedPrice");

   // Card inputs
   const cardNumberInput = document.getElementById("cardNumber");
   const cardHolderInput = document.getElementById("cardHolder");
   const cardExpiryInput = document.getElementById("cardExpiry");
   const cardCvvInput = document.getElementById("cardCvv");
   const cardBrandIcon = document.getElementById("cardBrandIcon");

   // UPI inputs
   const upiIdInput = document.getElementById("upiId");
   const verifyUpiBtn = document.getElementById("verifyUpiBtn");
   const upiVerifyMsg = document.getElementById("upiVerifyMsg");

   // COD inputs
   const codVerificationInput = document.getElementById("codVerification");
   const codCaptchaText = document.getElementById("codCaptchaText");
   const refreshCaptchaBtn = document.getElementById("refreshCaptchaBtn");
   const codErrorMsg = document.getElementById("codErrorMsg");

   // Selected items
   let selectedItems = getSelectedCartItems();
   if (!selectedItems.length && cartItems.length) {
      selectedItems = [...cartItems];
   }

   // Empty cart state
   if (!selectedItems.length) {
      if (emptyNoticeEl) emptyNoticeEl.classList.remove("d-none");
      if (mainLayoutEl) mainLayoutEl.classList.add("d-none");
      return;
   }

   // Auto-fill logged-in profile details
   const savedProfile = JSON.parse(localStorage.getItem("avyora-profile") || "null") || {};
   const savedUser = JSON.parse(localStorage.getItem("avyora-user") || "null") || {};
   const customerName = savedProfile.fullName || savedUser.fullName || "";
   const customerEmail = savedProfile.email || savedUser.email || "";

   if (customerName || customerEmail) {
      const nameInput = document.getElementById("fullName");
      const emailInput = document.getElementById("email");
      const phoneInput = document.getElementById("phone");
      const addressInput = document.getElementById("address");
      const cityInput = document.getElementById("city");

      if (nameInput && !nameInput.value) nameInput.value = customerName;
      if (emailInput && !emailInput.value) emailInput.value = customerEmail;
      if (phoneInput && !phoneInput.value && savedProfile.phone) phoneInput.value = savedProfile.phone;
      if (addressInput && !addressInput.value && savedProfile.address) addressInput.value = savedProfile.address;
      if (cityInput && !cityInput.value && savedProfile.city) cityInput.value = savedProfile.city;

      if (authNoticeEl && authUserEl) {
         authUserEl.textContent = customerName || customerEmail;
         authNoticeEl.classList.remove("d-none");
      }
   }

   // Render Items in Order Summary Sidebar
   function renderCheckoutItemsList() {
      if (itemsListEl) {
         itemsListEl.innerHTML = selectedItems.map(item => `
            <div class="checkout-preview-item">
               <img src="${item.image}" alt="${escapeHtml(item.title)}">
               <div class="checkout-preview-item-info">
                  <div class="checkout-preview-item-title">${escapeHtml(item.title)}</div>
                  <div class="checkout-preview-item-qty">Qty: ${item.quantity || 1} ${item.isBundleItem ? '<span class="badge bg-warning text-dark ms-1">Bundle</span>' : ''}</div>
               </div>
               <div class="checkout-preview-item-price">${formatPrice(item.price * (item.quantity || 1))}</div>
            </div>
         `).join("");
      }
   }
   renderCheckoutItemsList();

   // State
   let currentSpeed = "standard";
   let activePayment = "card";
   let appliedCoupon = null;

   // Coupons catalog
   const coupons = {
      "WELCOME10": { type: "percent", value: 10, label: "10% OFF" },
      "CELESTIAL": { type: "flat", value: 500 / USD_TO_INR, label: "₹500 OFF" },
      "FREESHIP": { type: "shipping", value: 0, label: "FREE SHIPPING" }
   };

   // Totals recalculation
   function calculateAndRenderTotals() {
      const pricing = getCartPricing(selectedItems);
      const isFreeStandard = (pricing.subtotal * USD_TO_INR) >= 999;
      
      if (standardSpeedPrice) {
         standardSpeedPrice.textContent = isFreeStandard ? "FREE" : "₹149";
      }

      let shippingFee = 0;
      if (currentSpeed === "standard") {
         shippingFee = isFreeStandard ? 0 : (SHIPPING_FEE_INR / USD_TO_INR);
      } else {
         shippingFee = 299 / USD_TO_INR; // Express Sanctuary delivery
      }

      let couponDiscount = 0;
      if (appliedCoupon) {
         if (appliedCoupon.type === "percent") {
            couponDiscount = pricing.subtotal * (appliedCoupon.value / 100);
         } else if (appliedCoupon.type === "flat") {
            couponDiscount = Math.min(appliedCoupon.value, pricing.subtotal);
         } else if (appliedCoupon.type === "shipping") {
            shippingFee = 0;
         }
      }

      const finalPayable = Math.max(0, pricing.subtotal + shippingFee - couponDiscount);

      if (subtotalEl) subtotalEl.textContent = formatPrice(pricing.subtotal);
      if (shippingEl) shippingEl.textContent = shippingFee === 0 ? "FREE" : formatPrice(shippingFee);
      if (savingsEl) savingsEl.textContent = pricing.savings > 0 ? `- ${formatPrice(pricing.savings)}` : formatPrice(0);
      
      if (couponRow && checkoutCouponDiscount && couponTag) {
         if (appliedCoupon && (couponDiscount > 0 || appliedCoupon.type === "shipping")) {
            couponRow.style.display = "flex";
            couponTag.textContent = appliedCoupon.code;
            checkoutCouponDiscount.textContent = appliedCoupon.type === "shipping" ? "Free Shipping" : `- ${formatPrice(couponDiscount)}`;
         } else {
            couponRow.style.display = "none";
         }
      }

      if (totalEl) totalEl.textContent = formatPrice(finalPayable);
      if (checkoutBtnLabel) {
         if (activePayment === "cod") {
            checkoutBtnLabel.textContent = `Confirm Order (${formatPrice(finalPayable)} on Delivery)`;
         } else {
            checkoutBtnLabel.textContent = `Pay ${formatPrice(finalPayable)} Securely`;
         }
      }

      return { pricing, shippingFee, couponDiscount, finalPayable };
   }

   calculateAndRenderTotals();

   // ==================================================
   // STEP 3: COMPANION BUNDLE (6 PRODUCTS - SELECT EXACTLY 3)
   // ==================================================
   let selectedBundleIds = [];
   let bundleClaimed = false;
   let companionProducts = [];

   function getCheckoutCompanionProducts() {
      if (!products || !products.length) return [];
      const cartProductIds = new Set(selectedItems.map(i => i.id));
      const cartCategories = new Set(selectedItems.map(i => i.category));
      const cartKeywords = selectedItems.flatMap(i => `${i.title} ${i.tags ? i.tags.join(" ") : ""}`.toLowerCase().split(/\s+/)).filter(w => w.length > 3);

      let candidates = products.filter(p => !cartProductIds.has(p.id));

      const scored = candidates.map(product => {
         let score = 0;
         if (cartCategories.has(product.category)) score += 6;
         const text = `${product.title} ${product.brand} ${product.description} ${(product.tags || []).join(" ")}`.toLowerCase();
         cartKeywords.forEach(kw => {
            if (text.includes(kw)) score += 2;
         });
         score += (product.rating?.rate || 0);
         return { product, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, 6).map(s => s.product);
   }

   function updateBundleUI() {
      const counterText = document.getElementById("checkoutBundleCounterText");
      const slot1 = document.getElementById("bundleSlot1");
      const slot2 = document.getElementById("bundleSlot2");
      const slot3 = document.getElementById("bundleSlot3");
      const slots = [slot1, slot2, slot3];
      const bundleTotalEl = document.getElementById("checkoutBundleTotal");
      const bundleOriginalEl = document.getElementById("checkoutBundleOriginal");
      const bundleSavingsEl = document.getElementById("checkoutBundleSavings");

      if (counterText) {
         counterText.textContent = `Selected: ${selectedBundleIds.length} of 3 items`;
      }

      slots.forEach((slot, idx) => {
         if (!slot) return;
         if (idx < selectedBundleIds.length) {
            const prod = companionProducts.find(p => p.id === selectedBundleIds[idx]);
            slot.classList.add("filled");
            slot.textContent = prod ? prod.title.split(" ").slice(0, 2).join(" ") : `Item ${idx + 1}`;
         } else {
            slot.classList.remove("filled");
            slot.textContent = `Item ${idx + 1}`;
         }
      });

      const selectedProds = companionProducts.filter(p => selectedBundleIds.includes(p.id));
      const originalSum = selectedProds.reduce((sum, p) => sum + p.price, 0);
      const discountedSum = originalSum * (1 - BUNDLE_DISCOUNT_RATE);
      const savingsSum = originalSum - discountedSum;

      if (bundleTotalEl) bundleTotalEl.textContent = formatPrice(discountedSum);
      if (bundleOriginalEl) bundleOriginalEl.textContent = selectedBundleIds.length > 0 ? formatPrice(originalSum) : "";
      if (bundleSavingsEl) bundleSavingsEl.textContent = selectedBundleIds.length > 0 ? `Save ${formatPrice(savingsSum)}` : "Save 15%";

      const grid = document.getElementById("checkoutBundleProducts");
      if (grid) {
         grid.querySelectorAll(".bundle-product-card").forEach(card => {
            const pid = Number(card.dataset.bundleId);
            card.classList.toggle("selected", selectedBundleIds.includes(pid));
         });
      }
   }

   initCheckoutBundleOffer = function () {
      companionProducts = getCheckoutCompanionProducts();
      const grid = document.getElementById("checkoutBundleProducts");
      if (!grid || !companionProducts.length) return;

      grid.innerHTML = companionProducts.map(product => {
         const isSelected = selectedBundleIds.includes(product.id);
         const discountedPrice = product.price * (1 - BUNDLE_DISCOUNT_RATE);

         return `
            <div class="col-6 col-md-4">
               <div class="bundle-product-card${isSelected ? " selected" : ""}" data-bundle-id="${product.id}">
                  <div class="bundle-card-thumb">
                     <span class="bundle-select-badge"><i class="bi bi-check-lg"></i></span>
                     <img src="${product.image}" alt="${escapeHtml(product.title)}" loading="lazy">
                  </div>
                  <span class="bundle-card-category">${escapeHtml(product.brand || product.displayCategory)}</span>
                  <h4 class="bundle-card-title" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h4>
                  <div class="bundle-card-prices">
                     <strong class="bundle-card-price">${formatPrice(discountedPrice)}</strong>
                     <span class="bundle-card-old-price">${formatPrice(product.price)}</span>
                     <span class="bundle-card-save-badge">15% OFF</span>
                  </div>
               </div>
            </div>
         `;
      }).join("");

      grid.querySelectorAll(".bundle-product-card").forEach(card => {
         card.addEventListener("click", function () {
            if (bundleClaimed) return;
            const pid = Number(card.dataset.bundleId);
            const isSelected = selectedBundleIds.includes(pid);
            const alertEl = document.getElementById("bundleValidationAlert");
            const textEl = document.getElementById("bundleValidationText");

            if (isSelected) {
               selectedBundleIds = selectedBundleIds.filter(id => id !== pid);
               if (alertEl) alertEl.classList.add("d-none");
            } else {
               if (selectedBundleIds.length >= 3) {
                  // User tried to select more than 3!
                  if (alertEl && textEl) {
                     textEl.textContent = "You have to select 3 items only. Please deselect an item if you wish to choose another.";
                     alertEl.classList.remove("d-none");
                  }
                  return;
               }
               selectedBundleIds.push(pid);
               if (alertEl) alertEl.classList.add("d-none");
            }

            updateBundleUI();
         });
      });

      updateBundleUI();
   };

   initCheckoutBundleOffer();

   // Claim button listener with strict 3-item validation
   const claimBtn = document.getElementById("claimCheckoutBundleBtn");
   const alertEl = document.getElementById("bundleValidationAlert");
   const textEl = document.getElementById("bundleValidationText");

   if (claimBtn) {
      claimBtn.addEventListener("click", function () {
         if (bundleClaimed) return;

         if (selectedBundleIds.length !== 3) {
            if (alertEl && textEl) {
               textEl.textContent = `You have to select 3 items only. (Currently selected: ${selectedBundleIds.length} of 3)`;
               alertEl.classList.remove("d-none");
            }
            return;
         }

         // Valid selection: exactly 3 items
         if (alertEl) alertEl.classList.add("d-none");
         bundleClaimed = true;

         const prodsToAdd = companionProducts.filter(p => selectedBundleIds.includes(p.id));
         prodsToAdd.forEach(bp => {
            const existing = selectedItems.find(i => i.id === bp.id);
            if (existing) {
               existing.quantity = (existing.quantity || 1) + 1;
            } else {
               selectedItems.push({ ...bp, quantity: 1, isBundleItem: true });
            }

            const existingCart = cartItems.find(i => i.id === bp.id);
            if (existingCart) {
               existingCart.quantity = (existingCart.quantity || 1) + 1;
            } else {
               cartItems.push({ ...bp, quantity: 1, isBundleItem: true });
            }
         });

         localStorage.setItem("avyora-cart", JSON.stringify(cartItems));
         updateCartCount();

         renderCheckoutItemsList();
         calculateAndRenderTotals();

         claimBtn.disabled = true;
         claimBtn.className = "btn btn-success fw-bold px-4";
         claimBtn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Bundle Claimed (15% Saved)';

         const trackerEl = document.querySelector(".checkout-bundle-tracker");
         if (trackerEl) {
            trackerEl.innerHTML = `
               <div class="bundle-claimed-banner">
                  <span><i class="bi bi-patch-check-fill me-2 fs-5"></i> 3-Item Companion Bundle successfully added to your order with 15% discount!</span>
               </div>
            `;
         }
      });
   }

   // Delivery Speed Listeners
   const speedInputs = document.querySelectorAll('input[name="deliverySpeed"]');
   speedInputs.forEach(input => {
      input.addEventListener("change", function () {
         currentSpeed = this.value;
         if (speedStandardLabel) speedStandardLabel.classList.toggle("active", currentSpeed === "standard");
         if (speedExpressLabel) speedExpressLabel.classList.toggle("active", currentSpeed === "express");
         calculateAndRenderTotals();
      });
   });

   // Payment Method Tab Switcher
   const paymentTabs = document.querySelectorAll(".payment-method-tab");
   const paymentPanels = {
      card: document.getElementById("panelCard"),
      upi: document.getElementById("panelUpi"),
      netbanking: document.getElementById("panelNetbanking"),
      cod: document.getElementById("panelCod")
   };
   const selectedPaymentMethodInput = document.getElementById("selectedPaymentMethod");

   paymentTabs.forEach(tab => {
      tab.addEventListener("click", function () {
         const method = this.dataset.payment;
         activePayment = method;
         if (selectedPaymentMethodInput) selectedPaymentMethodInput.value = method;

         paymentTabs.forEach(t => {
            const isActive = t === tab;
            t.classList.toggle("active", isActive);
            t.setAttribute("aria-selected", String(isActive));
         });

         Object.keys(paymentPanels).forEach(key => {
            if (paymentPanels[key]) {
               paymentPanels[key].classList.toggle("d-none", key !== method);
               paymentPanels[key].classList.toggle("active", key === method);
            }
         });

         calculateAndRenderTotals();
      });
   });

   // Card Formatting & Brand Detection
   if (cardNumberInput) {
      cardNumberInput.addEventListener("input", function (e) {
         let value = e.target.value.replace(/\D/g, "");
         if (value.length > 16) value = value.slice(0, 16);
         const formatted = value.replace(/(.{4})/g, "$1 ").trim();
         e.target.value = formatted;

         // Detect Brand
         const badgeVisa = document.getElementById("badgeVisa");
         const badgeMastercard = document.getElementById("badgeMastercard");
         const badgeRupay = document.getElementById("badgeRupay");
         const badgeAmex = document.getElementById("badgeAmex");
         [badgeVisa, badgeMastercard, badgeRupay, badgeAmex].forEach(b => b?.classList.remove("border-warning", "border-primary", "text-warning", "text-primary"));

         if (value.startsWith("4")) {
            if (cardBrandIcon) cardBrandIcon.className = "bi bi-credit-card text-primary checkout-field-icon";
            badgeVisa?.classList.add("border-primary", "text-primary");
         } else if (/^(5[1-5]|2[2-7])/.test(value)) {
            if (cardBrandIcon) cardBrandIcon.className = "bi bi-credit-card-2-back text-warning checkout-field-icon";
            badgeMastercard?.classList.add("border-warning", "text-warning");
         } else if (/^(60|65|35)/.test(value)) {
            if (cardBrandIcon) cardBrandIcon.className = "bi bi-credit-card text-success checkout-field-icon";
            badgeRupay?.classList.add("border-primary", "text-primary");
         } else if (/^(34|37)/.test(value)) {
            if (cardBrandIcon) cardBrandIcon.className = "bi bi-credit-card text-info checkout-field-icon";
            badgeAmex?.classList.add("border-primary", "text-primary");
         } else {
            if (cardBrandIcon) cardBrandIcon.className = "bi bi-credit-card checkout-field-icon";
         }
      });
   }

   if (cardExpiryInput) {
      cardExpiryInput.addEventListener("input", function (e) {
         let val = e.target.value.replace(/\D/g, "");
         if (val.length > 4) val = val.slice(0, 4);
         if (val.length >= 2) {
            val = val.slice(0, 2) + "/" + val.slice(2);
         }
         e.target.value = val;
      });
   }

   if (cardCvvInput) {
      cardCvvInput.addEventListener("input", function (e) {
         e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
      });
   }

   // UPI Verification & Apps
   if (verifyUpiBtn && upiIdInput) {
      verifyUpiBtn.addEventListener("click", function () {
         const upiVal = upiIdInput.value.trim();
         const isValidUpi = /^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z]{2,49}$/.test(upiVal);
         if (isValidUpi) {
            upiVerifyMsg.innerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Verified VPA · AVYORA Gateway Connected</span>';
         } else {
            upiVerifyMsg.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Please enter a valid UPI ID (e.g. mobile@upi)</span>';
         }
      });
   }

   document.querySelectorAll(".upi-app-chip").forEach(chip => {
      chip.addEventListener("click", function () {
         const app = this.dataset.upiApp;
         const handleMap = { gpay: "@okhdfcbank", phonepe: "@ybl", paytm: "@paytm", bhim: "@upi" };
         if (upiIdInput) {
            const base = upiIdInput.value.split("@")[0] || "member";
            upiIdInput.value = `${base}${handleMap[app] || "@upi"}`;
            if (verifyUpiBtn) verifyUpiBtn.click();
         }
      });
   });

   // Net Banking Chips & Select
   document.querySelectorAll(".bank-chip input").forEach(radio => {
      radio.addEventListener("change", function () {
         document.querySelectorAll(".bank-chip").forEach(c => c.classList.remove("active"));
         this.closest(".bank-chip")?.classList.add("active");
         const select = document.getElementById("allBanksSelect");
         if (select) select.value = "";
      });
   });

   const allBanksSelect = document.getElementById("allBanksSelect");
   if (allBanksSelect) {
      allBanksSelect.addEventListener("change", function () {
         if (this.value) {
            document.querySelectorAll(".bank-chip").forEach(c => {
               c.classList.remove("active");
               const input = c.querySelector("input");
               if (input) input.checked = false;
            });
         }
      });
   }

   // COD Captcha Generator
   function generateCaptcha() {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      if (codCaptchaText) codCaptchaText.textContent = code;
   }
   generateCaptcha();
   if (refreshCaptchaBtn) refreshCaptchaBtn.addEventListener("click", generateCaptcha);

   // Coupon Code Handler
   if (applyCouponBtn && couponCodeInput) {
      applyCouponBtn.addEventListener("click", function () {
         const code = couponCodeInput.value.trim().toUpperCase();
         if (!code) return;

         if (coupons[code]) {
            appliedCoupon = { code, ...coupons[code] };
            if (couponFeedback) {
               couponFeedback.className = "small mt-1 text-success d-block";
               couponFeedback.innerHTML = `<i class="bi bi-patch-check-fill"></i> Coupon <strong>${code}</strong> applied! (${appliedCoupon.label})`;
            }
            calculateAndRenderTotals();
         } else {
            if (couponFeedback) {
               couponFeedback.className = "small mt-1 text-danger d-block";
               couponFeedback.innerHTML = '<i class="bi bi-x-circle"></i> Invalid coupon code. Try <strong>WELCOME10</strong> or <strong>CELESTIAL</strong>';
            }
         }
      });
   }

   // Form Submission & Payment Gateway Handshake
   checkoutForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const formData = new FormData(checkoutForm);
      const name = String(formData.get("fullName") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const address = String(formData.get("address") || "").trim();
      const city = String(formData.get("city") || "").trim();
      const postalCode = String(formData.get("postalCode") || "").trim();

      if (!name || !email || !phone || !address || !city || !postalCode) {
         if (errorMessageEl) errorMessageEl.textContent = "Please fill in all delivery destination fields.";
         return;
      }

      // Validate payment methods
      let paymentSummary = "";
      if (activePayment === "card") {
         const cardNum = (cardNumberInput?.value || "").replace(/\s/g, "");
         const cardExp = cardExpiryInput?.value || "";
         const cardCvv = cardCvvInput?.value || "";

         if (cardNum.length < 15) {
            if (errorMessageEl) errorMessageEl.textContent = "Please enter a valid 16-digit card number.";
            return;
         }
         if (!/^\d{2}\/\d{2}$/.test(cardExp)) {
            if (errorMessageEl) errorMessageEl.textContent = "Please enter a valid expiry date (MM/YY).";
            return;
         }
         const [month, year] = cardExp.split("/").map(Number);
         if (month < 1 || month > 12) {
            if (errorMessageEl) errorMessageEl.textContent = "Card expiry month must be between 01 and 12.";
            return;
         }
         if (cardCvv.length < 3) {
            if (errorMessageEl) errorMessageEl.textContent = "Please enter a valid 3 or 4 digit CVV.";
            return;
         }
         paymentSummary = `Card ending in •••• ${cardNum.slice(-4)}`;
      } else if (activePayment === "upi") {
         const upiVal = upiIdInput?.value.trim() || "";
         if (!upiVal.includes("@")) {
            if (errorMessageEl) errorMessageEl.textContent = "Please enter a valid UPI ID (e.g. mobile@upi).";
            return;
         }
         paymentSummary = `UPI (${upiVal})`;
      } else if (activePayment === "netbanking") {
         const checkedBank = document.querySelector('input[name="selectedBank"]:checked');
         const bankName = allBanksSelect?.value || checkedBank?.value;
         if (!bankName) {
            if (errorMessageEl) errorMessageEl.textContent = "Please choose your bank for internet banking.";
            return;
         }
         paymentSummary = `Net Banking (${bankName})`;
      } else if (activePayment === "cod") {
         const userCaptcha = (codVerificationInput?.value || "").trim();
         const currentCaptcha = codCaptchaText?.textContent.trim();
         if (userCaptcha !== currentCaptcha) {
            if (codErrorMsg) codErrorMsg.textContent = "Incorrect verification code. Please try again.";
            generateCaptcha();
            return;
         }
         paymentSummary = "Cash on Delivery (Pay upon arrival)";
      }

      if (errorMessageEl) errorMessageEl.textContent = "";

      // Trigger Simulated Bank Gateway Handshake Modal
      if (paymentModal) {
         paymentModal.classList.remove("d-none");
         if (gatewayStatusText) {
            setTimeout(() => { gatewayStatusText.textContent = "Connecting to Bank Gateway..."; }, 500);
            setTimeout(() => { gatewayStatusText.textContent = "Verifying 256-bit credentials..."; }, 1100);
            setTimeout(() => { gatewayStatusText.textContent = "Authorized! Generating Order..."; }, 1700);
         }
      }

      // Calculate final pricing
      const { pricing, shippingFee, couponDiscount, finalPayable } = calculateAndRenderTotals();

      // Generate Order Record
      const order = {
         id: `AVY-${Date.now().toString().slice(-8)}`,
         customer: name,
         email,
         phone,
         address: `${address}, ${city} - ${postalCode}`,
         city,
         postalCode,
         items: selectedItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
         itemsList: selectedItems.map(i => ({ title: i.title, price: i.price, quantity: i.quantity || 1, image: i.image })),
         subtotal: pricing.subtotal,
         shippingFee: shippingFee,
         discount: couponDiscount,
         total: finalPayable,
         deliverySpeed: currentSpeed === "express" ? "Express Sanctuary Delivery" : "Standard Delivery",
         paymentMethod: activePayment,
         paymentDetails: paymentSummary,
         paymentStatus: activePayment === "cod" ? "Pay on Delivery" : "Paid via Gateway",
         placedAt: new Date().toISOString()
      };

      // Save order to localStorage
      localStorage.setItem("avyora-last-order", JSON.stringify(order));

      // Append to orders history
      const existingHistory = JSON.parse(localStorage.getItem("avyora-orders") || "[]");
      existingHistory.unshift(order);
      localStorage.setItem("avyora-orders", JSON.stringify(existingHistory));

      // Remove ordered items from cart
      const selectedIds = new Set(selectedItems.map(item => item.id));
      cartItems = cartItems.filter(item => !selectedIds.has(item.id));
      localStorage.setItem("avyora-cart", JSON.stringify(cartItems));
      updateCartCount();

      // Navigate to success.html after simulated gateway completes
      setTimeout(function () {
         window.location.href = "success.html";
      }, 2100);
   });
}

function renderCartPage() {
   const cartPageItems = document.getElementById("cartPageItems");
   const cartPageEmpty = document.getElementById("cartPageEmpty");
   const checkoutButton = document.getElementById("checkoutButton");
   const subtotalEl = document.getElementById("checkoutSubtotal");
   const shippingEl = document.getElementById("checkoutShipping");
   const savingsEl = document.getElementById("checkoutSavings");
   const totalEl = document.getElementById("checkoutTotal");

   if (!cartPageItems || !subtotalEl || !shippingEl || !savingsEl || !totalEl) return;

   const selectedItems = getSelectedCartItems();
   const pricing = getCartPricing(selectedItems);
   const shippingFee = selectedItems.length ? SHIPPING_FEE_INR / USD_TO_INR : 0;
   const finalTotal = Math.max(0, pricing.total + shippingFee);

   subtotalEl.textContent = formatPrice(pricing.subtotal);
   shippingEl.textContent = formatPrice(shippingFee);
   savingsEl.textContent = pricing.savings > 0 ? `- ${formatPrice(pricing.savings)}` : formatPrice(0);
   totalEl.textContent = formatPrice(finalTotal);

   if (checkoutButton) {
      const hasSelectedItems = selectedItems.length > 0;
      checkoutButton.classList.toggle("disabled", !hasSelectedItems);
      checkoutButton.setAttribute("aria-disabled", String(!hasSelectedItems));
      checkoutButton.onclick = function (event) {
         if (!hasSelectedItems) {
            event.preventDefault();
            showCartMessage("Select at least one item before checkout.");
         }
      };
   }

   if (!cartItems.length) {
      cartPageEmpty.hidden = false;
      cartPageItems.innerHTML = "";
      return;
   }

   cartPageEmpty.hidden = true;
   cartPageItems.innerHTML = cartItems.map(function (item, index) {
      const quantity = item.quantity || 1;
      const lineTotal = item.price * quantity;
      return `
         <article class="cart-page-item" data-cart-page-item="${index}">
            <img src="${item.image}" alt="${escapeHtml(item.title)}">
            <div class="cart-page-item-info">
               <span class="section-kicker">AVYORA PICK</span>
               <h3>${escapeHtml(item.title)}</h3>
               <div class="cart-page-item-meta">
                  <strong>${formatPrice(lineTotal)}</strong>
                  <span>${formatPrice(item.price)} each</span>
               </div>
               <div class="cart-page-item-actions">
                  <div class="cart-page-item-qty-wrap">
                     <span class="cart-quantity-label">Quantity</span>
                     <div class="cart-page-item-qty" aria-label="Quantity selector">
                        <button type="button" class="qty-button" data-cart-qty-change="${index}" data-cart-qty-delta="-1" aria-label="Decrease quantity">-</button>
                        <span>${quantity}</span>
                        <button type="button" class="qty-button" data-cart-qty-change="${index}" data-cart-qty-delta="1" aria-label="Increase quantity">+</button>
                     </div>
                  </div>
                  <label class="cart-item-select${item.selected !== false ? " is-selected" : ""}"><input type="checkbox" data-cart-select="${index}"${item.selected !== false ? " checked" : ""}><span>Include in checkout</span></label>
                  <button type="button" class="cart-page-remove" data-cart-page-remove="${index}">Remove</button>
               </div>
            </div>
         </article>
      `;
   }).join("");

   cartPageItems.querySelectorAll("[data-cart-page-remove]").forEach(function (button) {
      button.addEventListener("click", function () {
         const index = Number(button.dataset.cartPageRemove);
         cartItems.splice(index, 1);
         localStorage.setItem("avyora-cart", JSON.stringify(cartItems));
         updateCartCount();
         renderCartDrawer();
         renderCartPage();
      });
   });

   cartPageItems.querySelectorAll("[data-cart-qty-change]").forEach(function (button) {
      button.addEventListener("click", function () {
         const index = Number(button.dataset.cartQtyChange);
         const delta = Number(button.dataset.cartQtyDelta);
         const item = cartItems[index];

         if (!item) return;

         const nextQuantity = (item.quantity || 1) + delta;
         if (nextQuantity <= 0) {
            cartItems.splice(index, 1);
         } else {
            item.quantity = nextQuantity;
         }

         localStorage.setItem("avyora-cart", JSON.stringify(cartItems));
         updateCartCount();
         renderCartDrawer();
         renderCartPage();
      });
   });

   cartPageItems.querySelectorAll("[data-cart-select]").forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
         const item = cartItems[Number(checkbox.dataset.cartSelect)];
         if (!item) return;
         item.selected = checkbox.checked;
         checkbox.closest(".cart-item-select")?.classList.toggle("is-selected", checkbox.checked);
         localStorage.setItem("avyora-cart", JSON.stringify(cartItems));
         renderCartPage();
      });
   });
}

function addToCart(product, buyNow) {
   const existingItem = cartItems.find(item => item.id === product.id);

   if (existingItem) {
      existingItem.quantity = (existingItem.quantity || 1) + 1;
      existingItem.selected = true;
   } else {
      cartItems.push({ id: product.id, title: product.title, price: product.price, image: product.image, quantity: 1, selected: true });
   }

   localStorage.setItem("avyora-cart", JSON.stringify(cartItems));
   updateCartCount();
   renderCartDrawer();
   showCartMessage(buyNow ? "Added to cart. Ready for checkout." : `${product.title} added to cart.`);
}

function updateCartCount() {
   const cartCount = document.getElementById("cartCount");
   const cartTotal = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

   if (cartCount) {
      cartCount.textContent = cartTotal;
      cartCount.classList.toggle("has-items", cartTotal > 0);
   }
}

function updateWishlistCount() {
   wishlistItems = normalizeWishlistIds(wishlistItems);
   const wishlistCount = document.getElementById("wishlistCount");

   if (wishlistCount) {
      wishlistCount.textContent = wishlistItems.length;
      wishlistCount.classList.toggle("has-items", wishlistItems.length > 0);
   }
}

function bindWishlistDrawer() {
   document.querySelectorAll("[data-wishlist-trigger]").forEach(function (trigger) {
      trigger.addEventListener("click", openWishlistDrawer);
   });

   document.querySelectorAll("[data-wishlist-close]").forEach(function (closeButton) {
      closeButton.addEventListener("click", closeWishlistDrawer);
   });
}

function bindCartDrawer() {
   document.querySelectorAll("[data-cart-trigger]").forEach(function (trigger) {
      trigger.addEventListener("click", openCartDrawer);
   });

   document.querySelectorAll("[data-cart-close]").forEach(function (closeButton) {
      closeButton.addEventListener("click", closeCartDrawer);
   });
}

function openCartDrawer() {
   const drawer = document.getElementById("cartDrawer");
   drawer.classList.add("is-open");
   drawer.setAttribute("aria-hidden", "false");
   document.body.classList.add("wishlist-drawer-open");
   renderCartDrawer();
}

function closeCartDrawer() {
   const drawer = document.getElementById("cartDrawer");
   drawer.classList.remove("is-open");
   drawer.setAttribute("aria-hidden", "true");
   document.body.classList.remove("wishlist-drawer-open");
}

function renderCartDrawer() {
   const body = document.getElementById("cartDrawerBody");
   const total = document.getElementById("cartDrawerTotal");

   if (!body || !total) return;

   const pricing = getCartPricing();
   total.innerHTML = pricing.savings > 0
      ? `<del>${formatPrice(pricing.subtotal)}</del> ${formatPrice(pricing.total)} <small>-${formatPrice(pricing.savings)}</small>`
      : formatPrice(pricing.total);

   if (!cartItems.length) {
      body.innerHTML = `<div class="cart-empty"><i class="bi bi-bag"></i><h3>Your cart is waiting.</h3><p>Add something useful, beautiful, or both.</p></div>`;
      return;
   }

   const promotionMessage = pricing.nextBundleCount > 0
      ? `<p class="cart-promotion-note"><i class="bi bi-stars"></i> Add ${pricing.nextBundleCount} more item${pricing.nextBundleCount === 1 ? "" : "s"} to unlock 15% off the next bundle.</p>`
      : `<p class="cart-promotion-note active"><i class="bi bi-check-circle"></i> 15% bundle savings applied to ${pricing.eligibleItemCount} items.</p>`;

   body.innerHTML = promotionMessage + cartItems.map(function (item, index) {
      const quantity = item.quantity || 1;
      const lineTotal = item.price * quantity;
      return `<article class="cart-drawer-item">
         <img src="${item.image}" alt="${escapeHtml(item.title)}">
         <div class="cart-drawer-item-info"><span>AVYORA PICK</span><h3>${escapeHtml(item.title)}</h3><strong>${formatPrice(lineTotal)}</strong><small class="cart-drawer-qty">Qty: ${quantity}</small></div>
         <button type="button" class="cart-drawer-remove" aria-label="Remove ${escapeHtml(item.title)}" data-cart-remove="${index}"><i class="bi bi-trash3"></i></button>
      </article>`;
   }).join("");

   body.querySelectorAll("[data-cart-remove]").forEach(function (button) {
      button.addEventListener("click", function () {
         cartItems.splice(Number(button.dataset.cartRemove), 1);
         localStorage.setItem("avyora-cart", JSON.stringify(cartItems));
         updateCartCount();
         renderCartDrawer();
      });
   });
}

function openWishlistDrawer() {
   const drawer = document.getElementById("wishlistDrawer");
   drawer.classList.add("is-open");
   drawer.setAttribute("aria-hidden", "false");
   document.body.classList.add("wishlist-drawer-open");
   renderWishlistDrawer();
}

function closeWishlistDrawer() {
   const drawer = document.getElementById("wishlistDrawer");
   drawer.classList.remove("is-open");
   drawer.setAttribute("aria-hidden", "true");
   document.body.classList.remove("wishlist-drawer-open");
}

function initFavoritesPage() {
   const favoritesGrid = document.getElementById("favoritesPageItems");
   const emptyState = document.getElementById("favoritesPageEmpty");
   if (!favoritesGrid && !emptyState) return;

   renderFavoritesPage();
}

function renderFavoritesPage() {
   wishlistItems = normalizeWishlistIds(wishlistItems);
   const favoritesGrid = document.getElementById("favoritesPageItems");
   const emptyState = document.getElementById("favoritesPageEmpty");
   const countEl = document.getElementById("favoritesPageCount");

   if (!favoritesGrid && !emptyState) return;

   const savedProducts = wishlistItems
      .map(id => products.find(product => product.id === id) || wishlistProducts[id])
      .filter(Boolean);

   if (countEl) countEl.textContent = `${savedProducts.length} saved item${savedProducts.length === 1 ? "" : "s"}`;

   if (!favoritesGrid || !emptyState) return;

   if (!savedProducts.length) {
      favoritesGrid.innerHTML = "";
      emptyState.hidden = false;
      return;
   }

   emptyState.hidden = true;
   favoritesGrid.innerHTML = savedProducts.map(function (product) {
      return `
         <article class="favorites-page-item" data-favorites-product="${product.id}">
            <img src="${product.image}" alt="${escapeHtml(product.title)}">
            <div class="favorites-page-detail">
               <span class="section-kicker">${escapeHtml(product.category)}</span>
               <h3>${escapeHtml(product.title)}</h3>
               <p>${escapeHtml(product.description)}</p>
               <div class="favorites-page-meta">
                  <strong>${formatPrice(product.price)}</strong>
                  <span><i class="bi bi-star-fill"></i> ${product.rating.rate}</span>
               </div>
               <div class="favorites-page-actions">
                  <button type="button" class="btn btn-avyora favorites-add-cart" data-favorites-add="${product.id}"><i class="bi bi-cart-plus"></i> Add to cart</button>
                  <button type="button" class="favorites-remove" data-favorites-remove="${product.id}">Remove</button>
               </div>
            </div>
         </article>
      `;
   }).join("");

   favoritesGrid.querySelectorAll("[data-favorites-remove]").forEach(function (button) {
      button.addEventListener("click", function () {
         const productId = Number(button.dataset.favoritesRemove);
         removeFromWishlist(productId);
      });
   });

   favoritesGrid.querySelectorAll("[data-favorites-add]").forEach(function (button) {
      button.addEventListener("click", function () {
         const productId = Number(button.dataset.favoritesAdd);
         const product = products.find(item => item.id === productId);
         if (product) {
            addToCart(product, false);
         }
      });
   });
}

function renderWishlistDrawer() {
   wishlistItems = normalizeWishlistIds(wishlistItems);
   const body = document.getElementById("wishlistDrawerBody");
   const count = document.getElementById("wishlistDrawerCount");

   if (!body || !count) return;

   const savedProducts = wishlistItems
      .map(id => products.find(product => product.id === id) || wishlistProducts[id])
      .filter(Boolean);

   count.textContent = savedProducts.length;

   if (!savedProducts.length) {
      body.innerHTML = `<div class="wishlist-empty"><i class="bi bi-heart"></i><h3>Your wishlist is waiting.</h3><p>Save pieces you love and they will appear here.</p></div>`;
      return;
   }

   body.innerHTML = savedProducts.map(function (product) {
      return `<article class="wishlist-drawer-item" data-wishlist-product="${product.id}">
         <img src="${product.image}" alt="${escapeHtml(product.title)}">
         <div class="wishlist-drawer-item-info"><span>${escapeHtml(product.category)}</span><h3>${escapeHtml(product.title)}</h3><strong>${formatPrice(product.price)}</strong><button type="button" class="wishlist-drawer-cart"><i class="bi bi-cart-plus"></i> Add to cart</button></div>
         <button type="button" class="wishlist-drawer-remove" aria-label="Remove ${escapeHtml(product.title)}" data-wishlist-remove="${product.id}"><i class="bi bi-trash3"></i></button>
      </article>`;
   }).join("");

   body.querySelectorAll("[data-wishlist-remove]").forEach(function (button) {
      button.addEventListener("click", function () {
         removeFromWishlist(Number(button.dataset.wishlistRemove));
      });
   });

   body.querySelectorAll(".wishlist-drawer-cart").forEach(function (button) {
      button.addEventListener("click", function () {
         const productId = Number(button.closest("[data-wishlist-product]").dataset.wishlistProduct);
         const product = products.find(item => item.id === productId);
         if (product) addToCart(product, false);
      });
   });
}

function removeFromWishlist(productId) {
   wishlistItems = wishlistItems.filter(id => id !== productId);
   delete wishlistProducts[productId];
   localStorage.setItem("avyora-wishlist", JSON.stringify(wishlistItems));
   localStorage.setItem("avyora-wishlist-products", JSON.stringify(wishlistProducts));
   updateWishlistCount();
   renderProducts();
   renderWishlistDrawer();
   renderFavoritesPage();
}

function showCartMessage(message) {
   let toast = document.getElementById("cartToast");

   if (!toast) {
      toast = document.createElement("div");
      toast.id = "cartToast";
      toast.className = "cart-toast";
      document.body.appendChild(toast);
   }

   toast.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${escapeHtml(message)}`;
   toast.classList.add("show");
   window.clearTimeout(toast.hideTimer);
   toast.hideTimer = window.setTimeout(function () {
      toast.classList.remove("show");
   }, 2600);
}

function escapeHtml(value) {
   return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}
