import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import gql from "graphql-tag";

const getAutoSwapsApollo = async () => {
  try {
    const cache = new InMemoryCache();

    const clientApollo = new ApolloClient({
      cache: cache,
      link: new HttpLink({
        uri: process.env.GRAPH_URL,
        fetch: fetch,
      }),
    });

    let data;
    const QUERY_APOLLO = gql`
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

    const res = await clientApollo.query({
      query: QUERY_APOLLO,
      variables: {},
    });

    data = res.data.autoswaps;

    // console.log(data);
    return data;
  } catch (error) {
    throw new Error("error");
  }
};

const getWalletArtistId = async (id: string) => {
  try {
    const cache = new InMemoryCache();

    const clientApollo = new ApolloClient({
      cache: cache,
      link: new HttpLink({
        uri: process.env.GRAPH_URL,
        fetch: fetch,
      }),
    });

    if (id === "0") return process.env.ADDRES_SEND;
    const QUERY_APOLLO = gql`
      query QUERY_APOLLO($artist_id: String) {
        artist(id: $artist_id) {
          wallet
        }
      }
    `;

    const res = await clientApollo.query({
      query: QUERY_APOLLO,
      variables: { artist_id: id },
    });

    const data = res.data.artist;

    // console.log(data);

    if (!data) return false;

    return data.wallet;
  } catch (error) {
    // console.log(error);
    return false;
  }
};

const getArtistByWallet = async (wallet: string) => {
  try {
    const cache = new InMemoryCache();

    const clientApollo = new ApolloClient({
      cache: cache,
      link: new HttpLink({
        uri: process.env.GRAPH_URL,
        fetch: fetch,
      }),
    });

    if (!wallet) return process.env.ADDRES_SEND;

    const QUERY_APOLLO = gql`
      query QUERY_APOLLO($wallet: String) {
        artists(where: { wallet: $wallet }) {
          wallet
        }
      }
    `;

    const res = await clientApollo.query({
      query: QUERY_APOLLO,
      variables: { wallet: wallet },
    });

    const data = res.data.artists;

    // console.log(data);

    if (data.length === 0) return false;

    return data[0];
  } catch (error) {
    // console.log(error);
    return false;
  }
};

export { getAutoSwapsApollo, getWalletArtistId, getArtistByWallet };
