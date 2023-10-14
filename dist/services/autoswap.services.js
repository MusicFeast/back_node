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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoSwap = void 0;
require("dotenv/config");
//import dbConnect from "../config/postgres";
//import fetch from "cross-fetch";
const near_api_js_1 = require("near-api-js");
//import BN from "bn.js";
//import { PublicKey } from "near-api-js/lib/utils";
//import axios from "axios";
const near_services_1 = require("./near.services");
const apolloGraphql_services_1 = require("./apolloGraphql.services");
const decimals = Number(process.env.DECIMALS);
const AutoSwap = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("1");
        let dataForSwap = yield (0, apolloGraphql_services_1.getAutoSwapsApollo)();
        let totalAmountNear = 0;
        for (const forSwap of dataForSwap) {
            if (Number(near_api_js_1.utils.format.formatNearAmount(forSwap.amount_near)) < 0)
                continue;
            if (forSwap.id === 0) {
                totalAmountNear += Number(near_api_js_1.utils.format.formatNearAmount(forSwap.amount_near) + near_api_js_1.utils.format.formatNearAmount(forSwap.tax));
            }
            else {
                totalAmountNear += Number(near_api_js_1.utils.format.formatNearAmount(forSwap.amount_near));
            }
        }
        if (!(totalAmountNear > 0)) {
            res.json("Amount 0");
            return;
        } // console.log("AUTOSWAP NOT AMOUNT NEAR");
        let resultSwap = yield (0, near_services_1.swapNear)(totalAmountNear);
        // console.log(resultSwap);
        if (!resultSwap) {
            res.status(204).json("No se ejecuto el Swap");
            return;
        } // console.log("AUTOSWAP END RESULT SWAP");
        for (const item of dataForSwap) {
            // console.log("ENTRO SWAPPPPP");
            // console.log(item);
            if (Number(item.amount_near) <= 0 && Number(item.amount_usd) <= 0 && Number(item.tax) <= 0) {
                continue;
            }
            else if (Number(item.amount_near) < 0 || Number(item.amount_usd) < 0) {
                continue;
            }
            // const sendUser =
            //   Number(utils.format.formatNearAmount(item.amount)) * nearUsd;
            // console.log(item.amount_usd);
            let sendUserEnd = Math.round(item.amount_usd * Math.pow(10, decimals));
            // console.log("SEND", sendUserEnd);
            let result;
            if (sendUserEnd > 0) {
                let addressSend = yield (0, apolloGraphql_services_1.getWalletArtistId)(item.artist_id);
                // console.log("ADDRESS SEND", addressSend);
                let activated = yield (0, near_services_1.activateAccount)(addressSend);
                // console.log("ACTIVATED", activated);
                if (!activated || !addressSend) {
                    result = false;
                }
                else {
                    result = yield (0, near_services_1.sendTransferToken)(addressSend, sendUserEnd);
                }
            }
            else {
                result = true;
            }
            if (result) {
                yield (0, near_services_1.callsContractEnd)(item.artist_id, item.amount_near, item.tax, process.env.TOKEN_SYMBOL || "TOKEN", item.amount_usd);
            }
            else {
                // console.log("CALLS ERROR");
                yield (0, near_services_1.callsContractError)(item.artist_id, item.amount_usd, item.amount_near, process.env.TOKEN_SYMBOL || "TOKEN", "Error in transfer token");
            }
        }
        totalAmountNear = 0;
        console.log("END");
        res.json();
        return;
        // console.log("AUTOSWAP END");
    }
    catch (error) {
        // console.log("err");
        // console.log(error);
        res.status(500).json();
        return;
        // AutoSwap();
    }
});
exports.AutoSwap = AutoSwap;
