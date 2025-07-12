


import type { NextConfig } from 'next'
import CopyWebpackPlugin from 'copy-webpack-plugin'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins = config.plugins || []
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: 'public/libs/web-ifc/*',
              to: 'static/chunks/libs/web-ifc/[name][ext]',
              noErrorOnMissing: true, // <--- กัน build fail ถ้าไฟล์ไม่มี
            },
          ],
        })
      )
    }
    return config
  },
  
    eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig



