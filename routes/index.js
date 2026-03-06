// API: Sync status indicator
router.get('/api/sync-status', async function(req, res) {
  const lib = require('../lib/explorer');
  const Stats = require('../models/stats');
  let explorerBlock = null;
  let rpcBlock = null;
  let diff = null;
  let percent = null;
  // Get explorer block (last indexed)
  try {
    const stats = await Stats.findOne({coin: require('../lib/settings').coin});
    if (stats && typeof stats.last === 'number') {
      explorerBlock = stats.last;
    }
  } catch (e) {
    explorerBlock = null;
  }
  // Get RPC block
  await new Promise(resolve => {
    lib.get_blockcount(function(count) {
      rpcBlock = (typeof count === 'number') ? count : null;
      resolve();
    });
  });
  if (explorerBlock !== null && rpcBlock !== null && rpcBlock > 0) {
    diff = rpcBlock - explorerBlock;
    percent = ((explorerBlock / rpcBlock) * 100).toFixed(2);
  }
  res.json({
    explorer_block: explorerBlock,
    rpc_block: rpcBlock,
    difference: diff,
    percent_synced: percent
  });
});
// API: Explorer version, commit hash, Peercoin RPC version
router.get('/api/version', async function(req, res) {
  const lib = require('../lib/explorer');
  const fs = require('fs');
  // Get explorer version from package.json
  let explorerVersion = null;
  try {
    const pkg = JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8'));
    explorerVersion = pkg.version;
  } catch (e) {
    explorerVersion = null;
  }
  // Get commit hash from .git/HEAD and .git/refs/heads/*
  let commitHash = null;
  try {
    const headPath = __dirname + '/../.git/HEAD';
    const head = fs.readFileSync(headPath, 'utf8').trim();
    if (head.startsWith('ref:')) {
      const ref = head.split(' ')[1];
      const refPath = __dirname + '/../.git/' + ref;
      commitHash = fs.readFileSync(refPath, 'utf8').trim();
    } else {
      commitHash = head;
    }
  } catch (e) {
    commitHash = null;
  }
  // Get Peercoin RPC version
  let rpcinfo = await lib.resilientRpcCall('getrpcinfo', [], {});
  let peercoinRpcVersion = rpcinfo && rpcinfo.version ? rpcinfo.version : null;
  res.json({
    explorer_version: explorerVersion,
    commit_hash: commitHash,
    peercoin_rpc_version: peercoinRpcVersion
  });
});
// Mempool page for Peercoin
router.get('/mempool', async function(req, res) {
  const lib = require('../lib/explorer');
  // Get mempool info and txids
  let mempoolInfo = await lib.resilientRpcCall('getmempoolinfo', [], {});
  let mempoolTxids = await lib.resilientRpcCall('getrawmempool', [true], []);
  // Compose mempool data
  let txList = [];
  let totalSize = 0;
  let totalFee = 0;
  if (Array.isArray(mempoolTxids)) {
    // Old-style: just txids
    txList = mempoolTxids.map(txid => ({ txid, size: '-', fee: '-', feerate: '-' }));
  } else if (typeof mempoolTxids === 'object' && mempoolTxids !== null) {
    // New-style: verbose
    txList = Object.entries(mempoolTxids).map(([txid, info]) => {
      let feerate = (info.fee && info.size) ? (info.fee / info.size).toFixed(8) : '-';
      totalSize += info.size || 0;
      totalFee += info.fee || 0;
      return { txid, size: info.size || '-', fee: info.fee || '-', feerate };
    });
  }
  // Fallback to mempoolInfo size if needed
  if (!totalSize && mempoolInfo && mempoolInfo.bytes) totalSize = mempoolInfo.bytes;
  res.render('mempool', {
    mempool: {
      count: mempoolInfo.size || txList.length,
      totalSize,
      txList,
      totalFee,
    }
  });
});
// Chain Parameters page for developers
router.get('/chain-parameters', async function(req, res) {
  const lib = require('../lib/explorer');
  // Use resilient RPC calls for each parameter
  let params = await lib.resilientRpcCall('getchainparams', [], {});
  let maxmoney = await lib.resilientRpcCall('getmaxmoney', [], '-');
  // Fallbacks for older Peercoin nodes
  if (!params || typeof params.target_spacing === 'undefined') {
    params = {};
  }
  // Compose parameters object
  const chainParams = {
    target_spacing: params.target_spacing || '-',
    target_timespan: params.target_timespan || '-',
    max_money: maxmoney || '-',
    stake_min_age: params.stake_min_age || '-',
    stake_min_depth: params.stake_min_depth || '-',
  };
  res.render('chain_parameters', { chainParams });
});
// Node Info page for operators
router.get('/node-info', async function(req, res) {
  const lib = require('../lib/explorer');
  // Use resilient RPC calls for each field
  let rpcinfo = await lib.resilientRpcCall('getrpcinfo', [], {});
  let peercoininfo = await lib.resilientRpcCall('getinfo', [], {});
  let uptime = await lib.resilientRpcCall('uptime', [], null);
  // Fallbacks for older Peercoin nodes
  if (!rpcinfo || typeof rpcinfo.version === 'undefined') {
    rpcinfo = {};
  }
  if (!peercoininfo || typeof peercoininfo.version === 'undefined') {
    peercoininfo = {};
  }
  // Compose info object
  const nodeInfo = {
    rpc_version: rpcinfo.version || '-',
    peercoin_version: peercoininfo.version || '-',
    protocol_version: peercoininfo.protocolversion || '-',
    wallet_version: peercoininfo.walletversion || '-',
    uptime: uptime || '-',
  };
  res.render('node_info', { nodeInfo });
});
// Peercoin Staking Activity Analytics
router.get('/staking-activity', async function(req, res) {
  const lib = require('../lib/explorer');
  const numBlocks = 500;
  lib.get_blockcount(async function(blockcount) {
    let heights = [];
    for (let h = blockcount - 1; h >= Math.max(0, blockcount - numBlocks); h--) {
      heights.push(h);
    }
    let blocks = [];
    let processed = 0;
    if (heights.length === 0) return res.render('staking_activity', { blocks: [], stats: {} });
    for (let idx = 0; idx < heights.length; idx++) {
      await new Promise(resolve => {
        lib.get_blockhash(heights[idx], function(hash) {
          if (hash && hash !== 'There was an error. Check your console.') {
            lib.get_block(hash, function(block) {
              let block_type = 'Unknown';
              if (block && block.flags) {
                if (block.flags.toLowerCase().includes('proof-of-stake')) {
                  block_type = 'PoS';
                } else if (block.flags.toLowerCase().includes('proof-of-work')) {
                  block_type = 'PoW';
                }
              }
              blocks[idx] = {
                height: block.height,
                hash: block.hash,
                block_type: block_type,
                tx_count: block.tx ? block.tx.length : 0,
                size: block.size,
                time: block.time,
                stake_weight: block.stakeweight || null
              };
              processed++;
              resolve();
            });
          } else {
            processed++;
            resolve();
          }
        });
      });
    }
    // Analytics
    const now = Math.floor(Date.now() / 1000);
    let posBlocks = blocks.filter(b => b && b.block_type === 'PoS');
    let powBlocks = blocks.filter(b => b && b.block_type === 'PoW');
    let posPerHour = posBlocks.length / ((blocks[0].time - blocks[blocks.length-1].time) / 3600);
    let powPerDay = powBlocks.length / ((blocks[0].time - blocks[blocks.length-1].time) / 86400);
    let stakeWeights = posBlocks.map(b => b.stake_weight).filter(w => w);
    let avgStakeWeight = stakeWeights.length ? (stakeWeights.reduce((a,b) => a+b,0) / stakeWeights.length) : null;
    let posTimes = posBlocks.map(b => b.time);
    let posIntervals = posTimes.slice(1).map((t,i) => t - posTimes[i]);
    let avgPosInterval = posIntervals.length ? (posIntervals.reduce((a,b) => a+b,0) / posIntervals.length) : null;
    res.render('staking_activity', {
      blocks,
      stats: {
        posPerHour,
        powPerDay,
        avgStakeWeight,
        avgPosInterval,
        posCount: posBlocks.length,
        powCount: powBlocks.length,
        sampleSize: blocks.length
      }
    });
  });
});
// Visible richlist delta view
router.get('/richlist/delta/view', async function(req, res) {
  const Address = require('../models/address');
  const now = Date.now();
  try {
    const rich = await Address.find({}).sort({ balance: -1 }).limit(100);
    const deltas = rich.map(addr => {
      let delta24h = 0, delta7d = 0, delta30d = 0;
      if (Array.isArray(addr.balance_history)) {
        const bNow = addr.balance;
        const b24h = addr.balance_history.find(b => now - b.ts < 86400000);
        const b7d = addr.balance_history.find(b => now - b.ts < 604800000);
        const b30d = addr.balance_history.find(b => now - b.ts < 2592000000);
        delta24h = b24h ? bNow - b24h.balance : 0;
        delta7d = b7d ? bNow - b7d.balance : 0;
        delta30d = b30d ? bNow - b30d.balance : 0;
      }
      return {
        a_id: addr.a_id,
        balance: addr.balance,
        delta24h,
        delta7d,
        delta30d
      };
    });
    res.render('richlist_delta', { deltas });
  } catch (e) {
    res.render('error', { error: 'Database error.', details: e.message });
  }
});
// Richlist delta analytics view
router.get('/richlist/delta', async function(req, res) {
  const Address = require('../models/address');
  const now = Date.now();
  // Assume balance_history is an array of { ts, balance } in each Address (requires periodic snapshotting)
  try {
    const rich = await Address.find({}).sort({ balance: -1 }).limit(100);
    const deltas = rich.map(addr => {
      let delta24h = 0, delta7d = 0, delta30d = 0;
      if (Array.isArray(addr.balance_history)) {
        const bNow = addr.balance;
        const b24h = addr.balance_history.find(b => now - b.ts < 86400000);
        const b7d = addr.balance_history.find(b => now - b.ts < 604800000);
        const b30d = addr.balance_history.find(b => now - b.ts < 2592000000);
        delta24h = b24h ? bNow - b24h.balance : 0;
        delta7d = b7d ? bNow - b7d.balance : 0;
        delta30d = b30d ? bNow - b30d.balance : 0;
      }
      return {
        a_id: addr.a_id,
        balance: addr.balance,
        delta24h,
        delta7d,
        delta30d
      };
    });
    res.json({ count: deltas.length, deltas });
  } catch (e) {
    res.status(500).json({ error: 'Database error.', details: e.message });
  }
});
// Search by address prefix for wallet debugging and chain analysis
router.get('/search', async function(req, res) {
  const prefix = req.query.prefix;
  if (!prefix || typeof prefix !== 'string' || prefix.length < 2) {
    return res.status(400).json({ error: 'Missing or invalid prefix parameter.' });
  }
  const Address = require('../models/address');
  try {
    // Limit results for safety, e.g. max 100
    const matches = await Address.find({ a_id: { $regex: '^' + prefix } }).limit(100);
    res.json({ prefix, count: matches.length, addresses: matches });
  } catch (e) {
    res.status(500).json({ error: 'Database error.', details: e.message });
  }
});
// Raw block JSON view for developers
router.get('/block/:hash/raw', function(req, res) {
  lib.get_block(req.params.hash, function(rawblock) {
    if (!rawblock || rawblock === 'There was an error. Check your console.') {
      return res.status(404).json({ error: 'Block not found or RPC error.' });
    }
    res.json(rawblock);
  });
});
// Raw transaction JSON view for developers
router.get('/tx/:txid/raw', function(req, res) {
  lib.get_rawtransaction(req.params.txid, function(rawtx) {
    if (!rawtx || rawtx === 'There was an error. Check your console.') {
      return res.status(404).json({ error: 'Transaction not found or RPC error.' });
    }
    res.json(rawtx);
  });
});
// Health check endpoint for monitoring
router.get('/health', async function(req, res) {
  // Check RPC connectivity
  let rpc_ok = false;
  let mongo_ok = false;
  let sync_ok = false;
  // Check RPC: try getblockcount
  await new Promise(resolve => {
    lib.get_blockcount(function(count) {
      rpc_ok = (typeof count === 'number' && count > 0);
      resolve();
    });
  });
  // Check MongoDB: try to count Address documents
  try {
    const Address = require('../models/address');
    const count = await Address.countDocuments();
    mongo_ok = (typeof count === 'number');
  } catch (e) {
    mongo_ok = false;
  }
  // Explorer sync status: check if last indexed block matches RPC blockcount
  let explorer_height = null;
  let rpc_height = null;
  await new Promise(resolve => {
    lib.get_blockcount(function(count) {
      rpc_height = count;
      resolve();
    });
  });
  const Stats = require('../models/stats');
  try {
    const stats = await Stats.findOne({coin: require('../lib/settings').coin});
    if (stats && typeof stats.last === 'number') {
      explorer_height = stats.last;
      sync_ok = (explorer_height === rpc_height);
    }
  } catch (e) {
    sync_ok = false;
  }
  res.json({
    rpc: rpc_ok,
    mongo: mongo_ok,
    explorer_synced: sync_ok,
    explorer_height,
    rpc_height
  });
});
// 12C — Add /blocks route: latest 50 blocks with block type
router.get('/blocks', function(req, res) {
  const perPage = 50;
  const page = Math.max(parseInt(req.query.page || '1'), 1);
  lib.get_blockcount(function(blockcount) {
    const maxPage = Math.ceil(blockcount / perPage);
    const start = blockcount - ((page - 1) * perPage) - 1;
    const end = Math.max(start - perPage + 1, 0);
    let heights = [];
    for (let h = start; h >= end; h--) {
      if (h >= 0) heights.push(h);
    }
    let blocks = [];
    let processed = 0;
    if (heights.length === 0) return res.render('blocks', { blocks: [], page, maxPage });
    heights.forEach(function(height, idx) {
      lib.get_blockhash(height, function(hash) {
        if (hash && hash !== 'There was an error. Check your console.') {
          lib.get_block(hash, function(block) {
            let block_type = 'Unknown';
            if (block && block.flags) {
              if (block.flags.toLowerCase().includes('proof-of-stake')) {
                block_type = 'PoS';
              } else if (block.flags.toLowerCase().includes('proof-of-work')) {
                block_type = 'PoW';
              }
            }
            blocks[idx] = {
              height: block.height,
              hash: block.hash,
              block_type: block_type,
              tx_count: block.tx ? block.tx.length : 0,
              size: block.size,
              time: block.time
            };
            processed++;
            if (processed === heights.length) {
              blocks = blocks.filter(Boolean).sort((a, b) => b.height - a.height);
              res.render('blocks', { blocks, page, maxPage });
            }
          });
        } else {
          processed++;
          if (processed === heights.length) {
            blocks = blocks.filter(Boolean).sort((a, b) => b.height - a.height);
            res.render('blocks', { blocks, page, maxPage });
          }
        }
      });
    });
  });
});
var express = require('express')
    , router = express.Router()
    , settings = require('../lib/settings')
    , locale = require('../lib/locale')
    , db = require('../lib/database')
    , lib = require('../lib/explorer')
    , qr = require('qr-image');

