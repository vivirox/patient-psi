/** @type {import('next').NextConfig} */
export const images = {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'patient.gemcity.xyz',
      port: '',
      pathname: '**'
    }
  ]
};
export const serverRuntimeConfig = {
  logger: {
    level: 'info',
  },
  serverPath: 'app/api',
};
