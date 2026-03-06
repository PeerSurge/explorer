// Simple in-memory cache for expensive RPC calls
const _cache = {};
function cacheWrap(key, ttl, fn) {
  return function(...args) {
    const cb = args[args.length - 1];
    const now = Date.now();
    if (_cache[key] && (now - _cache[key].ts < ttl)) {
      return cb(_cache[key].val);
    }
    fn(...args.slice(0, -1), function(val) {
      _cache[key] = { val, ts: Date.now() };
      cb(val);
    });
  };
}
// Normalize Peercoin PoS vout array: vout[0] is nonstandard, vout[1] is actual reward
function normalize_pos_vout(vout, vin) {
  if (!Array.isArray(vout) || !Array.isArray(vin) || vout.length < 2 || vin.length < 1) return vout;
  // Only normalize if vout[0] is nonstandard and vout[1] has addresses
  if (vout[0].scriptPubKey && vout[0].scriptPubKey.type === 'nonstandard' && vout[1].scriptPubKey && vout[1].scriptPubKey.addresses) {
    // If staking input and output share the same address, adjust reward
    const stakeIn = vin[0].addresses;
    const stakeOut = vout[1].scriptPubKey.addresses[0];
    if (stakeIn && stakeOut && stakeIn === stakeOut) {
      // Clamp negative rewards to zero
      const reward = Math.max(parseFloat(vout[1].value) - parseFloat(vin[0].amount), 0);
      vout[1].reward = reward;
    }
  }
  return vout;
}
// Helper to detect Peercoin coinstake transactions
function is_coinstake(tx) {
  if (!tx || !Array.isArray(tx.vin) || !Array.isArray(tx.vout)) return false;
  if (tx.vin.length === 1 && !tx.vin[0].txid && tx.vout.length >= 2) {
    return true;
  }
  return false;
}

var request = require('request')
  , settings = require('./settings')
  , Address = require('../models/address');

// Resilient RPC wrapper: retries once, logs, returns fallback
async function resilientRpcCall(method, parameters = [], fallback = null) {
  return new Promise((resolve) => {
    let attempt = 0;
    function tryCall() {
      client.command([{ method, parameters }], function (err, response) {
        if (!err && response && response[0] && response[0].name !== 'RpcError') {
          resolve(response[0]);
        } else {
          if (attempt === 0) {
            attempt++;
            console.warn(`[RPC RETRY] ${method} failed, retrying once...`, err || response);
            setTimeout(tryCall, 250);
          } else {
            console.error(`[RPC FAIL] ${method} failed after retry:`, err || response);
            resolve(fallback);
          }
        }
      });
    }
    tryCall();
  });
}

var base_url = 'http://127.0.0.1:' + settings.port + '/api/';

const Client = require('bitcoin-core');
const client = new Client(settings.wallet);


// returns coinbase total sent as current coin supply
function coinbase_supply(cb) {
  Address.findOne({a_id: 'coinbase'}, function(err, address) {
    if (address) {
      return cb(address.sent);
    } else {
      return cb(0);
    }
  });
}

function rpcCommand(params, cb) {
  client.command([{method: params[0].method, parameters: params[0].parameters}], function(err, response){
    if(err){console.log('Error: ', err); }
    else{
      if(response[0].name == 'RpcError'){
        return cb('There was an error. Check your console.');
      }
      return cb(response[0]);
    }
  });
}