function route_get_block(res, blockhash) {
  lib.get_block(blockhash, function (block) {
    if (block != 'There was an error. Check your console.') {
      // 12A: Compute block_type from block.flags
      let block_type = 'Unknown';
      if (block && block.flags) {
        if (block.flags.toLowerCase().includes('proof-of-stake')) {
          block_type = 'PoS';
        } else if (block.flags.toLowerCase().includes('proof-of-work')) {
          block_type = 'PoW';
        }
      }
      if (blockhash == settings.genesis_block) {
        res.render('block', { active: 'block', block: block, confirmations: settings.confirmations, txs: 'GENESIS', block_type });
      } else {
        db.get_txs(block, function(txs) {
          if (txs.length > 0) {
            res.render('block', { active: 'block', block: block, confirmations: settings.confirmations, txs: txs, block_type });
          } else {
            db.create_txs(block, function(){
              db.get_txs(block, function(ntxs) {
                if (ntxs.length > 0) {
                  res.render('block', { active: 'block', block: block, confirmations: settings.confirmations, txs: ntxs, block_type });
                } else {
                  route_get_index(res, 'Block not found: ' + blockhash);
                }
              });
            });
          }
        });
      }
    } else {
      if (!isNaN(blockhash)) {
        var height = blockhash;
        lib.get_blockhash(height, function(hash) {
          if (hash != 'There was an error. Check your console.') {
            res.redirect('/block/' + hash);
          } else {
            route_get_index(res, 'Block not found: ' + blockhash);
          }
        });
      } else {
        route_get_index(res, 'Block not found: ' + blockhash);
      }
    }
  });
}
/* GET functions */

