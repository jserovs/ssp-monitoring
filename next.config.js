/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverRuntimeConfig: {
    GVI_DB_USER: process.env.GVI_DB_USER,
    GVI_DB_PASSWORD: process.env.GVI_DB_PASSWORD,
    GVI_DB_CONNECT_STRING: process.env.GVI_DB_CONNECT_STRING,
    GOM_DB_USER: process.env.GOM_DB_USER,
    GOM_DB_PASSWORD: process.env.GOM_DB_PASSWORD,
    GOM_DB_CONNECT_STRING: process.env.GOM_DB_CONNECT_STRING,
  },
}

module.exports = nextConfig
