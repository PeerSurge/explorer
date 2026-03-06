# 🚀 PeerSurge Explorer

**Version: 1.8.0**  
*The Next Generation Peercoin Blockchain Explorer*

---

PeerSurge Explorer is the definitive, modern block explorer for Peercoin. Built as a future‑ready, actively maintained fork of the legendary Iquidus Explorer, PeerSurge delivers blazing‑fast blockchain indexing, a clean and intuitive UI, and a robust foundation for Peercoin’s next decade of growth.

Whether you’re a node operator, developer, or Peercoin enthusiast, PeerSurge gives you the clarity, control, and reliability you need to power your blockchain infrastructure with confidence.

---

## ✨ Why PeerSurge?

- **Peercoin-First**: Purpose-built for Peercoin’s unique PoS architecture, with advanced coinstake and reward logic.
- **Modern & Minimal**: Clean code, minimal dependencies, and a future-proof namespace for Peercoin’s ecosystem.
- **Lightning Fast**: Deterministic, efficient indexing for rapid syncs and real-time chain analysis.
- **Actively Maintained**: No legacy baggage—just a clear roadmap and a commitment to Peercoin’s future.
- **Customizable & Extensible**: Ready for your branding, analytics, and infrastructure needs.

---

## 🏁 Quick Start

### Requirements
- **Node.js LTS** (v18+ recommended)
- **MongoDB**
- **Peercoin node** (fully synced, with `txindex=1`)

### Installation
```bash
git clone https://github.com/PeerSurge/explorer
cd explorer
npm install
```

### Configuration
Copy the template and edit for your environment:
```bash
cp settings.json.template settings.json
```
Edit `settings.json` to set your Peercoin node RPC credentials and explorer options.

### Index the Blockchain
```bash
node scripts/sync.js index update
```

### Launch the Explorer
```bash
npm start
```
Visit [http://localhost:3001](http://localhost:3001) to explore your Peercoin blockchain in style!

---

## 🌟 Features at a Glance
- Modern Pug templates for maintainable, beautiful UI
- Peercoin PoS block and coinstake support
- Clean, minimal, and easy to extend
- Fast, deterministic indexing
- PeerSurge branding and ecosystem integration

---

## 🛣️ Roadmap
- Peercoin PoS block enhancements
- Advanced reward and coinstake analytics
- Modern UI/UX improvements
- Optional API and charting modules
- Seamless PeerSurge ecosystem integration

---

## 📦 Versioning
PeerSurge Explorer uses [semantic versioning](https://semver.org/):
- **1.8.0** — First PeerSurge release, based on Iquidus 1.7.x
- Minor versions: new features, non-breaking improvements
- Major versions: breaking changes or architectural upgrades

---

## 🤝 Credits & License
PeerSurge Explorer is a proud, community-driven fork of the original Iquidus Explorer (MIT License). All original credits retained. PeerSurge is MIT-licensed and welcomes contributions from Peercoin’s global community.

---

*Ready to power Peercoin’s future? Join the PeerSurge movement and explore the chain like never before!*
