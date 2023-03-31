import { KeyPair, keyStores, Near, Account, utils, ConnectedWalletAccount, WalletConnection, Contract } from "near-api-js";
import { CONFIG, getNearPrice } from "./utils";
import { Action, createTransaction, functionCall } from "near-api-js/lib/transaction";
import BN from "bn.js";
import { PublicKey } from "near-api-js/lib/utils";
import axios from "axios";
import { AccountService } from "./account.service";

const address = process.env.ADDRESS_TASA!;
const privateKey = process.env.PRIVATE_KEY_TASA!;

const keyStore = new keyStores.InMemoryKeyStore();

const keyPair = KeyPair.fromString(privateKey);
keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
const near = new Near(CONFIG(keyStore));

const account = new AccountService(near.connection, address);

const updateTasaNear = async () => {
  try {
    console.log("UPDATE TASA INIT");
    const nearUsd = await getNearPrice();

    console.log(nearUsd);

    const trx = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        functionCall(
          "update_tasa",
          {
            tasa: parseFloat(nearUsd),
          },
          new BN("30000000000000"),
          new BN("0")
        ),
      ],
      address,
      near
    );
    const result = await account.signAndSendTrx(trx);

    if (!result.transaction.hash) return false;
    console.log("UPDATE TASA END");
    return result.transaction.hash as string;
  } catch (error) {
    console.log(error);
    return false;
  }
};

async function createTransactionFn(receiverId: string, actions: Action[], userAddress: string, near: Near) {
  const walletConnection = new WalletConnection(near, null);
  const wallet = new ConnectedWalletAccount(walletConnection, near.connection, userAddress);

  if (!wallet || !near) {
    throw new Error(`No active wallet or NEAR connection.`);
  }

  const localKey = await near?.connection.signer.getPublicKey(userAddress, near.connection.networkId);

  const accessKey = await wallet.accessKeyForTransaction(receiverId, actions, localKey);

  if (!accessKey) {
    throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
  }

  const block = await near?.connection.provider.block({
    finality: "final",
  });

  if (!block) {
    throw new Error(`Cannot find block for transaction sent to ${receiverId}`);
  }

  const blockHash = utils.serialize.base_decode(block?.header?.hash);
  //const blockHash = nearAPI.utils.serialize.base_decode(accessKey.block_hash);

  const publicKey = PublicKey.from(accessKey.public_key);
  //const nonce = accessKey.access_key.nonce + nonceOffset
  const nonce = ++accessKey.access_key.nonce;

  return createTransaction(userAddress, publicKey, receiverId, nonce, actions, blockHash);
}

export { updateTasaNear };
