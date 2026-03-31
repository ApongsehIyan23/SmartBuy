/*
   SmartBuy — App Module (DEFINITIVE VERSION)
   State management, business logic, event wiring*/

const App = {
  // State
  budget: 500,
  cart: [],
  allResults: [],
  filteredResults: [],
  currentQuery: '',
  darkMode: false,
  optimizerChartInstance: null,


  /**
   * Initialize the app
   */
  init() {
    Auth.setupListeners();

    const hasSession = Auth.init();
    if (hasSession) {
      Auth.hideModal();
      this.onAuthSuccess(Auth.user);
    } else {
      Auth.showModal();
    }

    this._setupListeners();

    const savedDark = localStorage.getItem('smartbuy_darkmode');
    if (savedDark === 'true') {
      this.darkMode = true;
      UI.toggleDarkMode(true);
    }

    const savedCart = localStorage.getItem('smartbuy_guest_cart');
    if (savedCart) {
      try {
        this.cart = JSON.parse(savedCart);
      } catch (e) { this.cart = []; }
    }

    const savedBudget = localStorage.getItem('smartbuy_guest_budget');
    if (savedBudget) {
      this.budget = parseFloat(savedBudget) || 500;
      document.getElementById('budgetInput').value = this.budget;
    }

    UI.updateBudget(this.budget, this._totalSpent());
    UI.renderCart(this.cart);
  },

  async onAuthSuccess(user) {
    UI.showApp();
    UI.updateUserSection(user);

    try {
      const data = await API.loadList();
      if (data.shoppingList && data.shoppingList.length > 0) {
        this.cart = data.shoppingList;
      }
      if (data.budget) {
        this.budget = data.budget;
        document.getElementById('budgetInput').value = this.budget;
      }
      if (data.preferences && data.preferences.darkMode) {
        this.darkMode = true;
        UI.toggleDarkMode(true);
      }
      UI.updateBudget(this.budget, this._totalSpent());
      UI.renderCart(this.cart);
    } catch (err) {
      console.log('Could not load saved list:', err.message);
    }
  },

  onGuestMode() {
    // Clear any previous user's data
    localStorage.removeItem('smartbuy_guest_cart');
    localStorage.removeItem('smartbuy_token');
    localStorage.removeItem('smartbuy_user');
    this.cart = [];

    UI.showApp();
    UI.updateUserSection(null);
    UI.updateBudget(this.budget, this._totalSpent());
    UI.renderCart(this.cart);
  },

   onLogout() {
    localStorage.removeItem('smartbuy_guest_cart');
    localStorage.removeItem('smartbuy_token');
    localStorage.removeItem('smartbuy_user');
    this.cart = [];
    this.allResults = [];
    this.filteredResults = [];
    this.currentQuery = '';
    document.getElementById('searchInput').value = '';
    UI.updateUserSection(null);
    UI.updateBudget(this.budget, 0);
    UI.renderCart(this.cart);
    UI.showWelcome();
    UI.hideAdvice();
    Auth.showModal();
  },

  /**
   * Search products
   * FIX: Correctly parses data.data.products from search-v2 API
   */
  async search(query) {
    if (!query || query.trim().length < 2) {
      UI.showError('Search too short', 'Please enter at least 2 characters.');
      return;
    }

    this.currentQuery = query.trim();
    UI.showLoading();
    UI.hideAdvice();

    try {
      const response = await API.searchProducts(this.currentQuery);

      console.log('API Response:', response);

      // FIX: Handle all possible response structures from search-v2
      if (response.data && response.data.products && Array.isArray(response.data.products)) {
        this.allResults = response.data.products;
      } else if (response.data && Array.isArray(response.data)) {
        this.allResults = response.data;
      } else if (response.products && Array.isArray(response.products)) {
        this.allResults = response.products;
      } else if (Array.isArray(response)) {
        this.allResults = response;
      } else {
        this.allResults = [];
      }

      console.log('Parsed results:', this.allResults.length, 'products');

      const stores = [...new Set(this.allResults.map(p => UI._extractStore(p)).filter(s => s !== 'Online store'))];
      UI.updateStoreFilters(stores);

      this.filterResults();
    } catch (err) {
      UI.showError('Search failed', err.message);
    }
  },

  /**
   * Filter and sort results (client-side)
   * FIX: Uses product_rating || product_star_rating
   */
  filterResults() {
    let results = [...this.allResults];

    const checkboxes = document.querySelectorAll('#storeFilters input[type="checkbox"]');
    const allChecked = document.querySelector('#storeFilters input[value="all"]');

    if (allChecked && !allChecked.checked) {
      const selectedStores = [];
      checkboxes.forEach(cb => {
        if (cb.value !== 'all' && cb.checked) selectedStores.push(cb.value);
      });
      if (selectedStores.length > 0) {
        results = results.filter(p => selectedStores.includes(UI._extractStore(p)));
      }
    }

    const minPrice = parseFloat(document.getElementById('priceMin').value) || 0;
    const maxPrice = parseFloat(document.getElementById('priceMax').value) || Infinity;
    results = results.filter(p => {
      const price = UI._extractPrice(p);
      return price >= minPrice && price <= maxPrice;
    });

    const activeRating = document.querySelector('.rating-btn.active');
    const minRating = activeRating ? parseFloat(activeRating.dataset.rating) : 0;
    if (minRating > 0) {
      results = results.filter(p => {
        const rating = parseFloat(p.product_rating || p.product_star_rating) || 0;
        return rating >= minRating;
      });
    }

    const activeSort = document.querySelector('.sort-btn.active');
    const sortBy = activeSort ? activeSort.dataset.sort : 'relevance';

    switch (sortBy) {
      case 'price-asc':
        results.sort((a, b) => UI._extractPrice(a) - UI._extractPrice(b));
        break;
      case 'price-desc':
        results.sort((a, b) => UI._extractPrice(b) - UI._extractPrice(a));
        break;
      case 'rating':
        results.sort((a, b) => (parseFloat(b.product_rating || b.product_star_rating) || 0) - (parseFloat(a.product_rating || a.product_star_rating) || 0));
        break;
    }

    this.filteredResults = results;
    UI.renderResults(results, this.currentQuery, this.cart, this.budget);
  },

  addToCart(item) {
    if (this.cart.some(i => i.id === item.id)) return;
    if (item.price > (this.budget - this._totalSpent())) return;

    this.cart.push({
      ...item,
      addedAt: new Date().toISOString()
    });

    this._onCartChange();
  },

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this._onCartChange();
  },

  clearCart() {
    if (this.cart.length === 0) return;
    this.cart = [];
    this._onCartChange();
    UI.hideAdvice();

    // If logged in, save empty list to server
    if (Auth.isLoggedIn) {
      API.saveList([], this.budget, {
        currency: 'USD',
        darkMode: this.darkMode
      }).catch(err => console.log('Could not sync clear:', err.message));
    }
  },

  async getAdvice() {
    if (this.cart.length === 0) return;

    const spent = this._totalSpent();
    UI.showAdviceLoading();

    try {
      const data = await API.getAdvice(
        this.budget,
        spent,
        this.budget - spent,
        this.cart.map(i => ({ name: i.name, store: i.store, price: i.price }))
      );
      UI.showAdvice(data.advice);
    } catch (err) {
      UI.showAdvice('Sorry, could not get advice right now. ' + err.message);
    }
  },

  exportList() {
    if (this.cart.length === 0) return;

    const spent = this._totalSpent();
    let csv = 'Product,Store,Price\n';
    this.cart.forEach(item => {
      const name = item.name.replace(/"/g, '""');
      const store = item.store.replace(/"/g, '""');
      csv += `"${name}","${store}","${item.price.toFixed(2)}"\n`;
    });
    csv += `\nTotal,,${spent.toFixed(2)}\n`;
    csv += `Budget,,${this.budget.toFixed(2)}\n`;
    csv += `Remaining,,${(this.budget - spent).toFixed(2)}\n`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartbuy-shopping-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  },

  async saveList() {
    if (!Auth.isLoggedIn) return;

    try {
      await API.saveList(this.cart, this.budget, {
        currency: 'USD',
        darkMode: this.darkMode
      });
      alert('Shopping list saved!');
    } catch (err) {
      alert('Could not save: ' + err.message);
    }
  },
  // Private helpers

  _totalSpent() {
    return this.cart.reduce((sum, item) => sum + item.price, 0);
  },

  _onCartChange() {
    UI.renderCart(this.cart);
    UI.updateBudget(this.budget, this._totalSpent());

    if (this.filteredResults.length > 0) {
      UI.renderResults(this.filteredResults, this.currentQuery, this.cart, this.budget);
    }

    localStorage.setItem('smartbuy_guest_cart', JSON.stringify(this.cart));
  },

  _setupListeners() {
    // Search form
    document.getElementById('searchForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const query = document.getElementById('searchInput').value;
      this.search(query);
    });

    // Retry button
    document.getElementById('retryBtn').addEventListener('click', () => {
      if (this.currentQuery) this.search(this.currentQuery);
    });

    // Budget input
    document.getElementById('budgetInput').addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val) || val < 1) val = 1;
      if (val > 99999) val = 99999;
      this.budget = val;
      e.target.value = val;
      localStorage.setItem('smartbuy_guest_budget', val.toString());
      UI.updateBudget(this.budget, this._totalSpent());

      if (this.filteredResults.length > 0) {
        UI.renderResults(this.filteredResults, this.currentQuery, this.cart, this.budget);
      }
    });

    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterResults();
      });
    });

    // Rating buttons
    document.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filterResults();
      });
    });

    // Price filter apply
    document.getElementById('applyPriceFilter').addEventListener('click', () => {
      this.filterResults();
    });

    // Cart actions
    document.getElementById('clearCartBtn').addEventListener('click', () => this.clearCart());
    document.getElementById('exportBtn').addEventListener('click', () => this.exportList());
    document.getElementById('saveListBtn').addEventListener('click', () => this.saveList());
    document.getElementById('adviceBtn').addEventListener('click', () => this.getAdvice());

    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', () => {
      this.darkMode = !this.darkMode;
      UI.toggleDarkMode(this.darkMode);
      localStorage.setItem('smartbuy_darkmode', this.darkMode.toString());
    });

    // ========== Tab switching ==========
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('searchView').style.display = tab === 'search' ? 'block' : 'none';
        document.getElementById('optimizerView').style.display = tab === 'optimizer' ? 'block' : 'none';
      });
    });

    // ========== Optimizer: Add wish item ==========
    document.getElementById('addWishItemBtn').addEventListener('click', () => {
      const container = document.getElementById('wishListInputs');
      const count = container.children.length;
      if (count >= 5) return;

      const row = document.createElement('div');
      row.className = 'wish-item-row';
      row.innerHTML = `
        <span class="wish-item-num">${count + 1}</span>
        <input type="text" class="wish-item-input" placeholder="e.g. mechanical keyboard" maxlength="100">
        <button class="wish-remove-btn" title="Remove">\u2715</button>
      `;
      row.querySelector('.wish-remove-btn').addEventListener('click', () => {
        row.remove();
        this._renumberWishItems();
        const newCount = document.getElementById('wishListInputs').children.length;
        document.getElementById('addWishItemBtn').disabled = newCount >= 5;
      });
      container.appendChild(row);
      document.getElementById('addWishItemBtn').disabled = count + 1 >= 5;
      row.querySelector('.wish-item-input').focus();
    });

    // Remove button for first wish item
    document.querySelector('.wish-remove-btn').addEventListener('click', (e) => {
      const container = document.getElementById('wishListInputs');
      if (container.children.length > 1) {
        e.target.closest('.wish-item-row').remove();
        this._renumberWishItems();
      }
    });

    // ========== Optimizer: Run optimization ==========
    document.getElementById('optimizeBtn').addEventListener('click', () => this.runOptimizer());
  },

  // ========== Optimizer helpers ==========

  _renumberWishItems() {
    const rows = document.querySelectorAll('.wish-item-row');
    rows.forEach((row, i) => {
      row.querySelector('.wish-item-num').textContent = i + 1;
    });
  },

  optimizerCache: {},
  optimizerCombinations: [],

  /**
   * Run the Smart Budget Optimizer
   * PHASE 1: Search all items and cache results (uses API calls)
   * PHASE 2: Generate combinations from cached data (zero API calls)
   */
  async runOptimizer() {
    const inputs = document.querySelectorAll('.wish-item-input');
    const items = [];
    inputs.forEach(input => {
      const val = input.value.trim();
      if (val.length >= 2) items.push(val);
    });

    if (items.length === 0) {
      document.getElementById('optimizerError').style.display = 'flex';
      document.getElementById('optimizerErrorTitle').textContent = 'No items entered';
      document.getElementById('optimizerErrorMsg').textContent = 'Please add at least one item to your wish list.';
      return;
    }

    if (items.length < 2) {
      document.getElementById('optimizerError').style.display = 'flex';
      document.getElementById('optimizerErrorTitle').textContent = 'Add more items';
      document.getElementById('optimizerErrorMsg').textContent = 'Add at least 2 items to generate budget combinations.';
      return;
    }

    const budget = parseFloat(document.getElementById('optimizerBudget').value) || 500;

    // Show loading
    document.getElementById('optimizerEmpty').style.display = 'none';
    document.getElementById('optimizerError').style.display = 'none';
    document.getElementById('optimizerResults').style.display = 'none';
    document.getElementById('optimizerLoading').style.display = 'flex';

    const progressFill = document.getElementById('optimizerProgressFill');
    const loadingText = document.getElementById('optimizerLoadingText');

    try {
      // 
      // PHASE 1: Search and cache all results
      // 
      this.optimizerCache = {};

      for (let i = 0; i < items.length; i++) {
        const progress = ((i + 1) / items.length) * 100;
        progressFill.style.width = progress + '%';
        loadingText.textContent = `Searching "${items[i]}" (${i + 1}/${items.length})...`;

        try {
          const data = await API.searchProducts(items[i]);

          // FIX: Same response parsing as search method
          let products = [];
          if (data.data && data.data.products && Array.isArray(data.data.products)) {
            products = data.data.products;
          } else if (data.data && Array.isArray(data.data)) {
            products = data.data;
          } else if (data.products && Array.isArray(data.products)) {
            products = data.products;
          } else if (Array.isArray(data)) {
            products = data;
          }

          console.log(`Optimizer: "${items[i]}" returned ${products.length} products`);

          const processed = products
            .map((p, idx) => {
              const price = UI._extractPrice(p);
              const rating = parseFloat(p.product_rating || p.product_star_rating) || 0;
              if (price <= 0) return null;
              return {
                id: p.product_id || `${i}-${idx}`,
                name: p.product_title || items[i],
                store: UI._extractStore(p),
                price: price,
                rating: rating,
                reviews: p.product_num_reviews || 0,
                image: (p.product_photos && p.product_photos[0]) || p.product_photo || '',
                url: p.product_page_url || p.product_url || ''
              };
            })
            .filter(p => p !== null);

          this.optimizerCache[items[i]] = processed;
          console.log(`Optimizer: "${items[i]}" has ${processed.length} valid products after filtering`);

        } catch (err) {
          console.error(`Optimizer: "${items[i]}" search failed:`, err.message);
          this.optimizerCache[items[i]] = [];
        }

        if (i < items.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // 
      // PHASE 2: Generate combinations (zero API calls)
      // 
      loadingText.textContent = 'Calculating best combinations...';

      const combinations = this._generateCombinations(items, budget);
      this.optimizerCombinations = combinations;

      console.log('Optimizer: Generated', combinations.length, 'combinations');

      this._renderOptimizerResults(items, combinations, budget);

    } catch (err) {
      document.getElementById('optimizerLoading').style.display = 'none';
      document.getElementById('optimizerError').style.display = 'flex';
      document.getElementById('optimizerErrorTitle').textContent = 'Optimization failed';
      document.getElementById('optimizerErrorMsg').textContent = err.message;
    }
  },

  /**
   * Generate 4 combinations from cached search data:
   * 1. Best Savings - cheapest option for each item
   * 2. Best Quality - highest rated within budget
   * 3. Balanced - best value score (price + rating)
   * 4. Fewest Stores - consolidate purchases
   */
  _generateCombinations(items, budget) {
    const combinations = [];

    const itemsWithData = items.filter(item =>
      this.optimizerCache[item] && this.optimizerCache[item].length > 0
    );

    if (itemsWithData.length === 0) return combinations;

    const sortedByPrice = {};
    const sortedByRating = {};

    itemsWithData.forEach(item => {
      sortedByPrice[item] = [...this.optimizerCache[item]].sort((a, b) => a.price - b.price);
      sortedByRating[item] = [...this.optimizerCache[item]].sort((a, b) => b.rating - a.rating);
    });

    // ---- Combination 1: BEST SAVINGS ----
    const bestSavings = {
      name: 'Best Savings',
      description: 'The absolute cheapest option for each item. Maximum money saved.',
      icon: 'fa-piggy-bank',
      items: {}
    };
    let bestSavingsTotal = 0;
    itemsWithData.forEach(item => {
      const cheapest = sortedByPrice[item][0];
      bestSavings.items[item] = cheapest;
      bestSavingsTotal += cheapest.price;
    });
    bestSavings.total = bestSavingsTotal;
    bestSavings.savings = budget - bestSavingsTotal;
    bestSavings.withinBudget = bestSavingsTotal <= budget;
    combinations.push(bestSavings);

    // ---- Combination 2: BEST QUALITY ----
    const bestRated = {
      name: 'Best Quality',
      description: 'Highest rated products that still fit within your budget.',
      icon: 'fa-star',
      items: {}
    };
    let bestRatedTotal = 0;
    let bestRatedBudgetLeft = budget;

    const minCosts = {};
    itemsWithData.forEach(item => {
      minCosts[item] = sortedByPrice[item][0].price;
    });

    const itemsCopy = [...itemsWithData];
    itemsCopy.forEach((item, idx) => {
      const remainingItems = itemsCopy.slice(idx + 1);
      const minCostForRemaining = remainingItems.reduce((sum, ri) => sum + minCosts[ri], 0);
      const maxForThisItem = bestRatedBudgetLeft - minCostForRemaining;

      const affordable = sortedByRating[item].filter(p => p.price <= maxForThisItem);
      const pick = affordable.length > 0 ? affordable[0] : sortedByPrice[item][0];

      bestRated.items[item] = pick;
      bestRatedTotal += pick.price;
      bestRatedBudgetLeft -= pick.price;
    });
    bestRated.total = bestRatedTotal;
    bestRated.savings = budget - bestRatedTotal;
    bestRated.withinBudget = bestRatedTotal <= budget;
    combinations.push(bestRated);

    // ---- Combination 3: BALANCED (budget-aware) ----
    const balanced = {
      name: 'Balanced Choice',
      description: 'A smart mix of price and quality. Good value for money.',
      icon: 'fa-scale-balanced',
      items: {}
    };
    let balancedTotal = 0;
    let balancedBudgetLeft = budget;

    const balancedItemsCopy = [...itemsWithData];
    balancedItemsCopy.forEach((item, idx) => {
      const remainingItems = balancedItemsCopy.slice(idx + 1);
      const minCostForRemaining = remainingItems.reduce((sum, ri) => sum + minCosts[ri], 0);
      const maxForThisItem = balancedBudgetLeft - minCostForRemaining;

      const products = this.optimizerCache[item];
      const maxPrice = Math.max(...products.map(p => p.price));
      const minPrice = Math.min(...products.map(p => p.price));
      const priceRange = maxPrice - minPrice || 1;
      const maxRating = Math.max(...products.map(p => p.rating));
      const minRating = Math.min(...products.map(p => p.rating));
      const ratingRange = maxRating - minRating || 1;

      // Score each product: 50% price savings + 50% rating
      const scored = products
        .filter(p => p.price <= maxForThisItem)
        .map(p => ({
          ...p,
          valueScore: (1 - (p.price - minPrice) / priceRange) * 0.5 +
                      ((p.rating - minRating) / ratingRange) * 0.5
        }));

      scored.sort((a, b) => b.valueScore - a.valueScore);
      const pick = scored.length > 0 ? scored[0] : sortedByPrice[item][0];

      balanced.items[item] = pick;
      balancedTotal += pick.price;
      balancedBudgetLeft -= pick.price;
    });
    balanced.total = balancedTotal;
    balanced.savings = budget - balancedTotal;
    balanced.withinBudget = balancedTotal <= budget;
    combinations.push(balanced);

    // ---- Combination 4: FEWEST STORES (budget-aware) ----
    const storeConsolidation = {
      name: 'Fewest Stores',
      description: 'Buy from as few stores as possible. May save on shipping costs.',
      icon: 'fa-store',
      items: {}
    };

    // Find which stores appear across multiple items
    const storeMap = {};
    itemsWithData.forEach(item => {
      this.optimizerCache[item].forEach(p => {
        if (!storeMap[p.store]) storeMap[p.store] = {};
        if (!storeMap[p.store][item] || p.price < storeMap[p.store][item].price) {
          storeMap[p.store][item] = p;
        }
      });
    });

    const storesCoverage = Object.entries(storeMap).map(([store, storeItems]) => ({
      store,
      itemsCovered: Object.keys(storeItems).length,
      products: storeItems
    })).sort((a, b) => b.itemsCovered - a.itemsCovered);

    // Greedy: pick items from store with most coverage, but respect budget
    let storeConTotal = 0;
    const coveredItems = new Set();
    let storeBudgetLeft = budget;

    for (const sc of storesCoverage) {
      for (const [item, product] of Object.entries(sc.products)) {
        if (!coveredItems.has(item) && itemsWithData.includes(item)) {
          // Check if this product fits remaining budget minus min cost of uncovered items
          const uncoveredAfter = itemsWithData.filter(i => !coveredItems.has(i) && i !== item);
          const minCostUncovered = uncoveredAfter.reduce((sum, ri) => sum + minCosts[ri], 0);

          if (product.price <= storeBudgetLeft - minCostUncovered) {
            storeConsolidation.items[item] = product;
            storeConTotal += product.price;
            storeBudgetLeft -= product.price;
            coveredItems.add(item);
          }
        }
      }
    }

    // Fill any uncovered items with cheapest option that fits
    itemsWithData.forEach(item => {
      if (!coveredItems.has(item)) {
        const uncoveredAfter = itemsWithData.filter(i => !coveredItems.has(i) && i !== item);
        const minCostUncovered = uncoveredAfter.reduce((sum, ri) => sum + minCosts[ri], 0);
        const maxForThis = storeBudgetLeft - minCostUncovered;

        const affordable = sortedByPrice[item].filter(p => p.price <= maxForThis);
        const pick = affordable.length > 0 ? affordable[0] : sortedByPrice[item][0];

        storeConsolidation.items[item] = pick;
        storeConTotal += pick.price;
        storeBudgetLeft -= pick.price;
        coveredItems.add(item);
      }
    });

    storeConsolidation.total = storeConTotal;
    storeConsolidation.savings = budget - storeConTotal;
    storeConsolidation.withinBudget = storeConTotal <= budget;

    const uniqueStores = new Set(Object.values(storeConsolidation.items).map(p => p.store));
    storeConsolidation.storeCount = uniqueStores.size;

    combinations.push(storeConsolidation);

    combinations.sort((a, b) => {
      if (a.withinBudget && !b.withinBudget) return -1;
      if (!a.withinBudget && b.withinBudget) return 1;
      return b.savings - a.savings;
    });

    return combinations;
  },

  /**
   * Render optimizer results with combination cards
   */
  _renderOptimizerResults(items, combinations, budget) {
    document.getElementById('optimizerLoading').style.display = 'none';
    document.getElementById('optimizerResults').style.display = 'block';

    const itemsWithData = items.filter(item =>
      this.optimizerCache[item] && this.optimizerCache[item].length > 0
    );
    const totalProducts = itemsWithData.reduce((sum, item) => sum + this.optimizerCache[item].length, 0);
    const bestSavingsVal = combinations.length > 0 ? Math.max(...combinations.filter(c => c.withinBudget).map(c => c.savings), 0) : 0;

    document.getElementById('optimizerTotal').textContent = totalProducts + ' products';
    document.getElementById('optimizerRemaining').textContent = '$' + bestSavingsVal.toFixed(2);
    document.getElementById('optimizerRemaining').className = 'summary-value remaining';
    document.getElementById('optimizerFound').textContent = combinations.filter(c => c.withinBudget).length + ' of ' + combinations.length;

    document.getElementById('optimizerTotalLabel').textContent = 'Products analyzed';
    document.getElementById('optimizerRemainingLabel').textContent = 'Best possible savings';
    document.getElementById('optimizerFoundLabel').textContent = 'Combinations within budget';

    const list = document.getElementById('optimizerResultsList');
    list.innerHTML = '';

    combinations.forEach((combo) => {
      const comboCard = document.createElement('div');
      comboCard.className = 'combo-card' + (!combo.withinBudget ? ' over-budget' : '');

      // Header
      const header = document.createElement('div');
      header.className = 'combo-header';

      const headerLeft = document.createElement('div');
      headerLeft.className = 'combo-header-left';

      const icon = document.createElement('i');
      icon.className = 'fa-solid ' + combo.icon + ' combo-icon';
      headerLeft.appendChild(icon);

      const headerText = document.createElement('div');
      const nameEl = document.createElement('div');
      nameEl.className = 'combo-name';
      UI.safeText(nameEl, combo.name);
      headerText.appendChild(nameEl);

      const descEl = document.createElement('div');
      descEl.className = 'combo-desc';
      UI.safeText(descEl, combo.description);
      headerText.appendChild(descEl);

      headerLeft.appendChild(headerText);
      header.appendChild(headerLeft);

      const headerRight = document.createElement('div');
      headerRight.className = 'combo-header-right';

      const totalEl = document.createElement('div');
      totalEl.className = 'combo-total';
      UI.safeText(totalEl, '$' + combo.total.toFixed(2));
      headerRight.appendChild(totalEl);

      const savingsEl = document.createElement('div');
      savingsEl.className = 'combo-savings' + (combo.withinBudget ? ' positive' : ' negative');
      UI.safeText(savingsEl, combo.withinBudget ?
        'Save $' + combo.savings.toFixed(2) :
        'Over budget by $' + Math.abs(combo.savings).toFixed(2));
      headerRight.appendChild(savingsEl);

      header.appendChild(headerRight);
      comboCard.appendChild(header);

      // Items list
      const itemsList = document.createElement('div');
      itemsList.className = 'combo-items';

      itemsWithData.forEach(item => {
        const product = combo.items[item];
        if (!product) return;

        const row = document.createElement('div');
        row.className = 'combo-item-row';

        const imgDiv = document.createElement('div');
        imgDiv.className = 'combo-item-img';
        if (product.image) {
          const img = document.createElement('img');
          img.src = product.image;
          img.alt = '';
          img.onerror = function() { this.style.display = 'none'; };
          imgDiv.appendChild(img);
        }
        row.appendChild(imgDiv);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'combo-item-info';

        const queryLabel = document.createElement('div');
        queryLabel.className = 'combo-item-query';
        UI.safeText(queryLabel, item);
        infoDiv.appendChild(queryLabel);

        const nameDiv = document.createElement('div');
        nameDiv.className = 'combo-item-name';
        UI.safeText(nameDiv, product.name);
        infoDiv.appendChild(nameDiv);

        const metaDiv = document.createElement('div');
        metaDiv.className = 'combo-item-meta';
        UI.safeText(metaDiv, product.store + ' \u00B7 ' + (product.rating > 0 ? '\u2605 ' + product.rating.toFixed(1) : 'No rating'));
        infoDiv.appendChild(metaDiv);

        row.appendChild(infoDiv);

        const priceDiv = document.createElement('div');
        priceDiv.className = 'combo-item-price';
        UI.safeText(priceDiv, '$' + product.price.toFixed(2));
        row.appendChild(priceDiv);

        itemsList.appendChild(row);
      });

      comboCard.appendChild(itemsList);

      // Add to cart button
      const addBtn = document.createElement('button');
      addBtn.className = 'btn-primary btn-full combo-add-btn';

      if (!combo.withinBudget) {
        addBtn.disabled = true;
        addBtn.textContent = 'Over budget';
      } else {
        const addIcon = document.createElement('i');
        addIcon.className = 'fa-solid fa-cart-plus';
        addBtn.appendChild(addIcon);
        addBtn.appendChild(document.createTextNode(' Add this combination to list'));

        addBtn.addEventListener('click', () => {
          Object.values(combo.items).forEach(product => {
            if (!this.cart.some(i => i.id === product.id)) {
              this.addToCart({
                id: product.id,
                name: product.name,
                store: product.store,
                price: product.price,
                image: product.image,
                rating: product.rating
              });
            }
          });
        });
      }

      comboCard.appendChild(addBtn);
      list.appendChild(comboCard);
    });

    if (combinations.filter(c => c.withinBudget).length === 0) {
      const warning = document.createElement('div');
      warning.className = 'combo-warning';
      UI.safeText(warning, 'No combinations fit within your budget. Try increasing your budget or removing items from your wish list.');
      list.prepend(warning);
    }
    this._renderOptimizerChart(combinations, budget);
  },
  _renderOptimizerChart(combinations, budget) {
   // Manually register the annotation plugin for Chart.js v4+
    if (typeof Chart !== 'undefined' && window['chartjs_plugin_annotation']) {
        Chart.register(window['chartjs_plugin_annotation']);
    }

    const canvas = document.getElementById('optimizerChart');
    if (!canvas) {
        console.error("Canvas element 'optimizerChart' not found.");
        return;
    }

    const ctx = canvas.getContext('2d');
    
    // 1. Properly destroy old instance
    if (this.optimizerChartInstance) {
        this.optimizerChartInstance.destroy();
    }

    // 2. Prepare Data
    const labels = combinations.map(c => c.name);
    const expenditureData = combinations.map(c => c.total);
    const savingsData = combinations.map(c => Math.max(0, budget - c.total));

    // 3. Fix the Math.max calculation
    const maxValInData = Math.max(...expenditureData);
    const chartYMax = Math.max(budget, maxValInData) * 1.2;

    // 4. Create the Chart
    try {
        this.optimizerChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Expenditure ($)',
                    data: expenditureData,
                    backgroundColor: '#3b82f6', // CHANGED: Blue color (Blue-500)
                    borderColor: '#2563eb',     // Darker blue border
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 20,           // ADDED: Makes the bar thinner (fixed pixel width)
                    },
                    {
                        label: 'Savings ($)',
                    data: savingsData,
                    backgroundColor: '#22c55e', // Keeping the Green
                    borderColor: '#16a34a',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 20,           // ADDED: Makes the bar thinner (fixed pixel width)
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: budget,
                                yMax: budget,
                                borderColor: '#334155',
                                borderWidth: 3,
                                borderDash: [5, 5],
                                label: {
                                    display: true,
                                    content: 'Budget Limit ($' + budget + ')',
                                    position: 'start',
                                    backgroundColor: '#334155',
                                    color: '#fff',
                                    font: { size: 10, weight: 'bold' }
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: chartYMax, // Using the fixed variable here
                        ticks: { 
                            callback: (value) => '$' + value 
                        }
                    },
                    x: {
                    grid: { display: false },
                    categoryPercentage: 0.5,     // ADDED: Controls the width of the group
                    barPercentage: 0.8           // ADDED: Controls width of individual bars in the group
                },
              }
            }
        });
    } catch (err) {
        console.error("Chart.js Error:", err);
    }
}
};

// 
// Boot
// 
document.addEventListener('DOMContentLoaded', () => App.init());