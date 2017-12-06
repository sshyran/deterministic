// (C) 2017 Internet of Coins / Joachim de Koning
// hybridd module - ethereum/deterministic.js
// Deterministic encryption wrapper for Ethereum

var wrapper = (
	function() {

    // encode ABI smart contract calls
    // call it by explicitly specifying the variables you want to pass along
    //
    // EXAMPLES:
    //            encode({ 'func':'balanceOf(address):(uint256)', 'vars':['target'], 'target':data.target });
    //            encode({ 'func':'transfer(address,uint256):(uint256)', 'vars':['target','amount'], 'target':data.target,'amount':'0x'+parseInt(data.amount).toString(16) });
    function encode(data) {
      return '0x'+( new Function( 'wrapperlib','data', 'return wrapperlib.ethABI.simpleEncode(data.func,data.'+data.vars.join(',data.')+');' ) )(wrapperlib,data).toString('hex');
    }

		var functions = {
          
			// create deterministic public and private keys based on a seed
			keys : function(data) {
        var privateKey = wrapperlib.ethUtil.sha256(data.seed);
        return {privateKey:privateKey};
			},

      // generate a unique wallet address from a given public key
      address : function(data) {
        var publicKey = wrapperlib.ethUtil.privateToPublic(data.privateKey);
        return '0x'+wrapperlib.ethUtil.publicToAddress(publicKey).toString('hex');
      },

      // create and sign a transaction
			transaction : function(data) {
        if(data.mode!='token') {
          var txParams = {                                          // optional-> data: payloadData
            nonce: '0x'+parseInt(data.unspent.nonce).toString(16),  // nonce
            gasPrice: '0x'+parseInt(data.fee/21000).toString(16),   // we use toString(16) here to specify HEX radix
            gasLimit: '0x'+parseInt(21000).toString(16),            //  but don't use it elsewhere
            to: data.target,                                        // send it to ...
            value: '0x'+parseInt(data.amount).toString(16)          // the amount to send
          };
        } else {
          var encoded = encode({ 'func':'transfer(address,uint256):(bool)','vars':['target','amount'],'target':data.target,'amount':'0x'+parseInt(data.amount).toString(16) }); // returns the encoded binary (as a Buffer) data to be sent
          var txParams = {
            nonce: '0x'+parseInt(data.unspent.nonce).toString(16),          // nonce
            gasPrice: '0x'+parseInt(data.fee/(21000*2.465)).toString(16),   // we use toString(16) here to specify HEX radix
            gasLimit: '0x'+parseInt(51765).toString(16),                    //  but don't use it elsewhere
            to: data.contract,                                              // send payload to contract address
            value: '0x'+parseInt(0).toString(16),                           // set to zero, since we're sending tokens
            data: encoded                                                   // payload as encoded using the smart contract
          };
        }
        
        // Transaction is created
        var tx = new wrapperlib.ethTx(txParams);

        // Transaction is signed
        tx.sign(data.keys.privateKey);
        var serializedTx = tx.serialize();
        var rawTx = '0x' + serializedTx.toString('hex');
				return rawTx;
			},

      // encode ABI smart contract calls
      encode : function(data) { return encode(data); }

		}

		return functions;
	}
)();

// export functionality to a pre-prepared var
deterministic = wrapper;