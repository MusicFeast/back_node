import {
  KeyPair,
  keyStores,
  Near,
  Account,
  utils,
  ConnectedWalletAccount,
  WalletConnection,
  Contract,
} from "near-api-js";
import {
  ftGetTokensMetadata,
  fetchAllPools,
  estimateSwap,
  instantSwap,
} from "@ref-finance/ref-sdk";
import { CONFIG } from "./utils";
import {
  Action,
  createTransaction,
  functionCall,
} from "near-api-js/lib/transaction";
import BN from "bn.js";
import { PublicKey } from "near-api-js/lib/utils";
import axios from "axios";
import { AccountService } from "./account.service";

const address = process.env.ADDRESS!;
const privateKey = process.env.PRIVATE_KEY!;
const tokenIn = "wrap.testnet";
const tokenOut = "nusdc.ft-fin.testnet";
const decimals = 2;

console.log(address, privateKey, tokenIn, tokenOut);

const keyStore = new keyStores.InMemoryKeyStore();

const keyPair = KeyPair.fromString(privateKey);
keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
const near = new Near(CONFIG(keyStore));

const account = new AccountService(near.connection, address);

const sendTransferToken = async (
  toAddress: string,
  amount: number,
  toAddressTax: string,
  amountTax: number
) => {
  try {
    console.log("TRANSFER INIT");

    console.log(toAddress, amount, toAddressTax, amountTax);

    const trx = await createTransactionFn(
      tokenOut,
      [
        await functionCall(
          "ft_transfer",
          {
            receiver_id: toAddress,
            amount: String(amount),
          },
          new BN("30000000000000"),
          new BN("1")
        ),
        await functionCall(
          "ft_transfer",
          {
            receiver_id: toAddressTax,
            amount: String(amountTax),
          },
          new BN("30000000000000"),
          new BN("1")
        ),
      ],
      address,
      near
    );

    const result = await account.signAndSendTrx(trx);

    if (!result.transaction.hash) return false;
    console.log("TRANSFER END");
    return result.transaction.hash as string;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const callsContractEnd = async (
  artistId: string,
  amountNear: string,
  taxNear: string,
  ftToken: string,
  amountUsd: string
) => {
  try {
    console.log({
      artist_id: artistId,
      amount_near: amountNear,
      tax_near: taxNear,
      amount_usd: amountUsd,
      ft_token: ftToken,
    });
    console.log("CALL CONTRACT INIT");

    const trx = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "auto_swap_ini",
          {
            artist_id: artistId,
            amount_near: amountNear,
            tax_near: taxNear,
            ft_token: ftToken,
          },
          new BN("30000000000000"),
          new BN("0")
        ),
        await functionCall(
          "auto_swap_end",
          {
            artist_id: artistId,
            amount_near: amountNear,
            tax_near: taxNear,
            amount_usd: amountUsd,
            ft_token: ftToken,
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
    console.log("CALL CONTRACT END");
    return result.transaction.hash as string;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const swapNear = async (amount: number) => {
  try {
    const tokensMetadata = await ftGetTokensMetadata([tokenIn, tokenOut]);

    const simplePools = (await fetchAllPools()).simplePools.filter((pool) => {
      return pool.tokenIds[0] === tokenIn && pool.tokenIds[1] === tokenOut;
    });

    const swapAlls = await estimateSwap({
      tokenIn: tokensMetadata[tokenIn],
      tokenOut: tokensMetadata[tokenOut],
      amountIn: String(amount),
      simplePools: simplePools,
      options: { enableSmartRouting: true },
    });

    const transactionsRef = await instantSwap({
      tokenIn: tokensMetadata[tokenIn],
      tokenOut: tokensMetadata[tokenOut],
      amountIn: String(amount),
      swapTodos: swapAlls,
      slippageTolerance: 0.01,
      AccountId: address,
    });

    const transaction = transactionsRef.find(
      (element) => element.functionCalls[0].methodName === "ft_transfer_call"
    );

    if (!transaction) return false;

    let nearTransactions = [];

    if (tokenIn.includes("wrap.")) {
      const trx = await createTransactionFn(
        tokenIn,
        [
          await functionCall(
            "near_deposit",
            {},
            new BN("300000000000000"),
            new BN(String(utils.format.parseNearAmount(String(amount))))
          ),
        ],
        address,
        near
      );

      nearTransactions.push(trx);
    }

    const trxs = await Promise.all(
      transactionsRef.map(async (tx: any) => {
        return await createTransactionFn(
          tx.receiverId,
          tx.functionCalls.map((fc: any) => {
            return functionCall(
              fc.methodName,
              fc.args,
              fc.gas,
              new BN(String(utils.format.parseNearAmount(fc.amount)))
            );
          }),
          address,
          near
        );
      })
    );

    nearTransactions = nearTransactions.concat(trxs);

    let resultSwap: any;
    for (let trx of nearTransactions) {
      console.log("ENTRA");
      console.log(trx.actions[0].functionCall.methodName);

      const result = await account.signAndSendTrx(trx);
      console.log(result);

      if (trx.actions[0].functionCall.methodName === "ft_transfer_call") {
        resultSwap = result;
      }
    }

    if (!resultSwap.transaction.hash) return false;

    const transactionHash = resultSwap.transaction.hash;

    if (!transactionHash) return false;

    return transactionHash as string;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const activateAccount = async (toAddress: string) => {
  try {
    const contract: any = new Contract(
      account, // the account object that is connecting
      tokenOut,
      {
        viewMethods: ["storage_balance_of"], // view methods do not change state but usually return a value
        changeMethods: [], // change methods modify state
      }
    );

    const addressActivate = await contract.storage_balance_of({
      account_id: toAddress,
    });

    if (addressActivate) return true;

    const trx = await createTransactionFn(
      tokenOut,
      [
        await functionCall(
          "storage_deposit",
          {
            registration_only: true,
            account_id: toAddress,
          },
          new BN("300000000000000"),
          new BN("100000000000000000000000")
        ),
      ],
      address,
      near
    );

    const result = await account.signAndSendTrx(trx);

    if (!result.transaction.hash) return false;
    console.log("ACTIVATE END");
    return result.transaction.hash as string;
  } catch (error) {
    console.log(error);
    console.log("ACTIVATE ERR");
    return false;
  }
};

async function createTransactionFn(
  receiverId: string,
  actions: Action[],
  userAddress: string,
  near: Near
) {
  const walletConnection = new WalletConnection(near, null);
  const wallet = new ConnectedWalletAccount(
    walletConnection,
    near.connection,
    userAddress
  );

  if (!wallet || !near) {
    throw new Error(`No active wallet or NEAR connection.`);
  }

  const localKey = await near?.connection.signer.getPublicKey(
    userAddress,
    near.connection.networkId
  );

  const accessKey = await wallet.accessKeyForTransaction(
    receiverId,
    actions,
    localKey
  );

  if (!accessKey) {
    throw new Error(
      `Cannot find matching key for transaction sent to ${receiverId}`
    );
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

  return createTransaction(
    userAddress,
    publicKey,
    receiverId,
    nonce,
    actions,
    blockHash
  );
}

export { swapNear, sendTransferToken, activateAccount, callsContractEnd };
