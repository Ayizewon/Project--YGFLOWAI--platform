// Apify Actor 入口 — 部署到 Apify 平台
// 输入字段: platforms(array), keyword(string), contentTypes(array), totalCount(number), from(string), to(string)
const { Actor } = require('apify')
const { CheerioCrawler, RequestQueue } = require('crawlee')

// 各平台搜索URL构造
const PLATFORM_URL = {
  zhihu:  (kw) => `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(kw)}`,
  juejin: (kw) => `https://juejin.cn/search?query=${encodeURIComponent(kw)}&type=0`,
  csdn:   (kw) => `https://so.csdn.net/so/search?q=${encodeURIComponent(kw)}&t=blog`,
  weibo:  (kw) => `https://s.weibo.com/weibo?q=${encodeURIComponent(kw)}`,
  baidu:  (kw) => `https://www.baidu.com/s?wd=${encodeURIComponent(kw)}`,
  douyin: (kw) => `https://www.douyin.com/search/${encodeURIComponent(kw)}`,
  weixin: (kw) => `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(kw)}`,
  // 国际平台（JS渲染，需配合 PlaywrightCrawler 使用）
  facebook:  (kw) => `https://www.facebook.com/search/posts?q=${encodeURIComponent(kw)}`,
  tiktok:    (kw) => `https://www.tiktok.com/search?q=${encodeURIComponent(kw)}`,
  twitter:   (kw) => `https://twitter.com/search?q=${encodeURIComponent(kw)}&src=typed_query&f=live`,
  instagram: (kw) => `https://www.instagram.com/explore/tags/${encodeURIComponent(kw)}/`,
  youtube:   (kw) => `https://www.youtube.com/results?search_query=${encodeURIComponent(kw)}`,
  reddit:    (kw) => `https://www.reddit.com/search/?q=${encodeURIComponent(kw)}&sort=new`
}