module.exports = {

  convert_to_satoshi: function(amount, cb) {
    // fix to 8dp & convert to string
    var fixed = amount.toFixed(8).toString(); 
    // remove decimal (.) and return integer 
    return cb(parseInt(fixed.replace('.', '')));
  },

  get_hashrate: cacheWrap('hashrate', 60000, function(cb) {
    if (settings.index.show_hashrate == false) return cb('-');
    if (settings.use_rpc) {
      (async () => {
        if (settings.nethash == 'netmhashps') {
          const response = await resilientRpcCall('getmininginfo', [], '-');
          if (!response || response === '-' || !response.netmhashps) return cb('-');
          let netmhashps = parseFloat(response.netmhashps);
          if (settings.nethash_units == 'K') return cb((netmhashps * 1000).toFixed(4));
          if (settings.nethash_units == 'G') return cb((netmhashps / 1000).toFixed(4));
          if (settings.nethash_units == 'H') return cb((netmhashps * 1000000).toFixed(4));
          if (settings.nethash_units == 'T') return cb((netmhashps / 1000000).toFixed(4));
          if (settings.nethash_units == 'P') return cb((netmhashps / 1000000000).toFixed(4));
          return cb(netmhashps.toFixed(4));
        } else {
          const response = await resilientRpcCall('getnetworkhashps', [], '-');
          if (response === '-') return cb('-');
          let val = parseFloat(response);
          if (settings.nethash_units == 'K') return cb((val / 1000).toFixed(4));
          if (settings.nethash_units == 'M') return cb((val / 1000000).toFixed(4));
          if (settings.nethash_units == 'G') return cb((val / 1000000000).toFixed(4));
          if (settings.nethash_units == 'T') return cb((val / 1000000000000).toFixed(4));
          if (settings.nethash_units == 'P') return cb((val / 1000000000000000).toFixed(4));
          return cb(val.toFixed(4));
        }
      })();
    } else {
      if (settings.nethash == 'netmhashps') {
        var uri = base_url + 'getmininginfo';
        request({uri: uri, json: true}, function (error, response, body) { //returned in mhash
          if (body.netmhashps) {
            if (settings.nethash_units == 'K') {
              return cb((body.netmhashps * 1000).toFixed(4));
            } else if (settings.nethash_units == 'G') {
              return cb((body.netmhashps / 1000).toFixed(4));
            } else if (settings.nethash_units == 'H') {
              return cb((body.netmhashps * 1000000).toFixed(4));
            } else if (settings.nethash_units == 'T') {
              return cb((body.netmhashps / 1000000).toFixed(4));
            } else if (settings.nethash_units == 'P') {
              return cb((body.netmhashps / 1000000000).toFixed(4));
            } else {
              return cb(body.netmhashps.toFixed(4));
            }
          } else {
            return cb('-');
          }
        });
      } else {
        var uri = base_url + 'getnetworkhashps';
        request({uri: uri, json: true}, function (error, response, body) {
          if (body == 'There was an error. Check your console.') {
            return cb('-');
          } else {
            if (settings.nethash_units == 'K') {
              return cb((body / 1000).toFixed(4));
            } else if (settings.nethash_units == 'M'){
              return cb((body / 1000000).toFixed(4));
            } else if (settings.nethash_units == 'G') {
              return cb((body / 1000000000).toFixed(4));
            } else if (settings.nethash_units == 'T') {
              return cb((body / 1000000000000).toFixed(4));
            } else if (settings.nethash_units == 'P') {
              return cb((body / 1000000000000000).toFixed(4));
            } else {
              return cb((body).toFixed(4));
            }
          }
        });
      }
    }
  },


  get_difficulty: cacheWrap('difficulty', 60000, function(cb) {
    if (settings.use_rpc) {
      (async () => {
        const response = await resilientRpcCall('getdifficulty', [], '-');
        if (typeof response === 'object' && (response['proof-of-stake'] !== undefined || response['proof-of-work'] !== undefined)) {
          return cb(response);
        } else {
          return cb(response);
        }
      })();
    } else {
      var uri = base_url + 'getdifficulty';
      request({uri: uri, json: true}, function (error, response, body) {
        return cb(body);
      });
    }
  }),

  get_connectioncount: function(cb) {
    if (settings.use_rpc) {
      (async () => {
        const response = await resilientRpcCall('getconnectioncount', [], '-');
        return cb(response);
      })();
    } else {
      var uri = base_url + 'getconnectioncount';
      request({uri: uri, json: true}, function (error, response, body) {
        return cb(body);
      });
    }
  },

  get_blockcount: cacheWrap('blockcount', 60000, function(cb) {
    if (settings.use_rpc) {
      (async () => {
        const response = await resilientRpcCall('getblockcount', [], '-1');
        return cb(parseInt(response));
      })();
    } else {
      var uri = base_url + 'getblockcount';
      request({uri: uri, json: true}, function (error, response, body) {
        return cb(parseInt(body));
      });
    }
  }),

  get_blockhash: function(height, cb) {
    if (settings.use_rpc) {
      (async () => {
        const response = await resilientRpcCall('getblockhash', [parseInt(height)], '-');
        return cb(response);
      })();
    } else {
      var uri = base_url + 'getblockhash?height=' + height;
      request({uri: uri, json: true}, function (error, response, body) {
        return cb(body);
      });
    }
  },

  get_block: function(hash, cb) {
    if (settings.use_rpc) {
      (async () => {
        const response = await resilientRpcCall('getblock', [hash], null);
        if (response) {
          if (typeof response.height === 'string') response.height = parseInt(response.height);
          if (typeof response.difficulty === 'string') response.difficulty = parseFloat(response.difficulty);
          if (typeof response.reward === 'undefined') response.reward = 0;
          if (!Array.isArray(response.tx)) response.tx = response.tx ? [response.tx] : [];
        }
        return cb(response);
      })();
    } else {
      var uri = base_url + 'getblock?hash=' + hash;
      request({uri: uri, json: true}, function (error, response, body) {
        if (body) {
          if (typeof body.height === 'string') body.height = parseInt(body.height);
          if (typeof body.difficulty === 'string') body.difficulty = parseFloat(body.difficulty);
          if (typeof body.reward === 'undefined') body.reward = 0;
          if (!Array.isArray(body.tx)) body.tx = body.tx ? [body.tx] : [];
        }
        return cb(body);
      });
    }
  },

  get_rawtransaction: function(hash, cb) {
    if (settings.use_rpc) {
      (async () => {
        const response = await resilientRpcCall('getrawtransaction', [hash, 1], null);
        if (response) {
          response.isCoinStake = is_coinstake(response);
        }
        return cb(response);
      })();
    } else {
      var uri = base_url + 'getrawtransaction?txid=' + hash + '&decrypt=1';
      request({uri: uri, json: true}, function (error, response, body) {
        if (body) {
          body.isCoinStake = is_coinstake(body);
        }
        return cb(body);
      });
    }
  },

  get_maxmoney: function(cb) {
    if (settings.use_rpc) {
      (async () => {
        const response = await resilientRpcCall('getmaxmoney', [], '-');
        return cb(response);
      })();
    } else {
      var uri = base_url + 'getmaxmoney';
      request({uri: uri, json: true}, function (error, response, body) {
        return cb(body);
      });
    }
  },
 
  // synchonous loop used to interate through an array, 
  // avoid use unless absolutely neccessary
  syncLoop: function(iterations, process, exit){
    var index = 0,
        done = false,
        shouldExit = false;
    var loop = {
      next:function(){
          if(done){
              if(shouldExit && exit){
                  exit(); // Exit if we're done
              }
              return; // Stop the loop if we're done
          }
          // If we're not finished
          if(index < iterations){
              index++; // Increment our index
              if (index % 100 === 0) { //clear stack
                setTimeout(function() {
                  process(loop); // Run our process, pass in the loop
                }, 1);
              } else {
                 process(loop); // Run our process, pass in the loop
              }
          // Otherwise we're done
          } else {
              done = true; // Make sure we say we're done
              if(exit) exit(); // Call the callback on exit
          }
      },
      iteration:function(){
          return index - 1; // Return the loop number we're on
      },
      break:function(end){
          done = true; // End the loop
          shouldExit = end; // Passing end as true means we still call the exit callback
      }
    };
    loop.next();
    return loop;
  },

  balance_supply: function(cb) {
    Address.find({}, 'balance').where('balance').gt(0).exec(function(err, docs) { 
      var count = 0;
      module.exports.syncLoop(docs.length, function (loop) {
        var i = loop.iteration();
        count = count + docs[i].balance;
        loop.next();
      }, function(){
        return cb(count);
      });
    });
  },

  get_supply: cacheWrap('supply', 60000, function(cb) {
    // Always use gettxoutsetinfo.total_amount for Peercoin supply
    if (settings.use_rpc) {
      (async () => {
        const response = await resilientRpcCall('gettxoutsetinfo', [], null);
        if (response && response.total_amount !== undefined) {
          return cb(parseFloat(response.total_amount));
        } else {
          return cb(0);
        }
      })();
    } else {
      var uri = base_url + 'gettxoutsetinfo';
      request({uri: uri, json: true}, function (error, response, body) {
        return cb(parseFloat(body.total_amount));
      });
    }
  }),

  is_unique: function(array, object, cb) {
    var unique = true;
    var index = null;
    module.exports.syncLoop(array.length, function (loop) {
      var i = loop.iteration();
      if (array[i].addresses == object) {
        unique = false;
        index = i;
        loop.break(true);
        loop.next();
      } else {
        loop.next();
      }
    }, function(){
      return cb(unique, index);
    });
  },

  calculate_total: function(vout, cb) {
    var total = 0;
    module.exports.syncLoop(vout.length, function (loop) {
      var i = loop.iteration();
      //module.exports.convert_to_satoshi(parseFloat(vout[i].amount), function(amount_sat){
        total = total + vout[i].amount;
        loop.next();
      //});
    }, function(){
      return cb(total);
    });
  },

  prepare_vout: function(vout, txid, vin, cb) {
    // Normalize Peercoin PoS vout before processing
    vout = normalize_pos_vout(vout, vin);
    var arr_vout = [];
    var arr_vin = vin;
    module.exports.syncLoop(vout.length, function (loop) {
      var i = loop.iteration();
      // Only process vout with addresses and not nulldata
      if (vout[i].scriptPubKey && vout[i].scriptPubKey.type !== 'nulldata' && vout[i].scriptPubKey.addresses) {
        module.exports.is_unique(arr_vout, vout[i].scriptPubKey.addresses[0], function(unique, index) {
          if (unique) {
            module.exports.convert_to_satoshi(parseFloat(vout[i].value), function(amount_sat){
              arr_vout.push({addresses: vout[i].scriptPubKey.addresses[0], amount: amount_sat});
              loop.next();
            });
          } else {
            module.exports.convert_to_satoshi(parseFloat(vout[i].value), function(amount_sat){
              arr_vout[index].amount = arr_vout[index].amount + amount_sat;
              loop.next();
            });
          }
        });
      } else {
        loop.next();
      }
    }, function(){
      return cb(arr_vout, arr_vin);
    });
  },

  get_input_addresses: function(input, vout, cb) {
    var addresses = [];
    if (input.coinbase) {
      var amount = 0;
      module.exports.syncLoop(vout.length, function (loop) {
        var i = loop.iteration();
          amount = amount + parseFloat(vout[i].value);  
          loop.next();
      }, function(){
        addresses.push({hash: 'coinbase', amount: amount});
        return cb(addresses);
      });
    } else {
      module.exports.get_rawtransaction(input.txid, function(tx){
        if (tx) {
          module.exports.syncLoop(tx.vout.length, function (loop) {
            var i = loop.iteration();
            if (tx.vout[i].n == input.vout) {
              //module.exports.convert_to_satoshi(parseFloat(tx.vout[i].value), function(amount_sat){
              if (tx.vout[i].scriptPubKey.addresses) {
                addresses.push({hash: tx.vout[i].scriptPubKey.addresses[0], amount:tx.vout[i].value});  
              }
                loop.break(true);
                loop.next();
              //});
            } else {
              loop.next();
            } 
          }, function(){
            return cb(addresses);
          });
        } else {
          return cb();
        }
      });
    }
  },

  prepare_vin: function(tx, cb) {
    var arr_vin = [];
    module.exports.syncLoop(tx.vin.length, function (loop) {
      var i = loop.iteration();
      module.exports.get_input_addresses(tx.vin[i], tx.vout, function(addresses){
        if (addresses && addresses.length) {
          //console.log('vin');
          module.exports.is_unique(arr_vin, addresses[0].hash, function(unique, index) {
            if (unique == true) {
              module.exports.convert_to_satoshi(parseFloat(addresses[0].amount), function(amount_sat){
                arr_vin.push({addresses:addresses[0].hash, amount:amount_sat});
                loop.next();
              });
            } else {
              module.exports.convert_to_satoshi(parseFloat(addresses[0].amount), function(amount_sat){
                arr_vin[index].amount = arr_vin[index].amount + amount_sat;
                loop.next();
              });
            }
          });
        } else {
          loop.next();
        }
      });
    }, function(){
      return cb(arr_vin);
    });
  }
};
