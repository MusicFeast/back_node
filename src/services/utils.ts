import axios from "axios";

const NETWORK = process.env.NETWORK;

function CONFIG(keyStores: any) {
  switch (NETWORK) {
    case "mainnet":
      return {
        networkId: "mainnet",
        nodeUrl: "https://rpc.mainnet.near.org",
        keyStore: keyStores,
        walletUrl: "https://wallet.near.org",
        helperUrl: "https://helper.mainnet.near.org",
        explorerUrl: "https://explorer.mainnet.near.org",
      };
    case "testnet":
      return {
        networkId: "testnet",
        keyStore: keyStores,
        nodeUrl: "https://rpc.testnet.near.org",
        walletUrl: "https://wallet.testnet.near.org",
        helperUrl: "https://helper.testnet.near.org",
        explorerUrl: "https://explorer.testnet.near.org",
      };
    default:
      throw new Error(`Unconfigured environment '${NETWORK}'`);
  }
}

async function getNearPrice() {
  try {
    const nearPrice: any = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=NEAR&vs_currencies=USD");

    if (!nearPrice.data.near.usd) throw new Error("Error near usd");
    return nearPrice.data.near.usd;
  } catch (error) {
    const nearPrice = await axios.get("https://nearblocks.io/api/near-price");
    if (!nearPrice.data.usd) throw new Error("Error near usd");
    return nearPrice.data.usd;
  }
}
export { CONFIG, getNearPrice };
