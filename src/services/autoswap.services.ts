import dbConnect from "../config/postgres";
import fetch from "cross-fetch";
import { utils } from "near-api-js";
import BN from "bn.js";
import { PublicKey } from "near-api-js/lib/utils";
import axios from "axios";
import {
  sendTransferToken,
  swapNear,
  activateAccount,
  callsContractEnd,
  callsContractError,
} from "./near.services";
import { getAutoSwapsApollo } from "./apolloGraphql.services";

const decimals = Number(process.env.DECIMALS);

const AutoSwap = async () => {
  try {
    console.log("AUTOSWAP INIT");
    // const nearPrice = await axios.get("https://nearblocks.io/api/near-price");

    // if (!nearPrice.data.usd) throw new Error("Error near usd");
    // const nearUsd = nearPrice.data.usd;

    const nearPrice: any = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=NEAR&vs_currencies=USD"
    );

    if (!nearPrice.data.near.usd) throw new Error("Error near usd");
    const nearUsd = nearPrice.data.near.usd;

    const dataForSwap = await getAutoSwapsApollo();

    let totalAmountNear = 0;

    for (const forSwap of dataForSwap) {
      if (forSwap.id === 0) {
        totalAmountNear += Number(
          utils.format.formatNearAmount(forSwap.amount_near) +
            utils.format.formatNearAmount(forSwap.tax)
        );
      } else {
        totalAmountNear += Number(
          utils.format.formatNearAmount(forSwap.amount_near)
        );
      }
    }
    console.log("TotalAmount: " + totalAmountNear);

    if (!(totalAmountNear > 0)) return console.log("AUTOSWAP FAILED");
    const resultSwap = await swapNear(totalAmountNear);

    if (!resultSwap) return console.log("AUTOSWAP END");

    for (const item of dataForSwap) {
      console.log("ENTRO SWAPPPPP");
      let addressSend;

      if (Number(item.artist_id) > 0) {
        const conexion = await dbConnect();
        const response = await conexion.query(
          "SELECT *\
          FROM backend_artist \
          where id_collection = $1",
          [item.artist_id]
        );

        if (response.rows.length === 0) continue;

        addressSend = response.rows[0].account_near;
      } else {
        addressSend = process.env.ADDRESS_SEND;
      }

      if (!addressSend) continue;

      console.log(addressSend);

      // const sendUser =
      //   Number(utils.format.formatNearAmount(item.amount)) * nearUsd;

      console.log(item.amount_usd);

      const sendUserEnd = Math.round(item.amount_usd * Math.pow(10, decimals));

      console.log(sendUserEnd);

      if (!sendUserEnd) continue;

      const activated = await activateAccount(addressSend);

      console.log("ACTIVATED", activated);

      if (!activated) continue;

      const result = await sendTransferToken(addressSend, sendUserEnd);

      if (result) {
        await callsContractEnd(
          item.artist_id,
          item.amount_near,
          item.tax,
          "USDT",
          item.amount_usd
        );
      } else {
        await callsContractError(
          item.artist_id,
          item.amount_usd,
          "USDT",
          "Error in transfer token"
        );
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
