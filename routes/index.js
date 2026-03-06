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
      if (blockhash == settings.genesis_block) {
        res.render('block', {
          active: 'block',
          block: block,
          block_type: block_type,
          confirmations: settings.confirmations,
          txs: 'GENESIS'
        });
      } else {
        db.get_txs(block, function(txs) {
          if (txs.length > 0) {
            res.render('block', {
              active: 'block',
              block: block,
              block_type: block_type,
              confirmations: settings.confirmations,
              txs: txs
            });
          } else {
            db.create_txs(block, function(){
              db.get_txs(block, function(ntxs) {
                if (ntxs.length > 0) {
                  res.render('block', {
                    active: 'block',
                    block: block,
                    block_type: block_type,
                    confirmations: settings.confirmations,
                    txs: ntxs
                  });
                } else {
                  route_get_index(res, 'Block not found: ' + blockhash);
                }
              // ------------------------------------------------------------
              // Peercoin: Blocks list page with Block Type (PoS / PoW)
              // ------------------------------------------------------------
              router.get('/blocks', function(req, res) {
                var limit = 50; // number of recent blocks to show

                lib.get_blockcount(function(blockcount) {
                  if (blockcount == 'There was an error. Check your console.') {
                    return route_get_index(res, 'Unable to fetch block count');
                  }

                  var blocks = [];

                  function loadBlock(height) {
                    if (blocks.length >= limit || height < 0) {
                      // Done collecting blocks
                      return res.render('blocks', {
                        active: 'blocks',
                        blocks: blocks
                      });
                    }

                    lib.get_blockhash(height, function(hash) {
                      if (hash == 'There was an error. Check your console.') {
                        return loadBlock(height - 1);
                      }

                      lib.get_block(hash, function(block) {
                        if (!block || block == 'There was an error. Check your console.') {
                          return loadBlock(height - 1);
                        }

                        // Derive block type from flags
                        var block_type = 'Unknown';
                        if (block.flags && typeof block.flags === 'string') {
                          if (block.flags.indexOf('proof-of-stake') !== -1) {
                            block_type = 'PoS';
                          } else if (block.flags.indexOf('proof-of-work') !== -1) {
                            block_type = 'PoW';
                          }
                        }

                        blocks.push({
                          height: block.height,
                          hash: block.hash,
                          time: block.time,
                          size: block.size,
                          txs: Array.isArray(block.tx) ? block.tx.length : 0,
                          confirmations: block.confirmations,
                          type: block_type
                        });

                        loadBlock(height - 1);
                      });
                    });
                  }

                  loadBlock(blockcount);
                });
              });
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

router.get('/reward', function(req, res){
  //db.get_stats(settings.coin, function (stats) {
    console.log(stats);
    db.get_heavy(settings.coin, function (heavy) {
      //heavy = heavy;
      var votes = heavy.votes;
      votes.sort(function (a,b) {
        if (a.count < b.count) {
          return -1;
        } else if (a.count > b.count) {
          return 1;
        } else {
          return 0;
        }
      });

      res.render('reward', { active: 'reward', stats: stats, heavy: heavy, votes: heavy.votes });
    });
  //});
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
  lib.get_difficulty(function(diff) {
    lib.get_hashrate(function(hashrate) {
      lib.get_connectioncount(function(connections) {
        lib.get_blockcount(function(blockcount) {
          db.get_stats(settings.coin, function (stats) {
            if (hashrate == 'There was an error. Check your console.') {
              hashrate = 0;
            }

            // Normalize Peercoin difficulty into explicit PoS / PoW fields
            var difficulty_pos = 0;
            var difficulty_pow = 0;

            if (diff && typeof diff === 'object') {
              if (diff['proof-of-stake']) {
                difficulty_pos = parseFloat(diff['proof-of-stake']);
              }
              if (diff['proof-of-work']) {
                difficulty_pow = parseFloat(diff['proof-of-work']);
              }
            } else if (diff) {
              // Fallback: treat single numeric difficulty as PoS difficulty
              difficulty_pos = parseFloat(diff);
            }

            // Clean, Peercoin‑correct summary payload
            res.send({
              data: [{
                difficulty_pos: difficulty_pos,
                difficulty_pow: difficulty_pow,
                hashrate: hashrate,
                supply: stats.supply,
                connections: connections,
                blockcount: blockcount
              }]
            });
          });
        });
      });
    });
  });
});
module.exports = router;
