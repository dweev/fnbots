-----

<h1 align="center"\>FN WHATSAPP BOT</h1\>

-----

## About The Project

  * **This is an independent project and is NOT affiliated, endorsed, or supported by WhatsApp or Meta Platforms. using [Baileys](https://www.npmjs.com/package/baileys) library from the [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) GitHub repository.**

### Core Philosophies

  * **Performance**: Heavy, blocking tasks (media processing, image generation, web scraping) are offloaded to a separate pool of worker threads, ensuring the main application remains non-blocking and highly responsive.
  * **Stability**: The application is designed for high uptime with self-healing capabilities, including memory monitoring, connection health checks, and a graceful restart manager that prevents infinite crash loops.
  * **Modularity**: A file-based plugin system allows for easy addition and hot-reloading of commands without restarting the entire application, streamlining development and maintenance.

-----

## Architecture

### Workflow Diagram

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

### Database Schema

```mermaid
classDiagram
  direction LR

  class Settings {
    +String botName
    +String botNumber (from pairing)
    +String rname (prefix)
    +String sname (prefix)
    +String packName (dataExif)
    +String packAuthor (dataExif)
    +String packID (dataExif)
    +String self (mode)
    +string pinoLogger
    +string autocommand
    +string groupIdentity
    +string linkIdendity
    +string restartId
    +Boolean restartState
    +Boolean maintenance
    +Boolean autojoin
    +Boolean changer
    +Boolean filter
    +Boolean chatbot
    +Boolean autosticker
    +Boolean antideleted
    +Boolean verify
    +Boolean autoreadsw
    +Boolean autolikestory
    +Boolean autoread
    +Boolean autodownload
    +Boolean anticall
    +Number autocorrect
    +Number totalHitCOunt
    +Number limitCount
    +Number limitGame
    +Number limitCountPrem
    +Number memberLimit
    +Array~String~ sAdmin
  }
  note for Settings "Singleton document for global bot config"

  class User {
    +String userId
    +Boolean isMaster
    +Boolean isVIP
    +Boolean isPremium
    +Boolean gacha
    +Date premiumExpired
    +String balance (BigInt)
    +Number xp
    +Number level
    +Number userCount
    +Object limit
    +Object limitgame
    +Map inventory
    +Map commandStats
    +addBalance(amount)
    +addXp(amount)
    +Array~Object~ mutedUser
  }

  class Group {
    +String groupId
    +String groupName
    +Object welcome
    +Object leave
    +Boolean antilink
    +Boolean antiHidetag
    +Boolean antiTagStory
    +Boolean verifyMember
    +Boolean isActive
    +Boolean isMuted
    +Boolean filter
    +Date lasActivity
    +number commandCount
    +Number messageCount
    +Number memberCount
    +Map dailyStats
    +Object warnings
    +Array afkUsers
    +Array bannedMembers
    +Array~String~ filterWords
  }

  class Command {
    +String name
    +Number count
    +String description
    +String category
    +Array~String~ aliases
    +Boolean isLimitCommand
    +Boolean isLimitGameCommand
    +Boolean isCommandWithoutPayment
  }
  
  class DatabaseBot {
    +String docId
    +Map~String, String~ chat
    +Array~String~ bacot
    +getDatabase()
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
    +String verifiedName
  }
  
  class StoreGroupMetadata {
    +String groupId
    +String subject
    +String owner
    +Array~Participant~ participants
  }
  note for StoreGroupMetadata "object data same as Baileys"
  
  class StoreMessages {
    +String chatId
    +Array~Mixed~ messages
    +Array~Conversation~ conversations
    +Map presences
  }
  
  class StoreStory {
    +String userId
    +Array~Mixed~ statuses
  }

  class OTPSession {
    +String userId
    +String groupId
    +String otp
    +Number attempts
    +Date expireAt
    +Boolean isBlocked
  }
  
  class Whitelist {
    +String type ('group' or 'user')
    +String targetId
  }

  Settings "1" -- "0" User : Lists memberShip
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

-----

## Project Structure

The directory structure is designed for a clear separation of concerns, making the codebase clean and maintainable.

```
.
├── core/                  # Core engine & main bot logic flow
├── database/              # DB connection, session management & cache layer
├── logs/                  # Activity and error log files
├── src/
│   ├── function/          # Collection of feature-specific utility functions
│   ├── handler/           # Handlers for non-command features (e.g., auto-sticker)
│   ├── lib/               # Core libraries & business logic (plugin loader, performance)
│   ├── models/            # MongoDB (Mongoose) schemas & models
│   ├── plugins/           # All bot commands (highly modular)
│   ├── sampah/            # Managed temporary file storage
│   ├── utils/             # General utilities (security, scrapers, external scripts)
│   └── worker/            # Async worker system for heavy tasks (FFMPEG, Canvas)
├── .env.example           # Environment variable template
├── config.js              # Main configuration file
├── install.sh             # Automated server setup script
├── update.sh              # Python dependency update script
├── ecosystem.config.cjs   # PM2 configuration for deployment
└── package.json           # Project dependencies
```

-----

## Requirements

### Software

  * **Node.js**: `v20.x` or higher
  * **MongoDB**: `v5.0` or higher (local or Atlas)
  * **Git**
  * **FFMPEG**: **Required** for all media processing (stickers, audio filters).
  * **Python**: `v3.12` recommended.
      * **Python Libraries**: `rembg` (for background removal), `yt-dlp`, `google-generativeai`, and other dependencies listed in `install.sh`.
  * A valid **WhatsApp** account.

### Hardware (VPS/Server)

The resource requirements are higher than a standard bot due to heavy processing features.

  * **Recommended (Production)**:

      * **CPU**: **4 vCores** or more
      * **RAM**: **8 GB** or more
      * **Storage**: **80 GB+ SSD/NVMe**
      * **OS**: Ubuntu 22.04 LTS or a similar Linux distribution.

  * **Minimal (Testing/Low-Load)**:

      * **CPU**: 2 vCores
      * **RAM**: 4 GB
      * **Storage**: 50 GB SSD/NVMe

> **Note**: Running features like Instagram scraping (`Playwright`) and parallel media processing (`FFMPEG`, `Canvas`) is very resource-intensive. Using specs below the recommended values may lead to slow response times and instability.

-----

## Quick Start

### Installation

The easiest way to set up is by using the `install.sh` script on a fresh Ubuntu server.

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/Terror-Machine/wabot.git
    cd wabot
    ```

2.  **Setup Environment Variables**

    ```bash
    cp .env.example .env
    ```

    Open and edit the `.env` file, filling in all required values:

      * `MONGODB_URI`: Your MongoDB connection string.
      * `OWNER_NUMBER`: JSON array of owner numbers (e.g., `["12025550101"]`).
      * `GEMINI_API_KEY`: For generative AI features. **(Optional)** 

3.  **Run the Automatic Setup Script**
    Execute the `install.sh` script to automatically install all system dependencies, Node.js, Python, and project dependencies.

    ```bash
    sudo bash install.sh
    ```

### Running the Bot

1.  **Start with Pairing Code (Recommended)**
    Use the `pair` script to log in with a pairing code. The bot will prompt you for your bot's phone number.

    ```bash
    npm run pair
    ```

2.  **Start with QR Code**
    If you prefer to use a QR code, ensure `usePairingCode` is `false` in `config.js` and run:

    ```bash
    npm start
    ```

    Scan the QR code that appears in your terminal.

-----

### Production Deployment

For production environments, using PM2 is highly recommended for process management and auto-restarts. The `install.sh` script already installs it globally.

```bash
# Start the application with PM2
pm2 start ecosystem.config.cjs

# Monitor logs
pm2 logs
```

-----

Made with ❤️ and 💦 by [Terror-Machine](https://github.com/Terror-Machine)

-----