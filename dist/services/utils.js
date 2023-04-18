"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNearPrice = exports.CONFIG = void 0;
const axios_1 = __importDefault(require("axios"));
const NETWORK = process.env.NETWORK;
function CONFIG(keyStores) {
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
exports.CONFIG = CONFIG;
function getNearPrice() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const nearPrice = yield axios_1.default.get("https://api.coingecko.com/api/v3/simple/price?ids=NEAR&vs_currencies=USD");
            if (!nearPrice.data.near.usd)
                throw new Error("Error near usd");
            return nearPrice.data.near.usd;
        }
        catch (error) {
            const nearPrice = yield axios_1.default.get("https://nearblocks.io/api/near-price");
            if (!nearPrice.data.usd)
                throw new Error("Error near usd");
            return nearPrice.data.usd;
        }
    });
}
exports.getNearPrice = getNearPrice;
