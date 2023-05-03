"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
// import "reflect-metadata";
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const postgres_1 = __importDefault(require("./config/postgres"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const autoswap_services_1 = require("./services/autoswap.services");
const tasaNear_services_1 = require("./services/tasaNear.services");
const fs = require("fs");
const PORT = Number(process.env.PORT) || 3000;
const app = (0, express_1.default)();
app.use((0, morgan_1.default)("dev"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
(0, postgres_1.default)().then(() => __awaiter(void 0, void 0, void 0, function* () {
    // console.log("Conexion DB Ready");
}));
let server;
// console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === "production") {
    const privateKey = fs.readFileSync("/etc/letsencrypt/live/defix3.com/privkey.pem", "utf8");
    const certificate = fs.readFileSync("/etc/letsencrypt/live/defix3.com/cert.pem", "utf8");
    const ca = fs.readFileSync("/etc/letsencrypt/live/defix3.com/chain.pem", "utf8");
    const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca,
    };
    server = https.createServer(credentials, app);
    // console.log("htpps");
}
else {
    server = http.createServer(app);
    // console.log("htpp");
}
server.listen(PORT, () => console.log(`Listo por el puerto ${PORT}`));
const startAutoSwap = () => {
    (0, autoswap_services_1.AutoSwap)();
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        (0, autoswap_services_1.AutoSwap)();
    }), 60000);
};
const startUpdateTasa = () => {
    (0, tasaNear_services_1.updateTasaNear)();
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        (0, tasaNear_services_1.updateTasaNear)();
    }), 900000);
};
startAutoSwap();
startUpdateTasa();
