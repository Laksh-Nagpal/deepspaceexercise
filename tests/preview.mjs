// Production-only hydration checks must run against the prerendered assets.
import { servePreview } from 'deepspace/testing'
servePreview({ appDir: new URL('..', import.meta.url), port: process.argv[2] })
