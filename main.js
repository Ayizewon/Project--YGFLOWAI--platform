// Apify Actor — Crawlee v3 + PlaywrightCrawler
const { Actor } = require('apify')
const { PlaywrightCrawler } = require('crawlee')

const PLATFORM_URL = {
  zhihu:     kw => `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(kw)}`,
  juejin:    kw => `https://juejin.cn/search?query=${encodeURIComponent(kw)}&type=0`,
  csdn:      kw => `https://so.csdn.net/so/search?q=${encodeURIComponent(kw)}&t=blog`,
  weibo:     kw => `https://s.weibo.com/weibo?q=${encodeURIComponent(kw)}`,
  baidu:     kw => `https://www.baidu.com/s?wd=${encodeURIComponent(kw)}`,
  douyin:    kw => `https://www.douyin.com/search/${encodeURIComponent(kw)}`,
  weixin:    kw => `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(kw)}`,
  facebook:  kw => `https://www.facebook.com/search/posts?q=${encodeURIComponent(kw)}`,
  tiktok:    kw => `https://www.tiktok.com/search?q=${encodeURIComponent(kw)}`,
  twitter:   kw => `https://twitter.com/search?q=${encodeURIComponent(kw)}&src=typed_query&f=live`,
  instagram: kw => `https://www.instagram.com/explore/tags/${encodeURIComponent(kw)}/`,
  youtube:   kw => `https://www.youtube.com/results?search_query=${encodeURIComponent(kw)}`,
  reddit:    kw => `https://www.reddit.com/search/?q=${encodeURIComponent(kw)}&sort=new`
}

