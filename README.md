---

<h1 align="center">FNBots WhatsApp – Multi-Function Bot</h1>  

---

## Project Architecture Diagram

![flow1](https://github.com/user-attachments/assets/e6b8bbde-7d88-4f10-aae6-34c9ade16f46)
![flow2](https://github.com/user-attachments/assets/bd9a33e3-43ff-417e-9123-44a9efad9d5e)

---

## Project Structure

```
.
├── core/                 # Core engine & bot logic
├── database/             # Database connections & session storage
├── logs/                 # Activity and error logs
├── src/
│   ├── lib/              # Helper libraries & event handlers
│   ├── models/           # MongoDB schemas & models
│   ├── plugins/          # All bot commands (modular plugins)
│   ├── sampah/           # Temporary media storage
│   └── utils/            # Utilities (logger, security, etc.)
├── test/                 # Automated testing files
├── config.js             # Main configuration file
├── ecosystem.config.cjs  # PM2 configuration (deployment)
└── package.json          # Project dependencies
```

---

### Directory Descriptions

* **`core/`**
  The **heart** of the bot. Handles application lifecycle:

  * `connection.js`: WhatsApp connection handling
  * `handler.js`: Message processing logic
  * `client.js`: Custom client functions

* **`database/`**
  Database layer and session storage:

  * `index.js`: MongoDB connection
  * `auth.js`: Stores login sessions
  * `StoreDB.js`: High-performance caching

* **`logs/`**
  Stores **activity logs** (`app_activity.log`) and **Baileys logs** (`baileys.log`) for debugging.

* **`src/lib/`**
  Helper libraries and event handlers (`function.js`, `plugins.js`, `groupParticipantsUpdate.js`).

* **`src/models/`**
  MongoDB schemas and models (e.g., `User.js`, `Group.js`).

* **`src/plugins/`**
  Modular command system. Each folder = command category.

* **`src/sampah/`**
  Temporary media storage for downloaded files before processing.

* **`src/utils/`**
  Utilities like `logger.js`, `security.js`, and `dayjs.js`.

* **`test/`**
  Automated test files to validate features after changes.

* **`config.js`**
  Loads environment variables, owner numbers, bot number, and categories.

* **`ecosystem.config.cjs`**
  PM2 configuration for production deployment.

---

## Core Architecture

1. **Core System** – `client.js`, `connection.js`, `handler.js`, `main.js`
2. **Database Layer** – MongoDB with caching (`StoreDB.js`)
3. **Authentication** – Session management (`auth.js`)
4. **Message Processing** – Message serialization and handling
5. **Plugin System** – Modular command structure
6. **Security** – Bug detection and protection
7. **User Management** – VIP, Premium, daily limits
8. **Group Management** – Admin tools, AFK, mute, ban
9. **Utility Functions** – Media conversion, logging, settings

---

## Key Features

### User Management

* VIP & Premium tiers with expiration dates
* Daily command limits
* Leveling system with XP
* Balance & inventory tracking
* Mute/block functionality
* Master user control

### Group Management

* Welcome/leave/promote/demote messages
* Anti-link, anti-hidetag, anti-tag story
* AFK system with reason & duration tracking
* Per-user warning system
* Group mute & member mute
* Bad word filtering

### Security

* Detects WhatsApp bugs
* Validates JIDs and senders
* Auto-block suspicious users
* Rate limiting & spam protection

### Media Processing

* Convert multiple formats to WebP stickers
* Text-to-Speech and audio format conversion
* EXIF metadata injection for stickers
* Auto-downloads incoming media

### Statistics & Monitoring

* Command usage tracking
* User activity statistics
* Group activity monitoring
* Leaderboards
* Comprehensive logging

### Flexible Configuration

* Auto-polling settings management
* Self/Normal/Maintenance modes
* Remote command & auto-correction
* Whitelist system

---

## Quick Start

### Prerequisites

* **Node.js** ≥ 18
* **npm** or **pnpm** ≥ 8
* **MongoDB** (local or Atlas)
* **Git** ≥ 2.30
* **WhatsApp** account

---

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Terror-Machine/wabot.git
   cd wabot
   ```

2. **Install Dependencies**

   ```bash
   # Using npm
   npm install

   # Or using pnpm
   pnpm install
   ```

3. **Setup Environment Variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and provide:

   * `MONGODB_URI` (local or Atlas)
   * `OWNER_NUMBER` (JSON array of owner number)
   * `BOT_NUMBER` (your bot's number)
   * Set `PAIRING_CODE` to `true` if using pairing code login

4. **Verify Configuration**
   Make sure `config.js` correctly reads values from `.env`.

---

### First Run

1. **Start the Bot**

   ```bash
   npm start
   ```

   Or:

   ```bash
   pnpm start
   ```

2. **Pair or Scan QR Code**

   * If `PAIRING_CODE=false`: Scan the QR code printed in the terminal.
   * If `PAIRING_CODE=true`: Enter the pairing code displayed.

3. **Start Using the Bot**

   * Add the bot to a group or DM it.
   * Test commands like `.help`, `.ping`, etc.

---

### Deployment with PM2

For production:

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 logs
```

---

Made with ❤️ and 💦 by [Terror-Machine](https://github.com/Terror-Machine)

---