function route_get_tx(res, txid) {
  if (txid == settings.genesis_tx) {
    route_get_block(res, settings.genesis_block);
  } else {
    db.get_tx(txid, function(tx) {
      if (tx) {
        lib.get_blockcount(function(blockcount) {
          res.render('tx', { active: 'tx', tx: tx, confirmations: settings.confirmations, blockcount: blockcount});
        });
      }
      else {
        lib.get_rawtransaction(txid, function(rtx) {
          if (rtx.txid) {
            lib.prepare_vin(rtx, function(vin) {
              lib.prepare_vout(rtx.vout, rtx.txid, vin, function(rvout, rvin) {
                lib.calculate_total(rvout, function(total){
                  if (!rtx.confirmations > 0) {
                    var utx = {
                      txid: rtx.txid,
                      vin: rvin,
                      vout: rvout,
                      total: total.toFixed(8),
                      timestamp: rtx.time,
                      blockhash: '-',
                      blockindex: -1,
                    };
                    res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount:-1});
                  } else {
                    var utx = {
                      txid: rtx.txid,
                      vin: rvin,
                      vout: rvout,
                      total: total.toFixed(8),
                      timestamp: rtx.time,
                      blockhash: rtx.blockhash,
                      blockindex: rtx.blockheight,
                    };
                    lib.get_blockcount(function(blockcount) {
                      res.render('tx', { active: 'tx', tx: utx, confirmations: settings.confirmations, blockcount: blockcount});
                    });
                  }
                });
              });
            });
          } else {
            route_get_index(res, null);
          }
        });
      }
    });
  }
}

