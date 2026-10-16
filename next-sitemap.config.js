/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.kosyachts.com',
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: 'monthly',
  priority: 0.7,
  
  // Exclude protected, admin, and system routes
  exclude: [
    // Admin and protected routes
    '/admin/*',
    '/profile/*', 
    '/bookings/*',
    '/owner',
    '/owner/*',
    '/brokers',
    '/brokers/*',
    // The listing flow (the /list-your-boat landing page itself stays in)
    '/list-your-boat/*',
    // Landing page redesign mockup (also noindex)
    '/home-preview',
    // Owner portal invite links
    '/owner-invite/*',
    
    // Auth routes
    '/auth/*',
    
    // API and system routes
    '/api/*',
    '/_next/*',
    
    // Server-side sitemap (handled separately)
    '/server-sitemap-boats.xml',
    
    // Dynamic routes (handled by server-side sitemap)
    '/boats/[id]',
    '/boats/[id]/*',
    
    // Temporary or test routes
    '/test',
    '/test-*',
    '/private/*',
    
    // Success pages (booking-specific)
    '/success',
  ],

  // Custom robots.txt configuration
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/profile/',
          '/owner',
          '/brokers',
          '/list-your-boat/',
          '/home-preview',
          '/owner-invite/',
          '/bookings/',
          '/api/',
          '/auth/',
          '/sign-in',
          '/sign-up',
          '/_next/',
          '/test',
          '/test-*',
          '/private/',
          '*.json',
          '*.xml',
          '*.txt',
        ],
      },
      // Enhanced rules for major search engines
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/profile/',
          '/owner',
          '/brokers',
          '/list-your-boat/',
          '/home-preview',
          '/owner-invite/',
          '/bookings/',
          '/api/',
          '/auth/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/admin/',
          '/profile/',
          '/owner',
          '/brokers',
          '/list-your-boat/',
          '/home-preview',
          '/owner-invite/',
          '/bookings/',
          '/api/',
          '/auth/',
        ],
      },
    ],
    additionalSitemaps: [
      // Server-side sitemap for all boat pages (~300+ boats)
      'https://www.kosyachts.com/server-sitemap-boats.xml',
    ],
  },

  // Dynamic boat pages are now handled by server-side sitemap
  // See: app/server-sitemap-boats.xml/route.ts

  // Custom transformation for static pages
  transform: async (config, path) => {
    // Custom priorities and change frequencies for specific routes
    const customConfig = {
      // Core business pages (highest priority)
      '/': { priority: 1.0, changefreq: 'weekly' },
      '/boats/search': { priority: 0.9, changefreq: 'daily' },
      
      // Services (high priority - main business)
      '/services': { priority: 0.9, changefreq: 'monthly' },
      '/services/charter-management': { priority: 0.8, changefreq: 'monthly' },
      '/list-your-boat': { priority: 0.8, changefreq: 'weekly' },
      '/services/yacht-management': { priority: 0.8, changefreq: 'monthly' },
      '/services/sales': { priority: 0.8, changefreq: 'monthly' },
      '/services/term-charters': { priority: 0.8, changefreq: 'monthly' },
      '/services/dock-management': { priority: 0.8, changefreq: 'monthly' },
      
      // Experiences (high priority - customer appeal)
      '/experiences': { priority: 0.9, changefreq: 'monthly' },
      '/experiences/fishing': { priority: 0.8, changefreq: 'monthly' },
      '/experiences/watersports': { priority: 0.8, changefreq: 'monthly' },
      '/experiences/sand-bar': { priority: 0.8, changefreq: 'monthly' },
      '/experiences/special-events': { priority: 0.8, changefreq: 'monthly' },
      '/experiences/term-charters': { priority: 0.8, changefreq: 'monthly' },
      
      // Company pages
      '/about-us': { priority: 0.7, changefreq: 'monthly' },
      '/contact': { priority: 0.8, changefreq: 'monthly' },
      '/kos-yacht-club': { priority: 0.6, changefreq: 'monthly' },
      '/careers': { priority: 0.5, changefreq: 'monthly' },
      
      // Content
      '/news': { priority: 0.6, changefreq: 'weekly' },
      '/faq': { priority: 0.6, changefreq: 'monthly' },
      
      // Legal (lowest priority)
      '/privacy': { priority: 0.3, changefreq: 'yearly' },
      '/terms-of-service': { priority: 0.3, changefreq: 'yearly' },
      '/cancellation-policy': { priority: 0.3, changefreq: 'yearly' },
      '/cookies': { priority: 0.2, changefreq: 'yearly' },
    };

    const custom = customConfig[path] || {};
    
    return {
      loc: path,
      changefreq: custom.changefreq || config.changefreq,
      priority: custom.priority || config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    };
  },
};
