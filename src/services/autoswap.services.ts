import "dotenv/config";
import dbConnect from "../config/postgres";
import fetch from "cross-fetch";
import { utils } from "near-api-js";
import BN from "bn.js";
import { PublicKey } from "near-api-js/lib/utils";
import axios from "axios";
import { sendTransferToken, swapNear, activateAccount, callsContractEnd, callsContractError } from "./near.services";
import { getAutoSwapsApollo, getWalletArtistId } from "./apolloGraphql.services";
import { getNearPrice } from "./utils";

const decimals = Number(process.env.DECIMALS);

const AutoSwap = async (res: Response) => {
  try {
    // console.log("START AUTO SWAP");
    // const nearUsd = await getNearPrice();

    let dataForSwap = await getAutoSwapsApollo();

    let totalAmountNear = 0;

    for (const forSwap of dataForSwap) {
      if (Number(utils.format.formatNearAmount(forSwap.amount_near)) < 0) continue;
      if (forSwap.id === 0) {
        totalAmountNear += Number(utils.format.formatNearAmount(forSwap.amount_near) + utils.format.formatNearAmount(forSwap.tax));
      } else {
        totalAmountNear += Number(utils.format.formatNearAmount(forSwap.amount_near));
      }
    }
    // console.log("TotalAmount: " + totalAmountNear);

    if (!(totalAmountNear > 0)) return res.json(); // console.log("AUTOSWAP NOT AMOUNT NEAR");

    let resultSwap = await swapNear(totalAmountNear);

    // console.log(resultSwap);

    if (!resultSwap) return res.json(); // console.log("AUTOSWAP END RESULT SWAP");

    for (const item of dataForSwap) {
      // console.log("ENTRO SWAPPPPP");
      // console.log(item);
      if (Number(item.amount_near) <= 0 && Number(item.amount_usd) <= 0 && Number(item.tax) <= 0) {
        continue;
      } else if (Number(item.amount_near) < 0 || Number(item.amount_usd) < 0) {
        continue;
      }

      // const sendUser =
      //   Number(utils.format.formatNearAmount(item.amount)) * nearUsd;

      // console.log(item.amount_usd);

      let sendUserEnd = Math.round(item.amount_usd * Math.pow(10, decimals));

      // console.log("SEND", sendUserEnd);

      let result: string | boolean;

      if (sendUserEnd > 0) {
        let addressSend = await getWalletArtistId(item.artist_id);

        // console.log("ADDRESS SEND", addressSend);

        let activated = await activateAccount(addressSend);

        // console.log("ACTIVATED", activated);

        if (!activated || !addressSend) {
          result = false;
        } else {
          result = await sendTransferToken(addressSend, sendUserEnd);
        }
      } else {
        result = true;
      }

      if (result) {
        await callsContractEnd(item.artist_id, item.amount_near, item.tax, process.env.TOKEN_SYMBOL || "TOKEN", item.amount_usd);
      } else {
        // console.log("CALLS ERROR");
        await callsContractError(item.artist_id, item.amount_usd, item.amount_near, process.env.TOKEN_SYMBOL || "TOKEN", "Error in transfer token");
      }
    }
    totalAmountNear = 0;
    res.json();
    // console.log("AUTOSWAP END");
  } catch (error) {
    // console.log("err");
    // console.log(error);
    return res.json();
    // AutoSwap();
  }
};

export { AutoSwap };