// 各平台结果解析
const PLATFORM_PARSER = {
  zhihu($ ) {
    const items = []
    $('.SearchResult-Card').each((_, el) => {
      items.push({
        title:       $(el).find('.ContentItem-title').text().trim(),
        summary:     $(el).find('.RichText').text().trim().slice(0, 100),
        author:      $(el).find('.UserLink-link').first().text().trim(),
        publishTime: $(el).find('.ContentItem-time').text().replace('发布于 ','').trim(),
        url:         $(el).find('a[data-za-detail-view-element_name="Title"]').attr('href') || ''
      })
    })
    return items
  },
  juejin($) {
    const items = []
    $('.search-list-box .item').each((_, el) => {
      items.push({
        title:       $(el).find('.title').text().trim(),
        summary:     $(el).find('.brief').text().trim(),
        author:      $(el).find('.username').text().trim(),
        publishTime: $(el).find('.time').text().trim(),
        url:         'https://juejin.cn' + ($(el).find('a.title').attr('href') || '')
      })
    })
    return items
  },
  csdn($) {
    const items = []
    $('#content_list .list-box-cont').each((_, el) => {
      items.push({
        title:       $(el).find('.title a').text().trim(),
        summary:     $(el).find('.content').text().trim().slice(0, 100),
        author:      $(el).find('.avatar-box span').text().trim(),
        publishTime: $(el).find('.time').text().trim(),
        url:         $(el).find('.title a').attr('href') || ''
      })
    })
    return items
  },
  weibo($) {
    const items = []
    $('.card-feed').each((_, el) => {
      items.push({
        title:       $(el).find('.txt').text().trim().slice(0, 60),
        summary:     $(el).find('.txt').text().trim().slice(0, 100),
        author:      $(el).find('.name').first().text().trim(),
        publishTime: $(el).find('.from a').first().text().trim(),
        url:         'https://weibo.com' + ($(el).find('.from a').first().attr('href') || '')
      })
    })
    return items
  },
  weixin($) {
    const items = []
    $('.news-box .news-list li').each((_, el) => {
      items.push({
        title:       $(el).find('h3').text().trim(),
        summary:     $(el).find('p').text().trim(),
        author:      $(el).find('.account').text().trim(),
        publishTime: $(el).find('.s2').text().trim(),
        url:         $(el).find('a').attr('href') || ''
      })
    })
    return items
  },
  baidu($) {
    const items = []
    $('#content_left .result').each((_, el) => {
      items.push({
        title:       $(el).find('h3').text().trim(),
        summary:     $(el).find('.content-right_8Zs40').text().trim().slice(0, 100),
        author:      $(el).find('.tts-title').text().trim(),
        publishTime: $(el).find('.newTimeFactor_new_oqdy5').text().trim(),
        url:         $(el).find('a').attr('href') || ''
      })
    })
    return items
  },
  douyin($) {
    const items = []
    $('[data-e2e="search-video-card"]').each((_, el) => {
      items.push({
        title:       $(el).find('[data-e2e="search-card-desc"]').text().trim(),
        summary:     $(el).find('[data-e2e="search-card-desc"]').text().trim().slice(0, 100),
        author:      $(el).find('[data-e2e="search-card-author-name"]').text().trim(),
        publishTime: $(el).find('.videoCard-playCount').text().trim(),
        url:         ''
      })
    })
    return items
  },
  // ── 国际平台（JS渲染，建议配合 PlaywrightCrawler） ──
  facebook($) {
    const items = []
    $('[role="article"]').each((_, el) => {
      items.push({
        title:       $(el).find('span[dir="auto"]').first().text().trim().slice(0, 60),
        summary:     $(el).find('span[dir="auto"]').first().text().trim().slice(0, 100),
        author:      $(el).find('strong a, h3 a').first().text().trim(),
        publishTime: $(el).find('abbr[data-utime], a[aria-label]').attr('title') || '',
        url:         $(el).find('a[aria-label]').attr('href') || ''
      })
    })
    return items
  },
  tiktok($) {
    const items = []
    $('[data-e2e="search_top-item"]').each((_, el) => {
      items.push({
        title:       $(el).find('[data-e2e="search-card-desc"]').text().trim(),
        summary:     $(el).find('[data-e2e="search-card-desc"]').text().trim().slice(0, 100),
        author:      $(el).find('[data-e2e="search-card-user-unique-id"]').text().trim(),
        publishTime: '',
        url:         $(el).find('a').attr('href') || ''
      })
    })
    return items
  },
  twitter($) {
    const items = []
    $('article[data-testid="tweet"]').each((_, el) => {
      items.push({
        title:       $(el).find('[data-testid="tweetText"]').text().trim().slice(0, 60),
        summary:     $(el).find('[data-testid="tweetText"]').text().trim().slice(0, 100),
        author:      $(el).find('[data-testid="User-Name"] span').first().text().trim(),
        publishTime: $(el).find('time').attr('datetime') || '',
        url:         'https://twitter.com' + ($(el).find('a[href*="/status/"]').attr('href') || '')
      })
    })
    return items
  },
  instagram($) {
    const items = []
    $('article').each((_, el) => {
      items.push({
        title:       $(el).find('img').attr('alt') || '',
        summary:     $(el).find('img').attr('alt') || '',
        author:      $(el).find('header a').text().trim(),
        publishTime: $(el).find('time').attr('datetime') || '',
        url:         'https://www.instagram.com' + ($(el).find('a[href*="/p/"]').attr('href') || '')
      })
    })
    return items
  },
  youtube($) {
    const items = []
    $('ytd-video-renderer, ytd-search-pyv-renderer').each((_, el) => {
      items.push({
        title:       $(el).find('#video-title').text().trim(),
        summary:     $(el).find('#description-text').text().trim(),
        author:      $(el).find('.ytd-channel-name a').text().trim(),
        publishTime: $(el).find('#metadata-line span:last-child').text().trim(),
        url:         'https://www.youtube.com' + ($(el).find('a#video-title').attr('href') || '')
      })
    })
    return items
  },
  reddit($) {
    const items = []
    $('div[data-testid="post-container"]').each((_, el) => {
      items.push({
        title:       $(el).find('h3').text().trim(),
        summary:     $(el).find('[data-click-id="body"] p').text().trim().slice(0, 100),
        author:      $(el).find('[data-testid="post_author_link"]').text().trim(),
        publishTime: $(el).find('a[data-click-id="timestamp"]').text().trim(),
        url:         'https://www.reddit.com' + ($(el).find('a[data-click-id="timestamp"]').attr('href') || '')
      })
    })
    return items
  }
}

Actor.main(async () => {
  const { platforms = [], keyword = '', contentTypes = ['post'], totalCount = 100 } = await Actor.getInput()

  const dataset = await Actor.openDataset()
  const requestQueue = await RequestQueue.open()

  for (const platform of platforms) {
    const url = PLATFORM_URL[platform]?.(keyword)
    if (url) await requestQueue.addRequest({ url, userData: { platform } })
  }

  const crawler = new CheerioCrawler({
    requestQueue,
    maxRequestsPerCrawl: platforms.length,
    async requestHandler({ request, $ }) {
      const { platform } = request.userData
      const parser = PLATFORM_PARSER[platform]
      if (!parser) return
      const items = parser($)
        .slice(0, Math.ceil(totalCount / platforms.length))
        .map(item => ({ platform, ...item }))
        .filter(item => {
          if (!contentTypes.includes('post') && !contentTypes.includes('comment')) return false
          return true
        })
      await dataset.pushData(items)
    }
  })

  await crawler.run()
})