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
import path from "path";

const pinataSDK = require("@pinata/sdk");
const pinata = new pinataSDK(
  "f1d9b9a0de834245bddc",
  "bbdab25a4fbc098ee462a1f47cd26e1f2ffad8c4733e98f84f22c338799aa500"
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

app.post("/ipfs/", upload.single("uploaded_file"), function (req: any, res: any) {
  try {
    if (req.file) {
      const filePath = path.join("./uploads", req.file.filename);
      const readableStreamForFile = fs.createReadStream(filePath);

      const options = {
        pinataMetadata: {
          name: req.file.filename + Date.now(),
          keyvalues: {
            customKey: "customValue",
            customKey2: "customValue2",
          },
        },
        pinataOptions: {
          cidVersion: 0,
        },
      };

      pinata
        .pinFileToIPFS(readableStreamForFile, options)
        .then((result: any) => {
          // handle results here
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          res.json(result);
        })
        .catch((err: any) => {
          // handle error here
          console.log("err", err);
          res.status(500).json({ error: err.message });
        });
    } else {
      res.status(400).json({ error: "No file uploaded" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
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
