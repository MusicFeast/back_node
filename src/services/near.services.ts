import { KeyPair, keyStores, Near, Account, utils, ConnectedWalletAccount, WalletConnection, Contract } from "near-api-js";
import {
  ftGetTokensMetadata,
  fetchAllPools,
  estimateSwap,
  instantSwap,
  SwapOptions,
  Pool,
  getStablePools,
  StablePool,
  DCLSwap,
  getDCLPoolId,
} from "@ref-finance/ref-sdk";
import { CONFIG, getNearPrice } from "./utils";
import { Action, createTransaction, functionCall } from "near-api-js/lib/transaction";
import BN from "bn.js";
import { PublicKey } from "near-api-js/lib/utils";
import axios from "axios";
import { AccountService } from "./account.service";

const address = process.env.ADDRESS_SWAP!;
const privateKey = process.env.PRIVATE_KEY_SWAP!;
const tokenIn = process.env.TOKEN_IN!;
const tokenOut = process.env.TOKEN_OUT!;
const decimals = Number(process.env.DECIMALS!);

const keyStore = new keyStores.InMemoryKeyStore();

const keyPair = KeyPair.fromString(privateKey);
keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
const near = new Near(CONFIG(keyStore));

const account = new AccountService(near.connection, address);

const sendTransferToken = async (toAddress: string, amount: number) => {
  try {
    console.log("TRANSFER INIT", amount);

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

const callsContractEnd = async (artistId: string, amountNear: string, taxNear: string, ftToken: string, amountUsd: string) => {
  try {
    console.log("CALL CONTRACT INIT");

    const trx = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "auto_swap_complete",
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

const callsContractError = async (artistId: string, amount: string, amountNear: string, ftToken: String, arg: String) => {
  try {
    console.log("CALL CONTRACT INIT");

    const trx = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "auto_swap_transfer_error",
          {
            artist_id: artistId,
            amount,
            amount_near: amountNear,
            ft_token: ftToken,
            arg,
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

    const transactionsRef = await getTxSwapRef(tokensMetadata[tokenIn], tokensMetadata[tokenOut], amount);

    const transactionsDcl = await getTxSwapDCL(tokensMetadata[tokenIn], tokensMetadata[tokenOut], amount);

    const minAmountRef = await getMinAmountOut(transactionsRef);
    const minAmountDcl = await getMinAmountOut(transactionsDcl);

    console.log("MIN AMOUNTS");
    console.log(minAmountRef, minAmountDcl);

    let txMain: any;

    if (minAmountRef && !minAmountDcl) {
      console.log("REF");
      txMain = transactionsRef;
    } else if (!minAmountRef && minAmountDcl) {
      console.log("DCL");
      txMain = transactionsDcl;
    } else if (minAmountRef && minAmountDcl) {
      if (minAmountRef > minAmountDcl) {
        console.log("REF");
        txMain = transactionsRef;
      } else {
        console.log("DCL");
        txMain = transactionsDcl;
      }
    }

    if (!txMain) return;

    let nearTransactions = [];

    if (tokenIn.includes("wrap.")) {
      const trx = await createTransactionFn(
        tokenIn,
        [await functionCall("near_deposit", {}, new BN("300000000000000"), new BN(String(utils.format.parseNearAmount(String(amount)))))],
        address,
        near
      );

      nearTransactions.push(trx);
    }

    const trxs = await Promise.all(
      txMain.map(async (tx: any) => {
        return await createTransactionFn(
          tx.receiverId,
          tx.functionCalls.map((fc: any) => {
            return functionCall(fc.methodName, fc.args, fc.gas, new BN(String(utils.format.parseNearAmount(fc.amount))));
          }),
          address,
          near
        );
      })
    );

    nearTransactions = nearTransactions.concat(trxs);

    let resultSwap: any;
    for (let trx of nearTransactions) {
      if (trx.actions[0].functionCall.methodName === "near_deposit") {
        console.log("FUNCTION ESPERA INIT");
        await esperar(30000);
        console.log("FUNCTION ESPERA END");
      }
      console.log("ENTRA");
      console.log(trx.actions[0].functionCall.methodName);

      const result = await account.signAndSendTrx(trx);

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

const getTxSwapRef = async (tokenMetadataA: any, tokenMetadataB: any, amount: number) => {
  const { ratedPools, unRatedPools, simplePools } = await fetchAllPools();

  const stablePools: Pool[] = unRatedPools.concat(ratedPools);

  const stablePoolsDetail: StablePool[] = await getStablePools(stablePools);

  const options: SwapOptions = {
    enableSmartRouting: true,
    stablePools,
    stablePoolsDetail,
  };

  const swapAlls = await estimateSwap({
    tokenIn: tokenMetadataA,
    tokenOut: tokenMetadataB,
    amountIn: String(amount),
    simplePools: simplePools,
    options,
  });

  const transactionsRef = await instantSwap({
    tokenIn: tokenMetadataA,
    tokenOut: tokenMetadataB,
    amountIn: String(amount),
    swapTodos: swapAlls,
    slippageTolerance: 0.01,
    AccountId: address,
  });
  console.log("REF FINANCE");
  console.log(transactionsRef[0].functionCalls);

  return transactionsRef;
};

const getTxSwapDCL = async (tokenMetadataA: any, tokenMetadataB: any, amount: number) => {
  const nearUsd = await getNearPrice();

  const fee = 2000;

  const pool_ids = [getDCLPoolId(tokenIn, tokenOut, fee)];

  const transactionsDcl = await DCLSwap({
    swapInfo: {
      amountA: String(amount),
      tokenA: tokenMetadataA,
      tokenB: tokenMetadataB,
    },
    Swap: {
      pool_ids,
      min_output_amount: String(Math.round(amount * nearUsd * 0.99 * Math.pow(10, decimals))),
    },
    AccountId: process.env.TOKEN_IN!,
  });

  return transactionsDcl;
};

function esperar(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const getMinAmountOut = async (trxSwap: any) => {
  const transaction = trxSwap.find(
    (element: {
      functionCalls: {
        methodName: string;
      }[];
    }) => element.functionCalls[0].methodName === "ft_transfer_call"
  );

  if (!transaction) return false;

  console.log("TXXX");

  const argsMsg = JSON.parse(transaction.functionCalls[0].args.msg);

  console.log(argsMsg);

  if (Object.keys(argsMsg).includes("actions")) {
    let minAmountOut = 0;
    for (const action of argsMsg.actions) {
      if (action.token_out === process.env.TOKEN_OUT) {
        minAmountOut += Number(action.min_amount_out);
      }
    }
    return minAmountOut;
  } else if (Object.keys(argsMsg).includes("Swap")) {
    return Number(argsMsg.Swap.min_output_amount);
  } else {
    return 0;
  }
};

const activateAccount = async (toAddress: string) => {
  try {
    if (!toAddress) return false;
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
    return true;
  } catch (error) {
    console.log(error);
    console.log("ACTIVATE ERR");
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

export { swapNear, sendTransferToken, activateAccount, callsContractEnd, callsContractError };
