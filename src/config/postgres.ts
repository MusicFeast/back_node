import { Pool, PoolConfig, Client } from "pg";
// Coloca aquí tus credenciales

async function dbConnect(): Promise<Pool> {
  const connectionData: PoolConfig = {
    user: process.env.USER_DB,
    host: process.env.HOST_DB,
    database: process.env.DATABASE,
    password: process.env.PASSWORD_DB,
    port: Number(process.env.PORT_DB),
  };
  return new Pool(connectionData);
}

export default dbConnect;
