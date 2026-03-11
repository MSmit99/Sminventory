# SMInventory
<img src="sminventory/public/smiv.jpg" alt="SMInventory Logo" width="80" style="border-radius:10px">

# ![SMInventory](https://img.shields.io/badge/SMInventory-Family%20Inventory%20Manager-2e7d32?style=for-the-badge)

**SMInventory** is a multi-tenant family inventory management app designed to help households track food items, monitor expiration dates, and reduce waste. Built with a clean, responsive interface and real-time sync across all household members.

---

## 📚 Documentation (Coming Soon)

- [Tech Stack](#tech-stack) – Frontend, backend, and libraries used
- [Project Structure](#project-structure) – Directory layout and file organization
- [Installation & Setup](#quick-setup) – How to run the project locally
- [Database Schema](#database-schema) – Supabase tables, RLS policies, and RPCs
- [Features](#features) – All features available in SMInventory

---

## ✨ Features

- **Multi-tenant households** – Create or join a household with an invite code; each household's data is fully isolated via Row Level Security
- **Inventory management** – Add, edit, and delete items with category, location, quantity, unit, expiration date, brand, and notes
- **Expiration tracking** – Items are automatically labeled Fresh, Expiring Soon (≤3 days), or Expired
- **Real-time sync** – Supabase Realtime pushes inventory changes to all household members instantly
- **Grid & list views** – Toggle between a card grid and a sortable table
- **Filtering & search** – Filter by category, location, and status; search by name or brand; sort by expiration, name, or date added
- **Bulk delete** – Select multiple items and remove them in one action
- **Alert banner** – Prominently surfaces items expiring soon or already expired
- **Dark mode** – Fully themed dark/light mode with system preference detection
- **Responsive design** – Mobile-friendly layout with collapsible sidebar

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7 |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime) |
| Styling | Custom CSS (CSS variables, no framework) |
| Fonts | DM Sans, Syne (Google Fonts) |
| Auth | Supabase Auth (email/password) |
| Real-time | Supabase Realtime (postgres_changes) |

---

## 📁 Project Structure

```
sminventory/
├── public/
│   └── smiv.jpg                  # App favicon / logo
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthPage.jsx      # Login & registration UI
│   │   │   └── HouseholdPage.jsx # Create or join a household
│   │   ├── inventory/
│   │   │   ├── InventoryGrid.jsx # Card grid layout
│   │   │   ├── InventoryList.jsx # Table/list layout
│   │   │   ├── ItemCard.jsx      # Single item card
│   │   │   └── ItemRow.jsx       # Single item table row
│   │   ├── layout/
│   │   │   ├── Header.jsx        # Top bar with page title & add button
│   │   │   └── Sidebar.jsx       # Navigation, invite code, user info
│   │   ├── modals/
│   │   │   ├── AddEditModal.jsx  # Add / edit item form
│   │   │   ├── DeleteModal.jsx   # Single-item delete confirmation
│   │   │   └── BulkDeleteModal.jsx
│   │   └── ui/
│   │       ├── AlertBanner.jsx   # Expiration alert strip
│   │       ├── Badge.jsx         # Status / category badge
│   │       ├── FilterBar.jsx     # Search, sort, filter chips
│   │       └── StatCard.jsx      # Summary stat tile
│   ├── constants/
│   │   └── categories.js        # Category, location, unit lists + EMPTY_FORM
│   ├── hooks/
│   │   ├── useAuth.js           # Auth state + sign in/up/out
│   │   ├── useDarkMode.js       # Dark mode toggle + localStorage persistence
│   │   ├── useHousehold.js      # Household + member data
│   │   └── useInventory.js      # Items CRUD + Realtime subscription
│   ├── lib/
│   │   └── supabase.js          # Supabase client initialization
│   ├── utils/
│   │   ├── dateUtils.js         # Date formatting helpers
│   │   └── statusUtils.js       # Expiration status logic
│   ├── App.jsx                  # Root component, layout orchestration
│   ├── index.css                # All styles (CSS variables, components)
│   └── main.jsx                 # React entry point
├── supabase/
│   └── schema.sql               # Full database schema + RLS + RPCs
├── .env                         # Environment variables (not committed)
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## Quick Setup

### Prerequisites

Before starting, ensure you have:
- [Node.js](https://nodejs.org/) v20 or higher
- A [Supabase](https://supabase.com/) account (free tier works)

### 1. Clone & Navigate

```bash
git clone <your-repo-url>
cd sminventory
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com/)
2. In the **SQL Editor**, run the full contents of `supabase/schema.sql`
3. Navigate to **Project Settings → API** and copy your **Project URL** and **anon public** key

### 4. Configure Environment Variables

Create a `.env` file in the `sminventory/` directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Get your credentials:**
- **Project URL & Anon Key**: [Supabase Dashboard → Settings → API](https://app.supabase.com/)

⚠️ **CRITICAL**: Never commit your `.env` file. It is already listed in `.gitignore`.

### 5. Start the Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:5173**

---

## Database Schema

SMInventory uses three Postgres tables managed entirely through Supabase.

### `households`
Stores each family group. Every household gets an auto-generated 8-character invite code valid for 7 days.

### `household_members`
Links users to households with a `role` of `owner` or `member`. Enforces a one-household-per-user constraint. Direct `INSERT` is blocked at the RLS level — all joins go through the `join_household()` RPC.

### `items`
Stores all inventory items scoped to a `household_id`. Includes name, category, quantity, unit, expiration date, location, brand, notes, and who added it.

### Security Model

- **Row Level Security (RLS)** is enabled on all three tables
- A `security definer` helper function `get_my_household_id()` resolves each user's household without causing RLS recursion
- Two RPCs — `create_household()` and `join_household()` — handle household creation and membership server-side, enforcing invite code validation, expiry checks, and a 10-member cap
- A trigger `prevent_membership_tampering()` blocks direct updates to `role`, `household_id`, or `user_id` on the members table

---

## Verify Installation

1. Open **http://localhost:5173**
2. Create an account with email and password
3. Create a household (or join one with an invite code)
4. Add an inventory item and verify it appears in the grid
5. Open a second browser window, sign in with a different account, and join via the invite code — changes should sync in real time

---

## Available Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```