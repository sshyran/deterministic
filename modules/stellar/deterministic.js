// (C) 2018 Internet of Coins / Gijs-Jan van Dompseler / Joachim de Koning
// Deterministic encryption wrapper for Stellar

'use strict';

const StellarSdk = require('stellar-sdk');

const wrapper = (
  function () {
    const functions = {
      // create deterministic public and private keys based on a seed
      // https://stellar.github.io/js-stellar-sdk/Keypair.html
      keys : function(data) {
        const seed = Buffer.from(data.seed, 'utf8');
        const hash = window.nacl.to_hex(window.nacl.crypto_hash_sha256(seed));
        const secret = Buffer.from(hash.substr(0,32), 'utf8');
        const keyPair = StellarSdk.Keypair.fromRawEd25519Seed(secret);
        return {publicKey: keyPair.publicKey(), privateKey: keyPair.secret()};
      },

      // generate a unique wallet address from a given public key
      address : function(data) {
        return data.publicKey;
      },

      // return public key
      publickey : function(data) {
        return data.publicKey;
      },

      // return private key
      privatekey : function(data) {
        return data.privateKey;
      },

      transaction: function(data,callback){
        const sequence = data.unspent;
        const source = new StellarSdk.Account(data.source_address, sequence);
        StellarSdk.Network.usePublicNetwork();

        const transaction = new StellarSdk.TransactionBuilder(source)
            .addOperation(StellarSdk.Operation.payment({
              destination: data.target_address,
              amount: String(data.amount),
              asset: StellarSdk.Asset.native()
            }))
            .build();
        const keyPair = StellarSdk.Keypair.fromSecret(data.keys.privateKey);

        transaction.sign(keyPair);
        return transaction.toEnvelope().toXDR('base64').replace(/\//g, '*');
      }
    };
    return functions;
  }
)();

// export the functionality to a pre-prepared const
window.deterministic = wrapper;
