/* SmartBuy — UI Module
   All DOM rendering, event binding, and display logic
   XSS-safe: always uses textContent, never innerHTML for user data*/

const UI = {

  /**
   * Safely set text content (XSS protection)
   */
  safeText(el, text) {
    if (el) el.textContent = text;
  },

  /**
   * Format price with dollar sign
   */
  formatPrice(price) {
    return '$' + Number(price).toFixed(2);
  },

  /**
   * Generate star rating HTML (safe - no user data)
   */
  starsHTML(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  },

  /**
   * Show app, hide auth
   */
  showApp() {
    document.getElementById('app').style.display = 'block';
  },

  /**
   * Update user section in header
   */
  updateUserSection(user) {
    const nameEl = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    const saveListBtn = document.getElementById('saveListBtn');

    if (user) {
      this.safeText(nameEl, user.name);
      logoutBtn.style.display = 'inline-block';
      loginBtn.style.display = 'none';
      if (saveListBtn) saveListBtn.style.display = 'block';
    } else {
      this.safeText(nameEl, 'Guest');
      logoutBtn.style.display = 'none';
      loginBtn.style.display = 'inline-block';
      if (saveListBtn) saveListBtn.style.display = 'none';
    }
  },

  /**
   * Update budget display
   */
  updateBudget(budget, spent) {
    const remaining = Math.max(budget - spent, 0);
    const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

    this.safeText(document.getElementById('budgetSpent'), this.formatPrice(spent));
    this.safeText(document.getElementById('budgetRemaining'), this.formatPrice(remaining));

    const progressBar = document.getElementById('budgetProgressBar');
    progressBar.style.width = percentage + '%';
    progressBar.className = 'budget-progress-fill';
    if (percentage > 80) progressBar.classList.add('danger');
    else if (percentage > 50) progressBar.classList.add('warning');

    // Also update cart progress
    const cartProgressBar = document.getElementById('cartProgressBar');
    if (cartProgressBar) {
      cartProgressBar.style.width = percentage + '%';
      cartProgressBar.className = 'cart-progress-fill';
      if (percentage > 80) cartProgressBar.classList.add('danger');
      else if (percentage > 50) cartProgressBar.classList.add('warning');
    }

    this.safeText(document.getElementById('cartSubtotal'), this.formatPrice(spent));
    this.safeText(document.getElementById('cartRemaining'), this.formatPrice(remaining));
  },

  /**
   * Show welcome state
   */
  showWelcome() {
    document.getElementById('welcomeState').style.display = 'flex';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('resultsHeader').style.display = 'none';
    document.getElementById('resultsGrid').innerHTML = '';
  },

  /**
   * Show loading state
   */
  showLoading() {
    document.getElementById('welcomeState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('resultsHeader').style.display = 'none';
    document.getElementById('resultsGrid').innerHTML = '';
  },

  /**
   * Show error state
   */
  showError(title, message) {
    document.getElementById('welcomeState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
    document.getElementById('resultsHeader').style.display = 'none';

    this.safeText(document.getElementById('errorTitle'), title);
    this.safeText(document.getElementById('errorMessage'), message);
  },

  /**
   * Render product results
   */
  renderResults(products, query, cart, budget) {
    document.getElementById('welcomeState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('resultsHeader').style.display = 'block';

    const spent = cart.reduce((sum, item) => sum + item.price, 0);
    const remaining = budget - spent;

    const headerEl = document.getElementById('resultsCount');
    headerEl.innerHTML = '';
    const countText = document.createTextNode(products.length + ' results for ');
    const boldQuery = document.createElement('b');
    this.safeText(boldQuery, '"' + query + '"');
    headerEl.appendChild(countText);
    headerEl.appendChild(boldQuery);

    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';

    if (products.length === 0) {
      this.showError('No results found', 'Try a different search term.');
      return;
    }

    products.forEach((product, index) => {
      const price = this._extractPrice(product);
      const isOverBudget = price > remaining;
      const isInCart = cart.some(item => item.id === (product.product_id || index.toString()));

      const card = document.createElement('div');
      card.className = 'product-card' + (isOverBudget ? ' over-budget' : '');

      // Image wrapper
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'product-img-wrapper';
      const photoUrl = (product.product_photos && product.product_photos[0]) || product.product_photo;
      if (photoUrl) {
        const img = document.createElement('img');
        img.src = photoUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function() { this.style.display = 'none'; };
        imgWrapper.appendChild(img);
      }

      // Over budget tag inside image wrapper
      if (isOverBudget && !isInCart) {
        const tag = document.createElement('div');
        tag.className = 'over-budget-tag';
        this.safeText(tag, 'Exceeds budget');
        imgWrapper.appendChild(tag);
      }
      card.appendChild(imgWrapper);

      // Card body
      const body = document.createElement('div');
      body.className = 'product-card-body';

      // Price row (shown first like Odaplace)
      const priceRow = document.createElement('div');
      priceRow.className = 'product-price-row';

      const priceEl = document.createElement('span');
      priceEl.className = 'product-price' + (isOverBudget ? ' over-budget-price' : '');
      this.safeText(priceEl, price > 0 ? this.formatPrice(price) : 'Price unavailable');
      priceRow.appendChild(priceEl);

      let oldPrice = 0;
      if (product.offer && product.offer.original_price) {
        oldPrice = parseFloat(String(product.offer.original_price).replace(/[^0-9.]/g, '')) || 0;
      } else if (product.typical_price_range && product.typical_price_range[1]) {
        oldPrice = parseFloat(String(product.typical_price_range[1]).replace(/[^0-9.]/g, '')) || 0;
      }
      if (oldPrice > price && price > 0) {
        const oldPriceEl = document.createElement('span');
        oldPriceEl.className = 'product-old-price';
        this.safeText(oldPriceEl, this.formatPrice(oldPrice));
        priceRow.appendChild(oldPriceEl);
      }
      body.appendChild(priceRow);

      // Title
      const title = document.createElement('div');
      title.className = 'product-title';
      this.safeText(title, product.product_title || 'Unknown product');
      body.appendChild(title);

      // Meta row (store, rating, reviews)
      const meta = document.createElement('div');
      meta.className = 'product-meta';

      const ratingVal = product.product_rating || product.product_star_rating;
      if (ratingVal) {
        const rating = document.createElement('span');
        rating.className = 'product-rating';
        this.safeText(rating, this.starsHTML(parseFloat(ratingVal)));
        meta.appendChild(rating);

        const reviews = document.createElement('span');
        reviews.className = 'product-reviews';
        this.safeText(reviews, product.product_num_reviews ? 'Sold ' + product.product_num_reviews : '');
        meta.appendChild(reviews);
      }

      const store = document.createElement('span');
      store.className = 'product-store';
      this.safeText(store, this._extractStore(product));
      meta.appendChild(store);

      body.appendChild(meta);

      // Add button
      const addBtn = document.createElement('button');
      addBtn.className = 'add-btn';
      if (isInCart) {
        addBtn.className += ' added';
        this.safeText(addBtn, '✓ In your list');
        addBtn.disabled = true;
      } else if (isOverBudget) {
        this.safeText(addBtn, 'Over budget');
        addBtn.disabled = true;
      } else if (price <= 0) {
        this.safeText(addBtn, 'Price unavailable');
        addBtn.disabled = true;
      } else {
        this.safeText(addBtn, 'Add to list');
        addBtn.addEventListener('click', () => {
          App.addToCart({
            id: product.product_id || index.toString(),
            name: product.product_title || 'Unknown product',
            store: this._extractStore(product),
            price: price,
            image: (product.product_photos && product.product_photos[0]) || product.product_photo || '',
            rating: parseFloat(product.product_rating || product.product_star_rating) || 0,
            url: product.product_page_url || product.product_url || ''
          });
        });
      }
      body.appendChild(addBtn);

      card.appendChild(body);
      grid.appendChild(card);
    });
  },

  /**
   * Extract price from product data
   */
  _extractPrice(product) {
    // Try offer.price first (e.g. "$879.99")
    if (product.offer && product.offer.price) {
      return parseFloat(String(product.offer.price).replace(/[^0-9.]/g, '')) || 0;
    }
    // Try typical_price_range
    if (product.typical_price_range && product.typical_price_range[0]) {
      return parseFloat(String(product.typical_price_range[0]).replace(/[^0-9.]/g, '')) || 0;
    }
    // Try product_min_price
    if (product.product_min_price) {
      return parseFloat(String(product.product_min_price).replace(/[^0-9.]/g, '')) || 0;
    }
    return 0;
  },

  /**
   * Extract store name from product data
   */
  _extractStore(product) {
    if (product.offer && product.offer.store_name) return product.offer.store_name;
    if (product.store_name) return product.store_name;
    if (product.stores_count_text) return product.stores_count_text;
    return 'Online store';
  },

  /**
   * Render shopping cart
   */
  renderCart(cart) {
    const itemsEl = document.getElementById('cartItems');
    const emptyEl = document.getElementById('cartEmpty');
    const footerEl = document.getElementById('cartFooter');
    const countEl = document.getElementById('cartCount');
    const itemsCountEl = document.getElementById('budgetItems');

    this.safeText(countEl, cart.length.toString());
    this.safeText(itemsCountEl, cart.length.toString());

    if (cart.length === 0) {
      emptyEl.style.display = 'flex';
      footerEl.style.display = 'none';
      itemsEl.innerHTML = '';
      return;
    }

    emptyEl.style.display = 'none';
    footerEl.style.display = 'block';
    itemsEl.innerHTML = '';

    cart.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'cart-item';

      // Image
      const imgDiv = document.createElement('div');
      imgDiv.className = 'cart-item-img';
      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = '';
        img.onerror = function() { this.style.display = 'none'; };
        imgDiv.appendChild(img);
      }
      row.appendChild(imgDiv);

      // Info
      const info = document.createElement('div');
      info.className = 'cart-item-info';

      const name = document.createElement('div');
      name.className = 'cart-item-name';
      this.safeText(name, item.name);
      info.appendChild(name);

      const store = document.createElement('div');
      store.className = 'cart-item-store';
      this.safeText(store, item.store);
      info.appendChild(store);

      row.appendChild(info);

      // Price & Remove
      const right = document.createElement('div');
      right.className = 'cart-item-right';

      const price = document.createElement('div');
      price.className = 'cart-item-price';
      this.safeText(price, this.formatPrice(item.price));
      right.appendChild(price);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'cart-item-remove';
      this.safeText(removeBtn, 'Remove');
      removeBtn.addEventListener('click', () => App.removeFromCart(index));
      right.appendChild(removeBtn);

      row.appendChild(right);
      itemsEl.appendChild(row);
    });
  },

  /**
   * Update store filter checkboxes based on results
   */
  updateStoreFilters(stores) {
    const container = document.getElementById('storeFilters');
    container.innerHTML = '';

    // All stores checkbox
    const allLabel = document.createElement('label');
    allLabel.className = 'checkbox-label';
    const allCheckbox = document.createElement('input');
    allCheckbox.type = 'checkbox';
    allCheckbox.value = 'all';
    allCheckbox.checked = true;
    allCheckbox.addEventListener('change', () => App.filterResults());
    allLabel.appendChild(allCheckbox);
    allLabel.appendChild(document.createTextNode(' All stores'));
    container.appendChild(allLabel);

    stores.forEach(store => {
      const label = document.createElement('label');
      label.className = 'checkbox-label';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = store;
      checkbox.addEventListener('change', () => App.filterResults());
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + store));
      container.appendChild(label);
    });
  },

  /**
   * Show AI advice
   */
  showAdvice(text) {
    document.getElementById('adviceLoading').style.display = 'none';
    document.getElementById('adviceResult').style.display = 'block';
    this.safeText(document.getElementById('adviceText'), text);
    document.getElementById('adviceBtn').disabled = false;
  },

  /**
   * Show advice loading
   */
  showAdviceLoading() {
    document.getElementById('adviceBtn').disabled = true;
    document.getElementById('adviceLoading').style.display = 'flex';
    document.getElementById('adviceResult').style.display = 'none';
  },

  /**
   * Hide advice
   */
  hideAdvice() {
    document.getElementById('adviceLoading').style.display = 'none';
    document.getElementById('adviceResult').style.display = 'none';
    document.getElementById('adviceBtn').disabled = false;
  },

  /**
   * Toggle dark mode
   */
  toggleDarkMode(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    this.safeText(document.getElementById('darkModeIcon'), isDark ? '🌙' : '☀️');
  }
};
