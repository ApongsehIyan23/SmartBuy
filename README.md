# SmartBuy — Student Price Comparison & Budget Optimizer

SmartBuy is a web application that helps students find the best product deals across multiple online stores and optimize their spending within a budget. Unlike a simple search engine, SmartBuy analyzes products across stores and generates multiple budget-aware combinations using economic optimization algorithms — something Google cannot do.

## Live Demo

- **Load Balancer:** http://54.197.19.147
- **Web Server 1:** http://18.234.221.151
- **Web Server 2:** http://52.87.243.104

## Features

### Search & Compare
- Real-time product search across multiple online stores via RapidAPI
- Product cards with images, prices, ratings, store names, and discount percentages
- Sort by price (low/high), rating, or relevance
- Filter by store, price range, and minimum rating
- Budget tracker with color-coded progress bar

### Smart Budget Optimizer
- Users add up to 5 items to a wish list and set a budget
- The app searches all items simultaneously and caches the results
- Generates 4 budget-aware combinations from cached data (zero additional API calls):
  - **Best Savings** — cheapest option for each item
  - **Best Quality** — highest rated products that fit within budget (greedy algorithm)
  - **Balanced Choice** — best value score combining price and quality, budget-constrained
  - **Fewest Stores** — consolidates purchases to minimize shipping, budget-constrained
- Each combination shows total cost, savings, and individual product details
- One-click "Add this combination to list" button

### User Authentication
- Register and login with email/password
- Passwords hashed with bcrypt
- JWT token-based sessions that persist across browser sessions
- Guest mode available (no account required)
- Shopping lists saved per user on the server

### AI Budget Advice
- Powered by Google Gemini API
- Analyzes the user's shopping list and provides personalized money-saving tips
- Available in the shopping list sidebar

### Additional Features
- Dark mode toggle (persisted in localStorage)
- Export shopping list as CSV
- Responsive design for mobile and desktop
- Input sanitization and XSS protection on all inputs
- Rate limiting on all API endpoints

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **Backend:** Node.js, Express.js
- **APIs:** RapidAPI Real-Time Product Search (search-v2), Google Gemini AI
- **Auth:** bcrypt for password hashing, jsonwebtoken for sessions
- **Security:** Helmet.js (CSP, headers), express-rate-limit, input sanitization
- **Icons:** Font Awesome 6.5.1
- **Font:** DM Sans (Google Fonts)
- **Deployment:** PM2 process manager, Nginx reverse proxy, Nginx load balancer

## Project Structure

```
SmartBuy/
├── server.js              # Express server, API proxy, auth routes
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── .gitignore             # Excludes .env, node_modules, users.json
├── Dockerfile             # Docker containerization
├── docker-compose.yml     # Docker compose config
├── public/
│   ├── index.html         # Main HTML (auth modal, search view, optimizer view)
│   ├── css/
│   │   └── styles.css     # Complete styling (Odaplace-inspired design)
│   └── js/
│       ├── app.js         # State management, optimizer logic, combinations
│       ├── api.js         # All fetch calls to server endpoints
│       ├── auth.js        # Login, register, session management
│       └── ui.js          # DOM rendering, XSS-safe text insertion
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/ApongsehIyan23/SmartBuy.git
cd SmartBuy
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Add your API keys to `.env`:
   - Get a RapidAPI key from [rapidapi.com](https://rapidapi.com) and subscribe to "Real-Time Product Search"
   - Get a Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   - Set a JWT secret (any random string)

5. Start the server:
```bash
node server.js
```

6. Open `http://localhost:3000` in your browser

## Deployment Architecture

```
User → Lb01 (54.197.19.147) Nginx Load Balancer
            ↓ ip_hash (sticky sessions)
     ┌──────┴──────┐
   Web01          Web02
(18.234.221.151) (52.87.243.104)
   Nginx → :3000   Nginx → :3000
   PM2 + Node.js   PM2 + Node.js
```

### Deployment Steps

1. **Web Servers (Web01 & Web02):**
   - Install Node.js 18, Nginx, PM2
   - Clone repo, npm install, create .env
   - Start app with PM2: `pm2 start server.js --name smartbuy`
   - Configure Nginx as reverse proxy (port 80 → 3000)

2. **Load Balancer (Lb01):**
   - Install Nginx
   - Configure upstream with `ip_hash` for sticky sessions
   - Proxy all traffic to Web01 and Web02

### Why Sticky Sessions?

User data (accounts, shopping lists) is stored in a local `users.json` file on each server. Without sticky sessions, a user who registers on Web01 could be sent to Web02 on their next request and find their account missing. The `ip_hash` directive ensures the same user IP always routes to the same server.

## API Usage

- **RapidAPI Real-Time Product Search:** Free tier allows 100 calls/month. Each search or optimizer item uses 1 call. The optimizer caches results to minimize API usage.
- **Google Gemini:** Free tier with rate limiting. Used only for AI budget advice.

## Security Measures

- API keys stored in `.env` (gitignored, never exposed to frontend)
- All API calls proxied through the server (keys never sent to browser)
- bcrypt password hashing (10 salt rounds)
- JWT tokens with 7-day expiry
- Helmet.js security headers (CSP, X-Frame-Options, etc.)
- Rate limiting: 15 searches/min, 5 AI requests/min, 10 auth attempts/15min
- Input sanitization on all user inputs (HTML tags and special characters stripped)
- XSS protection via textContent-only rendering (no innerHTML with user data)

## Challenges Faced

1. **API Rate Limits:** The free tier of RapidAPI only allows 100 calls/month. We had to create efficient caching in the optimizer to search once per item and generate all combinations from cached data.

2. **API Latency:** The Real-Time Product Search API averages 13 seconds per request. We increased timeouts to 45 seconds and added delays between optimizer searches to avoid failures.

3. **Response Structure:** The API response format changed between endpoints (search vs search-v2). We implemented multiple fallback parsers to handle different response structures.

4. **Budget Constraint Logic:** Initially, the "Balanced" and "Fewest Stores" combinations would exceed the budget. We implemented a greedy budget-aware algorithm that reserves minimum costs for remaining items before selecting each product.

5. **Session Persistence Across Servers:** With two web servers, user data stored in local files would be inconsistent. We solved this with Nginx ip_hash sticky sessions.

6. **CSP and HTTPS:** Helmet.js automatically adds `upgrade-insecure-requests`, which breaks the app on HTTP-only servers. We disabled this directive for deployment.

## Credits

- **RapidAPI** — Real-Time Product Search API for product data
- **Google** — Gemini API for AI budget advice
- **Font Awesome** — Icons
- **Google Fonts** — DM Sans typeface
- **Odaplace** — UI design inspiration

## Author

Apongseh Iyan —  Software Engineer @ALU