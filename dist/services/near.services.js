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
exports.createTransactionFn = exports.callsContractError = exports.callsContractEnd = exports.activateAccount = exports.sendTransferToken = exports.swapNear = void 0;
const near_api_js_1 = require("near-api-js");
const ref_sdk_1 = require("@ref-finance/ref-sdk");
const utils_1 = require("./utils");
const transaction_1 = require("near-api-js/lib/transaction");
const bn_js_1 = __importDefault(require("bn.js"));
const utils_2 = require("near-api-js/lib/utils");
const account_service_1 = require("./account.service");
const address = process.env.ADDRESS_SWAP;
const privateKey = process.env.PRIVATE_KEY_SWAP;
const tokenIn = process.env.TOKEN_IN;
const tokenOut = process.env.TOKEN_OUT;
const decimals = Number(process.env.DECIMALS);
const keyStore = new near_api_js_1.keyStores.InMemoryKeyStore();
const keyPair = near_api_js_1.KeyPair.fromString(privateKey);
keyStore.setKey(process.env.NEAR_ENV, address, keyPair);
const near = new near_api_js_1.Near((0, utils_1.CONFIG)(keyStore));
const account = new account_service_1.AccountService(near.connection, address);
const sendTransferToken = (toAddress, amount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // console.log("TRANSFER INIT", amount);
        const trx = yield createTransactionFn(tokenOut, [
            yield (0, transaction_1.functionCall)("ft_transfer", {
                receiver_id: toAddress,
                amount: String(amount),
            }, new bn_js_1.default("30000000000000"), new bn_js_1.default("1")),
        ], address, near);
        const result = yield account.signAndSendTrx(trx);
        if (!result.transaction.hash)
            return false;
        // console.log("TRANSFER END");
        return result.transaction.hash;
    }
    catch (error) {
        // console.log(error);
        return false;
    }
});
exports.sendTransferToken = sendTransferToken;
const callsContractEnd = (artistId, amountNear, taxNear, ftToken, amountUsd) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // console.log("CALL CONTRACT INIT");
        const trx = yield createTransactionFn(process.env.SMART_CONTRACT, [
            yield (0, transaction_1.functionCall)("auto_swap_complete", {
                artist_id: artistId,
                amount_near: amountNear,
                tax_near: taxNear,
                amount_usd: amountUsd,
                ft_token: ftToken,
            }, new bn_js_1.default("30000000000000"), new bn_js_1.default("0")),
        ], address, near);
        const result = yield account.signAndSendTrx(trx);
        if (!result.transaction.hash)
            return false;
        // console.log("CALL CONTRACT END");
        return result.transaction.hash;
    }
    catch (error) {
        // console.log(error);
        return false;
    }
});
exports.callsContractEnd = callsContractEnd;
const callsContractError = (artistId, amount, amountNear, ftToken, arg) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // console.log("CALL CONTRACT INIT");
        const trx = yield createTransactionFn(process.env.SMART_CONTRACT, [
            yield (0, transaction_1.functionCall)("auto_swap_transfer_error", {
                artist_id: artistId,
                amount,
                amount_near: amountNear,
                ft_token: ftToken,
                arg,
            }, new bn_js_1.default("30000000000000"), new bn_js_1.default("0")),
        ], address, near);
        const result = yield account.signAndSendTrx(trx);
        if (!result.transaction.hash)
            return false;
        // console.log("CALL CONTRACT END");
        return result.transaction.hash;
    }
    catch (error) {
        // console.log(error);
        return false;
    }
});
exports.callsContractError = callsContractError;
const swapNear = (amount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(amount);
        const tokensMetadata = yield (0, ref_sdk_1.ftGetTokensMetadata)([tokenIn, tokenOut]);
        const transactionsRef = yield getTxSwapRef(tokensMetadata[tokenIn], tokensMetadata[tokenOut], amount);
        const transactionsDcl = yield getTxSwapDCL(tokensMetadata[tokenIn], tokensMetadata[tokenOut], amount);
        const minAmountRef = yield getMinAmountOut(transactionsRef);
        const minAmountDcl = yield getMinAmountOut(transactionsDcl);
        // console.log("MIN AMOUNTS");
        // console.log(minAmountRef, minAmountDcl);
        let txMain;
        if (minAmountRef && !minAmountDcl) {
            // console.log("REF");
            txMain = transactionsRef;
        }
        else if (!minAmountRef && minAmountDcl) {
            // console.log("DCL");
            txMain = transactionsDcl;
        }
        else if (minAmountRef && minAmountDcl) {
            if (minAmountRef > minAmountDcl) {
                // console.log("REF");
                txMain = transactionsRef;
            }
            else {
                // console.log("DCL");
                txMain = transactionsDcl;
            }
        }
        if (!txMain)
            return;
        let nearTransactions = [];
        if (tokenIn.includes("wrap.")) {
            const trx = yield createTransactionFn(tokenIn, [yield (0, transaction_1.functionCall)("near_deposit", {}, new bn_js_1.default("300000000000000"), new bn_js_1.default(String(near_api_js_1.utils.format.parseNearAmount(String(amount)))))], address, near);
            nearTransactions.push(trx);
        }
        const trxs = yield Promise.all(txMain.map((tx) => __awaiter(void 0, void 0, void 0, function* () {
            return yield createTransactionFn(tx.receiverId, tx.functionCalls.map((fc) => {
                return (0, transaction_1.functionCall)(fc.methodName, fc.args, fc.gas, new bn_js_1.default(String(near_api_js_1.utils.format.parseNearAmount(fc.amount))));
            }), address, near);
        })));
        nearTransactions = nearTransactions.concat(trxs);
        let resultSwap;
        for (let trx of nearTransactions) {
            if (trx.actions[0].functionCall.methodName === "near_deposit") {
                // console.log("FUNCTION ESPERA INIT");
                yield esperar(30000);
                // console.log("FUNCTION ESPERA END");
            }
            // console.log("ENTRA");
            // console.log(trx.actions[0].functionCall.methodName);
            const result = yield account.signAndSendTrx(trx);
            if (trx.actions[0].functionCall.methodName === "ft_transfer_call") {
                resultSwap = result;
            }
        }
        if (!resultSwap.transaction.hash)
            return false;
        const transactionHash = resultSwap.transaction.hash;
        console.log(transactionHash);
        if (!transactionHash)
            return false;
        return transactionHash;
    }
    catch (error) {
        console.log(error);
        return false;
    }
});
exports.swapNear = swapNear;
const getTxSwapRef = (tokenMetadataA, tokenMetadataB, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const { ratedPools, unRatedPools, simplePools } = yield (0, ref_sdk_1.fetchAllPools)();
    const stablePools = unRatedPools.concat(ratedPools);
    const stablePoolsDetail = yield (0, ref_sdk_1.getStablePools)(stablePools);
    const options = {
        enableSmartRouting: true,
        stablePools,
        stablePoolsDetail,
    };
    const swapAlls = yield (0, ref_sdk_1.estimateSwap)({
        tokenIn: tokenMetadataA,
        tokenOut: tokenMetadataB,
        amountIn: String(amount),
        simplePools: simplePools,
        options,
    });
    const transactionsRef = yield (0, ref_sdk_1.instantSwap)({
        tokenIn: tokenMetadataA,
        tokenOut: tokenMetadataB,
        amountIn: String(amount),
        swapTodos: swapAlls,
        slippageTolerance: 0.01,
        AccountId: address,
    });
    // console.log("REF FINANCE");
    // console.log(transactionsRef[0].functionCalls);
    return transactionsRef;
});
const getTxSwapDCL = (tokenMetadataA, tokenMetadataB, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const nearUsd = yield (0, utils_1.getNearPrice)();
    const fee = 2000;
    const pool_ids = [(0, ref_sdk_1.getDCLPoolId)(tokenIn, tokenOut, fee)];
    const transactionsDcl = yield (0, ref_sdk_1.DCLSwap)({
        swapInfo: {
            amountA: String(amount),
            tokenA: tokenMetadataA,
            tokenB: tokenMetadataB,
        },
        Swap: {
            pool_ids,
            min_output_amount: String(Math.round(amount * nearUsd * 0.99 * Math.pow(10, decimals))),
        },
        AccountId: process.env.TOKEN_IN,
    });
    return transactionsDcl;
});
function esperar(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
const getMinAmountOut = (trxSwap) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = trxSwap.find((element) => element.functionCalls[0].methodName === "ft_transfer_call");
    if (!transaction)
        return false;
    // console.log("TXXX");
    const argsMsg = JSON.parse(transaction.functionCalls[0].args.msg);
    // console.log(argsMsg);
    if (Object.keys(argsMsg).includes("actions")) {
        let minAmountOut = 0;
        for (const action of argsMsg.actions) {
            if (action.token_out === process.env.TOKEN_OUT) {
                minAmountOut += Number(action.min_amount_out);
            }
        }
        return minAmountOut;
    }
    else if (Object.keys(argsMsg).includes("Swap")) {
        return Number(argsMsg.Swap.min_output_amount);
    }
    else {
        return 0;
    }
});
const activateAccount = (toAddress) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!toAddress)
            return false;
        const contract = new near_api_js_1.Contract(account, // the account object that is connecting
        tokenOut, {
            viewMethods: ["storage_balance_of"],
            changeMethods: [], // change methods modify state
        });
        const addressActivate = yield contract.storage_balance_of({
            account_id: toAddress,
        });
        if (addressActivate)
            return true;
        const trx = yield createTransactionFn(tokenOut, [
            yield (0, transaction_1.functionCall)("storage_deposit", {
                registration_only: true,
                account_id: toAddress,
            }, new bn_js_1.default("300000000000000"), new bn_js_1.default("100000000000000000000000")),
        ], address, near);
        const result = yield account.signAndSendTrx(trx);
        if (!result.transaction.hash)
            return false;
        // console.log("ACTIVATE END");
        return true;
    }
    catch (error) {
        // console.log(error);
        // console.log("ACTIVATE ERR");
        return false;
    }
});
exports.activateAccount = activateAccount;
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
exports.createTransactionFn = createTransactionFn;
