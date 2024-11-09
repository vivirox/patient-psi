/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'patient.gemcity.xyz',
        port: '',
        pathname: '**'
      }
    ]
  },
  serverRuntimeConfig: {
    logger: {
      level: 'info',
    },
    serverPath: 'app/api',
  }
}