function route_get_index(res, error) {
  db.is_locked(function(locked) {
    if (locked) {
      res.render('index', { active: 'home', error: error, warning: locale.initial_index_alert});
    } else {
      res.render('index', { active: 'home', error: error, warning: null});
    }
  });
}

function route_get_address(res, hash, count) {
  db.get_address(hash, function(address) {
    if (address) {
      var txs = [];
      res.render('address', { active: 'address', address: address, txs: txs});
    } else {
      route_get_index(res, hash + ' not found');
    }
  });
}

function route_get_claim_form(res, hash){
  db.get_address(hash, function(address) {
    if (address) {
      res.render("claim_address", { active: "address", address: address});
    } else {
      route_get_index(res, hash + ' not found');
    }
  });
}

/* GET home page. */
router.get('/', function(req, res) {
  route_get_index(res, null);
});

router.get('/info', function(req, res) {
  res.render('info', { active: 'info', address: settings.address, hashes: settings.api });
});

router.get('/markets/:market', function(req, res) {
  var market = req.params['market'];
  if (settings.markets.enabled.indexOf(market) != -1) {
    db.get_market(market, function(data) {
      /*if (market === 'bittrex') {
        data = JSON.parse(data);
      }*/
      // console.log(data);
      res.render('./markets/' + market, {
        active: 'markets',
        marketdata: {
          coin: settings.markets.coin,
          exchange: settings.markets.exchange,
          data: data,
        },
        market: market
      });
    });
  } else {
    route_get_index(res, null);
  }
});

