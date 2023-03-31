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

const AutoSwap = async () => {
  try {
    // const nearUsd = await getNearPrice();

    const dataForSwap = await getAutoSwapsApollo();

    let totalAmountNear = 0;

    for (const forSwap of dataForSwap) {
      if (forSwap.id === 0) {
        totalAmountNear += Number(utils.format.formatNearAmount(forSwap.amount_near) + utils.format.formatNearAmount(forSwap.tax));
      } else {
        totalAmountNear += Number(utils.format.formatNearAmount(forSwap.amount_near));
      }
    }
    console.log("TotalAmount: " + totalAmountNear);

    if (!(totalAmountNear > 0)) return console.log("AUTOSWAP NOT AMOUNT NEAR");

    const resultSwap = await swapNear(totalAmountNear);

    console.log(resultSwap);

    if (!resultSwap) return console.log("AUTOSWAP END");

    for (const item of dataForSwap) {
      console.log("ENTRO SWAPPPPP");
      console.log(item);
      if (Number(item.amount_near) <= 0 && Number(item.amount_usd) <= 0 && Number(item.tax) <= 0) {
        continue;
      }

      // const sendUser =
      //   Number(utils.format.formatNearAmount(item.amount)) * nearUsd;

      console.log(item.amount_usd);

      const sendUserEnd = Math.round(item.amount_usd * Math.pow(10, decimals));

      let result: string | boolean;

      if (item.sendUserEnd > 0) {
        const addressSend = await getWalletArtistId(item.artist_id);

        if (!addressSend) continue;

        const activated = await activateAccount(addressSend);

        if (!activated) continue;

        console.log("ACTIVATED", activated);
        result = await sendTransferToken(addressSend, sendUserEnd);
      } else {
        result = true;
      }

      if (result) {
        await callsContractEnd(item.artist_id, item.amount_near, item.tax, process.env.TOKEN_SYMBOL || "TOKEN", item.amount_usd);
      } else {
        await callsContractError(item.artist_id, item.amount_usd, process.env.TOKEN_SYMBOL || "TOKEN", "Error in transfer token");
      }
    }
    console.log("AUTOSWAP END");
  } catch (error) {
    console.log("err");
    console.log(error);
    // AutoSwap();
  }
};

export { AutoSwap };
