// Apify Actor — 使用 PlaywrightCrawler 处理 JS 动态渲染页面
const { Actor } = require('apify')
const { PlaywrightCrawler, RequestQueue } = require('crawlee')

const PLATFORM_URL = {
  zhihu:     (kw) => `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(kw)}`,
  juejin:    (kw) => `https://juejin.cn/search?query=${encodeURIComponent(kw)}&type=0`,
  csdn:      (kw) => `https://so.csdn.net/so/search?q=${encodeURIComponent(kw)}&t=blog`,
  weibo:     (kw) => `https://s.weibo.com/weibo?q=${encodeURIComponent(kw)}`,
  baidu:     (kw) => `https://www.baidu.com/s?wd=${encodeURIComponent(kw)}`,
  douyin:    (kw) => `https://www.douyin.com/search/${encodeURIComponent(kw)}`,
  weixin:    (kw) => `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(kw)}`,
  facebook:  (kw) => `https://www.facebook.com/search/posts?q=${encodeURIComponent(kw)}`,
  tiktok:    (kw) => `https://www.tiktok.com/search?q=${encodeURIComponent(kw)}`,
  twitter:   (kw) => `https://twitter.com/search?q=${encodeURIComponent(kw)}&src=typed_query&f=live`,
  instagram: (kw) => `https://www.instagram.com/explore/tags/${encodeURIComponent(kw)}/`,
  youtube:   (kw) => `https://www.youtube.com/results?search_query=${encodeURIComponent(kw)}`,
  reddit:    (kw) => `https://www.reddit.com/search/?q=${encodeURIComponent(kw)}&sort=new`
}

