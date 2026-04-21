import { XHS_HOST } from '../shared/constants';
import { storage } from '../shared/storage';
import type { Author, RuntimeMessageMap, ScrapeResult } from '../shared/types';

type Message = RuntimeMessageMap[keyof RuntimeMessageMap];

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type !== 'SCAN_SEARCH_RESULTS') {
    return undefined;
  }

  void scanSearchResults()
    .then(sendResponse)
    .catch((error: Error) => {
      sendResponse({
        success: false,
        message: error.message,
        total: 0,
        added: 0,
        merged: 0,
      } satisfies ScrapeResult);
    });

  return true;
});

async function scanSearchResults(): Promise<ScrapeResult> {
  assertValidPage();

  const scrapedAuthors = collectAuthorsFromSearchResults();
  if (scrapedAuthors.length === 0) {
    throw new Error('当前页面还没有可识别的博主卡片，请先滚动搜索结果页加载更多内容。');
  }

  const { authors, added, merged } = await storage.upsertAuthors(scrapedAuthors);

  return {
    success: true,
    message:
      added > 0
        ? `扫描完成，新增 ${added} 位已关注博主。`
        : '扫描完成，本页没有发现新的已关注博主。',
    total: authors.length,
    added,
    merged,
  };
}

function assertValidPage(): void {
  if (window.location.host !== XHS_HOST) {
    throw new Error('请先打开小红书网页版。');
  }

  if (!isSearchResultPage()) {
    throw new Error('请前往小红书搜索结果页，并切换到“已关注”筛选后再扫描。');
  }

  if (document.body.innerText.includes('登录后查看更多') || document.body.innerText.includes('登录后查看')) {
    throw new Error('请先登录小红书网页版。');
  }
}

function isSearchResultPage(): boolean {
  return (
    window.location.pathname.includes('/search_result') ||
    window.location.pathname.includes('/search') ||
    window.location.href.includes('search_result')
  );
}

function collectAuthorsFromSearchResults(): Author[] {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/user/profile/"]'));
  const authorMap = new Map<string, Author>();

  for (const anchor of anchors) {
    const profileUrl = normalizeProfileUrl(anchor.href);
    if (!profileUrl) {
      continue;
    }

    const userId = extractUserId(profileUrl);
    if (!userId) {
      continue;
    }

    const nickname = extractNicknameFromSearchCard(anchor);
    if (!nickname) {
      continue;
    }

    authorMap.set(userId, {
      user_id: userId,
      nickname,
      profile_url: profileUrl,
      tags: [],
    });
  }

  return Array.from(authorMap.values());
}

function normalizeProfileUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl, window.location.origin);
    if (url.host !== XHS_HOST || !url.pathname.includes('/user/profile/')) {
      return null;
    }

    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function extractUserId(profileUrl: string): string | null {
  const segments = new URL(profileUrl).pathname.split('/').filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : null;
}

function extractNicknameFromSearchCard(anchor: HTMLAnchorElement): string {
  const card = anchor.closest<HTMLElement>('section, article, [class*="note"], [class*="user"], [class*="card"]');
  const textCandidates = [
    anchor.getAttribute('title'),
    anchor.getAttribute('aria-label'),
    anchor.textContent,
    card?.querySelector<HTMLElement>('[class*="author"], [class*="name"], [class*="user"]')?.innerText,
    card?.innerText,
    anchor.parentElement?.innerText,
  ];

  for (const candidate of textCandidates) {
    const normalized = candidate?.replace(/\s+/g, ' ').trim();
    if (normalized) {
      const firstLine = normalized.split('\n')[0]?.trim() ?? '';
      if (firstLine && !firstLine.startsWith('http')) {
        return firstLine;
      }
    }
  }

  return '';
}
