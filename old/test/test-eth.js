/*
 * Example to test a deterministic wrapper
 */

fs = require('fs');
nacl = require('./lib/crypto/nacl');
crypto = require('crypto');                   // this supersedes browserify crypto library when code is run in virtual DOM
LZString = require('./lib/crypto/lz-string');
Decimal = require('./lib/crypto/decimal-light'); Decimal.set({ precision: 64 });  // high precision for nonces
//UrlBase64 = require('./crypto/urlbase64');
jsdom = require('jsdom');

//
// first some most often used global functions
//

// we use function 'logger' server-side and browser-side, enabling us to adapt its functionality
logger = function(text) {
  console.log("\n"+text);
}

// easy conversion from Decimal.js integer
fromInt = function(input,factor) {
  f = Number(factor);
  x = new Decimal(String(input));
  return x.times((f>1?'0.'+new Array(f).join('0'):'')+'1');
}

Number.prototype.toFixedSpecial = function(n) {
};

// easy conversion to Decimal.js integer
toInt = function(input,factor) {
  f = Number(factor);
  x = new Decimal(String(input));
  return x.times('1'+(f>1?new Array(f+1).join('0'):''));
}

//
// first we read from the compiled package and activate the code
//

var mode = 'ethereum.token';  // other modes: bitcoinjslib.bitcoin, ethereum, lisk
dcode = String(fs.readFileSync('./modules/deterministic/'+mode.split('.')[0]+'/deterministic.js.lzma'))
//require(LZString.decompressFromEncodedURIComponent(dcode));
var deterministic = activate( LZString.decompressFromEncodedURIComponent(dcode) );

var input = {}

var tx = {
      'ethereum.token': {
        'seed':'correct horse battery staple',                  // seed string for deterministic wallet
        'keys':null,                                            // cryptographic keys (will be generated)
        'source_address':null,                                  // where to transact from (will be generated)
        'target_address':'0x8Bbf8f56ed5C694beF9F0f6D74365D663517E67a',  // where to transact to
        'contract':'0x2f4baef93489b09b5e4b923795361a65a26f55e5',  // smart contract address
        'amount':101012.81006747,                                           // amount to send
        'fee':0.00075,                                          // fee for the miners or the system
        'unspent':{                                             // Bitcoin derived cryptocurrencies need unspents to be able to generate transactions
                    'nonce':'16', // Ethereum needs a nonce, so we in that case add it here into 'unspent requirements' #BETTERSUGGESTION ?
                  },
        'factor':18,                                            // amount of decimals, i.e.: 10^x
      }
    }

if(typeof deterministic!='object' || deterministic=={}) {
  logger('Error: Cannot load deterministic wrapper!');
} else {

  //
  // generate cryptographic keys based on a seed string
  //
  input = { seed: tx[mode].seed }
  var result = deterministic.keys(input);
  tx[mode].keys = result;
  logger('SEED: '+input.seed);

  //
  // produce a public address based on cryptographic keys
  //
  var result = deterministic.address(tx[mode].keys);
  tx[mode].source_address = result;
  logger('PUBLIC ADDRESS: '+result);

  //
  // produce a public address based on cryptographic keys
  //
  logger('CONTRACT ADDRESS: '+tx[mode].contract);

  //
  // create a signed transaction
  //
  input = {
            mode:mode.split('.')[1],
            source:tx[mode].source_address,
            target:tx[mode].target_address,
            amount:toInt(tx[mode].amount,tx[mode].factor),
            fee:toInt(tx[mode].fee,tx[mode].factor),
            factor:tx[mode].factor,
            contract:tx[mode].contract,
            keys:tx[mode].keys,
            seed:tx[mode].seed,
            unspent:tx[mode].unspent
          }

  logger('TRANSACTION INPUT: '+JSON.stringify(input));

  var result = deterministic.transaction(input);
  logger('SIGNED TRANSACTION: '+result);

}

// activate (deterministic) code from a string
function activate(code) {
  if(typeof code == 'string') {
    // interpret deterministic library in a virtual DOM environment
    var { JSDOM } = jsdom;
    var dom = (new JSDOM('', { runScripts: "outside-only" })).window;
    dom.window.nacl = nacl; // inject NACL into virtual DOM
    dom.window.crypto = crypto; // inject nodeJS crypto to supersede crypto-browserify
    dom.window.logger = logger; // inject the logger function into virtual DOM
    dom.eval('var deterministic = (function(){})(); '+code+';'); // init deterministic code
    return dom.window.deterministic;
  } else {
    logger('Error: Cannot activate deterministic code!')
    return function(){};
  }
}
