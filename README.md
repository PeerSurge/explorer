# PeerSurge Explorer

**Version: 1.8.0**

PeerSurge Explorer is a modern, actively maintained continuation of the original Iquidus Explorer.
This fork provides a clean, stable, and future‑oriented foundation for blockchain indexing and chain
analysis, with first‑class support for Peercoin and long‑term maintainability as core design goals.

PeerSurge is built for operators who value clarity, reproducibility, and full control over their
infrastructure. It removes legacy components, modernizes the codebase, and establishes a clean
namespace for future Peercoin‑focused tooling.

---

## ✨ Key Features

- **Modernized Pug template engine**  
  Clean, maintainable templates replacing legacy Jade.

- **Peercoin‑ready architecture**  
  A stable foundation for Peercoin‑specific patches, including PoS block handling, coinstake
  detection, and reward logic.

- **Legacy cleanup**  
  Removal of abandoned exchange integrations, dead markets code, and outdated assumptions from the
  original Iquidus project.

- **Lightweight and maintainable**  
  Minimal dependencies, clear structure, and deterministic indexing behavior.

- **Future‑proof namespace**  
  PeerSurge establishes a clean identity for future infrastructure tools, explorers, and analytics
  components.

---

## 🚀 Getting Started

### Requirements

- Node.js LTS (v18 recommended)  
- MongoDB  
- A fully synced Peercoin node with `txindex=1` enabled  

### Installation

```bash
git clone https://github.com/PeerSurge/explorer
cd explorer
npm install
```

### Configuration

Copy the template and adjust for your environment:

```bash
cp settings.json.template settings.json
```

Set RPC credentials and Peercoin node details inside `settings.json`.

### Running the Indexer

```bash
node scripts/sync.js index update
```

### Starting the Web Server

```bash
npm start
```

The explorer will be available at:

```
http://localhost:3001
```

---

## 🧩 Project Goals

PeerSurge Explorer exists to provide:

- A **clean, modern** codebase free of legacy baggage  
- A **Peercoin‑compatible** explorer foundation  
- A **maintained** alternative to the abandoned upstream  
- A **stable platform** for future PeerSurge infrastructure tools  

This project is not intended to track or merge upstream Iquidus changes.  
PeerSurge is a fully independent fork with its own roadmap and identity.

---

## 🛣️ Roadmap

- Peercoin PoS block enhancements  
- Improved coinstake and reward parsing  
- Modernized UI and layout cleanup  
- Optional API refinements  
- Optional charting and analytics modules  
- PeerSurge branding and ecosystem integration  

---

## 📦 Versioning

PeerSurge Explorer follows semantic versioning:

- **1.8.0** — first PeerSurge release based on the Iquidus 1.7.x lineage  
- Future minor versions will introduce non‑breaking improvements  
- Major versions will be reserved for breaking changes or architectural shifts  

Intended metadata for this release:

```
name: peersurge-explorer
version: 1.8.0
description: PeerSurge Explorer — a modern, Peercoin‑ready continuation of the Iquidus Explorer.
```

---

## 📄 License

PeerSurge Explorer is a maintained fork of the unmaintained Iquidus Explorer project.  
Original code is MIT‑licensed; modifications remain under the same license.
