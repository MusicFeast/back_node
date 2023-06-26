import gql from "graphql-tag";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { Request, Response } from "express";
import { google } from "googleapis";
import axios from "axios";
import { Contract, KeyPair, Near, WalletConnection, connect, keyStores } from "near-api-js";
import { CONFIG } from "../utils";
import { AccountService } from "../account.service";
import dbConnect from "../../config/postgres";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import fs from "fs";

const credentialsPath = "credentials.json";

const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth: auth });

const folderId = "1XVcnzQL6Y2p_Mg3tq4FoI4woN8xAmtO7";

const driveService = async (req: Request, res: Response) => {
  try {
    const { wallet, email } = req.body;

    const resp = await getNFTContractsByAccount(wallet, email);

    if (resp) {
      res.send("Exito");
    } else {
      res.status(400).send("No se encontraron NFTs");
    }

    // const fileMetadata = {
    //   name: "ArtistCompilation",
    //   mimeType: "application/vnd.google-apps.folder",
    // };

    // try {
    //   const file = await drive.files.create({
    //     requestBody: fileMetadata,
    //     fields: "id",
    //   });
    //   console.log("Folder Id:", file.data.id);
    //   return file.data.id;
    // } catch (err) {
    //   console.log(err);
    //   throw err;
    // }

    // async function listFolders() {
    //   try {
    //     const response = await drive.files.list({
    //       q: "mimeType='application/vnd.google-apps.folder'",
    //       fields: "files(id, name)",
    //     });

    //     console.log(response);

    //     const folders = response.data.files;
    //     if (folders && folders.length > 0) {
    //       console.log("Folders:");
    //       folders.forEach((folder) => {
    //         console.log(`${folder.name} (${folder.id})`);
    //       });
    //     } else {
    //       console.log("No se encontraron folders.");
    //     }
    //   } catch (error) {
    //     console.error("Error al listar los folders:", error);
    //   }
    // }

    // Llama a la función para listar los folders
    // listFolders();
  } catch (err) {
    res.status(400).send(err);
    // throw new Error(`Failed bot discord service, ${err}`);
  }
};

async function getNFTContractsByAccount(accountId: string, email: string) {
  try {
    let serviceUrl = `https://api.kitwallet.app/account/${accountId}/likelyNFTs`;
    // if (process.env.NETWORK === "mainnet") {
    //   serviceUrl = `https://api.kitwallet.app/account/${accountId}/likelyNFTs`;
    // } else {
    //   serviceUrl = `https://preflight-api.kitwallet.app/account/${accountId}/likelyNFTs`;
    // }

    const result = await axios.get(serviceUrl);

    for (var i = 0; i < result.data.length; i++) {
      if (result.data[i] === "nft-v2.keypom.near") {
        return await getNFTByContract(result.data[i], accountId, email);
      }
    }
    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function getNFTByContract(contract_id: string, owner_account_id: string, email: string) {
  try {
    const keyStore = new keyStores.InMemoryKeyStore();
    const configNear = {
      networkId: "mainnet",
      nodeUrl: "https://rpc.mainnet.near.org",
      keyStore: keyStore,
      walletUrl: "https://wallet.near.org",
      helperUrl: "https://helper.mainnet.near.org",
      explorerUrl: "https://explorer.mainnet.near.org",
    };
    const near = new Near(configNear);

    const account = new AccountService(near.connection, owner_account_id);

    const contract: any = new Contract(account, contract_id, {
      changeMethods: [],
      viewMethods: ["nft_tokens_for_owner"],
    });

    const result = await contract.nft_tokens_for_owner({
      account_id: owner_account_id,
      from_index: "0",
      limit: 100,
    });

    for (var i = 0; i < result.length; i++) {
      let conexion = await dbConnect();
      const resultados = await conexion.query("select * from backend_drivenft where token_id = $1", [result[i].token_id]);
      if (resultados.rows.length === 0) {
        const permission = {
          type: "user",
          role: "reader",
          emailAddress: email,
        };

        await drive.permissions
          .create({
            fileId: folderId,
            requestBody: permission,
          })
          .then(async (response) => {
            await conexion.query("insert into backend_drivenft (wallet, token_id, email) values ($1, $2, $3)", [
              owner_account_id,
              result[i].token_id,
              email,
            ]);
            console.log("Insertado");
          })
          .catch((error) => {
            console.error("Error adding permission:", error);
          });
      } else {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export default { driveService };