// 各平台：等待选择器 + page.evaluate 提取数据
const PLATFORM_EXTRACTOR = {
  zhihu: {
    waitFor: '.SearchResult-Card',
    extract: () => [...document.querySelectorAll('.SearchResult-Card')].map(el => ({
      title:       el.querySelector('.ContentItem-title')?.textContent.trim() || '',
      summary:     el.querySelector('.RichText')?.textContent.trim().slice(0, 100) || '',
      author:      el.querySelector('.UserLink-link')?.textContent.trim() || '',
      publishTime: el.querySelector('.ContentItem-time')?.textContent.replace('发布于 ','').trim() || '',
      url:         el.querySelector('a[data-za-detail-view-element_name="Title"]')?.href || ''
    }))
  },
  juejin: {
    waitFor: '.search-list-box .item',
    extract: () => [...document.querySelectorAll('.search-list-box .item')].map(el => ({
      title:       el.querySelector('.title')?.textContent.trim() || '',
      summary:     el.querySelector('.brief')?.textContent.trim() || '',
      author:      el.querySelector('.username')?.textContent.trim() || '',
      publishTime: el.querySelector('.time')?.textContent.trim() || '',
      url:         'https://juejin.cn' + (el.querySelector('a.title')?.getAttribute('href') || '')
    }))
  },
  csdn: {
    waitFor: '#content_list .list-box-cont',
    extract: () => [...document.querySelectorAll('#content_list .list-box-cont')].map(el => ({
      title:       el.querySelector('.title a')?.textContent.trim() || '',
      summary:     el.querySelector('.content')?.textContent.trim().slice(0, 100) || '',
      author:      el.querySelector('.avatar-box span')?.textContent.trim() || '',
      publishTime: el.querySelector('.time')?.textContent.trim() || '',
      url:         el.querySelector('.title a')?.href || ''
    }))
  },
  weibo: {
    waitFor: '.card-feed',
    extract: () => [...document.querySelectorAll('.card-feed')].map(el => ({
      title:       el.querySelector('.txt')?.textContent.trim().slice(0, 60) || '',
      summary:     el.querySelector('.txt')?.textContent.trim().slice(0, 100) || '',
      author:      el.querySelector('.name')?.textContent.trim() || '',
      publishTime: el.querySelector('.from a')?.textContent.trim() || '',
      url:         el.querySelector('.from a')?.href || ''
    }))
  },
  weixin: {
    waitFor: '.news-box .news-list li',
    extract: () => [...document.querySelectorAll('.news-box .news-list li')].map(el => ({
      title:       el.querySelector('h3')?.textContent.trim() || '',
      summary:     el.querySelector('p')?.textContent.trim() || '',
      author:      el.querySelector('.account')?.textContent.trim() || '',
      publishTime: el.querySelector('.s2')?.textContent.trim() || '',
      url:         el.querySelector('a')?.href || ''
    }))
  },
  baidu: {
    waitFor: '#content_left .result',
    extract: () => [...document.querySelectorAll('#content_left .result')].map(el => ({
      title:       el.querySelector('h3')?.textContent.trim() || '',
      summary:     el.querySelector('.content-right_8Zs40, .c-abstract')?.textContent.trim().slice(0, 100) || '',
      author:      el.querySelector('.tts-title, .c-author')?.textContent.trim() || '',
      publishTime: el.querySelector('.newTimeFactor_new_oqdy5, .c-color-gray')?.textContent.trim() || '',
      url:         el.querySelector('a')?.href || ''
    }))
  },
  douyin: {
    waitFor: '[data-e2e="search-video-card"]',
    extract: () => [...document.querySelectorAll('[data-e2e="search-video-card"]')].map(el => ({
      title:       el.querySelector('[data-e2e="search-card-desc"]')?.textContent.trim() || '',
      summary:     el.querySelector('[data-e2e="search-card-desc"]')?.textContent.trim().slice(0, 100) || '',
      author:      el.querySelector('[data-e2e="search-card-author-name"]')?.textContent.trim() || '',
      publishTime: '',
      url:         el.querySelector('a')?.href || ''
    }))
  },
  facebook: {
    waitFor: '[role="article"]',
    extract: () => [...document.querySelectorAll('[role="article"]')].map(el => ({
      title:       el.querySelector('span[dir="auto"]')?.textContent.trim().slice(0, 60) || '',
      summary:     el.querySelector('span[dir="auto"]')?.textContent.trim().slice(0, 100) || '',
      author:      el.querySelector('strong a, h3 a')?.textContent.trim() || '',
      publishTime: el.querySelector('abbr[data-utime]')?.title || '',
      url:         el.querySelector('a[role="link"]')?.href || ''
    }))
  },
  tiktok: {
    waitFor: '[data-e2e="search_top-item"]',
    extract: () => [...document.querySelectorAll('[data-e2e="search_top-item"]')].map(el => ({
      title:       el.querySelector('[data-e2e="search-card-desc"]')?.textContent.trim() || '',
      summary:     el.querySelector('[data-e2e="search-card-desc"]')?.textContent.trim().slice(0, 100) || '',
      author:      el.querySelector('[data-e2e="search-card-user-unique-id"]')?.textContent.trim() || '',
      publishTime: '',
      url:         el.querySelector('a')?.href || ''
    }))
  },
  twitter: {
    waitFor: 'article[data-testid="tweet"]',
    extract: () => [...document.querySelectorAll('article[data-testid="tweet"]')].map(el => ({
      title:       el.querySelector('[data-testid="tweetText"]')?.textContent.trim().slice(0, 60) || '',
      summary:     el.querySelector('[data-testid="tweetText"]')?.textContent.trim().slice(0, 100) || '',
      author:      el.querySelector('[data-testid="User-Name"] span')?.textContent.trim() || '',
      publishTime: el.querySelector('time')?.getAttribute('datetime') || '',
      url:         'https://twitter.com' + (el.querySelector('a[href*="/status/"]')?.getAttribute('href') || '')
    }))
  },
  instagram: {
    waitFor: 'article',
    extract: () => [...document.querySelectorAll('article')].map(el => ({
      title:       el.querySelector('img')?.alt || '',
      summary:     el.querySelector('img')?.alt.slice(0, 100) || '',
      author:      el.querySelector('header a')?.textContent.trim() || '',
      publishTime: el.querySelector('time')?.getAttribute('datetime') || '',
      url:         'https://www.instagram.com' + (el.querySelector('a[href*="/p/"]')?.getAttribute('href') || '')
    }))
  },
  youtube: {
    waitFor: 'ytd-video-renderer',
    extract: () => [...document.querySelectorAll('ytd-video-renderer')].map(el => ({
      title:       el.querySelector('#video-title')?.textContent.trim() || '',
      summary:     el.querySelector('#description-text')?.textContent.trim() || '',
      author:      el.querySelector('.ytd-channel-name a')?.textContent.trim() || '',
      publishTime: el.querySelector('#metadata-line span:last-child')?.textContent.trim() || '',
      url:         'https://www.youtube.com' + (el.querySelector('a#video-title')?.getAttribute('href') || '')
    }))
  },
  reddit: {
    waitFor: '[data-testid="post-container"]',
    extract: () => [...document.querySelectorAll('[data-testid="post-container"]')].map(el => ({
      title:       el.querySelector('h3')?.textContent.trim() || '',
      summary:     el.querySelector('[data-click-id="body"] p')?.textContent.trim().slice(0, 100) || '',
      author:      el.querySelector('[data-testid="post_author_link"]')?.textContent.trim() || '',
      publishTime: el.querySelector('a[data-click-id="timestamp"]')?.textContent.trim() || '',
      url:         'https://www.reddit.com' + (el.querySelector('a[data-click-id="timestamp"]')?.getAttribute('href') || '')
    }))
  }
}

Actor.main(async () => {
  const { platforms = [], keyword = '', contentTypes = ['post'], totalCount = 100 } = await Actor.getInput()
  const perPlatform = Math.ceil(totalCount / platforms.length)
  const dataset = await Actor.openDataset()
  const requestQueue = await RequestQueue.open()

  for (const platform of platforms) {
    const url = PLATFORM_URL[platform]?.(keyword)
    if (url) await requestQueue.addRequest({ url, userData: { platform } })
  }

  const crawler = new PlaywrightCrawler({
    requestQueue,
    maxRequestsPerCrawl: platforms.length,
    launchContext: { launchOptions: { headless: true } },
    async requestHandler({ page, request }) {
      const { platform } = request.userData
      const ext = PLATFORM_EXTRACTOR[platform]
      if (!ext) return

      try {
        await page.waitForSelector(ext.waitFor, { timeout: 15000 })
      } catch {
        // 选择器等待超时，仍尝试提取
      }

      const items = await page.evaluate(ext.extract)
      const mapped = items
        .slice(0, perPlatform)
        .map(item => ({ platform, ...item }))

      if (mapped.length) await dataset.pushData(mapped)
    },
    failedRequestHandler({ request }) {
      console.error(`Failed: ${request.url}`)
    }
  })

  await crawler.run()
})
