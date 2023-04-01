import "dotenv/config";
// import "reflect-metadata";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dbConnect from "./config/postgres";
import * as http from "http";
import * as https from "https";
import { AutoSwap } from "./services/autoswap.services";
import { updateTasaNear } from "./services/tasaNear.services";
const fs = require("fs");

const PORT = Number(process.env.POST) || 3000;
const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

dbConnect().then(async () => {
  console.log("Conexion DB Ready");
});

let server;
console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === "production") {
  const privateKey = fs.readFileSync(
    "/etc/letsencrypt/live/defix3.com/privkey.pem",
    "utf8"
  );
  const certificate = fs.readFileSync(
    "/etc/letsencrypt/live/defix3.com/cert.pem",
    "utf8"
  );
  const ca = fs.readFileSync(
    "/etc/letsencrypt/live/defix3.com/chain.pem",
    "utf8"
  );

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

const startAutoSwap = () => {
  AutoSwap();
  setInterval(async () => {
    AutoSwap();
  }, 36000000);
};

const startUpdateTasa = () => {
  updateTasaNear();
  setInterval(async () => {
    updateTasaNear();
  }, 900000);
};

setTimeout(startAutoSwap, 30000);
startUpdateTasa();
