---

<h1 align="center">FN WHATSAPP BOT</h1> 

---

## Architecture & Features

**FNBOT** is a multifunctional WhatsApp bot platform built with **Baileys**. This project is designed with robust modular architecture, with primary focus on **performance, security,** and **ease** of feature addition.

```mermaid
graph TD
  subgraph "Phase 1: Startup & Initialization"
    A[Start Application main.js] --> B(1. Load Configuration);
    B --> C(2. Connect to MongoDB Database);
    C --> D{DB Connected?};
    D -- Success --> E(3. Initialize Settings Cache);
    D -- Error --> ERR1[Exit Process];
    E --> F(4. Load All Commands to pluginCache);
    F --> G(5. Initialize Fuzzy Search);
    G --> H(6. Wrap Socket with Helpers);
    H --> I(7. Create WA Socket & Start Connection);
    A --> BG(Initialize Background Processes);
  end

  subgraph "Phase 2: Connection Handling"
    I --> J{Event: connection.update};
    J -- connecting --> OD[First Login?];
    OD -- Yes --> K[Display QR / Pairing Code];
    K --> J;
    OD -- No --> OO[Wait Connection];
    OO --> J;
    J -- open --> N[Connection Successful];
    J -- close --> L[Connection Closed];
    L --> M{Auto Restart?};
    M -- Yes --> I;
    M -- No --> ERR2[Shutdown];
    N --> O[Synchronize Groups];
    O --> P(BOT READY TO RECEIVE MESSAGES);
  end

  subgraph "Phase 3: Message Processing"
    P --> Q(Event: messages.upsert);
    Q --> R[1. Normalize Message];
    R --> S{2. Security Check};
    S -- Dangerous --> T[Block & Delete Message];
    S -- Safe --> U{3. Special Message Type?};
    
    U -- Group Event --> V{Welcome/Leave Event?};
    V -- Yes --> V1[Send Welcome/Goodbye Message];
    V1 --> AT;
    V -- No --> P;
    
    U -- Status Update --> W{Status Update?};
    W -- Yes --> W1[Process Status Logic];
    W1 --> P;
    W -- No --> P;
    
    U -- Deleted Message --> X{Anti-Delete Active?};
    X -- Yes --> X1[Send Delete Notification];
    X1 --> AT;
    X -- No --> P;
    
    U -- Regular Message --> Y[Main Handler];
  end

  subgraph "Phase 4: Logic & Command Execution"
    Y --> Z(4. Gather Context);
    Z --> AA{5. Check Bot Mode};
    AA -- Ignore --> TERM(End Cycle);
    AA -- Process --> AB{6. Command?};
    
    AB -- No --> AC_ROUTER{Group Moderation & Auto Features};
      AC_ROUTER -- Moderation --> AC_MOD{Run Group Moderation};
      AC_MOD -- Need Response --> AT;
      AC_MOD -- No Need --> P;
      
      AC_ROUTER -- Check Next --> AC1{AutoSticker?};
      AC1 -- Yes --> AC2[Process to Sticker];
      AC2 --> AT;
      AC1 -- No --> AC3{AutoJoin?};
      AC3 -- Yes --> AC4[Process Group Join];
      AC4 --> AT;
      AC3 -- No --> AC5{Chatbot?};
      AC5 -- Yes --> AC6[Reply Message from DB];
      AC6 --> AT;
      AC5 -- No --> AC7[Auto Changer?];
      AC7 -- Yes --> AC8[Process Audio Change];
      AC8 --> AT;
      AC7 -- No --> AC9[Auto Download?];
      AC9 -- Yes --> AC10[Process Download];
      AC10 --> AT;
      AC9 -- No --> AC11[Other Auto Features];
      AC11 --> P;
    
    AB -- Yes --> AD(7. Parse Command);
    
    AD --> AE{Remote Command?};
    AE -- No --> AF[Continue Normal];
    AE -- Yes --> AG{SAdmin?};
    AG -- No --> TERM;
    AG -- Yes --> AH[Process Remote];
    AH --> AF;
    
    AF --> AI{8. Cooldown?};
    AI -- Yes --> AJ[Warn User];
    AJ --> TERM;
    AI -- No --> AK[Set Cooldown];
    
    AK --> AL(9. Search in pluginCache);
    AL --> AM{Found?};
    AM -- No --> AN[10. Fuzzy Correction];
    AN --> AL;
    AM -- Yes --> AO[11. Check Access & Limit];
    AO --> AP{Allowed?};
    AP -- No --> AQ[Send Error];
    AP -- Yes --> AR[12. EXECUTE];
    
    AR --> AS[13. Update Stats & DB];
    AS --> AT[14. Send Response];
  end

    subgraph "Background Processes"
        BG --> BA[Cron Jobs];
        BG --> BB[Cache Sync];
        BG --> BC[Batch DB Writes];
        BG --> BD[File Watcher];
        
        BA --> BA1[Reset Daily Limits];
        BA --> BA2[Clean Expired Users];
        BB --> BB1[Sync Settings];
        BC --> BC1[Bulk Operations];
        BD --> BD1[Hot-Reload Plugins];
    end

  P --> Q;
  BG --> P;
  AT --> P;
  TERM --> P;
  AQ --> P;
  
  ERR1 --> EXIT[Application Exit];
  ERR2 --> EXIT;
```

