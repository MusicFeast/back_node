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
import { getArtistByWallet } from "./apolloGraphql.services";
import axios from "axios";
import { Vimeo } from "vimeo";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.USER_MAIL, pass: process.env.PASS_MAIL },
});

let client = new Vimeo(process.env.VIMEO_CLIENT_ID!, process.env.VIMEO_CLIENT_SECRET!, process.env.VIMEO_ACCESS_TOKEN!);

const createArtist = async (req: Request, res: Response) => {
  try {
    const { walletArtist, artistName } = req.body;

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
            wallet: walletArtist,
          },
          new BN("30000000000000"),
          new BN("0")
        ),
      ],
      address,
      near
    );

    const result = await account.signAndSendTrx(trx);

    const logs = result.receipts_outcome[0].outcome?.logs[0];

    const logsParsed = JSON.parse(logs);

    if (logsParsed?.params.id) {
      res.send({ id_collection: logsParsed?.params.id });
    } else {
      console.log("PARAMS", logsParsed?.params);
      res.send(false);
    }
  } catch (error) {
    console.log("ERROR", error);
    res.send(false);
  }
};

const createTiers = async (req: Request, res: Response) => {
  try {
    const { idCollection, title, description, media, price, royalty, royaltyBuy, email } = req.body;

    const address = process.env.ADDRESS_NFT!;
    const privateKey = process.env.PRIVATE_KEY_NFT!;

    const keyStore = new keyStores.InMemoryKeyStore();

    const keyPair = KeyPair.fromString(privateKey);
    keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
    const near = new Near(CONFIG(keyStore));

    const account = new AccountService(near.connection, address);

    const dataRoyalties = JSON.parse(royalty);
    const royalties: { [key: string]: number } = {};

    // Itera sobre el array y asigna las propiedades y valores al objeto
    dataRoyalties.forEach((item: any) => {
      royalties[item.account] = Number(item.percentage) * 100;
    });

    const dataSplit = JSON.parse(royaltyBuy);
    const royaltiesBuy: { [key: string]: number } = {};

    royaltiesBuy["0"] = 3000;

    // Itera sobre el array y asigna las propiedades y valores al objeto
    for (const item of dataSplit) {
      const artists = await getArtistByWallet(item.account);

      if (artists) {
        royaltiesBuy[artists.id] = Number(item.percentage) * 100;
      } else {
        const trx = await createTransactionFn(
          process.env.SMART_CONTRACT!,
          [
            await functionCall(
              "add_artist",
              {
                name: item.account,
                wallet: item.account,
              },
              new BN("30000000000000"),
              new BN("0")
            ),
          ],
          address,
          near
        );

        const result = await account.signAndSendTrx(trx);

        const logs = result.receipts_outcome[0].outcome?.logs[0];

        const logsParsed = JSON.parse(logs);

        if (logsParsed?.params.id) {
          royaltiesBuy[String(logsParsed?.params.id)] = Number(item.percentage) * 100;
        }
      }
    }

    const trx1 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 1,
            token_metadata: {
              title: "TIER1 (Access Pass)",
              description: description,
              media: media,
              reference: "1",
            },
            price: Number(price),
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx2 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 2,
            token_metadata: {
              title: "TIER2 (Video)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "2",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx3 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 3,
            token_metadata: {
              title: "TIER3 (Merch)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "3",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx4 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 4,
            token_metadata: {
              title: "TIER4 (Merch)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "4",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx5 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 5,
            token_metadata: {
              title: "TIER5 (One on One)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "5",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx6 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 6,
            token_metadata: {
              title: "TIER6 (Auction)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "6",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const result1 = await account.signAndSendTrx(trx1);
    const result2 = await account.signAndSendTrx(trx2);
    const result3 = await account.signAndSendTrx(trx3);
    const result4 = await account.signAndSendTrx(trx4);
    const result5 = await account.signAndSendTrx(trx5);
    const result6 = await account.signAndSendTrx(trx6);

    if (
      result1.transaction.hash &&
      result2.transaction.hash &&
      result3.transaction.hash &&
      result4.transaction.hash &&
      result5.transaction.hash &&
      result6.transaction.hash
    ) {
      if (email) {
        sendMail(email);
      }

      res.json({
        hashes: [
          result1.transaction.hash,
          result2.transaction.hash,
          result3.transaction.hash,
          result4.transaction.hash,
          result5.transaction.hash,
          result6.transaction.hash,
        ],
      });
    } else {
      res.send(false);
    }
  } catch (error) {
    console.log(error);
    res.send(false);
  }
};

const uploadMedia = async (req: Request, res: Response) => {
  try {
    const files: any = req.files;

    if (files.audio || files.video) {
      return res.send({ media: files.audio || files.video });
    } else {
      res.status(400).send();
    }
  } catch (error) {
    res.status(500).send();
  }
};

const updateNft = async (req: Request, res: Response) => {
  try {
    const {
      id,
      title,
      description,
      price,
      media,
      wallet,
      tier,
      id_collection,
      number_collection,
      royalty,
      royaltyBuy,
      copies,
    } = req.body;

    console.log("AQUI VA 1");

    const address = process.env.ADDRESS_NFT!;
    const privateKey = process.env.PRIVATE_KEY_NFT!;

    const keyStore = new keyStores.InMemoryKeyStore();

    const keyPair = KeyPair.fromString(privateKey);
    keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
    const near = new Near(CONFIG(keyStore));

    const account = new AccountService(near.connection, address);

    const dataRoyalties = JSON.parse(royalty);
    const royalties: { [key: string]: number } = {};

    console.log("AQUI VA 2");

    // Itera sobre el array y asigna las propiedades y valores al objeto
    dataRoyalties.forEach((item: any) => {
      royalties[item.account] = Number(item.percentage) * 100;
    });

    const dataSplit = JSON.parse(royaltyBuy);
    const royaltiesBuy: { [key: string]: number } = {};

    royaltiesBuy["0"] = 3000;

    console.log("AQUI VA 3");

    // Itera sobre el array y asigna las propiedades y valores al objeto
    for (const item of dataSplit) {
      const artists = await getArtistByWallet(item.account);

      if (artists) {
        royaltiesBuy[artists.id] = Number(item.percentage) * 100;
      } else {
        const trx = await createTransactionFn(
          process.env.SMART_CONTRACT!,
          [
            await functionCall(
              "add_artist",
              {
                name: item.account,
                wallet: item.account,
              },
              new BN("30000000000000"),
              new BN("0")
            ),
          ],
          address,
          near
        );

        const result = await account.signAndSendTrx(trx);

        const logs = result.receipts_outcome[0].outcome?.logs[0];

        const logsParsed = JSON.parse(logs);

        if (logsParsed?.params.id) {
          royaltiesBuy[String(logsParsed?.params.id)] = Number(item.percentage) * 100;
        }
      }
    }

    console.log("AQUI VA 4");

    const args: any = {
      token_series_id: String(id),
      royalty: royalties,
      royalty_buy: royaltiesBuy,
    };

    if (title) args.title = title;
    if (copies) args.copies = Number(copies) || null;
    if (description) args.description = description;
    if (media) args.media = media;
    if (price) args.price = Number(price);

    const trx = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [await functionCall("update_nft_series", args, new BN("30000000000000"), new BN("0"))],
      address,
      near
    );

    const result = await account.signAndSendTrx(trx);

    if (result?.transaction?.hash) {
      const files: any = req.files;
      if (files.audio) {
        axios.post(`${process.env.DJANGO_URL}/api/v1/update-coming-soon/`, {
          wallet: wallet,
          tier: tier,
          id_collection: id_collection,
          media_id: files.audio[0].key,
          number_collection: number_collection,
        });
      }
      if (files.video) {
        axios.post(`${process.env.DJANGO_URL}/api/v1/update-coming-soon/`, {
          wallet: wallet,
          tier: tier,
          id_collection: id_collection,
          media_id: files.video[0].key,
          number_collection: number_collection,
        });

        // const videoPath = path.join(__dirname, "../../uploads/" + video.originalname);

        // client.upload(
        //   videoPath,
        //   {
        //     name: video.originalname,
        //     description: "Video",
        //     asd: "asd",
        //   },
        //   function (uri: string) {
        //     console.log("URI", uri);
        //     const id = uri.replace("/videos/", "");
        //     const apiUrl = `https://api.vimeo.com/videos/${id}/privacy/domains/musicfeast.io`;

        //     const config = {
        //       headers: {
        //         Authorization: "Bearer " + process.env.VIMEO_ACCESS_TOKEN, // Reemplaza con tu token de acceso real
        //       },
        //     };

        //     axios.put(apiUrl, null, config);
        //     axios.post(`${process.env.DJANGO_URL}/api/v1/update-coming-soon/`, {
        //       wallet: wallet,
        //       tier: tier,
        //       id_collection: id_collection,
        //       vimeo_id: id,
        //       number_collection: number_collection,
        //     });
        //   },
        //   function (bytes_uploaded: number, bytes_total: number) {
        //     var percentage = ((bytes_uploaded / bytes_total) * 100).toFixed(2);
        //     console.log(bytes_uploaded, bytes_total, percentage + "%");
        //   },
        //   function (error: string) {
        //     console.log("Failed because: " + error);
        //   },
        // );
      }

      res.send({ hash: result.transaction.hash });
    } else {
      res.status(400).send({ error: "Error" });
    }
  } catch (error: any) {
    console.log(error);
    res.status(500).send({ error: error.message });
  }
};

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
      subject: "Music Feast Approved",
      template: "announcement",
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

const newCollection = async (req: Request, res: Response) => {
  try {
    const { idCollection, title, description, media, price, royalty, royaltyBuy } = req.body;

    const address = process.env.ADDRESS_NFT!;
    const privateKey = process.env.PRIVATE_KEY_NFT!;

    const keyStore = new keyStores.InMemoryKeyStore();

    const keyPair = KeyPair.fromString(privateKey);
    keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
    const near = new Near(CONFIG(keyStore));

    const account = new AccountService(near.connection, address);

    const dataRoyalties = JSON.parse(royalty);
    const royalties: { [key: string]: number } = {};

    // Itera sobre el array y asigna las propiedades y valores al objeto
    dataRoyalties.forEach((item: any) => {
      royalties[item.account] = Number(item.percentage) * 100;
    });

    const dataSplit = JSON.parse(royaltyBuy);
    const royaltiesBuy: { [key: string]: number } = {};

    royaltiesBuy["0"] = 3000;

    // Itera sobre el array y asigna las propiedades y valores al objeto
    for (const item of dataSplit) {
      const artists = await getArtistByWallet(item.account);

      console.log("WALLET", artists);

      if (artists) {
        royaltiesBuy[artists.id] = Number(item.percentage) * 100;
      } else {
        const trx = await createTransactionFn(
          process.env.SMART_CONTRACT!,
          [
            await functionCall(
              "add_artist",
              {
                name: item.account,
                wallet: item.account,
              },
              new BN("30000000000000"),
              new BN("0")
            ),
          ],
          address,
          near
        );

        const result = await account.signAndSendTrx(trx);

        const logs = result.receipts_outcome[0].outcome?.logs[0];

        const logsParsed = JSON.parse(logs);

        if (logsParsed?.params.id) {
          royaltiesBuy[String(logsParsed?.params.id)] = Number(item.percentage) * 100;
        }
      }
    }

    const nextCol = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "next_collection",
          {
            artist_id: Number(idCollection),
          },
          new BN("30000000000000"),
          new BN("0")
        ),
      ],
      address,
      near
    );

    const nextColRes = await account.signAndSendTrx(nextCol);
    console.log("nextColRes", nextColRes);

    const trx1 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 1,
            token_metadata: {
              title: "TIER1 (Access Pass)",
              description: description,
              media: media,
              reference: "1",
            },
            price: Number(price),
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx2 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 2,
            token_metadata: {
              title: "TIER2 (Video)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "2",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx3 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 3,
            token_metadata: {
              title: "TIER3 (Merch)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "3",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx4 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 4,
            token_metadata: {
              title: "TIER4 (Merch)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "4",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx5 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 5,
            token_metadata: {
              title: "TIER5 (One on One)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "5",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const trx6 = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 6,
            token_metadata: {
              title: "TIER6 (Auction)",
              description:
                "<p>Coming Soon</p> <ul>  <li>more exclusive content</li>  <li>more exclusive content</li> </ul> <p>The next tiers that will be released will have special exclusive content strictly for the community members</p> <p>Once you purchase the next tiers, it will unlock special goods and experiences in which you can either hold or sell back to other community members.</p>",
              media:
                "https://bafybeiejaqv6r7iz6cxtdkwgqw346bwrvz2kz5vdt5zeqdjboxipn62xwq.ipfs.w3s.link/coming%20soon.jpeg",
              reference: "6",
            },
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const result1 = await account.signAndSendTrx(trx1);
    const result2 = await account.signAndSendTrx(trx2);
    const result3 = await account.signAndSendTrx(trx3);
    const result4 = await account.signAndSendTrx(trx4);
    const result5 = await account.signAndSendTrx(trx5);
    const result6 = await account.signAndSendTrx(trx6);

    if (
      result1.transaction.hash &&
      result2.transaction.hash &&
      result3.transaction.hash &&
      result4.transaction.hash &&
      result5.transaction.hash &&
      result6.transaction.hash
    ) {
      res.json({
        hashes: [
          result1.transaction.hash,
          result2.transaction.hash,
          result3.transaction.hash,
          result4.transaction.hash,
          result5.transaction.hash,
          result6.transaction.hash,
        ],
      });
    } else {
      res.send(false);
    }
  } catch (error) {
    console.log(error);
    res.send(false);
  }
};

const createEvent = async (req: Request, res: Response) => {
  try {
    const { idCollection, title, description, media, price, royalty, royaltyBuy, extra } = req.body;

    const address = process.env.ADDRESS_NFT!;
    const privateKey = process.env.PRIVATE_KEY_NFT!;

    const keyStore = new keyStores.InMemoryKeyStore();

    const keyPair = KeyPair.fromString(privateKey);
    keyStore.setKey(process.env.NEAR_ENV!, address, keyPair);
    const near = new Near(CONFIG(keyStore));

    const account = new AccountService(near.connection, address);

    const dataRoyalties = JSON.parse(royalty);
    const royalties: { [key: string]: number } = {};

    // Itera sobre el array y asigna las propiedades y valores al objeto
    dataRoyalties.forEach((item: any) => {
      royalties[item.account] = Number(item.percentage) * 100;
    });

    const dataSplit = JSON.parse(royaltyBuy);
    const royaltiesBuy: { [key: string]: number } = {};

    royaltiesBuy["0"] = 3000;

    // Itera sobre el array y asigna las propiedades y valores al objeto
    for (const item of dataSplit) {
      const artists = await getArtistByWallet(item.account);

      if (artists) {
        royaltiesBuy[artists.id] = Number(item.percentage) * 100;
      } else {
        const trx = await createTransactionFn(
          process.env.SMART_CONTRACT!,
          [
            await functionCall(
              "add_artist",
              {
                name: item.account,
                wallet: item.account,
              },
              new BN("30000000000000"),
              new BN("0")
            ),
          ],
          address,
          near
        );

        const result = await account.signAndSendTrx(trx);

        const logs = result.receipts_outcome[0].outcome?.logs[0];

        const logsParsed = JSON.parse(logs);

        if (logsParsed?.params.id) {
          royaltiesBuy[String(logsParsed?.params.id)] = Number(item.percentage) * 100;
        }
      }
    }

    const trx = await createTransactionFn(
      process.env.SMART_CONTRACT!,
      [
        await functionCall(
          "nft_series",
          {
            artist_id: Number(idCollection),
            type_token_id: 7,
            token_metadata: {
              title: title,
              description: description,
              media: media,
              reference: "7",
              extra,
            },
            price: Number(price),
            royalty: royalties,
            royalty_buy: royaltiesBuy,
          },
          new BN("30000000000000"),
          new BN("11000000000000000000000")
        ),
      ],
      address,
      near
    );

    const result = await account.signAndSendTrx(trx);

    if (result.transaction.hash) {
      res.json({
        hashes: [result.transaction.hash],
      });
    } else {
      res.send(false);
    }
  } catch (error) {
    console.log(error);
    res.send(false);
  }
};

export { createArtist, createTiers, updateNft, newCollection, uploadMedia, createEvent };
