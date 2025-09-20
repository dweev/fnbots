---

<h1 align="center">FNBots WhatsApp – Multi-Function Bot</h1>  

---

## Structure

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
  The **heart** of the bot. Contains the main files managing the application lifecycle, including `connection.js` (connection handling), `handler.js` (message processing), and `client.js` (custom client functions).

* **`database/`**
  Manages everything related to the **database**.

  * `index.js`: Handles the main MongoDB connection.
  * `auth.js`: Stores login sessions.
  * `StoreDB.js`: Provides a high-performance caching layer for frequently accessed data.

* **`logs/`**
  Automatically stores all **activity logs** (`app_activity.log`) and internal Baileys logs (`baileys.log`). Essential for debugging and error tracking.

* **`src/lib/`**
  A collection of **helper libraries** and logic modules. Contains reusable functions (`function.js`), plugin loader (`plugins.js`), and event-specific handlers like `groupParticipantsUpdate.js`.

* **`src/models/`**
  Contains all **data schemas** for MongoDB collections. Each file (e.g., `User.js`, `Group.js`) defines both the structure and business logic of its respective data.

* **`src/plugins/`**
  The **center of all bot commands**. Each subfolder represents a command category, making the bot highly modular and easy to extend or modify.

* **`src/sampah/`**
  A **temporary working directory** for storing downloaded media (images, videos, stickers) before processing or sending them back.

* **`src/utils/`**
  A set of **technical utilities** that support the entire application, such as logger configuration (`logger.js`), message security checks (`security.js`), and time utilities (`dayjs.js`).

* **`test/`**
  Contains all files for **automated testing**, ensuring each part of the bot works correctly after code changes.

* **`config.js`**
  The **main configuration file** for storing critical variables such as the MongoDB URI, owner numbers, and other sensitive settings.

* **`ecosystem.config.cjs`**
  The **PM2 configuration file**, used to keep the bot running reliably on a server and automatically restart it in case of a crash.

---

Made with ❤️ and 💦 by [Terror-Machine](https://github.com/Terror-Machine)

---