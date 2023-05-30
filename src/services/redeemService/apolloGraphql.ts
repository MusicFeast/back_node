import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import gql from "graphql-tag";

const getListRedeemer = async () => {
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
        controlobjects(where: { aproved: false }) {
          aproved
          artist_id
          extra
          fecha
          id
          owner_id
          serie_id
          token_object_id
          user_burn
        }
      }
    `;

    const res = await clientApollo.query({
      query: QUERY_APOLLO,
      variables: {},
    });

    data = res.data.controlobjects;

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

export { getListRedeemer, getWalletArtistId };
