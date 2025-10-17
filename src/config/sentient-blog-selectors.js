export const sentientBlogSelectors = {
  // Webflow CMS typically uses these patterns
  containers: [
    '.w-dyn-item',           // Webflow dynamic item
    '[role="listitem"]',     // Webflow list item
    '.blog-post',
    '.post-item',
    'article',
    '[class*="collection-item"]',
    '[class*="blog-item"]'
  ],
  
  title: [
    'h2',
    'h3',
    '.heading',
    '[class*="title"]',
    '[class*="heading"]',
    '.post-title',
    '.blog-title'
  ],
  
  link: [
    'a.w-inline-block',      // Webflow link wrapper
    'a[href*="/post"]',
    'a[href*="/blog"]',
    'h2 a',
    'h3 a',
    '.post-link',
    'a[class*="link"]'
  ],
  
  content: [
    '.rich-text',            // Webflow rich text
    '.text-block',           // Webflow text block
    'p',
    '.excerpt',
    '.description',
    '[class*="excerpt"]',
    '[class*="description"]',
    '.post-content'
  ],
  
  // Additional metadata selectors for Webflow
  date: [
    '.post-date',
    '[class*="date"]',
    'time'
  ],
  
  category: [
    '.post-category',
    '[class*="category"]',
    '.tag'
  ]
};

// Export as default for easy import
export default sentientBlogSelectors;