import dbConnect from "../config/postgres";
import fetch from "cross-fetch";
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import gql from "graphql-tag";
console.log("entro");

const cache = new InMemoryCache();

const clientApollo = new ApolloClient({
  cache: cache,
  link: new HttpLink({
    uri: "https://api.thegraph.com/subgraphs/name/hrpalencia/musicfeast",
    fetch: fetch,
  }),
});

const AutoSwap = async () => {
  try {
    console.log("AutoSwap");
    const data = await getQueryApollo();
  } catch (error) {
    console.log("err");
    console.log(error);
  }
};

const getQueryApollo = async () => {
  try {
    const QUERY_APOLLO = gql`
      query QUERY_APOLLO {
        autoswaps {
          id
          artist_id
          amount
          status_des
          status_id
          tax
        }
      }
    `;

    const res = await clientApollo.query({
      query: QUERY_APOLLO,
      variables: {},
    });

    const data = res.data.autoswaps;

    console.log(data);
    return data;
  } catch (error) {
    throw new Error("error");
  }
};

const startAutoSwap = () => {
  AutoSwap();
  setInterval(async () => {
    AutoSwap();
  }, 60000);
};

export { startAutoSwap };
