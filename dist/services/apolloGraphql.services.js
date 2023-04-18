"use strict";
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
exports.getWalletArtistId = exports.getAutoSwapsApollo = void 0;
const client_1 = require("@apollo/client");
const graphql_tag_1 = __importDefault(require("graphql-tag"));
const cache = new client_1.InMemoryCache();
const clientApollo = new client_1.ApolloClient({
    cache: cache,
    link: new client_1.HttpLink({
        uri: process.env.GRAPH_URL,
        fetch: fetch,
    }),
});
const getAutoSwapsApollo = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const QUERY_APOLLO = (0, graphql_tag_1.default) `
      query QUERY_APOLLO {
        autoswaps {
          id
          artist_id
          amount_near
          amount_usd
          status_des
          status_id
          tax
        }
      }
    `;
        const res = yield clientApollo.query({
            query: QUERY_APOLLO,
            variables: {},
        });
        const data = res.data.autoswaps;
        console.log(data);
        return data;
    }
    catch (error) {
        throw new Error("error");
    }
});
exports.getAutoSwapsApollo = getAutoSwapsApollo;
const getWalletArtistId = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (id === "0")
            return process.env.ADDRES_SEND;
        const QUERY_APOLLO = (0, graphql_tag_1.default) `
      query QUERY_APOLLO($artist_id: String) {
        artist(id: $artist_id) {
          wallet
        }
      }
    `;
        const res = yield clientApollo.query({
            query: QUERY_APOLLO,
            variables: { artist_id: id },
        });
        const data = res.data.artist;
        console.log(data);
        if (!data)
            return false;
        return data.wallet;
    }
    catch (error) {
        console.log(error);
        return false;
    }
});
exports.getWalletArtistId = getWalletArtistId;
