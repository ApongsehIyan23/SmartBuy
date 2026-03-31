# SmartBuy — Student Price Comparison & Budget Optimizer

SmartBuy is a web application designed specifically for students who need to make smart purchasing decisions on a limited budget. Unlike a simple search engine, SmartBuy searches for products across multiple online stores in real-time, then applies economic optimization algorithms to generate multiple budget-aware product combinations — giving students the ability to see exactly how to spend their money most effectively.

The application uses concepts from consumer economics (indifference curves, budget constraints, utility maximization) to help users understand the trade-offs between price and quality, making it a tool that cannot be replicated by a simple Google search.

---

## Live Demo

| Resource | URL |
|----------|-----|
  **Website**: http://www2.ianapongseh.tech/
| **Load Balancer** | http://54.197.19.147 |
| **Web Server 1** | http://18.234.221.151 |
| **Web Server 2** | http://52.87.243.104 |
## Demo Video : https://youtu.be/ILE_JiUavx8
| **GitHub Repository** | https://github.com/ApongsehIyan23/SmartBuy |

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Local Development Setup](#local-development-setup)
6. [Environment Variables](#environment-variables)
7. [API Endpoints](#api-endpoints)
8. [HTTP Status Codes & Error Handling](#http-status-codes--error-handling)
9. [Deployment Architecture](#deployment-architecture)
10. [Deployment Steps](#deployment-steps)
11. [Security Measures](#security-measures)
12. [Challenges Faced & Solutions](#challenges-faced--solutions)
13. [API & Resource Attribution](#api--resource-attribution)
14. [Author](#author)

---

## Features

### Search & Compare
- Real-time product search across multiple online stores via the RapidAPI Real-Time Product Search API
- Product cards displaying product images, current prices, original prices with discount percentages, star ratings, review counts, and store names
- Client-side sorting by price (ascending/descending), rating, or relevance
- Client-side filtering by store name, price range (min/max), and minimum star rating
- Budget tracker with a color-coded progress bar that turns green (under 50%), yellow (50-80%), or red (over 80%) as the user approaches their budget limit

### Smart Budget Optimizer
This is the core feature that differentiates SmartBuy from a regular shopping search. Users add up to 5 items to a wish list and set a budget, and the optimizer:

1. **Searches all items** simultaneously, making one API call per item
2. **Caches all results** in memory — no additional API calls needed for combination generation
3. **Generates 4 budget-aware combinations** using different optimization strategies:

| Combination | Strategy | Algorithm |
|-------------|----------|-----------|
| **Best Savings** | Minimize total cost | Picks the absolute cheapest option for each item |
| **Best Quality** | Maximize ratings within budget | Greedy algorithm: for each item, picks the highest-rated product that leaves enough budget for the cheapest options of remaining items |
| **Balanced Choice** | Optimize value (price + quality) | Scores each product using a normalized formula (50% price savings + 50% rating), constrained by remaining budget |
| **Fewest Stores** | Minimize number of stores | Prioritizes stores that carry the most items, constrained by remaining budget to reduce shipping costs |

Each combination displays the total cost, budget savings, and individual product details with images. Users can add any combination to their shopping list with one click.

### User Authentication System
- **Registration:** Users create accounts with name, email, and password. Passwords are hashed using bcrypt with 10 salt rounds before storage
- **Login:** Email and password are validated against stored credentials. On success, a JWT token is issued with a 7-day expiry
- **Session Persistence:** JWT tokens are stored in the browser's localStorage, keeping users logged in across browser sessions and tabs
- **Guest Mode:** Users can skip authentication and use the app without an account. Guest data is stored only in localStorage and cleared on logout
- **Data Isolation:** Each user's shopping list is stored separately on the server. Logging out clears all session data and shows the auth modal. Guest mode clears any previous user's localStorage data to prevent data leakage between users

### AI Budget Advice (Google Gemini)
- Available in the shopping list sidebar after adding items
- Sends the user's budget, spending totals, and item list to the Google Gemini API
- Returns 2-3 personalized, actionable money-saving tips
- Gemini responses are sanitized (HTML stripped) before display

### Additional Features
- **Dark Mode:** Toggle switch in the header, preference persisted in localStorage
- **CSV Export:** Download the entire shopping list as a CSV file with product names, stores, prices, totals, and budget summary
- **Responsive Design:** Three-column layout on desktop, collapses to single column on mobile
- **Input Sanitization:** All user inputs are sanitized on both client and server side to prevent XSS attacks

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | UI rendering, client-side logic |
| **Backend** | Node.js 18, Express.js 4 | API server, routing, middleware |
| **Product Data API** | RapidAPI Real-Time Product Search (search-v2) | Real-time product prices and details from multiple stores |
| **AI API** | Google Gemini 2.0 Flash | AI-powered shopping advice |
| **Authentication** | bcryptjs, jsonwebtoken | Password hashing, session tokens |
| **Security** | Helmet.js, express-rate-limit | HTTP security headers, rate limiting |
| **Process Manager** | PM2 | Keeps Node.js running in production |
| **Web Server** | Nginx | Reverse proxy (web servers) and load balancer |
| **Icons** | Font Awesome 6.5.1 | UI icons throughout the application |
| **Typography** | Google Fonts (DM Sans) | Application typeface |

---

## Project Structure

```
SmartBuy/
├── server.js                # Express server: API proxy, auth routes, static file serving
├── package.json             # Project metadata and dependencies
├── package-lock.json        # Locked dependency versions
├── .env.example             # Template for environment variables (safe to commit)
├── .gitignore               # Excludes .env, node_modules, users.json, logs
├── Dockerfile               # Docker container configuration
├── docker-compose.yml       # Docker Compose multi-service configuration
├── README.md                # This file
│
├── public/                  # Static frontend files served by Express
│   ├── index.html           # Single-page app: auth modal, search view, optimizer view
│   ├── css/
│   │   └── styles.css       # Complete application styling (1400+ lines)
│   └── js/
│       ├── app.js           # Main application logic: state, search, optimizer, combinations
│       ├── api.js           # HTTP client: all fetch calls to server endpoints
│       ├── auth.js          # Authentication: login, register, logout, session management
│       └── ui.js            # DOM manipulation: rendering, XSS-safe text, helper functions
│
├── users.json               # Runtime user database (auto-created, gitignored)
└── .env                     # API keys and secrets (gitignored, never committed)
```

---

## Prerequisites

Before running SmartBuy locally, ensure you have:

- **Node.js** version 18 or higher — [Download here](https://nodejs.org/)
- **npm** version 8 or higher (included with Node.js)
- **A RapidAPI account** with a subscription to the "Real-Time Product Search" API (free tier available)
- **A Google AI Studio account** for a Gemini API key (free tier available)

Verify your Node.js installation:
```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 8.x.x or higher
```

---

## Local Development Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/ApongsehIyan23/SmartBuy.git
cd SmartBuy
```

### Step 2: Install Dependencies
```bash
npm install
```

This installs the following packages:
- `express` — Web framework
- `dotenv` — Environment variable loader
- `helmet` — Security headers
- `express-rate-limit` — Rate limiting middleware
- `bcryptjs` — Password hashing
- `jsonwebtoken` — JWT token generation and verification
- `uuid` — Unique ID generation for users
- `node-fetch@2` — HTTP client for API calls

### Step 3: Configure Environment Variables
```bash
cp .env.example .env
```

Open `.env` and add your actual API keys:
```
RAPIDAPI_KEY=your_rapidapi_key_here
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=any_random_secret_string_here
PORT=3000
```

**How to get the API keys:**

1. **RapidAPI Key:**
   - Go to [rapidapi.com](https://rapidapi.com) and create an account
   - Search for "Real-Time Product Search" API
   - Subscribe to the free tier (100 calls/month)
   - Copy the `X-RapidAPI-Key` from the API dashboard

2. **Gemini API Key:**
   - Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - Create a new API key
   - Copy the key

3. **JWT Secret:**
   - Use any random string (e.g., `my-super-secret-key-2026`)
   - This is used to sign authentication tokens

### Step 4: Start the Server
```bash
node server.js
```

You should see:
```
SmartBuy server running on port 3000
```

### Step 5: Open the Application
Navigate to `http://localhost:3000` in your web browser.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RAPIDAPI_KEY` | Yes | API key for Real-Time Product Search on RapidAPI |
| `GEMINI_API_KEY` | Yes | API key for Google Gemini AI |
| `JWT_SECRET` | Yes | Secret string used to sign and verify JWT tokens |
| `PORT` | No | Server port (defaults to 3000 if not set) |

---

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/register` | Create a new user account | No |
| `POST` | `/api/login` | Authenticate and receive JWT token | No |

**Register Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Successful Auth Response:**
```json
{
  "message": "Logged in successfully.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "john@example.com",
    "budget": 500,
    "shoppingList": [],
    "preferences": { "currency": "USD", "darkMode": false }
  }
}
```

### Shopping List (Requires Authentication)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/list` | Load user's saved shopping list | Yes (JWT) |
| `POST` | `/api/list` | Save user's shopping list | Yes (JWT) |

### Product Search

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/search?q=query&page=1` | Search products via RapidAPI | No |

### AI Advice

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/advice` | Get AI budget advice from Gemini | No |

**Advice Request Body:**
```json
{
  "budget": 500,
  "spent": 234.50,
  "remaining": 265.50,
  "items": [
    { "name": "Wireless Headphones", "store": "Amazon", "price": 45.99 },
    { "name": "Laptop Stand", "store": "Walmart", "price": 29.99 }
  ]
}
```

---

## HTTP Status Codes & Error Handling

SmartBuy uses standard HTTP status codes throughout the application. Every error response includes a descriptive `error` message in JSON format.

### Success Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200 OK` | Request succeeded | Successful search, login, list retrieval |
| `201 Created` | Resource created | Successful user registration |

### Client Error Codes

| Code | Meaning | When Used | Example Response |
|------|---------|-----------|-----------------|
| `400 Bad Request` | Invalid input | Search query too short, missing required fields, invalid email format, password too short, invalid shopping list format | `{"error": "Please enter at least 2 characters to search."}` |
| `401 Unauthorized` | Authentication failed | Invalid email/password, missing or expired JWT token | `{"error": "Invalid email or password."}` |
| `409 Conflict` | Resource already exists | Registering with an email that already has an account | `{"error": "An account with this email already exists."}` |
| `429 Too Many Requests` | Rate limit exceeded | Too many searches, login attempts, or AI advice requests within the time window | `{"error": "Search limit reached. Please wait a moment before searching again."}` |

### Server Error Codes

| Code | Meaning | When Used | Example Response |
|------|---------|-----------|-----------------|
| `500 Internal Server Error` | Unexpected server error | Database read/write failures, unexpected exceptions | `{"error": "Something went wrong. Please try again."}` |
| `502 Bad Gateway` | Upstream API unavailable | RapidAPI or Gemini API returned a non-OK response | `{"error": "Product search is temporarily unavailable."}` |
| `504 Gateway Timeout` | Upstream API timeout | RapidAPI or Gemini API did not respond within the timeout period (45 seconds for search, 20 seconds for AI advice) | `{"error": "Search request timed out. Please try again."}` |

### Rate Limiting Configuration

| Endpoint | Window | Max Requests | Purpose |
|----------|--------|-------------|---------|
| `/api/search` | 1 minute | 15 | Prevent API key exhaustion |
| `/api/advice` | 1 minute | 5 | Prevent Gemini API abuse |
| `/api/register`, `/api/login` | 15 minutes | 10 | Prevent brute force attacks |
| All `/api/*` routes | 15 minutes | 100 | General abuse prevention |

### Client-Side Error Handling

The frontend handles errors gracefully with user-friendly messages:

- **Search errors:** Displayed in a centered error state with a "Try again" button
- **Auth errors:** Shown inline below the form fields in red text
- **Optimizer errors:** Displayed with descriptive title and message (e.g., "No items entered", "Invalid budget", "Add more items")
- **AI advice errors:** Shown inline in the advice result area
- **Network errors:** Caught by the fetch wrapper and displayed as user-friendly messages

---

## Deployment Architecture

```
                    ┌─────────────────────────────────┐
                    │         User's Browser           │
                    └──────────────┬──────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────────┐
                    │    Lb01 — Nginx Load Balancer    │
                    │       54.197.19.147:80           │
                    │    (ip_hash sticky sessions)     │
                    └──────────┬──────────┬───────────┘
                               │          │
                    ┌──────────▼──┐  ┌────▼──────────┐
                    │    Web01    │  │    Web02       │
                    │ 18.234.221  │  │  52.87.243    │
                    │  .151:80    │  │  .104:80      │
                    │             │  │               │
                    │ Nginx → :3K │  │ Nginx → :3K   │
                    │ PM2+Node.js │  │ PM2+Node.js   │
                    │ SmartBuy    │  │ SmartBuy       │
                    └─────────────┘  └───────────────┘
```

**How it works:**
1. The user visits `http://54.197.19.147` (the load balancer)
2. Nginx on Lb01 uses `ip_hash` to consistently route the same user IP to the same backend server
3. The selected web server's Nginx receives the request on port 80 and proxies it to the Node.js app running on port 3000
4. PM2 ensures the Node.js process stays alive even after SSH disconnection or crashes

**Why Sticky Sessions (ip_hash)?**

User data (accounts, shopping lists) is stored in a local `users.json` file on each web server. Without sticky sessions, a user who registers on Web01 could be routed to Web02 on their next request and find their account missing. The `ip_hash` directive ensures the same client IP always routes to the same backend server, maintaining data consistency without requiring a shared database.

---

## Deployment Steps

### Web Servers (Web01 & Web02)

Run these steps on **both** web servers:

```bash
# 1. Update system
sudo apt update

# 2. Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install Nginx
sudo apt install -y nginx

# 4. Clone the repository
cd /home/ubuntu
git clone https://github.com/ApongsehIyan23/SmartBuy.git
cd SmartBuy

# 5. Install dependencies
npm install

# 6. Create environment file
vi .env
# Add: RAPIDAPI_KEY, GEMINI_API_KEY, JWT_SECRET, PORT=3000

# 7. Update Helmet configuration for HTTP deployment
# In server.js, add to Helmet config:
#   upgradeInsecureRequests: null (inside directives)
#   crossOriginEmbedderPolicy: false
#   crossOriginOpenerPolicy: false
#   crossOriginResourcePolicy: false
#   originAgentCluster: false

# 8. Install PM2 and start the app
sudo npm install -g pm2
pm2 start server.js --name smartbuy
pm2 save
pm2 startup  # Follow the instructions it prints

# 9. Configure Nginx reverse proxy
sudo vi /etc/nginx/sites-available/default
```

**Nginx configuration for web servers:**
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# 10. Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Load Balancer (Lb01)

```bash
# 1. Update and install Nginx
sudo apt update
sudo apt install -y nginx

# 2. Stop any existing services on port 80
sudo systemctl stop haproxy 2>/dev/null
sudo systemctl disable haproxy 2>/dev/null

# 3. Configure Nginx as load balancer
sudo vi /etc/nginx/sites-available/default
```

**Nginx configuration for load balancer:**
```nginx
upstream smartbuy {
    ip_hash;
    server 18.234.221.151;
    server 52.87.243.104;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://smartbuy;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# 4. Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Verifying Deployment

1. Visit `http://18.234.221.151` — should show SmartBuy (Web01)
2. Visit `http://52.87.243.104` — should show SmartBuy (Web02)
3. Visit `http://54.197.19.147` — should show SmartBuy via load balancer

---

## Security Measures

### Server-Side Security

| Measure | Implementation | Purpose |
|---------|---------------|---------|
| **API Key Protection** | Keys stored in `.env`, gitignored | Prevents API key exposure in source code |
| **API Proxy Pattern** | Frontend → Server → RapidAPI | API keys never sent to the browser |
| **Password Hashing** | bcrypt with 10 salt rounds | Passwords stored securely, never in plaintext |
| **JWT Authentication** | Signed tokens with 7-day expiry | Stateless, secure session management |
| **Helmet.js** | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy | Protection against clickjacking, MIME sniffing, and other attacks |
| **Rate Limiting** | express-rate-limit on all API routes | Prevents brute force and API abuse |
| **Input Sanitization** | HTML tag stripping, special character removal, length limits | Prevents XSS and injection attacks |

### Client-Side Security

| Measure | Implementation | Purpose |
|---------|---------------|---------|
| **XSS Prevention** | All user data rendered via `textContent` (never `innerHTML`) | Prevents script injection through product names or user input |
| **Input Validation** | Max lengths, type checking, format validation | Prevents oversized or malformed data |
| **Session Cleanup** | localStorage cleared on logout and guest mode | Prevents data leakage between users |
| **Budget Validation** | Positive numbers only, max $99,999 | Prevents invalid budget values |
| **Wish List Sanitization** | HTML tags and dangerous characters stripped | Prevents XSS through optimizer inputs |

### Content Security Policy (CSP)

```
default-src 'self';
style-src 'self' 'unsafe-inline' fonts.googleapis.com cdnjs.cloudflare.com;
font-src 'self' fonts.gstatic.com cdnjs.cloudflare.com;
img-src 'self' https: data: *;
script-src 'self' 'unsafe-inline' cdn.jsdelivr.net;
connect-src 'self' cdn.jsdelivr.net;
```

---

## Challenges Faced & Solutions

### 1. API Rate Limits (100 calls/month)
**Problem:** The free tier of RapidAPI only allows 100 API calls per month. With 4 items in the optimizer using 4 calls each, plus regular searches, the limit was quickly exhausted.

**Solution:** Designed the optimizer to search once per item and cache all results in memory. The 4 combinations are generated entirely from cached data with zero additional API calls. This reduced API usage by approximately 75%.

### 2. High API Latency (~13 seconds average)
**Problem:** The Real-Time Product Search API averages 13 seconds per request, with some queries taking over 30 seconds. This caused frequent timeouts, especially in the optimizer where multiple sequential searches are made.

**Solution:** Increased the server-side timeout to 45 seconds. Added 3-second delays between optimizer searches to avoid overwhelming the API. Added a progress bar to keep users informed during the wait.

### 3. Inconsistent API Response Structure
**Problem:** The API response format differed between versions. Sometimes products were in `data.products`, sometimes in `data.data.products`, and sometimes directly in the response array.

**Solution:** Implemented a cascading parser that checks multiple possible response structures:
```javascript
if (data.data && data.data.products) { ... }
else if (data.data && Array.isArray(data.data)) { ... }
else if (data.products) { ... }
else if (Array.isArray(data)) { ... }
```

### 4. Over-Budget Combinations
**Problem:** The "Balanced Choice" and "Fewest Stores" combinations were selecting products based on their criteria (value score, store consolidation) without checking if the total exceeded the budget.

**Solution:** Implemented a greedy budget-aware algorithm for all combinations. Before selecting a product for an item, the algorithm calculates the minimum cost needed for all remaining items and only selects products that leave enough budget for the rest.

### 5. Data Consistency Across Load-Balanced Servers
**Problem:** With user data stored in local `users.json` files, a user who registered on Web01 would not exist on Web02. The load balancer could send them to either server.

**Solution:** Configured Nginx's `ip_hash` directive for sticky sessions, ensuring the same client IP always routes to the same backend server. This maintains data consistency without requiring a shared database.

### 6. Helmet.js HTTPS Upgrade on HTTP Servers
**Problem:** Helmet.js automatically adds the `upgrade-insecure-requests` CSP directive, which tells browsers to upgrade all HTTP requests to HTTPS. Since our servers run on HTTP only, this caused all static assets (CSS, JS, fonts) to fail loading with `ERR_CONNECTION_REFUSED`.

**Solution:** Disabled the `upgrade-insecure-requests` directive by setting `upgradeInsecureRequests: null` in the Helmet CSP configuration, along with disabling `crossOriginEmbedderPolicy`, `crossOriginOpenerPolicy`, `crossOriginResourcePolicy`, and `originAgentCluster`.

---

## API & Resource Attribution

### APIs Used

| API | Provider | Purpose | Tier |
|-----|----------|---------|------|
| **[Real-Time Product Search](https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-product-search)** | LetsCrepe via RapidAPI | Real-time product prices, images, ratings, and store information from multiple online retailers | Free (100 calls/month) |
| **[Google Gemini API](https://ai.google.dev/)** | Google | AI-powered budget analysis and personalized shopping advice using the Gemini 2.0 Flash model | Free (rate limited) |

### Libraries & Frameworks

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [Express.js](https://expressjs.com/) | 4.x | MIT | Web server framework |
| [Helmet](https://helmetjs.github.io/) | 7.x | MIT | HTTP security headers |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 2.x | MIT | Password hashing |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 9.x | MIT | JWT token authentication |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | 7.x | MIT | API rate limiting |
| [node-fetch](https://github.com/node-fetch/node-fetch) | 2.x | MIT | HTTP client for API calls |
| [uuid](https://github.com/uuidjs/uuid) | 9.x | MIT | Unique ID generation |
| [dotenv](https://github.com/motdotla/dotenv) | 16.x | BSD-2-Clause | Environment variable management |

### Frontend Resources

| Resource | Provider | License | Purpose |
|----------|----------|---------|---------|
| [Font Awesome](https://fontawesome.com/) | Fonticons, Inc. | Free License | UI icons (piggy bank, star, scale, store, cart, etc.) |
| [DM Sans](https://fonts.google.com/specimen/DM+Sans) | Google Fonts | Open Font License | Application typography |
| [Odaplace](https://odaplace.com/) | Odaplace | — | UI design inspiration for product card layout and color scheme |

### Infrastructure

| Tool | Purpose |
|------|---------|
| [Nginx](https://nginx.org/) | Reverse proxy on web servers, load balancer on Lb01 |
| [PM2](https://pm2.keymetrics.io/) | Node.js process manager for production deployment |
| [Ubuntu 20.04](https://ubuntu.com/) | Server operating system |

---

## Author

**Apongseh Iyan** — Software Engineer @ ALU (African Leadership University)

GitHub: [ApongsehIyan23](https://github.com/ApongsehIyan23)
