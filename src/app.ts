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
import {
  createArtist,
  createEvent,
  createTiers,
  newCollection,
  updateNft,
  uploadMedia,
} from "./services/create.artist";
import multer from "multer";
const fs = require("fs");

const pinataSDK = require("@pinata/sdk");
const pinata = new pinataSDK(
  "2d7d4578a389f9aa8c07",
  "bbc0eafd85df40edd68f5de5d583c4dcc9f69a6fbcb68e29e97c9c5a2516f49e"
);

import multerConfig from "./config/multer";

const storage = multer.diskStorage({
  destination: "./uploads/", // Directorio de destino donde se guardarán los archivos
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Utiliza el nombre original del archivo
  },
});

const upload = multer({ storage });

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
app.post("/create-event/", createEvent);

app.post(
  "/update-nft/",
  multerConfig.upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateNft
);

app.post(
  "/upload-media/",
  multerConfig.upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  uploadMedia
);

app.post("/new-collection/", newCollection);
app.post("/drive-service/", driveController.driveService);

app.post("/ipfs/", upload.single("uploaded_file"), function (req: any, res) {
  if (req.file) {
    // eslint-disable-next-line n/no-path-concat
    const readableStreamForFile = fs.createReadStream(__dirname + "/storage/img/" + req.file.filename);
    const options = {
      pinataMetadata: {
        name: req.body.name,
        keyvalues: {
          customKey: "customValue",
          customKey2: "customValue2",
        },
      },
      pinataOptions: {
        cidVersion: 0,
      },
    };
    console.log(req.file);
    pinata
      .pinFileToIPFS(readableStreamForFile, options)
      .then((result: any) => {
        // handle results here
        // eslint-disable-next-line n/no-path-concat
        const path = __dirname + "/storage/img/" + "/" + req.file.filename;
        if (fs.existsSync(path)) {
          fs.unlinkSync(path);
        }
        console.log(result);
        res.json(result);
      })
      .catch((err: any) => {
        // handle error here
        res.json(err);
        console.log(err);
      });
  }
});

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
