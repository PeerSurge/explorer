# Changelog

All notable changes to PeerSurge Explorer and its Iquidus legacy are documented here.

---

## 1.8.0 (2026-03-06) – PeerSurge Modernization
- Project renamed to **PeerSurge Explorer**; new branding and identity
- Modernized documentation and README
- Cleaned up legacy code and removed abandoned exchange integrations
- Established Peercoin‑ready architecture: PoS block support, coinstake detection, reward logic
- Updated to latest Node.js LTS and MongoDB recommendations
- Improved maintainability, deterministic indexing, and code clarity
- Dropped support for unmaintained themes and outdated dependencies
- Set foundation for future Peercoin‑focused infrastructure

---

## 1.7.4
- Updated themes to Bootstrap 4.5 by using latest Bootswatch themes
- Deleted unmaintained themes that were never ported to Bootstrap4
- New setting to optionally show a logo in the navbar header: `headerlogo`
- New settings to switch between default, dark and light boostswatch navbars: `display.navbar_dark` and `display.navbar_light`
- Added flag icons to network view.

## 1.7.3
- Fixes for Historical Address Balance - seems to be fastest method that works along-side parallel indexing
- New settings to optionally show market cap in header: `show_market_cap` and `show_market_cap_over_price`

## 1.7.2
- Index blocks in parallel - uses settings for task counts.
- Indexing is much faster (again).
- New settings to adjust parallel task counts: `block_parallel_tasks`

## 1.7.1
- Added "claim address" system - allows users to label addresses by signing messages

## 1.7.0
- Various updated dependencies & node version
- Switched from Jade to Pug
- Updated required mongo version

## 1.6.2
- Indexing is now MUCH faster.
- Added AddressTX model/collection - **REQUIRES REINDEX**
- Added balance history to Address TX History
- Added support for AJAX loading of Address TX History, using `txcount` setting for loading
- Stopped maximum TX count trimming TX's in AddressTX collection
- Removed `tx_array` from Address collection → AddressTX
- Fix mismatching balances/sent/received, negative balances etc
- Added new file lock during database indexing: `tmp/db_index.pid`
- New setting to lock during indexing: `lock_during_index`
- Add setting to call bitcoin-core directly or use RPC during indexing

## 1.6.1
- Fixed `last_txs` setting
- Added `hashrate_units` setting
- Added cryptsy support (markets)
- Removed market update lockfile

## 1.6.0
- Fixed negative/incorrect balance due to sending to yourself (Issues #6, #8)
- Pages found via search now display full url
- Markets backend overhaul/rewrite
- Added Yobit support (markets)
- Added Empoex support (markets)
- Layout redesign
- Layout data (coin supply, connections etc) now fetched via ajax
- Dynamic table data on main view (ajax, updates every 30 seconds)

## 1.5.2
- Fix poloniex href (xCore)
- Added links (xCore)
- Coinbase balance fix (xCore)
- Getaddress balance fix
- Added `getbalance` api call
- Finalized `getlasttxs` api call
- Added footer logo

## 1.5.1
- Added labels setting (address labels)

## 1.5.0
- Added theme setting to `settings.json`
- Added bootswatch themes
- New extended api call (`getlasttxs`)
- Index page now shows last x transactions instead of only last block
- Added `last_txs` settings to `settings.json`
- Mobile fixes
- `OP_RETURN`/type=nulldata crash fix
- PoS fixes
- Search tx confirmation fix
- Search tx blockcount fix
- Address page redesign

## 1.4.1
- Added user and password to database settings
- Mongo authentication
- Added alert (index not up-to-date)
- New richlist configuration settings
- Added `npm stop` to kill cluster
- Added logo setting

## 1.4.0
- Removed mintpal support (markets)
- Added poloniex support (markets)
- Cluster support
- Jasmine test scripts
- `getaddress` api fix (address not found)
- Base 2 rounding fix (values stored in satoshis)
- DRK fixes
- New current supply setting: `BALANCES`
- Sync fixes/optimizations
- New setting: `show_sent_received`

## 1.3.4
- Added qrcode api
- Added qrcode to address page

## 1.3.3
- Wealth Distribution stats & charts (richlist)
- New locale settings (richlist)
- Extended api
- `getmoneysupply` (api)
- `getaddress` (api)
- `getdistribution` (api)
- Negative zero balance fix (address)

## 1.3.2
- HeavyCoin support
- New heavy setting (`heavy`)
- New rewards page (`heavy`)
- Current coin supply (coinbase total sent, `getinfo.moneysupply`, `getsupply` (heavy))
- New supply setting (`supply`)
- New txcount setting
- Address txs segfault fix
- Indexing optimizations
- DOS address page fix

## 1.3.1
- Rich Lists/Top 100
- PoS fixes
- UI fixes
- Coinbase address segfault fix
- Performance tweaks

## 1.3.0
- Merged `blocknotify.js` and `markets.js` into `sync.js`
- Added update and check timeout settings
- Local tx index
- Input addresses/amounts
- Unixtime format (now human friendly date/time)
- Fixed genesis crash
- Added genesis settings
- Local address index
- New address view
- Search by address

## 1.2.1
- Updated locale (markets)
- Updated index view
- Updated tx view
- Updated block view
- Added optional search to navbar
- Added confirmations setting
- Added screenshots

## 1.2.0
- Added jqplot and datatables
- New markets page
- Added mintpal support (markets)
- Added bittrex support (markets)
- New display setting (markets, twitter)
- New locale entries (markets)
- New settings (markets, api)
- Added icons to nav (explorer, markets, api, loading, twitter)
- New twitter setting

## 1.1.0
- Fixed navbar title (was not reading from settings)
- Added locale support (and updated views)
- New display setting to toggle menu items (api)

## 1.0.0
- Initial release