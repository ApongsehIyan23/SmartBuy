/*
   SmartBuy — Auth Module
   Handles login, register, guest mode, session management*/

const Auth = {
  isLoggedIn: false,
  user: null,

  /**
   * Initialize auth state from localStorage
   */
  init() {
    const token = localStorage.getItem('smartbuy_token');
    const userData = localStorage.getItem('smartbuy_user');

    if (token && userData) {
      try {
        this.user = JSON.parse(userData);
        this.isLoggedIn = true;
        return true;
      } catch (e) {
        this.logout();
      }
    }
    return false;
  },

  /**
   * Show auth modal
   */
  showModal() {
    document.getElementById('authOverlay').style.display = 'flex';
    this._setMode('login');
  },

  /**
   * Hide auth modal
   */
  hideModal() {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('authError').textContent = '';
    document.getElementById('authForm').reset();
  },

  /**
   * Toggle between login and register
   */
  _setMode(mode) {
    const nameGroup = document.getElementById('nameGroup');
    const submitBtn = document.getElementById('authSubmit');
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    const switchText = document.getElementById('authSwitchText');
    const switchLink = document.getElementById('authSwitchLink');

    if (mode === 'register') {
      nameGroup.style.display = 'block';
      submitBtn.textContent = 'Create account';
      title.textContent = 'Create your account';
      subtitle.textContent = 'Save your shopping lists and preferences';
      switchText.textContent = 'Already have an account?';
      switchLink.textContent = 'Sign in';
      submitBtn.dataset.mode = 'register';
    } else {
      nameGroup.style.display = 'none';
      submitBtn.textContent = 'Sign in';
      title.textContent = 'Welcome to SmartBuy';
      subtitle.textContent = 'Sign in to save your shopping lists across devices';
      switchText.textContent = "Don't have an account?";
      switchLink.textContent = 'Create one';
      submitBtn.dataset.mode = 'login';
    }
  },

  /**
   * Handle form submission
   */
  async handleSubmit(e) {
    e.preventDefault();
    const errorEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmit');
    const mode = submitBtn.dataset.mode || 'login';

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value.trim();

    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = mode === 'login' ? 'Signing in...' : 'Creating account...';

    try {
      let data;
      if (mode === 'register') {
        if (!name) throw new Error('Please enter your name.');
        data = await API.register(name, email, password);
      } else {
        data = await API.login(email, password);
      }

      // Save session
      localStorage.setItem('smartbuy_token', data.token);
      localStorage.setItem('smartbuy_user', JSON.stringify(data.user));
      this.user = data.user;
      this.isLoggedIn = true;

      this.hideModal();

      // Update UI
      App.onAuthSuccess(data.user);
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? 'Sign in' : 'Create account';
    }
  },

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem('smartbuy_token');
    localStorage.removeItem('smartbuy_user');
    this.isLoggedIn = false;
    this.user = null;
  },

  /**
   * Setup auth event listeners
   */
  setupListeners() {
    // Form submit
    document.getElementById('authForm').addEventListener('submit', (e) => this.handleSubmit(e));

    // Toggle login/register
    document.getElementById('authSwitchLink').addEventListener('click', (e) => {
      e.preventDefault();
      const currentMode = document.getElementById('authSubmit').dataset.mode;
      this._setMode(currentMode === 'login' ? 'register' : 'login');
    });

    // Skip (guest mode)
    document.getElementById('authSkip').addEventListener('click', () => {
      this.hideModal();
      App.onGuestMode();
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.logout();
      App.onLogout();
    });

    // Login button (in header)
    document.getElementById('loginBtn').addEventListener('click', () => {
      this.showModal();
    });
  }
};