// 等待条件 + 提取逻辑（在浏览器中执行，不能引用外部变量）
const PLATFORM_CONFIG = {
  zhihu:    { wait: '.SearchResult-Card',        fn: () => [...document.querySelectorAll('.SearchResult-Card')].map(el => ({ title: el.querySelector('.ContentItem-title')?.textContent.trim() || '', summary: el.querySelector('.RichText')?.textContent.trim().slice(0,100) || '', author: el.querySelector('.UserLink-link')?.textContent.trim() || '', publishTime: el.querySelector('.ContentItem-time')?.textContent.replace('发布于 ','').trim() || '', url: el.querySelector('a[data-za-detail-view-element_name="Title"]')?.href || '' })) },
  juejin:   { wait: '.search-list-box .item',    fn: () => [...document.querySelectorAll('.search-list-box .item')].map(el => ({ title: el.querySelector('.title')?.textContent.trim() || '', summary: el.querySelector('.brief')?.textContent.trim() || '', author: el.querySelector('.username')?.textContent.trim() || '', publishTime: el.querySelector('.time')?.textContent.trim() || '', url: 'https://juejin.cn' + (el.querySelector('a.title')?.getAttribute('href') || '') })) },
  csdn:     { wait: '#content_list .list-box-cont', fn: () => [...document.querySelectorAll('#content_list .list-box-cont')].map(el => ({ title: el.querySelector('.title a')?.textContent.trim() || '', summary: el.querySelector('.content')?.textContent.trim().slice(0,100) || '', author: el.querySelector('.avatar-box span')?.textContent.trim() || '', publishTime: el.querySelector('.time')?.textContent.trim() || '', url: el.querySelector('.title a')?.href || '' })) },
  weibo:    { wait: '.card-feed',                fn: () => [...document.querySelectorAll('.card-feed')].map(el => ({ title: el.querySelector('.txt')?.textContent.trim().slice(0,60) || '', summary: el.querySelector('.txt')?.textContent.trim().slice(0,100) || '', author: el.querySelector('.name')?.textContent.trim() || '', publishTime: el.querySelector('.from a')?.textContent.trim() || '', url: el.querySelector('.from a')?.href || '' })) },
  weixin:   { wait: '.news-box .news-list li',   fn: () => [...document.querySelectorAll('.news-box .news-list li')].map(el => ({ title: el.querySelector('h3')?.textContent.trim() || '', summary: el.querySelector('p')?.textContent.trim() || '', author: el.querySelector('.account')?.textContent.trim() || '', publishTime: el.querySelector('.s2')?.textContent.trim() || '', url: el.querySelector('a')?.href || '' })) },
  baidu:    { wait: '#content_left .result',     fn: () => [...document.querySelectorAll('#content_left .result')].map(el => ({ title: el.querySelector('h3')?.textContent.trim() || '', summary: (el.querySelector('.content-right_8Zs40') || el.querySelector('.c-abstract'))?.textContent.trim().slice(0,100) || '', author: '', publishTime: (el.querySelector('.newTimeFactor_new_oqdy5') || el.querySelector('.c-color-gray'))?.textContent.trim() || '', url: el.querySelector('a')?.href || '' })) },
  douyin:   { wait: '[data-e2e="search-video-card"]', fn: () => [...document.querySelectorAll('[data-e2e="search-video-card"]')].map(el => ({ title: el.querySelector('[data-e2e="search-card-desc"]')?.textContent.trim() || '', summary: el.querySelector('[data-e2e="search-card-desc"]')?.textContent.trim().slice(0,100) || '', author: el.querySelector('[data-e2e="search-card-author-name"]')?.textContent.trim() || '', publishTime: '', url: el.querySelector('a')?.href || '' })) },
  facebook: { wait: '[role="article"]',          fn: () => [...document.querySelectorAll('[role="article"]')].map(el => ({ title: el.querySelector('span[dir="auto"]')?.textContent.trim().slice(0,60) || '', summary: el.querySelector('span[dir="auto"]')?.textContent.trim().slice(0,100) || '', author: (el.querySelector('strong a') || el.querySelector('h3 a'))?.textContent.trim() || '', publishTime: el.querySelector('abbr[data-utime]')?.title || '', url: el.querySelector('a[role="link"]')?.href || '' })) },
  tiktok:   { wait: '[data-e2e="search_top-item"]', fn: () => [...document.querySelectorAll('[data-e2e="search_top-item"]')].map(el => ({ title: el.querySelector('[data-e2e="search-card-desc"]')?.textContent.trim() || '', summary: el.querySelector('[data-e2e="search-card-desc"]')?.textContent.trim().slice(0,100) || '', author: el.querySelector('[data-e2e="search-card-user-unique-id"]')?.textContent.trim() || '', publishTime: '', url: el.querySelector('a')?.href || '' })) },
  twitter:  { wait: 'article[data-testid="tweet"]', fn: () => [...document.querySelectorAll('article[data-testid="tweet"]')].map(el => ({ title: el.querySelector('[data-testid="tweetText"]')?.textContent.trim().slice(0,60) || '', summary: el.querySelector('[data-testid="tweetText"]')?.textContent.trim().slice(0,100) || '', author: el.querySelector('[data-testid="User-Name"] span')?.textContent.trim() || '', publishTime: el.querySelector('time')?.getAttribute('datetime') || '', url: 'https://twitter.com' + (el.querySelector('a[href*="/status/"]')?.getAttribute('href') || '') })) },
  instagram:{ wait: 'article',                   fn: () => [...document.querySelectorAll('article')].map(el => ({ title: el.querySelector('img')?.alt || '', summary: (el.querySelector('img')?.alt || '').slice(0,100), author: el.querySelector('header a')?.textContent.trim() || '', publishTime: el.querySelector('time')?.getAttribute('datetime') || '', url: 'https://www.instagram.com' + (el.querySelector('a[href*="/p/"]')?.getAttribute('href') || '') })) },
  youtube:  { wait: 'ytd-video-renderer',        fn: () => [...document.querySelectorAll('ytd-video-renderer')].map(el => ({ title: el.querySelector('#video-title')?.textContent.trim() || '', summary: el.querySelector('#description-text')?.textContent.trim() || '', author: el.querySelector('.ytd-channel-name a')?.textContent.trim() || '', publishTime: el.querySelector('#metadata-line span:last-child')?.textContent.trim() || '', url: 'https://www.youtube.com' + (el.querySelector('a#video-title')?.getAttribute('href') || '') })) },
  reddit:   { wait: '[data-testid="post-container"]', fn: () => [...document.querySelectorAll('[data-testid="post-container"]')].map(el => ({ title: el.querySelector('h3')?.textContent.trim() || '', summary: el.querySelector('[data-click-id="body"] p')?.textContent.trim().slice(0,100) || '', author: el.querySelector('[data-testid="post_author_link"]')?.textContent.trim() || '', publishTime: el.querySelector('a[data-click-id="timestamp"]')?.textContent.trim() || '', url: 'https://www.reddit.com' + (el.querySelector('a[data-click-id="timestamp"]')?.getAttribute('href') || '') })) }
}

Actor.main(async () => {
  const { platforms = [], keyword = '', totalCount = 100 } = await Actor.getInput()

  if (!platforms.length || !keyword) {
    console.log('Missing platforms or keyword'); return
  }

  const perPlatform = Math.ceil(totalCount / platforms.length)

  // 直接传 URL 数组，避免 RequestQueue 初始化问题
  const requests = platforms
    .filter(p => PLATFORM_URL[p])
    .map(p => ({ url: PLATFORM_URL[p](keyword), label: p }))

  const crawler = new PlaywrightCrawler({
    launchContext: {
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
      }
    },
    preNavigationHooks: [async ({ page }) => {
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' })
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false })
      })
    }],
    async requestHandler({ page, request }) {
      const platform = request.label
      const cfg = PLATFORM_CONFIG[platform]
      if (!cfg) return

      try { await page.waitForSelector(cfg.wait, { timeout: 15000 }) } catch {}

      const items = await page.evaluate(cfg.fn)
      const result = items.slice(0, perPlatform).map(item => ({ platform, ...item }))
      if (result.length) await Actor.pushData(result)
      console.log(`${platform}: ${result.length} items`)
    },
    failedRequestHandler({ request, error }) {
      console.error(`Failed ${request.label}: ${error.message}`)
    }
  })

  await crawler.run(requests)
})