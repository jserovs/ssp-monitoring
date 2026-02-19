import oracledb, { type Pool } from "oracledb";

interface OracleConfig {
  user: string;
  password: string;
  connectString: string;
}

function getGviConfig(): OracleConfig {
  return {
    user: process.env.GVI_DB_USER || "",
    password: process.env.GVI_DB_PASSWORD || "",
    connectString: process.env.GVI_DB_CONNECT_STRING || "",
  };
}

function getGomConfig(): OracleConfig {
  return {
    user: process.env.GOM_DB_USER || "",
    password: process.env.GOM_DB_PASSWORD || "",
    connectString: process.env.GOM_DB_CONNECT_STRING || "",
  };
}

export async function createGviPool() {
  const config = getGviConfig();
  //todo
  console.log("Creating GVI pool:", config);
  
  if (!config.user || !config.password || !config.connectString) {
    throw new Error("GVI Oracle database configuration is missing. Please set GVI_DB_USER, GVI_DB_PASSWORD, and GVI_DB_CONNECT_STRING environment variables.");
  }
  
  return oracledb.createPool({
    user: config.user,
    password: config.password,
    connectString: config.connectString,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 2,
  });
}

export async function createGomPool() {
  const config = getGomConfig();
  
  if (!config.user || !config.password || !config.connectString) {
    throw new Error("GOM Oracle database configuration is missing. Please set GOM_DB_USER, GOM_DB_PASSWORD, and GOM_DB_CONNECT_STRING environment variables.");
  }
  
  return oracledb.createPool({
    user: config.user,
    password: config.password,
    connectString: config.connectString,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 2,
  });
}

// Singleton pools
let gviPool: Pool | null = null;
let gomPool: Pool | null = null;

export async function getGviPool() {
  if (!gviPool) {
    gviPool = await createGviPool();
  }
  return gviPool;
}

export async function getGomPool() {
  if (!gomPool) {
    gomPool = await createGomPool();
  }
  return gomPool;
}

export async function closePools() {
  if (gviPool) {
    await gviPool.close(0);
    gviPool = null;
  }
  if (gomPool) {
    await gomPool.close(0);
    gomPool = null;
  }
}