router.get('/richlist', function(req, res) {
  if (settings.display.richlist == true ) {
    db.get_stats(settings.coin, function (stats) {
      db.get_richlist(settings.coin, function(richlist){
        //console.log(richlist);
        if (richlist) {
          db.get_distribution(richlist, stats, function(distribution) {
            //console.log(distribution);
            res.render('richlist', {
              active: 'richlist',
              balance: richlist.balance,
              received: richlist.received,
              stats: stats,
              dista: distribution.t_1_25,
              distb: distribution.t_26_50,
              distc: distribution.t_51_75,
              distd: distribution.t_76_100,
              diste: distribution.t_101plus,
              show_dist: settings.richlist.distribution,
              show_received: settings.richlist.received,
              show_balance: settings.richlist.balance,
            });
          });
        } else {
          route_get_index(res, null);
        }
      });
    });
  } else {
    route_get_index(res, null);
  }
});

router.get('/movement', function(req, res) {
  res.render('movement', {active: 'movement', flaga: settings.movement.low_flag, flagb: settings.movement.high_flag, min_amount:settings.movement.min_amount});
});

router.get('/network', function(req, res) {
  res.render('network', {active: 'network'});
});



router.get('/tx/:txid', function(req, res) {
  route_get_tx(res, req.params.txid);
});

