import "dotenv/config";
// import "reflect-metadata";
import express, { Router } from "express";
import cors from "cors";
import morgan from "morgan";
import dbConnect from "./config/postgres";
import * as http from "http";
import * as https from "https";
import { AutoSwap } from "./services/autoswap.services";
import { sendRedeemer } from "./services/redeemService/redeemController";
import driveController from "./services/driveService/driveController";
import { updateTasaNear } from "./services/tasaNear.services";
import { awardNft, sendMail } from "./services/awardNft.services";
import { createArtist, createTiers, updateNft } from "./services/create.artist";
const fs = require("fs");

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

dbConnect().then(async () => {
  // console.log("Conexion DB Ready");
});

let server;

app.post("/start-autoswap", AutoSwap);
app.post("/award-nft/", awardNft);
app.post("/start-redeem", sendRedeemer);
app.post("/create-artist/", createArtist);
app.post("/create-tiers/", createTiers);
app.post("/update-nft/", updateNft);
app.post("/drive-service/", driveController.driveService);

console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === "production") {
  const privateKey = fs.readFileSync("/etc/letsencrypt/live/musicfeast.io/privkey.pem", "utf8");
  const certificate = fs.readFileSync("/etc/letsencrypt/live/musicfeast.io/cert.pem", "utf8");
  const ca = fs.readFileSync("/etc/letsencrypt/live/musicfeast.io/chain.pem", "utf8");

  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };
  server = https.createServer(credentials, app);
  console.log("htpps");
} else {
  server = http.createServer(app);
  console.log("htpp");
}

server.listen(PORT, () => console.log(`Listo por el puerto ${PORT}`));

// const startAutoSwap = () => {
//   AutoSwap();
//   setInterval(async () => {
//     AutoSwap();
//   }, 60000);
// };

const startUpdateTasa = () => {
  updateTasaNear();
  setInterval(async () => {
    updateTasaNear();
  }, 900000);
};

// startAutoSwap();
startUpdateTasa();
