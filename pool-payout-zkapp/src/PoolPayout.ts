/*
* First we get the data from the oracle and verify it by checking the signature
* Then we get the latest index from the chain
* Then we batch up 9 accounts
* We do all the assertions, right epoch, right index etc...
*/

import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  PublicKey,
  Signature,
  UInt64,
  UInt32,
  Struct,
  Circuit,
  Bool,
} from 'snarkyjs';

// The public key of our trusted data provider
const ORACLE_PUBLIC_KEY =
  'B62qphyUJg3TjMKi74T2rF8Yer5rQjBr1UyEG7Wg9XEYAHjaSiSqFv1';

// Using this value as a test as a nice number of delegates
const VALIDATOR_PUBLIC_KEY = 'B62qjhiEXP45KEk8Fch4FnYJQ7UMMfiR3hq9ZeMUZ8ia3MbfEteSYDg';

// This matches our output
export class Reward extends Struct({
  index: Field,
  publicKey: PublicKey,
  delegatingBalance: UInt64,
  rewards: UInt64,
  epoch: Field,
  signature: Signature,
  confirmed: Bool
}) { // Have the data concatenated here?
}

export class PoolPayout extends SmartContract {

  // What state variables do we need to store

  // The latest epoch - will init this variable to have a starting point
  @state(Field) currentEpoch = State<Field>();

  // The current index of the payout run
  @state(Field) currentIndex = State<Field>();

  // Fee
  @state(UInt32) feePercentage = State<UInt32>();

  // The Oracle public key (takes 2)
  @state(PublicKey) oraclePublicKey = State<PublicKey>();

  // Validator key (takes 2)
  @state(PublicKey) validatorPublicKey = State<PublicKey>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editSequenceState: Permissions.proofOrSignature(),
      editState: Permissions.proofOrSignature(),
      incrementNonce: Permissions.proofOrSignature(),
      receive: Permissions.proofOrSignature(),
      send: Permissions.proofOrSignature(),
      setDelegate: Permissions.impossible(),
      setPermissions: Permissions.proofOrSignature(),
      setTokenSymbol: Permissions.proofOrSignature(),
      setVerificationKey: Permissions.proofOrSignature(),
      setVotingFor: Permissions.proofOrSignature(),
      setZkappUri: Permissions.impossible(),
    });

    // Move this to an init() method but for debugging useful to redeploy
    this.currentEpoch.set(Field(39));
    this.currentIndex.set(Field(0));
    this.feePercentage.set(UInt32.from(5));
    this.oraclePublicKey.set(PublicKey.fromBase58(ORACLE_PUBLIC_KEY));
    this.validatorPublicKey.set(PublicKey.fromBase58(VALIDATOR_PUBLIC_KEY));

  }

  @method sendReward(account: Reward) {

    // This method simplifies and only sends one payout
    // get the current epoch
    let currentEpoch = this.currentEpoch.get();
    this.currentEpoch.assertEquals(currentEpoch);
    Circuit.log(currentEpoch);

    // get the current index
    let currentIndex = this.currentIndex.get();
    this.currentIndex.assertEquals(currentIndex);
    Circuit.log(currentIndex);

    // get the current fee
    let feePercentage = this.feePercentage.get();
    this.feePercentage.assertEquals(feePercentage);

    // Assert the validating key on chain
    let oraclePublicKey = this.oraclePublicKey.get();
    this.oraclePublicKey.assertEquals(oraclePublicKey);
    //Circuit.log("Oracle public key" + oraclePublicKey);

    // get the current validator
    let validatorPublicKey = this.validatorPublicKey.get();
    this.validatorPublicKey.assertEquals(validatorPublicKey);

    // validate the oracle signature
    const signedData = account.index.toFields().concat(account.publicKey.toFields().concat(account.delegatingBalance.toFields().concat(account.rewards.toFields()).concat(account.epoch.toFields()).concat(account.confirmed.toFields())));

    const validSignature = account.signature.verify(oraclePublicKey, signedData);

    // Check that the signature is valid
    //validSignature.assertTrue();

    // Assert the index is the same as the current index
    account.index.assertEquals(currentIndex, "The index must match");

    // Assert the epoch is correct
    account.epoch.assertEquals(currentEpoch, "The epoch must match");

    // calculate the rewards
    let payout = account.rewards.mul(95).div(100).div(1000); // Temp make this smaller as easier to pay
    payout.assertLte(account.rewards);

    // If we made it this far we can send the 
    this.send({
      to: account.publicKey,
      amount: payout
    });

    this.currentIndex.set(currentIndex.add(1));
  }

  @method closeEpoch() {
    // Validate oracle data
    // Check that index == number of delegators (via oracle)
    // Send payout to the pool operator
    // Update on chain state for epoch and reset index
  }
}