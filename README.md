# zkAppPool
A zkApp based staking pool for MINA (WIP).

## Oracle example
A sample project that uses historical data from the [MinaExplorer GraphQL API](https://berkeley.graphql.minaexplorer.com/) in a zkApp to verify that a delegation program member has made the required payouts for an epoch. If they have, a transaction with an associated event will be broadcast. This can be subsequently read from data stored in an archive serve e.g. with a script such as [output.ts](https://github.com/garethtdavies/zkAppPool/blob/main/oracle/src/output.ts). For more details on the delegation program see [here](https://docs.minaprotocol.com/node-operators/foundation-delegation-program).

The **lambda** folder contains an example of an oracle that uses an AWS serverless function, that signs the response from the GraphQL API. An example output is [here](https://xiyh2rxrqdnbv3jeaiscukkngi0rkili.lambda-url.us-west-2.on.aws/?publicKey=B62qpBVRzjqFcbzMk3JAFdjruMAoqdHyHiE9XNyshZ5NjGo2gY7CxZz&epoch=38) (could be slow the first time it is run). It takes as inputs a delegating public key and the epoch number.

The **oracle** folder is a zkApp that consumes the oracle data, verifies the signature, and checks to see if the sent amount is greater than the amount required to be sent. If so, the zkApp sends a transaction with an event containing the epoch and both delegator and block producer keys.

An example transaction is [here](https://berkeley.minaexplorer.com/transaction/CkpZUfHgefJ3EAb9kFTx6P37qSy6vBRcYPwW72TGnDwv66K67s8WA).

You can query all events for the zkApp using https://berkeley.graphql.minaexplorer.com/ and the following query. Note that the values are returned as fields so need to be converted to e.g. a public key (see the `output.ts` script).

```gql
query getEvents {
  zkapps(query: {zkappCommand: {accountUpdates: {body: {publicKey: "B62qmLWZfcbqrQPMky44w6K6Myj9aydbHKE5fG2N6wrXxFbkfEUWdRM"}}}, canonical: true, failureReason_exists: false}, sortBy: BLOCKHEIGHT_DESC, limit: 100) {
    hash
    blockHeight
    zkappCommand {
      accountUpdates {
        body {
          events
          publicKey
        }
      }
    }
  }
}
```

You can run this for your own key by cloning this repo and entering the value of the key that is delegating:

```
cd oracle
npm install
# Replace the key and epoch you wish the verify here. It will fail (non-gracefully) if the required funds have not been sent
npm run build && node build/src/main.js B62qmRapzi3nrctTihmaeH3CNbsDkpAAmf5osj9SvucNTU7jteFchhZ 39
```

Wait for inclusion in a block, then you can read the values stored as events by running the [output.ts](https://github.com/garethtdavies/zkAppPool/blob/main/oracle/src/output.ts) script:

```
# Wait for inclusion and run from oracle folder
npm run build && node ./build/src/output.js
```

This will output a list of all keys that have sucessfully verified via the zkApp e.g.:
```
39 B62qiTKpEPjGTSHZrtM8uXiKgn8So916pLmNJKFWfnXvT4MbtHuiueD B62qiTKpEPjGTSHZrtM8uXiKgn8So916pLmNJKHv8hkrgAeqqq6mQ8y
39 B62qiTKpEPjGTSHZrtM8uXiKgn8So916pLmNJKFVF255aw3TH4C1Cca B62qiTKpEPjGTSHZrtM8uXiKgn8So916pLmNJKG3b5HvLEwBjng3UdF
38 B62qiTKpEPjGTSHZrtM8uXiKgn8So916pLmNJKG1niy2McyztRhv98f B62qiTKpEPjGTSHZrtM8uXiKgn8So916pLmNJKFUQAwx6uiqn1gMaLm
```

Note: This is very much a proof of concept. Some testnet keys have been hardcoded into the app to pay for transactions and to sign the data. The oracle only considers the total amount received between slots 3501 of the epoch in question, and slot 3500 of the next epoch, which is how the automated email scripts determine it. If you have paid late, early or have sent different payouts to compenstate for earlier epochs it will not take this into account.