```mermaid
classDiagram
  direction LR

  class Settings {
    +String botName
    +String rname (prefix)
    +Boolean maintenance
    +String self (mode)
    +Number limitCount
    +Number limitGame
    +Array~String~ sAdmin
    +getSettings()
  }
  note for Settings "Singleton document for global bot config"

  class User {
    +String userId
    +Boolean isMaster
    +Boolean isPremium
    +Boolean isVIP
    +Date premiumExpired
    +String balance (BigInt)
    +Number xp
    +Number level
    +Object limit
    +Object limitgame
    +Map commandStats
    +addBalance(amount)
    +addXp(amount)
    +isLimit()
  }

  class Group {
    +String groupId
    +String groupName
    +Object welcome
    +Object leave
    +Boolean antilink
    +Boolean antiHidetag
    +Object warnings
    +Array afkUsers
    +Array bannedMembers
    +addWarning(userId)
    +addAfkUser(userId, reason)
  }

  class Command {
    +String name
    +String category
    +Number count
    +Array~String~ aliases
    +Boolean isLimitCommand
    +findOrCreate(name, category)
    +updateCount(commandName)
  }
  
  class DatabaseBot {
    +String docId
    +Map~String, String~ chat
    +Array~String~ bacot
    +getDatabase()
    +addChat(keyword, reply)
  }
  note for DatabaseBot "Singleton for chatbot & media responses"
  
  class Media {
    +String name
    +String type
    +Buffer data
  }
  
  class BaileysSession {
    +String key
    +Mixed value
  }
  note for BaileysSession "Key-value store for Baileys auth credentials"
  
  class StoreContact {
    +String jid
    +String lid
    +String name
    +String notify
  }
  
  class StoreGroupMetadata {
    +String groupId
    +String subject
    +String owner
    +Array~Participant~ participants
  }
  
  class StoreMessages {
    +String chatId
    +Array~Mixed~ messages
    +Array~Conversation~ conversations
    +addMessage(chatId, msg)
  }
  
  class StoreStory {
    +String userId
    +Array~Mixed~ statuses
    +addStatus(userId, status)
  }

  class OTPSession {
    +String userId
    +String groupId
    +String otp
    +Number attempts
    +Date expireAt
    +createSession(userId, groupId, otp)
    +verifyOTP(userId, otp)
  }
  
  class Whitelist {
    +String type ('group' or 'user')
    +String targetId
    +isWhitelisted(targetId)
  }

  Settings "1" -- "0" User : Lists SAdmins
  User "1" -- "0" OTPSession : Can have OTP session
  Group "1" -- "0" OTPSession : Is target for OTP
  User "1" -- "1" StoreStory : Has status updates
  Group "1" -- "1" StoreGroupMetadata : Has metadata
  User "1" -- "0" Group : Implicitly related via afkUsers, bannedMembers, etc.
  
  StoreGroupMetadata "1" -- "0" StoreContact : Participants are contacts
  StoreMessages ..> User : `chatId` can be a User JID
  StoreMessages ..> Group : `chatId` can be a Group JID
  
  DatabaseBot "1" -- "0" Media : Can link to media responses
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
│   ├── media/            # Media utility
│   ├── models/           # MongoDB schemas & models
│   ├── plugins/          # All bot commands (modular plugins)
│   ├── sampah/           # Temporary media storage
│   ├── utils/            # Utilities (logger, security, etc.)
│   └── worker/           # Async Worker for heavy process.
├── test/                 # Automated testing files
├── config.js             # Main configuration file
├── ecosystem.config.cjs  # PM2 configuration (deployment)
└── package.json          # Project dependencies
```

