---

<h1 align="center">FN WHATSAPP BOT</h1> 

---

## Project Architecture Diagram

```mermaid
graph TB
    subgraph Startup
        A[Starting Engine] --> B(Load .env & config.js)
        B --> C(Connect Database)
        C --> D(Initialize Settings Manager)
        D --> E(Load Plugins)
        E --> F(Warm Caches - StoreDB)
        F --> G(Create WA Socket)
        A --> BG(Start Background Processes)
    end

    subgraph Message_Processing_Reaktif
        H(Event: messages.upsert) --> I[updateMessageUpsert]
        I --> J(serializeMessage)
        J --> K{isBug?}
        K -- Yes --> L(Block User & Delete Msg)
        K -- No --> M{isStub?}
        M -- Yes --> N(handleGroupStubMessages.js)
        M -- No --> O{isStatus?}
        O -- Yes --> P(Handle Status Logic)
        O -- No --> AD_Check{isDeleteEvent?}
        AD_Check -- Yes --> AD_Action(Handle Anti-Delete)
        AD_Check -- No --> Q[handler.js - arfine]
    end

    subgraph Command_Execution
        Q --> SM_Check{Self Mode Check}
        SM_Check -- Process --> R(Gather Context)
        SM_Check -- Ignore --> Z(End)
        R --> S{isCmd?}
        S -- No --> GM_Check{isGroup?}
        GM_Check -- Yes --> GM_Action(Group Moderation)
        GM_Check -- No --> Z
        
        S -- Yes --> RC_Check{Remote Command?}
        RC_Check -- Yes --> CCA_Admin{Is SAdmin?}
        CCA_Admin -- Yes --> RC_Action(Change Target Chat)
        CCA_Admin -- No --> Z
        RC_Check -- No --> AS_Check
        RC_Action --> AS_Check
        
        AS_Check{Anti-Flood Check} -- Pass --> T(Find Command in PluginCache)
        AS_Check -- Fail --> Z

        T --> T_Result{Command Found?}
        T_Result -- No --> AC_Check{Auto-Correct?}
        AC_Check -- Suggest --> AC1(Suggest Correction)
        AC_Check -- Auto-run --> T
        AC_Check -- No --> Z
        AC1 --> Z
        
        T_Result -- Yes --> CCA1(Check Limits & Access)
        CCA1 --> CCA2{Lolos?}
        CCA2 -- No --> Z
        CCA2 -- Yes --> CCA3{Is SAdmin?}
        CCA3 -- Yes --> U(Execute Command)
        CCA3 -- No --> CCA4{Role Matches?}
        CCA4 -- Yes --> U
        CCA4 -- No --> Z

        U --> V(Interact with StoreDB Cache)
        V --> V_DB(Database Models)
        V --> W(BOT Response)
        V_DB --> W
    end

    subgraph Background_Processes
        BG1[Interval: Check Expired Users]
        BG2[Cron Job: Cleanup Data]
        BG3[Interval: Poll Settings]
        BG4[Interval: Batch DB Writes]
        BG5[Interval: Listen Plugin Folders]
    end

    G --> H
    GM_Action --> BG1
```

```mermaid
erDiagram
  USER {
    string userId PK
    bool isPremium
    bool isVIP
    bigint balance
    int xp
    int level
    map commandStats
    map inventory
  }

  GROUP {
    string groupId PK
    string groupName
    bool antilink
    bool isMuted
    map warnings
    array afkUsers
  }

  MUTED_MEMBER {
    string groupId FK
    string userId FK
    date expireAt
  }

  COMMAND {
    string name PK
    string category
    int count
    array aliases
  }

  SETTINGS {
    string botName
    bool maintenance
    string selfMode
  }

  WHITELIST {
    string type
    string targetId
  }

  DATABASE_BOT {
    string docId PK
    map chat
    array bacot
    map sticker
  }

  STORE_CONTACT {
    string jid PK
    string name
    string lid
  }

  STORE_GROUP_METADATA {
    string groupId PK
    string subject
    array participants
  }

  STORE_MESSAGES {
    string chatId PK
    array messages
    array conversations
  }

  STORE_STORY {
    string userId PK
    array statuses
  }

  USER ||--o{ STORE_STORY : "posts"
  USER ||--o{ STORE_CONTACT : "has"
  GROUP ||--o{ STORE_GROUP_METADATA : "has"
  GROUP ||--o{ MUTED_MEMBER : "has"
  GROUP ||--o{ STORE_MESSAGES : "contains"
  WHITELIST }o--|| USER : "includes"
  WHITELIST }o--|| GROUP : "includes"
  USER }o--|| COMMAND : "uses"
```

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

4. **Verify Configuration**
   Make sure `config.js` correctly reads values from `.env`.
   
   * Set `usePairingCode` to `true` if using pairing code login

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

   * If `usePairingCode=false`: Scan the QR code printed in the terminal.
   * If `usePairingCode=true`: Enter the pairing code displayed.

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