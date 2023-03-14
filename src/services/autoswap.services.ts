import dbConnect from "../config/postgres";
import fetch from "cross-fetch";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import gql from "graphql-tag";
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

const cache = new InMemoryCache();

const clientApollo = new ApolloClient({
  cache: cache,
  link: new HttpLink({
    uri: "https://api.thegraph.com/subgraphs/name/hrpalencia/musicfeast",
    fetch: fetch,
  }),
});

const address =
  "41b5227b24b96dcb31874101231918c79849d2b16405e7b298beef0cb2c6b9ca";

const privateKey =
  "ed25519:66W3aoxpqC3JhnrrQJwzdW5UwWXp8iDFuUpfxnUv258m8sMRDF12vAzhUFxQQzajWXdikzNEKzvu2ZjPcFA2RPw7";
const tokenIn = "wrap.testnet";
const tokenOut = "nusdc.ft-fin.testnet";
const decimals = 2;

const AutoSwap = async () => {
  try {
    const nearPrice = await axios.get("https://nearblocks.io/api/near-price");

    const nearUsd = nearPrice.data.usd;

    const dataForSwap = await getQueryApollo();

    let totalAmountNear = 0;

    for (const forSwap of dataForSwap) {
      totalAmountNear +=
        Number(utils.format.formatNearAmount(forSwap.amount)) +
        Number(utils.format.formatNearAmount(forSwap.tax));
    }
    console.log("TotalAmount: " + totalAmountNear);
    const resultSwap = await swapNear(totalAmountNear);
    console.log(resultSwap);

    if (!resultSwap) return;

    for (const item of dataForSwap) {
      const sendUser =
        Number(utils.format.formatNearAmount(item.amount)) * nearUsd;
      const sendTax = Number(utils.format.formatNearAmount(item.tax)) * nearUsd;

      const sendUserEnd = Math.round(sendUser * Math.pow(10, decimals));
      const sendTaxEnd = Math.round(sendTax * Math.pow(10, decimals));

      if (Number(item.artist_id) > 0) {
        await sendTokenContract("whootest.testnet", sendUserEnd);
        await sendTokenContract("whootest.testnet", sendTaxEnd);
      } else {
        await sendTokenContract("mftftest.testnet", sendUserEnd);
        await sendTokenContract("mftftest.testnet", sendTaxEnd);
      }
    }
  } catch (error) {
    console.log("err");
    console.log(error);
  }
};

const sendTokenContract = async (toAddress: string, amount: number) => {
  console.log("ENTRO");
  const keyStore = new keyStores.InMemoryKeyStore();

  const keyPair = KeyPair.fromString(privateKey);
  keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
  const near = new Near(CONFIG(keyStore));

  const account = new Account(near.connection, address);

  const contract: any = new Contract(
    account, // the account object that is connecting
    tokenOut,
    {
      viewMethods: [], // view methods do not change state but usually return a value
      changeMethods: ["ft_transfer_call"], // change methods modify state
    }
  );

  const result = await contract.ft_transfer_call(
    {
      receiver_id: toAddress,
      amount: String(amount),
      msg: "",
    },
    "300000000000000",
    "1"
  );

  console.log(result);
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

    const keyStore = new keyStores.InMemoryKeyStore();

    const keyPair = KeyPair.fromString(privateKey);
    keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
    const near = new Near(CONFIG(keyStore));

    const account = new Account(near.connection, address);

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
      const result = await account.signAndSendTransaction(trx);
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

const getQueryApollo = async () => {
  try {
    const QUERY_APOLLO = gql`
      query QUERY_APOLLO {
        autoswaps {
          id
          artist_id
          amount
          status_des
          status_id
          tax
        }
      }
    `;

    const res = await clientApollo.query({
      query: QUERY_APOLLO,
      variables: {},
    });

    const data = res.data.autoswaps;

    console.log(data);
    return data;
  } catch (error) {
    throw new Error("error");
  }
};

const startAutoSwap = () => {
  AutoSwap();
  // setInterval(async () => {
  //   AutoSwap();
  // }, 60000);
};

export { startAutoSwap };
