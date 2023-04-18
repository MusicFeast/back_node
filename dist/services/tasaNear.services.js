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
exports.updateTasaNear = void 0;
const near_api_js_1 = require("near-api-js");
const utils_1 = require("./utils");
const transaction_1 = require("near-api-js/lib/transaction");
const bn_js_1 = __importDefault(require("bn.js"));
const utils_2 = require("near-api-js/lib/utils");
const account_service_1 = require("./account.service");
const address = process.env.ADDRESS_TASA;
const privateKey = process.env.PRIVATE_KEY_TASA;
const keyStore = new near_api_js_1.keyStores.InMemoryKeyStore();
const keyPair = near_api_js_1.KeyPair.fromString(privateKey);
keyStore.setKey(process.env.NEAR_ENV, address, keyPair);
const near = new near_api_js_1.Near((0, utils_1.CONFIG)(keyStore));
const account = new account_service_1.AccountService(near.connection, address);
function getTasa() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const contract = new near_api_js_1.Contract(account, process.env.SMART_CONTRACT, {
                changeMethods: [],
                viewMethods: ["get_tasa"],
            });
            const price = yield contract.get_tasa();
            return price;
        }
        catch (error) {
            return false;
        }
    });
}
const updateTasaNear = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("UPDATE TASA INIT");
        const nearUsd = yield (0, utils_1.getNearPrice)();
        const tasaActual = yield getTasa();
        let diference = ((tasaActual - nearUsd) / nearUsd) * 100;
        if (diference < 0) {
            diference = diference * -1;
        }
        if (diference < 2)
            return false;
        const trx = yield createTransactionFn(process.env.SMART_CONTRACT, [
            (0, transaction_1.functionCall)("update_tasa", {
                tasa: parseFloat(nearUsd),
            }, new bn_js_1.default("30000000000000"), new bn_js_1.default("0")),
        ], address, near);
        const result = yield account.signAndSendTrx(trx);
        if (!result.transaction.hash)
            return false;
        console.log("UPDATE TASA END");
        return result.transaction.hash;
    }
    catch (error) {
        console.log(error);
        return false;
    }
});
exports.updateTasaNear = updateTasaNear;
function createTransactionFn(receiverId, actions, userAddress, near) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const walletConnection = new near_api_js_1.WalletConnection(near, null);
        const wallet = new near_api_js_1.ConnectedWalletAccount(walletConnection, near.connection, userAddress);
        if (!wallet || !near) {
            throw new Error(`No active wallet or NEAR connection.`);
        }
        const localKey = yield (near === null || near === void 0 ? void 0 : near.connection.signer.getPublicKey(userAddress, near.connection.networkId));
        const accessKey = yield wallet.accessKeyForTransaction(receiverId, actions, localKey);
        if (!accessKey) {
            throw new Error(`Cannot find matching key for transaction sent to ${receiverId}`);
        }
        const block = yield (near === null || near === void 0 ? void 0 : near.connection.provider.block({
            finality: "final",
        }));
        if (!block) {
            throw new Error(`Cannot find block for transaction sent to ${receiverId}`);
        }
        const blockHash = near_api_js_1.utils.serialize.base_decode((_a = block === null || block === void 0 ? void 0 : block.header) === null || _a === void 0 ? void 0 : _a.hash);
        //const blockHash = nearAPI.utils.serialize.base_decode(accessKey.block_hash);
        const publicKey = utils_2.PublicKey.from(accessKey.public_key);
        //const nonce = accessKey.access_key.nonce + nonceOffset
        const nonce = ++accessKey.access_key.nonce;
        return (0, transaction_1.createTransaction)(userAddress, publicKey, receiverId, nonce, actions, blockHash);
    });
}
