import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import gql from "graphql-tag";

const cache = new InMemoryCache();

const clientApollo = new ApolloClient({
  cache: cache,
  link: new HttpLink({
    uri: process.env.GRAPH_URL,
    fetch: fetch,
  }),
});

const getAutoSwapsApollo = async () => {
  try {
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

    const data = res.data.autoswaps;

    console.log(data);
    return data;
  } catch (error) {
    throw new Error("error");
  }
};

export { getAutoSwapsApollo };
