// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // Keep your existing svg loader
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // ✅ Ignore RN AsyncStorage in web builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };

    // ✅ Ignore Node-only pino transports in browser builds
    // These are optional in pino, but bundlers may try to resolve them.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": false,
      "pino-abstract-transport": false,
      "sonic-boom": false,
    };

    return config;
  },
};

export default nextConfig;