/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Always define the flag so an unset value is inlined as "" and the e2e-only
  // store exposure is compiled out of production builds.
  env: { NEXT_PUBLIC_E2E: process.env.NEXT_PUBLIC_E2E ?? "" },
};

module.exports = nextConfig;
