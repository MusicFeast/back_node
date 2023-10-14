import { Request, Response } from "express";
import { Contract, KeyPair, Near, keyStores } from "near-api-js";
import { CONFIG } from "./utils";
import { AccountService } from "./account.service";
import BN from "bn.js";
import nodemailer from "nodemailer";
import hbs, { NodemailerExpressHandlebarsOptions } from "nodemailer-express-handlebars";
import path from "path";
import { createTransactionFn } from "./near.services";
import { functionCall } from "near-api-js/lib/transaction";

const createArtist = async (req: Request, res: Response) => {
  try {
    const { wallet, artistName } = req.body;

    const address = process.env.ADDRESS_NFT!;
    const privateKey = process.env.PRIVATE_KEY_NFT!;

    const keyStore = new keyStores.InMemoryKeyStore();

    const keyPair = KeyPair.fromString(privateKey);
    keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
    const near = new Near(CONFIG(keyStore));

    const account = new AccountService(near.connection, address);

    const trx = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "add_artist",
          {
            name: artistName,
            wallet: wallet,
          },
          new BN("30000000000000"),
          new BN("0"),
        ),
      ],
      address,
      near,
    );

    const result = await account.signAndSendTrx(trx);

    const logs = result.receipts_outcome[0].outcome?.logs[0];

    const logsParsed = JSON.parse(logs);

    if (logsParsed?.params.id) {
      res.send({ id_collection: logsParsed?.params.id });
    } else {
      res.send(false);
    }
  } catch (error) {
    res.send(false);
  }
};

export { createArtist };
