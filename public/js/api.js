/* ============================================================
   SmartBuy — API Layer
   All communication with the server goes through here
   ============================================================ */

const API = {
  /**
   * Get auth headers with JWT token
   */
  _authHeaders() {
    const token = localStorage.getItem('smartbuy_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  /**
   * Search products
   */
  async searchProducts(query, page = 1) {
    if (!query || query.trim().length < 2) {
      throw new Error('Please enter at least 2 characters to search.');
    }

    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(`/api/search?q=${encodedQuery}&page=${page}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Search failed. Please try again.');
    }

    return data;
  },

  /**
   * Get AI advice on shopping list
   */
  async getAdvice(budget, spent, remaining, items) {
    const response = await fetch('/api/advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget, spent, remaining, items })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not get AI advice.');
    }

    return data;
  },

  /**
   * Register a new user
   */
  async register(name, email, password) {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    return data;
  },

  /**
   * Log in
   */
  async login(email, password) {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    return data;
  },

  /**
   * Save shopping list to server
   */
  async saveList(shoppingList, budget, preferences) {
    const response = await fetch('/api/list', {
      method: 'POST',
      headers: this._authHeaders(),
      body: JSON.stringify({ shoppingList, budget, preferences })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not save your list.');
    }

    return data;
  },

  /**
   * Load shopping list from server
   */
  async loadList() {
    const response = await fetch('/api/list', {
      method: 'GET',
      headers: this._authHeaders()
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not load your list.');
    }

    return data;
  }
};
