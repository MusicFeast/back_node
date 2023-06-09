import "dotenv/config";
//import dbConnect from "../config/postgres";
//import fetch from "cross-fetch";
import { utils } from "near-api-js";
import { getListRedeemer, getWalletArtistId } from "./apolloGraphql";
//import { getNearPrice } from "./utils";
import { Request, Response } from "express";
import axios from "axios";
import dbConnect from "../../config/postgres";

const sendRedeemer = async (req: Request, res: Response) => {
  try {
    let dataRedeem = await getListRedeemer();
    let i = 1;

    for (const data of dataRedeem) {
      const extra = data.extra;

      let conexion = await dbConnect();
      const resultados = await conexion.query("select * from backend_orderredeem where token_id = $1", [data.id]);

      console.log(resultados.rows);

      if (resultados.rows.length === 0) {
        continue;
      }

      console.log(JSON.parse(extra));

      const dataOrder = resultados.rows[0];

      const addresUser = {
        name: dataOrder.city,
        nameLine2: dataOrder.city,
        addressLine1: dataOrder.street_address,
        addressLine2: dataOrder.street_address,
        city: dataOrder.city,
        state: dataOrder.state,
        postalCode: dataOrder.postal,
        country: dataOrder.country,
        phone: dataOrder.phone_number,
      };

      const orderPost = {
        campaignId: "123456",
        confirmationEmailAddress: dataOrder.email || "juanochandoa@gmail.com",
        // customerAddress: addresUser,
        // customerEmailAddress: dataOrder.email || "juanochandoa@gmail.com",
        customId: "123456",
        holdFulfillmentUntilDate: null,
        isTest: true,
        orderItemGroups: [
          {
            countryOfOrigin: "string",
            customsDescription: "string",
            declaredValue: 0,
            designId: "string",
            designData: {
              artwork: [
                {
                  embroideryMetadata: {
                    dstFileUrl: "extra.ArtWork",
                    text: null,
                    threadColors: [
                      {
                        code: "White",
                        brand: "Red",
                      },
                    ],
                  },
                  mockups: [
                    {
                      mockupUrl: extra.ArtWork,
                    },
                  ],
                  originalFileUrl: extra.ArtWork,
                  physicalPlacement: extra.physicalPlacement,
                  physicalSize: extra.physicalSize,
                  printingMethod: null,
                  printLocation: null,
                },
              ],
            },
            // gtin: extra.CatalogProductId,
            // htsCode: extra.CatalogProductId,
            id: extra.CatalogProductId,
            quantity: 1,
            sku: "4363068066",
            //vendorSKU: "4363068066",
          },
        ],
        shipments: [
          {
            confirmationEmailAddress: dataOrder.email || "juanochandoa@gmail.com",
            customId: "123456",
            // customPackingSlipUrl: null,
            // giftMessage: null,
            items: [
              {
                orderItemGroupId: "123456",
                quantity: 1,
              },
            ],
            // returnToAddress: addresUser,
            shippingAddress: addresUser,
            shippingTier: "economy",
            // shippingCarrier: null,
            // shippingService: null,
          },
        ],
      };

      const res = await axios
        .post(process.env.API_FULFILL_URL as string, orderPost, {
          headers: {
            "x-api-key": process.env.API_KEY_FULFILL,
          },
        })
        .then((response) => {
          console.log("Connect Success");
          console.log(response);
          i++;
        })
        .catch((err) => {
          console.log("Error");
          if (i === 1) {
            console.error(err.response.data);
          }
          i++;
        });
    }

    res.send(dataRedeem);
  } catch (error) {
    // console.log("err");
    // console.log(error);
    res.status(500).json();
    return;
    // AutoSwap();
  }
};

export { sendRedeemer };