router.get('/block/:hash', function(req, res) {
  route_get_block(res, req.params.hash);
});

router.get('/address/:hash/claim', function(req,res){
  route_get_claim_form(res, req.params.hash);
});

router.get('/address/:hash', function(req, res) {
  route_get_address(res, req.params.hash, settings.txcount);
});

router.get('/address/:hash/:count', function(req, res) {
  route_get_address(res, req.params.hash, req.params.count);
});

router.post('/search', function(req, res) {
  var query = req.body.search;
  if (query.length == 64) {
    if (query == settings.genesis_tx) {
      res.redirect('/block/' + settings.genesis_block);
    } else {
      db.get_tx(query, function(tx) {
        if (tx) {
          res.redirect('/tx/' +tx.txid);
        } else {
          lib.get_block(query, function(block) {
            if (block != 'There was an error. Check your console.') {
              res.redirect('/block/' + query);
            } else {
              route_get_index(res, locale.ex_search_error + query );
            }
          });
        }
      });
    }
  } else {
    db.get_address(query, function(address) {
      if (address) {
        res.redirect('/address/' + address.a_id);
      } else {
        lib.get_blockhash(query, function(hash) {
          if (hash != 'There was an error. Check your console.') {
            res.redirect('/block/' + hash);
          } else {
            route_get_index(res, locale.ex_search_error + query );
          }
        });
      }
    });
  }
});

router.get('/qr/:string', function(req, res) {
  if (req.params.string) {
    var address = qr.image(req.params.string, {
      type: 'png',
      size: 4,
      margin: 1,
      ec_level: 'M'
    });
    res.type('png');
    address.pipe(res);
  }
});

router.get('/ext/summary', function(req, res) {
  lib.get_difficulty(function(difficulty) {
    // Peercoin returns an object with proof-of-stake and proof-of-work
    var difficulty_pos = (difficulty && difficulty['proof-of-stake'] !== undefined) ? difficulty['proof-of-stake'] : null;
    var difficulty_pow = (difficulty && difficulty['proof-of-work'] !== undefined) ? difficulty['proof-of-work'] : null;
    lib.get_hashrate(function(hashrate) {
      lib.get_connectioncount(function(connections){
        lib.get_blockcount(function(blockcount) {
          db.get_stats(settings.coin, function (stats) {
            res.send({ data: [{
              difficulty_pos: difficulty_pos,
              difficulty_pow: difficulty_pow,
              hashrate: hashrate,
              supply: stats.supply,
              connections: connections,
              blockcount: blockcount
            }]});
          });
        });
      });
    });
  });
});
module.exports = router;
