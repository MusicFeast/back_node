import { Request, Response } from "express";
import { Contract, KeyPair, Near, keyStores } from "near-api-js";
import { CONFIG } from "./utils";
import { AccountService } from "./account.service";
import BN from "bn.js";
import nodemailer from "nodemailer";
import hbs, { NodemailerExpressHandlebarsOptions } from "nodemailer-express-handlebars";
import path from "path";

const awardNft = async (req: Request, res: Response) => {
  try {
    const { wallet, email } = req.body;

    const address = process.env.ADDRESS_NFT!;
    const privateKey = process.env.PRIVATE_KEY_NFT!;

    const keyStore = new keyStores.InMemoryKeyStore();

    const keyPair = KeyPair.fromString(privateKey);
    keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
    const near = new Near(CONFIG(keyStore));

    const account = new AccountService(near.connection, address);

    const contract: any = new Contract(account, String(process.env.SMART_CONTRACT), {
      changeMethods: ["deliver_gift"],
      viewMethods: [],
    });

    let resp = null;

    try {
      console.log("WALLET: ", wallet);
      const respons = await contract.deliver_gift(
        {
          receiver_id: wallet,
        },
        new BN("300000000000000"),
        new BN("1"),
      );
      console.log("RESPUESTA AQUI!!");
      console.log(respons);
      resp = true;
    } catch (error) {
      console.log("ERRRORR AQUII!!");
      console.log(error);
      resp = false;
    }

    sendMail(email);
    if (resp) {
      res.send(true);
    } else {
      res.send(false);
    }
  } catch (error) {
    res.send(false);
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.USER_MAIL, pass: process.env.PASS_MAIL },
});

const sendMail = async (email: string) => {
  try {
    let from = process.env.USER_MAIL;

    const handlebarOptions: NodemailerExpressHandlebarsOptions = {
      viewEngine: {
        partialsDir: path.resolve(`./viewsEmail`),
        defaultLayout: false,
      },
      viewPath: path.resolve(`./viewsEmail`),
    };

    // use a template file with nodemailer
    transporter.use("compile", hbs(handlebarOptions));
    const mailOptions = {
      from: from,
      to: email,
      subject: "Music Feast Sign Up",
      template: "musicfeast",
    };
    transporter.sendMail(mailOptions, function (error, info) {
      console.log("Email");
      if (error) {
        console.log(false);
      } else {
        console.log(true);
      }
    });
  } catch (error) {
    console.log(error);
  }
};

export { sendMail, awardNft };