---

### Directory Structure

The directory structure is designed to separate each concern, making the codebase clean and maintainable.

* `core/`
    * **Heart** of the bot that handles application lifecycle and core processing logic.
    * `main.js`: **Main application entry point.** Initializes all modules and starts connection.
    * `connection.js`: Handles connection, authentication (QR/Pairing Code), and Baileys connection events.
    * `handler.js`: **Message processing brain.** Receives normalized messages and routes them to plugins or automatic features.
    * `client.js`: Collection of wrapper functions to simplify Baileys interactions (e.g., `sendMessage`, `getMediaBuffer`).

* `database/`
    * Data layer, schemas, and session management.
    * `connection/index.js`: Manages MongoDB connection with retry logic.
    * `auth.js`: Schema and logic for storing Baileys login sessions in MongoDB.
    * `StoreDB.js`: **High-performance caching layer** between bot and database for faster data reads.
    * `index.js`: Exports all database models and connections for easy imports.

* `logs/`
    * Stores **application activity logs** (`app_activity.log`) and **internal Baileys logs** (`baileys.log`) for debugging.

* `src/lib/`
    * **Core Libraries & Business Logic.** Contains main helper functions and event handlers.
    * `function.js`: Collection of global utility functions (media conversion, fuzzy search, etc.).
    * `plugins.js`: Plugin system manager, responsible for loading, reloading, and caching commands.
    * `watcherPlugins.js`: Monitors plugin directory for **hot-reloading** feature (reload plugins without restarting bot).
    * `groupParticipantsUpdate.js`: Specialized handler for group member events (join/leave/promote/demote).
    * `serializeMessage.js`: Critical module that normalizes various Baileys message formats into one consistent `m` object.

* `src/models/`
    * **Mongoose** schema and model definitions for each database collection (e.g., `User.js`, `Group.js`, `Settings.js`).

* `src/plugins/`
    * **Modular command system.** Each subfolder here is a command category, and each `.js` file is a single command.

* `src/sampah/`
    * Temporary media storage directory for files downloaded or created before being sent or processed.

* `src/utils/`
    * Smaller, more specific supporting utility modules.
    * `dayjs.js`: Custom configuration for date and time management.
    * `errorManager.js`: Custom error definitions for better error handling.
    * `security.js`: Functions to detect dangerous messages or WhatsApp "bugs".

* `src/worker/`
    * **Async Workers.** Runs heavy CPU-intensive tasks in separate threads to keep bot responsive.
    * `sticker_worker.js`: Handles image/video to sticker conversion.
    * `audio_changer_worker.js`: Processes and modifies audio files.

* `config.js`
    * Main configuration file that loads environment variables (`.env`), owner numbers, and performance parameters.

* `ecosystem.config.cjs`
    * **PM2** configuration for production deployment, managing restarts and monitoring.

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