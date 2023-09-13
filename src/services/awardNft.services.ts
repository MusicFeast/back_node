import { Request, Response } from "express";
import { Contract, KeyPair, Near, keyStores } from "near-api-js";
import { CONFIG } from "./utils";
import { AccountService } from "./account.service";
import BN from "bn.js";

const awardNft = async (req: Request, res: Response) => {
  try {
    const { wallet } = req.body;
    const address = process.env.ADDRESS_TASA!;
    const privateKey = process.env.PRIVATE_KEY_TASA!;

    const keyStore = new keyStores.InMemoryKeyStore();

    const keyPair = KeyPair.fromString(privateKey);
    keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
    const near = new Near(CONFIG(keyStore));

    const account = new AccountService(near.connection, address);

    const contract: any = new Contract(account, String(process.env.SMART_CONTRACT), {
      changeMethods: ["deliver_gift"],
      viewMethods: [],
    });

    const resp = await contract.deliver_gift(
      {
        receiver_id: wallet,
      },
      new BN("300000000000000"),
      new BN("1")
    );
    if (resp) {
      res.send(true);
    } else {
      res.send(false);
    }
  } catch (error) {
    throw new Error("error");
  }
};

export { awardNft };
