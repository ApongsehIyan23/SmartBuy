require('dotenv').config();
const fetch = require('node-fetch');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

// 
// Security Middleware
// 
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      // UPDATED: Added "*" to allow product images from any shopping site
      imgSrc: ["'self'", "https:", "data:", "*"], 
      // UPDATED: Added "'unsafe-inline'" to allow your chart initialization scripts
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      // UPDATED: Added "https://cdn.jsdelivr.net" to allow the browser to talk to the Chart library
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"]
    }
  }
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting - general
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' }
});

// Rate limiting - search (stricter)
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: { error: 'Search limit reached. Please wait a moment before searching again.' }
});

// Rate limiting - AI advice (strictest)
const adviceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: { error: 'AI advisor limit reached. Please wait before requesting more advice.' }
});

// Rate limiting - auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' }
});

app.use('/api/', generalLimiter);

// 
// Input Sanitization Helpers
// 
function sanitizeString(str, maxLength = 200) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`;(){}]/g, '')
    .trim()
    .substring(0, maxLength);
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidNumber(val, min = 0, max = 99999) {
  const num = Number(val);
  return !isNaN(num) && num >= min && num <= max;
}

// User Storage Helpers
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading users:', err.message);
  }
  return [];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error saving users:', err.message);
  }
}

// 
// Auth Middleware
// 
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// 
// Auth Routes
// 
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = sanitizeString(email, 100).toLowerCase();
    const cleanName = sanitizeString(name, 50);

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const users = loadUsers();
    if (users.find(u => u.email === cleanEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      shoppingList: [],
      budget: 500,
      preferences: { currency: 'USD', darkMode: false },
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, preferences: newUser.preferences }
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = sanitizeString(email, 100).toLowerCase();
    const users = loadUsers();
    const user = users.find(u => u.email === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        budget: user.budget,
        shoppingList: user.shoppingList,
        preferences: user.preferences
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// 
// Shopping List Routes (Authenticated)
// 
app.get('/api/list', authenticateToken, (req, res) => {
  try {
    const users = loadUsers();
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({
      shoppingList: user.shoppingList,
      budget: user.budget,
      preferences: user.preferences
    });
  } catch (err) {
    console.error('Get list error:', err.message);
    res.status(500).json({ error: 'Could not load your shopping list.' });
  }
});

app.post('/api/list', authenticateToken, (req, res) => {
  try {
    const { shoppingList, budget, preferences } = req.body;

    if (!Array.isArray(shoppingList)) {
      return res.status(400).json({ error: 'Invalid shopping list format.' });
    }

    if (shoppingList.length > 50) {
      return res.status(400).json({ error: 'Shopping list cannot exceed 50 items.' });
    }

    const cleanList = shoppingList.map(item => ({
      name: sanitizeString(item.name, 100),
      store: sanitizeString(item.store, 50),
      price: isValidNumber(item.price) ? Number(item.price) : 0,
      image: typeof item.image === 'string' ? item.image.substring(0, 500) : '',
      rating: isValidNumber(item.rating, 0, 5) ? Number(item.rating) : 0,
      addedAt: item.addedAt || new Date().toISOString()
    }));

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found.' });

    users[userIndex].shoppingList = cleanList;
    if (isValidNumber(budget, 1, 99999)) {
      users[userIndex].budget = Number(budget);
    }
    if (preferences && typeof preferences === 'object') {
      users[userIndex].preferences = {
        currency: sanitizeString(preferences.currency || 'USD', 3),
        darkMode: Boolean(preferences.darkMode)
      };
    }

    saveUsers(users);
    res.json({ message: 'Shopping list saved.', shoppingList: cleanList });
  } catch (err) {
    console.error('Save list error:', err.message);
    res.status(500).json({ error: 'Could not save your shopping list.' });
  }
});

// 
// Product Search Route (Proxy to RapidAPI)
// 
app.get('/api/search', searchLimiter, async (req, res) => {
  try {
    const query = sanitizeString(req.query.q, 100);
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Please enter at least 2 characters to search.' });
    }

    const page = Math.min(Math.max(parseInt(req.query.page) || 1, 1), 10);

    const url = `https://real-time-product-search.p.rapidapi.com/search-v2?q=${encodeURIComponent(query)}&country=us&language=en&page=${page}&limit=25&sort_by=BEST_MATCH&product_condition=ANY`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.status === 429) {
      return res.status(429).json({ error: 'Search API limit reached. Please try again later.' });
    }

    if (!response.ok) {
      return res.status(502).json({ error: 'Product search is temporarily unavailable.' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Search request timed out. Please try again.' });
    }
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Something went wrong with the search. Please try again.' });
  }
});

// 
// AI Advice Route (Proxy to Gemini)
// 
app.post('/api/advice', adviceLimiter, async (req, res) => {
  try {
    const { budget, spent, remaining, items } = req.body;
    
    // 1. Prepare the URL using the Flash Latest alias
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // 2. Try the Real AI first
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Give 3 short student budget tips for these items: " + items.map(i => i.name).join(', ') }] }]
      })
    });

    const data = await response.json();

    // 3. If Quota is exceeded (429), use the "Local AI" Fallback
    if (response.status === 429 || !response.ok) {
        console.warn("Using Local AI Fallback due to Quota Limits");
        
        const tips = [
            `You have $${remaining.toFixed(2)} left. Consider looking for used versions of "${items[0].name}" to save more.`,
            `Check if ${items[1]?.name || 'your items'} have a student discount available at the store.`,
            `Try to group your purchases at ${items[0].store} to save on shipping costs.`
        ];
        
        return res.json({ advice: tips.join(' ') });
    }

    // 4. If AI worked, return the real advice
    const advice = data.candidates[0].content.parts[0].text.replace(/\*/g, '');
    res.json({ advice });

  } catch (err) {
    res.status(500).json({ error: 'System busy, please try again.' });
  }
});


// 
// Catch-all: serve index.html for any unmatched route
// 
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 
// Start Server
// 
app.listen(PORT, () => {
  console.log(`SmartBuy server running on port ${PORT}`);
  // Create users.json if it doesn't exist
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]');
  }
});