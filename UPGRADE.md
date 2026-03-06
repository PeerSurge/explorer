# Upgrade Guide

This guide describes how to upgrade to PeerSurge Explorer 1.8.0 from previous Iquidus Explorer versions. It also includes a legacy appendix for older upgrade steps.

---

## Upgrading to PeerSurge Explorer 1.8.0

PeerSurge Explorer 1.8.0 is a modernized, Peercoin‑ready fork of Iquidus Explorer. It introduces breaking changes, new requirements, and a new project identity.

### 1. Review Requirements
- **Node.js LTS (v18 recommended)**
- **MongoDB (latest stable recommended)**
- **Peercoin node with `txindex=1` enabled**

### 2. Backup Your Data
- Backup your `settings.json` and MongoDB database before upgrading.

### 3. Update Source Code
- Clone or pull the latest PeerSurge Explorer repository.
- Remove any legacy or unmaintained themes and custom code.

### 4. Update Configuration
- Copy `settings.json.template` to `settings.json` if new options are present.
- Update RPC credentials and Peercoin node details in `settings.json`.
- Review and update any new or changed settings (see template for details).

### 5. Install Dependencies
```bash
npm install
```

### 6. Reindex Database (Recommended)
- For best results and to ensure compatibility, reindex your explorer database:
```bash
node scripts/sync.js index reindex
```

### 7. Start the Explorer
```bash
npm start
```

---

## Notable Breaking Changes
- Project is now Peercoin‑focused; some legacy altcoin/market integrations removed.
- Legacy themes and settings may no longer be supported.
- Configuration file (`settings.json`) may have new or renamed fields.
- Peercoin-specific logic for PoS, coinstake, and rewards is now present.

---

## Legacy Upgrade Steps (Iquidus 1.x)

<details>
<summary>Show legacy upgrade instructions</summary>

### 1.7.3 → 1.7.4
- Ensure that you are not using theme "Paper" or "Readable" as these were not ported by Bootswatch
- Add new settings to settings.json (see settings.json.template):
  - `headerlogo`
  - `display.navbar_dark`
  - `display.navbar_light`
- Run peers script twice after initial upgrade to ensure country codes are added to mongo.

### 1.7.2 → 1.7.3
- Reindex explorerdb (`node --stack-size=15000 scripts/sync.js index reindex`) required for Historical Address Balance
- Add new settings to settings.json (see settings.json.template):
  - `show_market_cap`
  - `show_market_cap_over_price`

### 1.7.1 → 1.7.2
- Add new settings to settings.json (see settings.json.template):
  - `block_parallel_tasks`

### 1.7.0 → 1.7.1
- Nothing required

### 1.6.2 → 1.7.0
- Update node (v12 is advised)
- Update mongodb (4.2.x is advised)
- Change settings in settings.json (see settings.json.template):
  - `wallet.user` → `wallet.username`
  - `wallet.pass` → `wallet.password`

### 1.6.1 → 1.6.2
- Remove `tmp/db_index.pid` (if it exists)
- Add new settings to settings.json (see settings.json.template):
  - `lock_during_index`
  - `use_rpc`
  - `txcount_per_page`
  - `index.txs_per_page`
- Reindex explorerdb (`node --stack-size=15000 scripts/sync.js index reindex`) to build new address TX collection

### 1.6.0 → 1.6.1
- Add new `cryptsy_id` and `hashrate_units` settings (see settings.json.template)
- Remove `tmp/market.pid` (if it exists)

### 1.5.2 → 1.6.0
- Change market settings to new format (see settings.json.template)
- Reindex explorerdb (`node --stack-size=15000 scripts/sync.js index reindex`)

### 1.5.1 → 1.5.2
- Nothing required, coinbase balance / wealth distribution will be fixed in next sync.
  Run `sync.js index check` to force this if required.

### 1.5.0 → 1.5.1
- Optional: Add new `labels` setting to settings.json (see settings.json.template)

### 1.4.1 → 1.5.0
- New database/reindex
- Add new settings to settings.json (see settings.json.template):
  - `theme`
  - `last_txs`

### 1.4.0 → 1.4.1
- New database created with read/write access. See README.
- Add new settings to settings.json (see settings.json.template):
  - `richlist`
  - `logo`

### 1.3.x → 1.4.0
- New database
- Add new settings to settings.json (see settings.json.template):
  - `show_sent_received`
- Note: mintpal support has been dropped, replaced with poloniex. Make sure market settings reflect this (see settings.json.template)

### 1.3.3 → 1.3.4
- Install new dependency (`qr-image`):
  ```bash
  npm install
  ```

### 1.3.2 → 1.3.3
- Restart explorer

### 1.3.1 → 1.3.2
- New database
- Add new settings to settings.json (see settings.json.template):
  - `heavy`
  - `supply`
  - `txcount`

</details>

---

For further help, see the README or open an issue on the PeerSurge Explorer repository.