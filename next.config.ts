import type { NextConfig } from 'next'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const nextConfig: NextConfig = {
  // This app lives beside another Next project in the same repo. Pin the
  // workspace root so Turbopack resolves this app's own lockfile.
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
}

export default nextConfig
