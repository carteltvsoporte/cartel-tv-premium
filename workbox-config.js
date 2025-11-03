module.exports = {
  globDirectory: '.',
  globPatterns: [
    '**/*.{html,css,js,json,jpg,png,svg,ico}'
  ],
  swDest: 'sw.js',
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [{
    urlPattern: /^https:\/\/api\.themoviedb\.org\/3\/.*/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'tmdb-api-cache',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60
      },
      cacheableResponse: {
        statuses: [0, 200]
      }
    }
  }, {
    urlPattern: /^https:\/\/image\.tmdb\.org\/.*/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'tmdb-images-cache',
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60
      }
    }
  }, {
    urlPattern: /^https:\/\/api\.tvmaze\.com\/.*/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'tvmaze-api-cache',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 6 * 60 * 60
      },
      networkTimeoutSeconds: 3
    }
  }, {
    urlPattern: /^https:\/\/static\.tvmaze\.com\/.*/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'tvmaze-images-cache',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60
      }
    }
  }]
};