import { useEffect, useState } from 'react';
import { storage } from '../shared/storage';
import { XHS_HOST } from '../shared/constants';
import type { Author, Tag } from '../shared/types';

type StatusTone = 'idle' | 'success' | 'error';
type ViewMode = 'authors' | 'tags';
type ScanMode = 'page' | 'auto';
type ScanProgressMessage = {
  type: 'SCAN_PROGRESS';
  sessionId: string;
  mode: ScanMode;
  round: number;
  detectedProfiles: number;
  usedScrollableContainer: boolean;
};

const TAG_RECOMMENDATION_KEYWORDS: Record<string, string[]> = {
  美食: ['美食', '探店', '吃货', '餐厅', '料理', '烘焙', '咖啡', '甜品', '火锅', '小吃', '早餐', '下午茶', '夜宵', '菜谱', '家常菜', '饮品', '奶茶'],
  穿搭: ['穿搭', 'ootd', '搭配', '时尚', '服饰', '女装', '男装', '鞋子', '包包', '首饰', '通勤穿搭', '显瘦', 'lookbook'],
  旅行: ['旅行', '旅游', '攻略', '出行', '酒店', '机票', '民宿', 'citywalk', '打卡', '景点', '自由行', '周末去哪', '路线'],
  摄影: ['摄影', '拍照', '相机', '修图', '镜头', '人像', '胶片', '写真', '构图', '后期', '滤镜'],
  健身: ['健身', '减脂', '塑形', '跑步', '瑜伽', '训练', '增肌', '体态', '普拉提', '燃脂', '运动'],
  美妆: ['美妆', '护肤', '彩妆', '口红', '香水', '面膜', '粉底', '化妆', '底妆', '眼影', '腮红', '护发'],
  母婴: ['母婴', '宝宝', '育儿', '孕妈', '早教', '辅食', '带娃', '亲子', '儿童', '婴儿', '宝妈'],
  家居: ['家居', '收纳', '装修', '软装', '居家', '清洁', '房间', '卧室', '客厅', '家装', '生活好物'],
  学习: ['学习', '英语', '留学', '职场', '效率', '考研', '课程', '自律', '面试', '写作', '备考', '复习', '刷题'],
  数码: ['数码', '手机', '电脑', 'ipad', '耳机', '测评', '科技', '相机参数', '键盘', '显示器', 'app推荐'],
  手帐: ['手帐', '手账', '拼贴', '胶带', '排版', '本子', '文具', '贴纸', '笔记本', '手帐素材', '文具店', '手帐店', '印章'],
  阅读: ['阅读', '书单', '读书', '书评', '荐书', '文学', '小说', '非虚构', '阅读笔记'],
  宠物: ['宠物', '猫咪', '狗狗', '养猫', '养狗', '萌宠', '宠物日常', '猫猫', '狗子'],
  生活: ['生活', 'vlog', '日常', '好物', '开箱', '生活方式', '居家日常'],
  搞笑: ['搞笑', '喜剧', '段子', '整活', '沙雕', '幽默', '爆笑'],
  绘画: ['绘画', '画画', '插画', '板绘', '水彩', '素描', '临摹', 'procreate'],
};
const DEFAULT_RECOMMENDATION_TAGS = Object.keys(TAG_RECOMMENDATION_KEYWORDS);
const DEFAULT_TAG_NAME_SET = new Set(DEFAULT_RECOMMENDATION_TAGS);
const NICKNAME_WEAK_KEYWORDS: Record<string, string[]> = {
  美食: ['奶茶', '咖啡', '甜品'],
  宠物: ['猫', '狗'],
  学习: ['笔记', '课程'],
  生活: ['生活', '日常', '记录', '分享'],
};
const SECONDARY_COLLECT_DELAY_MS = 4500;
const SECONDARY_COLLECT_SETTLE_MS = 2500;
const SECONDARY_COLLECT_TIMEOUT_MS = 20000;
const VERIFICATION_PATTERNS = [
  '安全验证',
  '为保护账号安全',
  '扫码验证身份',
  '已登录该账号的「小红书APP」',
  '二维码1分钟失效',
];
const NOISE_SUMMARY_PATTERNS = [
  '行吟信息科技（上海）有限公司',
  '行吟信息科技(上海)有限公司',
  '版权所有',
  '沪ICP备',
  '增值电信业务经营许可证',
  '网络文化经营许可证',
  '小红书APP',
  '问题反馈',
  '复制 LaTeX 公式',
  '已复制',
];

function cleanNicknameText(rawText: string): string {
  return rawText
    .replace(/\s+/g, ' ')
    .replace(/(?:19|20)\d{2}[-/.年](?:0?[1-9]|1[0-2])[-/.月](?:0?[1-9]|[12]\d|3[01])日?$/g, '')
    .replace(/(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])$/g, '')
    .replace(/(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])$/g, '')
    .replace(/\d{1,2}:\d{2}$/g, '')
    .trim();
}

function getTwoCharSegments(input: string): string[] {
  const normalized = input.replace(/\s+/g, '').trim();
  const segments = new Set<string>();

  for (let index = 0; index < normalized.length - 1; index += 1) {
    segments.add(normalized.slice(index, index + 2));
  }

  return Array.from(segments);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function delay(ms: number) {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function waitForTabComplete(tabId: number, timeoutMs = SECONDARY_COLLECT_TIMEOUT_MS) {
  const currentTab = await chrome.tabs.get(tabId);
  if (currentTab.status === 'complete') {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('二次搜集打开博主主页超时，请稍后重试。'));
    }, timeoutMs);

    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId !== tabId) {
        return;
      }

      if (changeInfo.status === 'complete') {
        window.clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function collectAuthorProfileSummariesSlowly(
  candidates: Author[],
  onProgress?: (finished: number, total: number, nickname: string) => void,
): Promise<
  Array<{
    user_id: string;
    nickname?: string;
    avatar_url?: string;
    profile_summary?: string;
    verification_detected?: boolean;
    raw_lines?: string[];
  }>
> {
  const activeTab = await getActiveTab();
  const windowId = activeTab.windowId;
  const updates: Array<{
    user_id: string;
    nickname?: string;
    avatar_url?: string;
    profile_summary?: string;
    verification_detected?: boolean;
    raw_lines?: string[];
  }> = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    let createdTabId: number | null = null;

    try {
      onProgress?.(index, candidates.length, candidate.nickname);

      const tab = await chrome.tabs.create({
        url: candidate.profile_url,
        active: false,
        windowId,
      });
      createdTabId = tab.id ?? null;
      if (!createdTabId) {
        continue;
      }

      await waitForTabComplete(createdTabId);
      await delay(SECONDARY_COLLECT_SETTLE_MS);

      const results = await chrome.scripting.executeScript({
        target: { tabId: createdTabId },
        func: () => {
          const normalizeText = (input: string) =>
            input.replace(/\s+/g, ' ').replace(/[|｜]+/g, ' ').trim();
          const verificationPatterns = [
            '安全验证',
            '为保护账号安全',
            '扫码验证身份',
            '已登录该账号的「小红书APP」',
            '二维码1分钟失效',
          ];

          const shouldIgnoreText = (text: string) =>
            /^关注$|^粉丝$|^获赞与收藏$|^IP属地/.test(text) ||
            /^编辑资料$|^发消息$|^私信$/.test(text) ||
            /^小红书号[:：]/.test(text) ||
            /^[0-9.]+万?$/.test(text) ||
            NOISE_SUMMARY_PATTERNS.some((pattern) => text.includes(pattern));

          const avatarUrl =
            document.querySelector<HTMLImageElement>(
              'img[class*="avatar"], img[class*="user"], img[alt*="头像"]',
            )?.src || undefined;

          const metaCandidates = [
            document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
            document.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
            document.title,
          ];

          const selectorTextCandidates = Array.from(
            document.querySelectorAll<HTMLElement>([
              'main [class*="desc"]',
              'main [class*="intro"]',
              'main [class*="bio"]',
              'main [class*="profile"] p',
              'main [class*="profile"] span',
              'main [class*="info"] p',
              'main [class*="info"] span',
              'main [class*="user"] p',
              'main [class*="user"] span',
              'main div',
            ].join(', ')),
          ).map((element) => element.innerText);

          const topAreaCandidates = Array.from(
            document.querySelectorAll<HTMLElement>('main p, main span, main h1, main h2, main div'),
          )
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.top >= 0 && rect.top <= 1200 && rect.height > 0;
            })
            .map((element) => element.innerText);

          const treeWalker = document.createTreeWalker(
            document.querySelector('main') ?? document.body,
            NodeFilter.SHOW_TEXT,
          );
          const textNodeCandidates: string[] = [];
          let currentNode = treeWalker.nextNode();
          while (currentNode) {
            const rawText = normalizeText(currentNode.textContent || '');
            const parent = currentNode.parentElement;
            const rect = parent?.getBoundingClientRect();

            if (
              rawText.length >= 2 &&
              rawText.length <= 120 &&
              rect &&
              rect.top >= 0 &&
              rect.top <= 950 &&
              rect.height > 0 &&
              !shouldIgnoreText(rawText)
            ) {
              textNodeCandidates.push(rawText);
            }

            currentNode = treeWalker.nextNode();
          }

          const firstScreenBlockCandidates = Array.from(
            document.querySelectorAll<HTMLElement>('main section, main article, main div'),
          )
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              if (rect.top < 0 || rect.top > 900 || rect.height < 40) {
                return false;
              }

              const text = normalizeText(element.innerText || '');
              return text.length >= 8 && text.length <= 300;
            })
            .map((element) => element.innerText);

          const bodyLineCandidates = (document.body.innerText || '')
            .split('\n')
            .map(normalizeText)
            .filter((text) => text.length >= 2 && text.length <= 80)
            .filter((text) => !shouldIgnoreText(text))
            .slice(0, 40);

          const summaryParts = [
            ...metaCandidates,
            ...selectorTextCandidates,
            ...topAreaCandidates,
            ...textNodeCandidates,
            ...firstScreenBlockCandidates,
            ...bodyLineCandidates,
          ]
            .map(normalizeText)
            .filter((text) => text.length >= 2)
            .filter((text) => !shouldIgnoreText(text));

          const verificationDetected = verificationPatterns.some((pattern) =>
            summaryParts.some((text) => text.includes(pattern)),
          );
          const uniqueParts = [...new Set(summaryParts)];
          return {
            avatar_url: avatarUrl,
            profile_summary: verificationDetected
              ? undefined
              : uniqueParts.join(' | ').slice(0, 500),
            verification_detected: verificationDetected,
            raw_lines: uniqueParts.slice(0, 12),
          };
        },
      });

      const result = results[0]?.result;
      if (result?.avatar_url || result?.profile_summary || result?.verification_detected) {
        updates.push({
          user_id: candidate.user_id,
          nickname: candidate.nickname,
          avatar_url: result.avatar_url,
          profile_summary: result.profile_summary || undefined,
          verification_detected: Boolean(result.verification_detected),
          raw_lines: Array.isArray(result.raw_lines) ? result.raw_lines : [],
        });
      }
    } catch {
      // Ignore single profile failures and continue.
    } finally {
      if (createdTabId) {
        try {
          await chrome.tabs.remove(createdTabId);
        } catch {
          // Ignore tab close failures.
        }
      }

      if (index < candidates.length - 1) {
        await delay(SECONDARY_COLLECT_DELAY_MS);
      }
    }
  }

  return updates;
}

async function enhanceAuthorsFromActivePage(
  candidates: Author[],
): Promise<
  Array<{
    user_id: string;
    nickname?: string;
    avatar_url?: string;
    profile_summary?: string;
  }>
> {
  const tab = await getActiveTab();
  if (!tab.id) {
    throw new Error('未找到当前标签页。');
  }

  if (!tab.url?.includes(XHS_HOST)) {
    throw new Error('请先切换到小红书页面后再增强推荐。');
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (
      profiles: Array<{
        user_id: string;
        profile_url: string;
      }>,
    ) => {
      const cleanNickname = (rawText: string): string =>
        rawText
          .replace(/\s+/g, ' ')
          .replace(/(?:19|20)\d{2}[-/.年](?:0?[1-9]|1[0-2])[-/.月](?:0?[1-9]|[12]\d|3[01])日?$/g, '')
          .replace(/(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])$/g, '')
          .replace(/(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])$/g, '')
          .replace(/\d{1,2}:\d{2}$/g, '')
          .trim();

      const delay = (ms: number) =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, ms);
        });

      const candidateIds = new Set(profiles.map((profile) => profile.user_id));

      const collectFromCurrentDom = (
        targetMap: Map<
          string,
          {
            user_id: string;
            nickname?: string;
            avatar_url?: string;
            snippets: Set<string>;
          }
        >,
      ) => {
        const anchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>('a[href*="/user/profile/"]'),
        );

        for (const anchor of anchors) {
          try {
            const url = new URL(anchor.href, window.location.origin);
            const segments = url.pathname.split('/').filter(Boolean);
            const userId = segments.length > 0 ? segments[segments.length - 1] : undefined;
            if (!userId || !candidateIds.has(userId)) {
              continue;
            }

            const card = anchor.closest<HTMLElement>(
              'section, article, [class*="note"], [class*="user"], [class*="card"]',
            );
            const rawText = (
              card?.innerText ||
              anchor.parentElement?.innerText ||
              anchor.textContent ||
              ''
            )
              .replace(/\s+/g, ' ')
              .trim();

            const nickname = cleanNickname(
              (
                anchor.getAttribute('title') ||
                anchor.getAttribute('aria-label') ||
                anchor.textContent ||
                ''
              ).trim(),
            );

            const normalizedSnippet = rawText
              .replace(nickname, '')
              .replace(/(?:19|20)\d{2}[-/.年](?:0?[1-9]|1[0-2])[-/.月](?:0?[1-9]|[12]\d|3[01])日?/g, '')
              .replace(/\d{1,2}:\d{2}/g, '')
              .replace(/\s+/g, ' ')
              .trim();

            const current = targetMap.get(userId) ?? {
              user_id: userId,
              nickname: nickname || undefined,
              avatar_url:
                anchor
                  .closest<HTMLElement>(
                    'section, article, [class*="note"], [class*="user"], [class*="card"]',
                  )
                  ?.querySelector<HTMLImageElement>(
                    'img[class*="avatar"], img[class*="user"], img[alt*="头像"]',
                  )?.src || undefined,
              snippets: new Set<string>(),
            };

            if (nickname && !current.nickname) {
              current.nickname = nickname;
            }

            if (normalizedSnippet) {
              current.snippets.add(normalizedSnippet.slice(0, 240));
            }

            targetMap.set(userId, current);
          } catch {
            // Ignore invalid profile anchors.
          }
        }
      };

      const updates: Array<{
        user_id: string;
        nickname?: string;
        avatar_url?: string;
        profile_summary?: string;
      }> = [];
      const collected = new Map<
        string,
        {
          user_id: string;
          nickname?: string;
          avatar_url?: string;
          snippets: Set<string>;
        }
      >();

      collectFromCurrentDom(collected);

      let previousCount = collected.size;
      for (let round = 0; round < 30; round += 1) {
        window.scrollBy({ top: Math.max(window.innerHeight, 900), behavior: 'auto' });
        await delay(700);
        collectFromCurrentDom(collected);

        if (collected.size <= previousCount) {
          if (round >= 3) {
            break;
          }
        } else {
          previousCount = collected.size;
        }
      }

      window.scrollTo({ top: 0, behavior: 'auto' });

      for (const entry of collected.values()) {
        const profile_summary = Array.from(entry.snippets)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (entry.nickname || profile_summary) {
          updates.push({
            user_id: entry.user_id,
            nickname: entry.nickname,
            avatar_url: entry.avatar_url,
            profile_summary: profile_summary || undefined,
          });
        }
      }

      return updates;
    },
    args: [
      candidates.map((author) => ({
        user_id: author.user_id,
        profile_url: author.profile_url,
      })),
    ],
  });

  return results[0]?.result ?? [];
}

async function scanAuthorsInActivePage(mode: ScanMode, sessionId: string): Promise<{
  authors: Author[];
  diagnostics?: {
    rounds: number;
    detectedProfiles: number;
    usedScrollableContainer: boolean;
  };
}> {
  const tab = await getActiveTab();
  if (!tab.id) {
    throw new Error('未找到当前标签页。');
  }

  if (!tab.url?.includes(XHS_HOST)) {
    throw new Error('请先切换到小红书搜索结果页。');
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (expectedHost: string, scanMode: ScanMode, nextSessionId: string) => {
      type PageAuthor = {
        user_id: string;
        nickname: string;
        profile_url: string;
        tags: string[];
        avatar_url?: string;
        note?: string;
        profile_summary?: string;
      };

      const cleanNickname = (rawText: string): string =>
        rawText
          .replace(/\s+/g, ' ')
          .replace(/(?:19|20)\d{2}[-/.年](?:0?[1-9]|1[0-2])[-/.月](?:0?[1-9]|[12]\d|3[01])日?$/g, '')
          .replace(/(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])$/g, '')
          .replace(/(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])$/g, '')
          .replace(/\d{1,2}:\d{2}$/g, '')
          .trim();

      const isSearchResultPage = () =>
        window.location.pathname.includes('/search_result') ||
        window.location.pathname.includes('/search') ||
        window.location.href.includes('search_result');

      const normalizeProfileUrl = (rawUrl: string): string | null => {
        try {
          const url = new URL(rawUrl, window.location.origin);
          if (url.host !== expectedHost || !url.pathname.includes('/user/profile/')) {
            return null;
          }
          url.search = '';
          url.hash = '';
          return url.toString();
        } catch {
          return null;
        }
      };

      const extractUserId = (profileUrl: string): string | null => {
        const segments = new URL(profileUrl).pathname.split('/').filter(Boolean);
        return segments.length > 0 ? segments[segments.length - 1] : null;
      };

      const extractNickname = (anchor: HTMLAnchorElement): string => {
        const card = anchor.closest<HTMLElement>(
          'section, article, [class*="note"], [class*="user"], [class*="card"]',
        );
        const textCandidates = [
          anchor.getAttribute('title'),
          anchor.getAttribute('aria-label'),
          anchor.textContent,
          card?.querySelector<HTMLElement>('[class*="author"], [class*="name"], [class*="user"]')
            ?.innerText,
          card?.innerText,
          anchor.parentElement?.innerText,
        ];

        for (const candidate of textCandidates) {
          const normalized = candidate?.replace(/\s+/g, ' ').trim();
          if (!normalized) {
            continue;
          }
          const firstLine = normalized.split('\n')[0]?.trim() ?? '';
          const cleaned = cleanNickname(firstLine);
          if (cleaned && !cleaned.startsWith('http')) {
            return cleaned;
          }
        }

        return '';
      };

      const shouldSkipAuthor = (nickname: string, anchor: HTMLAnchorElement): boolean => {
        const normalized = nickname.replace(/\s+/g, '').trim();
        if (normalized === '我' || normalized === '自己' || normalized === '我的主页') {
          return true;
        }

        const explicitLabels = [
          anchor.getAttribute('title'),
          anchor.getAttribute('aria-label'),
          anchor.textContent,
        ]
          .filter(Boolean)
          .map((value) => value!.replace(/\s+/g, '').trim());

        return explicitLabels.includes('我');
      };

      const delay = (ms: number) =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, ms);
        });

      const reportProgress = (round: number, detectedProfiles: number, usedScrollableContainer: boolean) => {
        try {
          chrome.runtime.sendMessage(
            {
              type: 'SCAN_PROGRESS',
              sessionId: nextSessionId,
              mode: scanMode,
              round,
              detectedProfiles,
              usedScrollableContainer,
            },
            () => {
              void chrome.runtime.lastError;
            },
          );
        } catch {
          // ignore progress reporting errors
        }
      };

      const getProfileAnchors = () =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/user/profile/"]'));

      const collectAuthorsFromVisibleDom = (): PageAuthor[] => {
        const authorMap = new Map<string, PageAuthor>();

        for (const anchor of getProfileAnchors()) {
          const profileUrl = normalizeProfileUrl(anchor.href);
          if (!profileUrl) {
            continue;
          }

          const userId = extractUserId(profileUrl);
          if (!userId) {
            continue;
          }

          const nickname = extractNickname(anchor);
          if (!nickname) {
            continue;
          }

          if (shouldSkipAuthor(nickname, anchor)) {
            continue;
          }

          const card = anchor.closest<HTMLElement>(
            'section, article, [class*="note"], [class*="user"], [class*="card"]',
          );
          const rawText = (
            card?.innerText ||
            anchor.parentElement?.innerText ||
            anchor.textContent ||
            ''
          )
            .replace(/\s+/g, ' ')
            .trim();
          const profileSummary = rawText
            .replace(nickname, '')
            .replace(/(?:19|20)\d{2}[-/.年](?:0?[1-9]|1[0-2])[-/.月](?:0?[1-9]|[12]\d|3[01])日?/g, '')
            .replace(/\d{1,2}:\d{2}/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 240);
          const avatarUrl =
            card?.querySelector<HTMLImageElement>(
              'img[class*="avatar"], img[class*="user"], img[alt*="头像"]',
            )?.src ||
            anchor.querySelector<HTMLImageElement>('img')?.src ||
            undefined;

          authorMap.set(userId, {
            user_id: userId,
            nickname,
            profile_url: profileUrl,
            tags: [],
            avatar_url: avatarUrl,
            note: '',
            profile_summary: profileSummary || undefined,
          });
        }

        return Array.from(authorMap.values());
      };

      const mergeCollectedAuthors = (
        targetMap: Map<string, PageAuthor>,
        authors: PageAuthor[],
      ) => {
        for (const author of authors) {
          const existing = targetMap.get(author.user_id);
          targetMap.set(author.user_id, {
            ...existing,
            ...author,
            tags: existing?.tags ?? author.tags,
          });
        }
      };

      const getUniqueProfileCount = () => {
        const ids = new Set<string>();
        for (const anchor of getProfileAnchors()) {
          const profileUrl = normalizeProfileUrl(anchor.href);
          if (!profileUrl) {
            continue;
          }
          const userId = extractUserId(profileUrl);
          if (userId) {
            ids.add(userId);
          }
        }
        return ids.size;
      };

      const isScrollable = (element: HTMLElement) => {
        const style = window.getComputedStyle(element);
        const overflowY = style.overflowY;
        return (
          (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
          element.scrollHeight - element.clientHeight > 240
        );
      };

      const getScrollableAncestors = (element: HTMLElement): HTMLElement[] => {
        const ancestors: HTMLElement[] = [];
        let current = element.parentElement;
        while (current && current !== document.body) {
          if (isScrollable(current)) {
            ancestors.push(current);
          }
          current = current.parentElement;
        }
        return ancestors;
      };

      const getResultRoot = (): HTMLElement | null => {
        const anchors = getProfileAnchors();
        if (anchors.length === 0) {
          return null;
        }

        const scored = new Map<HTMLElement, number>();
        for (const anchor of anchors.slice(0, 40)) {
          let current = anchor.closest<HTMLElement>(
            'section, article, [class*="note"], [class*="user"], [class*="card"]',
          );
          while (current && current !== document.body) {
            const count = current.querySelectorAll('a[href*="/user/profile/"]').length;
            if (count >= 3) {
              scored.set(current, Math.max(scored.get(current) ?? 0, count));
            }
            current = current.parentElement;
          }
        }

        const candidates = Array.from(scored.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([element]) => element);

        return candidates[0] ?? null;
      };

      const getBestScrollTarget = (): HTMLElement | null => {
        const resultRoot = getResultRoot();
        if (resultRoot) {
          const rootAncestors = getScrollableAncestors(resultRoot);
          if (rootAncestors.length > 0) {
            return rootAncestors[0];
          }
        }

        const anchors = getProfileAnchors();
        const scored = new Map<HTMLElement, number>();
        for (const anchor of anchors.slice(0, 30)) {
          for (const ancestor of getScrollableAncestors(anchor)) {
            scored.set(ancestor, (scored.get(ancestor) ?? 0) + 1);
          }
        }

        const candidates = Array.from(scored.entries())
          .sort((a, b) => b[1] - a[1] || b[0].clientHeight - a[0].clientHeight)
          .map(([element]) => element);

        return candidates[0] ?? null;
      };

      const scrollLastAnchorIntoView = (target: HTMLElement | null) => {
        const anchors = getProfileAnchors();
        const lastAnchor = anchors[anchors.length - 1];
        if (!lastAnchor) {
          return;
        }

        if (!target) {
          lastAnchor.scrollIntoView({ block: 'end', behavior: 'auto' });
          return;
        }

        const targetRect = target.getBoundingClientRect();
        const anchorRect = lastAnchor.getBoundingClientRect();
        const delta = anchorRect.bottom - targetRect.bottom + Math.min(target.clientHeight * 0.4, 320);
        if (delta > 0) {
          target.scrollTop += delta;
        } else {
          lastAnchor.scrollIntoView({ block: 'end', behavior: 'auto' });
        }
      };

      const autoScrollToLoadMore = async () => {
        const settleDelay = 950;
        const maxRounds = 120;
        const target = getBestScrollTarget();
        const collectedAuthors = new Map<string, PageAuthor>();
        let stableRounds = 0;
        let rounds = 0;
        let previousCollectedCount = 0;
        let previousWindowScrollY = window.scrollY;
        let previousTargetScrollTop = target?.scrollTop ?? 0;

        const getDocumentHeight = () =>
          Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

        mergeCollectedAuthors(collectedAuthors, collectAuthorsFromVisibleDom());
        previousCollectedCount = collectedAuthors.size;
        reportProgress(0, collectedAuthors.size, Boolean(target));

        for (rounds = 1; rounds <= maxRounds; rounds += 1) {
          const containerStep = Math.max((target?.clientHeight ?? window.innerHeight) * 1.05, 900);
          const windowStep = Math.max(window.innerHeight * 1.05, 900);

          if (target) {
            target.scrollTop += containerStep;
          }

          window.scrollBy({ top: windowStep, behavior: 'auto' });
          scrollLastAnchorIntoView(target);
          await delay(settleDelay);
          scrollLastAnchorIntoView(target);
          await delay(250);
          mergeCollectedAuthors(collectedAuthors, collectAuthorsFromVisibleDom());
          reportProgress(rounds, collectedAuthors.size, Boolean(target));

          const currentWindowScrollY = window.scrollY;
          const currentTargetScrollTop = target?.scrollTop ?? 0;
          const noNewProfiles = collectedAuthors.size <= previousCollectedCount;
          const windowAtBottom =
            currentWindowScrollY + window.innerHeight >= getDocumentHeight() - 48;
          const targetAtBottom = target
            ? currentTargetScrollTop + target.clientHeight >= target.scrollHeight - 48
            : true;
          const noWindowMovement = currentWindowScrollY <= previousWindowScrollY;
          const noTargetMovement = target ? currentTargetScrollTop <= previousTargetScrollTop : true;

          if (noNewProfiles && ((windowAtBottom && targetAtBottom) || (noWindowMovement && noTargetMovement))) {
            stableRounds += 1;
          } else {
            stableRounds = 0;
          }

          previousCollectedCount = Math.max(previousCollectedCount, collectedAuthors.size);
          previousWindowScrollY = Math.max(previousWindowScrollY, currentWindowScrollY);
          previousTargetScrollTop = Math.max(previousTargetScrollTop, currentTargetScrollTop);

          if (stableRounds >= 6) {
            break;
          }
        }

        window.scrollTo({ top: 0, behavior: 'auto' });
        if (target) {
          target.scrollTop = 0;
        }

        return {
          rounds: Math.min(rounds, maxRounds),
          detectedProfiles: collectedAuthors.size,
          usedScrollableContainer: Boolean(target),
          authors: Array.from(collectedAuthors.values()),
        };
      };

      if (window.location.host !== expectedHost) {
        return {
          success: false,
          message: '请先打开小红书网页版。',
          authors: [] as PageAuthor[],
        };
      }

      if (!isSearchResultPage()) {
        return {
          success: false,
          message: '请前往小红书搜索结果页，并切换到“已关注”筛选后再扫描。',
          authors: [] as PageAuthor[],
        };
      }

      if (
        document.body.innerText.includes('登录后查看更多') ||
        document.body.innerText.includes('登录后查看')
      ) {
        return {
          success: false,
          message: '请先登录小红书网页版。',
          authors: [] as PageAuthor[],
        };
      }

      const diagnostics =
        scanMode === 'auto'
          ? await autoScrollToLoadMore()
          : {
              rounds: 0,
              detectedProfiles: getUniqueProfileCount(),
              usedScrollableContainer: Boolean(getBestScrollTarget()),
              authors: collectAuthorsFromVisibleDom(),
            };

      return {
        success: true,
        message: '',
        authors: diagnostics.authors,
        diagnostics,
      };
    },
    args: [XHS_HOST, mode, sessionId],
  });

  const payload = results[0]?.result;
  if (!payload) {
    throw new Error('页面扫描没有返回结果，请刷新页面后重试。');
  }

  if (!payload.success) {
    throw new Error(payload.message);
  }

  return {
    authors: payload.authors,
    diagnostics: payload.diagnostics,
  };
}

export function PopupApp() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeScanSessionId, setActiveScanSessionId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('authors');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showClassificationDebug, setShowClassificationDebug] = useState(false);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('打开小红书搜索结果页，并勾选“已关注”筛选后开始扫描。');
  const [statusTone, setStatusTone] = useState<StatusTone>('idle');

  useEffect(() => {
    void refreshData();
  }, []);

  useEffect(() => {
    const listener = (message: ScanProgressMessage) => {
      if (message.type !== 'SCAN_PROGRESS') {
        return;
      }

      if (!activeScanSessionId || message.sessionId !== activeScanSessionId) {
        return;
      }

      setStatusText(
        `自动搜集中... 已滚动 ${message.round} 轮，累计识别 ${message.detectedProfiles} 位候选博主${
          message.usedScrollableContainer ? '，当前使用结果容器滚动。' : '，当前使用整页滚动。'
        }`,
      );
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [activeScanSessionId]);

  const filteredAuthors = authors.filter((author) => {
    if (favoritesOnly && !author.favorite) {
      return false;
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return (
      author.nickname.toLowerCase().includes(query) ||
      author.profile_url.toLowerCase().includes(query) ||
      (author.note ?? '').toLowerCase().includes(query) ||
      (author.favorite && '收藏'.includes(query)) ||
      author.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });
  const favoriteAuthors = filteredAuthors.filter((author) => author.favorite);
  const untaggedAuthors = filteredAuthors.filter((author) => author.tags.length === 0);
  const recommendationTagPool = [...new Set([...tags.map((tag) => tag.name), ...DEFAULT_RECOMMENDATION_TAGS])];
  const normalizedTagMap = new Map(recommendationTagPool.map((tagName) => [tagName.toLowerCase(), tagName]));
  const groupedAuthors = [
    ...(!favoritesOnly && untaggedAuthors.length > 0 ? [{ label: '未分类', authors: untaggedAuthors }] : []),
    ...tags
      .map((tag) => ({
        label: tag.name,
        authors: filteredAuthors.filter((author) => author.tags.includes(tag.name)),
      }))
      .filter((group) => group.authors.length > 0),
  ];
  const selectedTag = tags.find((tag) => tag.id === selectedTagId) ?? null;
  const selectedTagAuthors = selectedTag
    ? authors.filter((author) => author.tags.includes(selectedTag.name))
    : [];

  function pushLog(message: string) {
    setActivityLogs((current) => [message, ...current].slice(0, 14));
  }

  function getTagScoreDetails(author: Author) {
    const nicknameText = author.nickname.toLowerCase().replace(/\s+/g, ' ');
    const summaryText = (author.profile_summary ?? '').toLowerCase().replace(/\s+/g, ' ');
    const noteText = (author.note ?? '').toLowerCase().replace(/\s+/g, ' ');
    const urlText = author.profile_url.toLowerCase().replace(/\s+/g, ' ');
    const summaryParts = (author.profile_summary ?? '')
      .split(/\s*[|｜]\s*/)
      .map((item) => item.trim())
      .filter(Boolean);

    return recommendationTagPool
      .map((tagName) => {
        const keywords = new Set<string>([
          tagName,
          ...(TAG_RECOMMENDATION_KEYWORDS[tagName] ?? []),
        ]);

        let score = 0;
        const hits: string[] = [];
        const matchedSummarySnippets = new Set<string>();
        for (const keyword of keywords) {
          const normalizedKeyword = keyword.toLowerCase().trim();
          if (!normalizedKeyword) {
            continue;
          }

          const isWeakNicknameKeyword =
            (NICKNAME_WEAK_KEYWORDS[tagName] ?? []).includes(keyword) ||
            (NICKNAME_WEAK_KEYWORDS[tagName] ?? []).includes(normalizedKeyword);
          const isTagNameMatch = normalizedKeyword === tagName.toLowerCase();

          if (noteText.includes(normalizedKeyword)) {
            score += isTagNameMatch ? 4 : 3;
            hits.push(`备注:${keyword}`);
          }

          if (summaryText.includes(normalizedKeyword)) {
            score += isTagNameMatch ? 3 : 2;
            hits.push(`摘要:${keyword}`);
            for (const part of summaryParts) {
              if (part.toLowerCase().includes(normalizedKeyword)) {
                matchedSummarySnippets.add(part);
              }
            }
          }

          if (nicknameText.includes(normalizedKeyword) && !isWeakNicknameKeyword) {
            score += isTagNameMatch ? 2 : 1;
            hits.push(`昵称:${keyword}`);
          }

          if (urlText.includes(normalizedKeyword) && normalizedKeyword.length >= 2) {
            score += 0.5;
            hits.push(`链接:${keyword}`);
          }
        }

        for (const [normalizedTagName, originalTagName] of normalizedTagMap.entries()) {
          if (
            originalTagName !== tagName &&
            (summaryText.includes(normalizedTagName) || noteText.includes(normalizedTagName)) &&
            normalizedTagName.includes(tagName.toLowerCase())
          ) {
            score += 1;
            hits.push(`标签联想:${originalTagName}`);
          }
        }

        // Only use fuzzy matching for custom tags to avoid default-tag false positives.
        if (!DEFAULT_TAG_NAME_SET.has(tagName)) {
          for (const segment of getTwoCharSegments(tagName.toLowerCase())) {
            if (
              segment.length >= 2 &&
              (summaryText.includes(segment) || noteText.includes(segment))
            ) {
              score += 0.5;
            }
          }
        }

        const threshold = DEFAULT_TAG_NAME_SET.has(tagName) ? 2 : 1;

        return {
          tagName,
          score,
          threshold,
          hits: [...new Set(hits)],
          matchedSummarySnippets: Array.from(matchedSummarySnippets).slice(0, 3),
        };
      })
      .sort((a, b) => b.score - a.score || a.tagName.localeCompare(b.tagName));
  }

  function getRecommendedTags(author: Author): string[] {
    const scoredRecommendations = getTagScoreDetails(author)
      .filter((item) => item.score >= item.threshold && !author.tags.includes(item.tagName))
      .slice(0, Math.min(1, Math.max(0, 5 - author.tags.length)))
      .map((item) => item.tagName);

    return scoredRecommendations;
  }

  function getClassificationDebug(author: Author) {
    const summary = (author.profile_summary ?? '').trim();
    const scoreDetails = getTagScoreDetails(author)
      .filter((item) => !author.tags.includes(item.tagName))
      .slice(0, 3);

    if (!summary) {
      return {
        reason: '还没有抓到可用摘要，所以当前只能靠昵称、链接和备注判断。',
        summary: '暂无已抓到的摘要',
        topCandidates: scoreDetails,
      };
    }

    if (scoreDetails.length === 0) {
      return {
        reason: '当前没有任何标签命中到可用信号。',
        summary,
        topCandidates: [],
      };
    }

    const best = scoreDetails[0];
    if (best.score < best.threshold) {
      return {
        reason: `最接近的标签是「${best.tagName}」，但分数 ${best.score} 还没达到阈值 ${best.threshold}。`,
        summary,
        topCandidates: scoreDetails,
      };
    }

    return {
      reason: `当前最接近的标签是「${best.tagName}」，分数 ${best.score}。`,
      summary,
      topCandidates: scoreDetails,
    };
  }

  function getAuthorsWithRecommendations(sourceAuthors: Author[]) {
    return sourceAuthors
      .map((author) => ({
        author,
        recommendedTags: getRecommendedTags(author),
      }))
      .filter((item) => item.recommendedTags.length > 0);
  }

  const authorsWithRecommendations = getAuthorsWithRecommendations(authors);

  async function refreshData() {
    const [nextAuthors, nextTags] = await Promise.all([storage.getAuthors(), storage.getTags()]);
    setAuthors(nextAuthors);
    setTags(nextTags);
    setSelectedTagId((current) => {
      if (!current) {
        return nextTags[0]?.id ?? null;
      }
      return nextTags.some((tag) => tag.id === current) ? current : (nextTags[0]?.id ?? null);
    });
  }

  async function handleScanClick(mode: ScanMode) {
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setLoading(true);
    setActiveScanSessionId(sessionId);
    setStatusTone('idle');
    setStatusText(
      mode === 'auto'
        ? '插件正在自动滚动搜索结果页并持续搜集，请暂时不要切换标签页...'
        : '正在扫描当前搜索结果页，请先确保你已经勾选“已关注”筛选...',
    );

    try {
      const { authors: scannedAuthors, diagnostics } = await scanAuthorsInActivePage(mode, sessionId);
      if (scannedAuthors.length === 0) {
        throw new Error('当前页面还没有可识别的博主卡片，请先滚动搜索结果页加载更多内容。');
      }

      const response = await storage.upsertAuthors(scannedAuthors);
      await refreshData();
      pushLog(
        `${
          mode === 'auto' ? '自动搜集' : '扫描当前页'
        }：新增 ${response.added} 位，合并 ${response.merged} 位。`,
      );
      setStatusTone('success');
      setStatusText(
        response.added > 0
          ? `${
              mode === 'auto' ? '自动搜集完成' : '扫描完成'
            }，新增 ${response.added} 位已关注博主，并同步保存了推荐资料。${
              mode === 'auto' && diagnostics
                ? `本轮滚动 ${diagnostics.rounds} 次，识别到 ${diagnostics.detectedProfiles} 位候选博主。`
                : '当前本地库已自动合并重复数据。'
            }`
          : mode === 'auto'
            ? '自动搜集完成，但没有发现新的已关注博主。'
            : '扫描完成，本页没有发现新的已关注博主。',
      );
    } catch (error) {
      setStatusTone('error');
      setStatusText(error instanceof Error ? error.message : '扫描失败，请稍后重试。');
    } finally {
      setActiveScanSessionId(null);
      setLoading(false);
    }
  }

  async function handleCreateTag() {
    try {
      const createdTag = await storage.createTag(tagDraft);
      setTagDraft('');
      await refreshData();
      setSelectedTagId(createdTag.id);
      setStatusTone('success');
      setStatusText('标签已创建，可以开始给已搜集的博主打标。');
    } catch (error) {
      setStatusTone('error');
      setStatusText(error instanceof Error ? error.message : '创建标签失败。');
    }
  }

  async function handleClearAuthors() {
    const confirmed = window.confirm('确认清空所有已入库博主吗？此操作不会删除标签。');
    if (!confirmed) {
      return;
    }

    await storage.clearAuthors();
    await refreshData();
    setStatusTone('success');
    setStatusText('已清空入库博主数据，标签已保留。');
  }

  async function handleDeleteTag(tagId: string) {
    await storage.deleteTag(tagId);
    await refreshData();
    if (selectedTagId === tagId) {
      setSelectedTagId((current) => (current === tagId ? null : current));
    }
    setStatusTone('success');
    setStatusText('标签已删除，相关博主身上的该标签也已同步移除。');
  }

  async function handleToggleTag(author: Author, tagName: string) {
    try {
      const nextAuthors = await storage.toggleAuthorTag(author.user_id, tagName);
      setAuthors(nextAuthors);
      setStatusTone('success');
      setStatusText(
        author.tags.includes(tagName)
          ? `已从 ${author.nickname} 身上移除标签「${tagName}」。`
          : `已为 ${author.nickname} 添加标签「${tagName}」。`,
      );
    } catch (error) {
      setStatusTone('error');
      setStatusText(error instanceof Error ? error.message : '更新标签失败。');
    }
  }

  async function handleApplyRecommendedTags(author: Author, recommendedTags: string[]) {
    if (recommendedTags.length === 0) {
      return;
    }

    const nextAuthors = await storage.applyAuthorTags(author.user_id, recommendedTags);
    setAuthors(nextAuthors);
    const details = getTagScoreDetails(author).filter((item) => recommendedTags.includes(item.tagName));
    pushLog(
      `${author.nickname}：应用推荐标签 ${recommendedTags.join('、')}。${
        details.length > 0
          ? `原因：${details
              .map((item) => `${item.tagName}(${item.score}/${item.threshold}${item.hits.length > 0 ? `，${item.hits.join('、')}` : ''}${item.matchedSummarySnippets.length > 0 ? `，摘要片段：${item.matchedSummarySnippets.join(' / ')}` : ''})`)
              .join('；')}`
          : ''
      }`,
    );
    setStatusTone('success');
    setStatusText(`已为 ${author.nickname} 应用推荐标签：${recommendedTags.join('、')}。`);
  }

  async function handleToggleFavorite(author: Author) {
    const nextAuthors = await storage.toggleAuthorFavorite(author.user_id);
    setAuthors(nextAuthors);
    setStatusTone('success');
    setStatusText(
      author.favorite
        ? `已取消收藏 ${author.nickname}。`
        : `已收藏 ${author.nickname}，后续可以在“收藏”分组里快速找到。`,
    );
  }

  async function handleToggleFollow(author: Author) {
    const followed = author.followed ?? true;
    const targetAction = followed ? 'unfollow' : 'follow';
    const actionLabel = followed ? '取消关注' : '关注';
    const confirmed = window.confirm(
      `将尝试为 ${author.nickname}${actionLabel}。插件会打开该博主主页并点击站内按钮，是否继续？`,
    );
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setStatusTone('idle');
    setStatusText(`正在为 ${author.nickname}${actionLabel}...`);

    let createdTabId: number | null = null;

    try {
      const activeTab = await getActiveTab();
      const tab = await chrome.tabs.create({
        url: author.profile_url,
        active: false,
        windowId: activeTab.windowId,
      });
      createdTabId = tab.id ?? null;
      if (!createdTabId) {
        throw new Error('无法打开博主主页，请稍后重试。');
      }

      await waitForTabComplete(createdTabId, 15000);
      await delay(2200);

      const results = await chrome.scripting.executeScript({
        target: { tabId: createdTabId },
        func: (action: 'follow' | 'unfollow') => {
          const normalize = (text: string) => text.replace(/\s+/g, '').trim();
          const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));

          const targetTexts =
            action === 'unfollow'
              ? ['已关注', '已关注中', '关注中']
              : ['关注', '+关注'];

          const targetButton = buttons.find((button) => {
            const text = normalize(button.innerText || button.textContent || '');
            return targetTexts.some((candidate) => text.includes(candidate));
          });

          if (!targetButton) {
            return { success: false, reason: '未找到可操作的关注按钮。' };
          }

          targetButton.click();
          return { success: true };
        },
        args: [targetAction],
      });

      const result = results[0]?.result;
      if (!result?.success) {
        throw new Error(result?.reason || `${actionLabel}失败，请稍后重试。`);
      }

      if (targetAction === 'unfollow') {
        await delay(1200);
      }

      const nextAuthors = await storage.setAuthorFollowed(author.user_id, !followed);
      setAuthors(nextAuthors);
      setStatusTone('success');
      setStatusText(`已为 ${author.nickname}${actionLabel}。`);
    } catch (error) {
      setStatusTone('error');
      setStatusText(error instanceof Error ? error.message : `${actionLabel}失败，请稍后重试。`);
    } finally {
      if (createdTabId) {
        try {
          await chrome.tabs.remove(createdTabId);
        } catch {
          // Ignore close failures.
        }
      }
      setLoading(false);
    }
  }

  function handleToggleFavoritesOnly() {
    setFavoritesOnly((current) => !current);
  }

  function handleToggleClassificationDebug() {
    setShowClassificationDebug((current) => !current);
  }

  async function handleAutoClassify() {
    setLoading(true);
    setStatusTone('idle');
    setStatusText('正在自动分类：仅基于当前搜索结果页已加载的资料进行打标...');

    try {
      let nextAuthors = authors;
      const candidates = authors.filter((author) => !author.profile_summary);

      if (candidates.length > 0) {
        const updates = await enhanceAuthorsFromActivePage(candidates);
        if (updates.length > 0) {
          nextAuthors = await storage.updateAuthorProfiles(updates);
          setAuthors(nextAuthors);
        }
      }

      const recommended = getAuthorsWithRecommendations(nextAuthors);
      let appliedAuthors = nextAuthors;
      let appliedCount = 0;

      for (const { author, recommendedTags } of recommended) {
        if (recommendedTags.length === 0) {
          continue;
        }

        const details = getTagScoreDetails(author).filter((item) => recommendedTags.includes(item.tagName));
        appliedAuthors = await storage.applyAuthorTags(author.user_id, recommendedTags);
        appliedCount += 1;
        pushLog(
          `${author.nickname}：自动分类 -> ${recommendedTags.join('、')}。原因：${details
            .map((item) => `${item.tagName}(${item.score}/${item.threshold}${item.hits.length > 0 ? `，${item.hits.join('、')}` : ''}${item.matchedSummarySnippets.length > 0 ? `，摘要片段：${item.matchedSummarySnippets.join(' / ')}` : ''})`)
            .join('；')}`,
        );
      }

      setAuthors(appliedAuthors);
      const remainingUntyped = appliedAuthors.filter((author) => author.tags.length === 0).length;
      setStatusTone(appliedCount > 0 ? 'success' : 'error');
      setStatusText(
        appliedCount > 0
          ? `自动分类完成，已为 ${appliedCount} 位博主自动打上标签。仍有 ${remainingUntyped} 位待继续分类。`
          : '自动分类没有命中可用标签。建议先多搜集几轮，尽量让更多博主卡片和文案加载出来后再试。',
      );
    } catch (error) {
      setStatusTone('error');
      setStatusText(error instanceof Error ? error.message : '自动分类失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }

  async function handleSecondaryCollect() {
    const candidates = authors.filter((author) => author.tags.length === 0);
    if (candidates.length === 0) {
      setStatusTone('idle');
      setStatusText('当前没有待二次搜集的未分类博主。');
      pushLog('二次搜集：当前没有待处理的未分类博主。');
      return;
    }

    const confirmed = window.confirm(
      `将对 ${candidates.length} 位未分类博主执行慢速二次搜集：逐个打开主页，补抓简介后再自动分类。这个操作仍有风控风险，但已调慢速度。是否继续？`,
    );
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setStatusTone('idle');
    setStatusText('正在慢速二次搜集：逐个打开博主主页补抓资料...');
    pushLog(`二次搜集开始：准备处理 ${candidates.length} 位未分类博主。`);

    try {
      const updates = await collectAuthorProfileSummariesSlowly(
        candidates,
        (finished, total, nickname) => {
          setStatusText(
            `正在慢速二次搜集 ${finished + 1}/${total}：${nickname}。每位博主之间会额外等待几秒。`,
          );
        },
      );
      if (updates.length === 0) {
        pushLog('二次搜集：这轮没有返回任何可用抓取结果。');
      }

      let nextAuthors = authors;
      if (updates.length > 0) {
        nextAuthors = await storage.updateAuthorProfiles(updates);
        setAuthors(nextAuthors);
      }
      for (const update of updates) {
        if (update.verification_detected) {
          pushLog(
            `${update.nickname ?? update.user_id}：二次搜集命中安全验证页，未能抓到有效简介。原始文本：${
              update.raw_lines?.slice(0, 6).join(' / ') || '无'
            }`,
          );
          continue;
        }

        pushLog(
          `${update.nickname ?? update.user_id}：二次搜集${
            update.profile_summary ? `已抓到摘要「${update.profile_summary.slice(0, 80)}」` : '未抓到有效摘要'
          }。原始文本：${update.raw_lines?.slice(0, 6).join(' / ') || '无'}`,
        );
      }

      const recommended = getAuthorsWithRecommendations(nextAuthors).filter(
        ({ author }) => author.tags.length === 0,
      );
      if (recommended.length === 0) {
        pushLog('二次搜集：抓取完成，但当前没有任何未分类博主命中新标签。');
      }
      let appliedAuthors = nextAuthors;
      let appliedCount = 0;

      for (const { author, recommendedTags } of recommended) {
        if (recommendedTags.length === 0) {
          continue;
        }

        const details = getTagScoreDetails(author).filter((item) => recommendedTags.includes(item.tagName));
        appliedAuthors = await storage.applyAuthorTags(author.user_id, recommendedTags);
        appliedCount += 1;
        pushLog(
          `${author.nickname}：二次搜集后命中 ${recommendedTags.join('、')}。原因：${details
            .map((item) => `${item.tagName}(${item.score}/${item.threshold}${item.hits.length > 0 ? `，${item.hits.join('、')}` : ''}${item.matchedSummarySnippets.length > 0 ? `，摘要片段：${item.matchedSummarySnippets.join(' / ')}` : ''})`)
            .join('；')}`,
        );
      }

      setAuthors(appliedAuthors);
      const remainingUntyped = appliedAuthors.filter((author) => author.tags.length === 0).length;
      setStatusTone(appliedCount > 0 ? 'success' : 'error');
      setStatusText(
        appliedCount > 0
          ? `二次搜集完成，已额外为 ${appliedCount} 位博主打上标签。仍有 ${remainingUntyped} 位未分类。`
          : '二次搜集完成，但这轮仍没有命中更多可用标签。',
      );
      pushLog(
        appliedCount > 0
          ? `二次搜集结束：新增 ${appliedCount} 位命中标签，剩余 ${remainingUntyped} 位未分类。`
          : '二次搜集结束：0 位命中新标签。',
      );
    } catch (error) {
      setStatusTone('error');
      setStatusText(error instanceof Error ? error.message : '二次搜集失败，请稍后重试。');
      pushLog(`二次搜集失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleNoteBlur(author: Author, note: string) {
    const nextAuthors = await storage.updateAuthorNote(author.user_id, note);
    setAuthors(nextAuthors);
  }

  return (
    <main className="w-[380px] bg-[radial-gradient(circle_at_top,_rgba(254,226,226,0.9),_rgba(255,255,255,1)_50%)] p-4 text-slate-900">
      <section className="rounded-3xl bg-white/90 p-4 shadow-panel ring-1 ring-slate-200">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">
            XHS Following Manager
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">小红书关注整理助手</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            v1.1 已切换为“搜索结果页 + 已关注筛选”的采集路径，并补上基础标签管理与打标能力。
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            搜索结果很多时，优先点“自动滚动搜集”，插件会自己向下加载直到页面内容稳定。
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleScanClick('page')}
            disabled={loading}
            className="rounded-2xl bg-brand px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? '处理中...' : '扫描当前页'}
          </button>
          <button
            type="button"
            onClick={() => handleScanClick('auto')}
            disabled={loading}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? '处理中...' : '自动滚动搜集'}
          </button>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'authors' ? 'tags' : 'authors')}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {viewMode === 'authors' ? '管理标签' : '返回博主列表'}
          </button>
        </div>

        <div
          className={[
            'mt-3 rounded-2xl px-3 py-2 text-sm',
            statusTone === 'success' && 'bg-emerald-50 text-emerald-700',
            statusTone === 'error' && 'bg-rose-50 text-rose-700',
            statusTone === 'idle' && 'bg-slate-100 text-slate-600',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {statusText}
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-600 ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-700">运行日志</p>
            <span className="text-slate-400">最近 {activityLogs.length} 条</span>
          </div>
          {activityLogs.length === 0 ? (
            <p className="mt-2 leading-5 text-slate-500">还没有日志。开始扫描、自动分类或二次搜集后，这里会显示命中原因。</p>
          ) : (
            <div className="mt-2 max-h-[140px] space-y-2 overflow-y-auto pr-1">
              {activityLogs.map((log, index) => (
                <p key={`${index}-${log.slice(0, 12)}`} className="leading-5 text-slate-700">
                  {log}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">已入库博主</p>
            <p className="mt-1 text-3xl font-semibold">{authors.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">已收藏</p>
            <p className="mt-1 text-2xl font-semibold">{authors.filter((author) => author.favorite).length}</p>
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleFavoritesOnly}
              disabled={viewMode !== 'authors'}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                favoritesOnly
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                viewMode !== 'authors' && 'cursor-not-allowed bg-slate-100 text-slate-400',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {favoritesOnly ? '返回全部' : '收藏夹'}
            </button>
            <button
              type="button"
              onClick={handleAutoClassify}
              disabled={loading || authors.length === 0}
              className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              自动分类
            </button>
            <button
              type="button"
              onClick={handleSecondaryCollect}
              disabled={loading || authors.filter((author) => author.tags.length === 0).length === 0}
              className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              二次搜集
            </button>
            <button
              type="button"
              onClick={handleToggleClassificationDebug}
              disabled={viewMode !== 'authors'}
              className={[
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                showClassificationDebug
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                viewMode !== 'authors' && 'cursor-not-allowed bg-slate-100 text-slate-400',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {showClassificationDebug ? '关闭调试' : '分类调试'}
            </button>
            <button
              type="button"
              onClick={handleClearAuthors}
              disabled={loading || authors.length === 0}
              className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              清空入库博主
            </button>
          </div>
        </div>

        {viewMode === 'authors' ? (
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                {favoritesOnly ? '收藏夹' : '已搜集博主'}
              </h2>
              <span className="text-xs text-slate-500">
                {authors.filter((author) => author.tags.length > 0).length} 位已自动分类
              </span>
            </div>

            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索昵称、主页链接、标签或备注"
              className="mb-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-red-300"
            />

            {tags.length === 0 ? (
              <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                当前还没有你手动创建的标签，但插件会先使用内置分类自动打标；命中后会自动补充对应标签。
              </div>
            ) : null}

            {authors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                还没有数据。先去搜索结果页勾选“已关注”，再点击上方按钮扫描当前页。
              </div>
            ) : groupedAuthors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                {favoritesOnly ? '收藏夹里还没有已打标签的博主。' : '没有匹配到相关博主，试试别的关键词。'}
              </div>
            ) : (
              <div className="max-h-[360px] space-y-4 overflow-y-auto pr-1">
                {groupedAuthors.map((group) => (
                  <div key={group.label}>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {group.label}
                      </h3>
                      <span className="text-xs text-slate-400">{group.authors.length} 位</span>
                    </div>

                    <ul className="space-y-2">
                      {group.authors.map((author) => (
                        <li
                          key={author.user_id}
                          className="rounded-2xl border border-slate-200 px-3 py-3"
                        >
                          {(() => {
                            const debug = getClassificationDebug(author);
                            return (
                              <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-3">
                                {author.avatar_url ? (
                                  <img
                                    src={author.avatar_url}
                                    alt={author.nickname}
                                    className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                                  />
                                ) : null}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-900">
                                    {author.nickname}
                                  </p>
                                  <a
                                    href={author.profile_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 block truncate text-xs text-slate-500 hover:text-brand"
                                  >
                                    {author.profile_url}
                                  </a>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleFollow(author)}
                                disabled={loading}
                                className={[
                                  'rounded-full px-2.5 py-1 text-[11px] transition',
                                  (author.followed ?? true)
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
                                ].join(' ')}
                              >
                                {author.followed ?? true ? '已关注' : '关注'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleFavorite(author)}
                                aria-label={author.favorite ? '取消收藏' : '收藏博主'}
                                title={author.favorite ? '取消收藏' : '收藏博主'}
                                className={[
                                  'rounded-full px-2.5 py-1 text-sm leading-none transition',
                                  author.favorite
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                ].join(' ')}
                              >
                                {author.favorite ? '★' : '☆'}
                              </button>
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                                {author.tags[0] ?? '未分类'}
                              </span>
                            </div>
                          </div>

                          {author.tags.length === 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {recommendationTagPool.length === 0 ? (
                                <span className="text-xs text-slate-400">暂无可用标签</span>
                              ) : (
                                tags.map((tag) => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleToggleTag(author, tag.name)}
                                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:border-slate-300"
                                  >
                                    {tag.name}
                                  </button>
                                ))
                              )}
                            </div>
                          ) : null}

                          <div className="mt-3">
                            <textarea
                              defaultValue={author.note ?? ''}
                              onBlur={(event) => handleNoteBlur(author, event.target.value)}
                              rows={2}
                              placeholder="添加备注，例如：探店风格稳定，后续归到美食精选"
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-red-300"
                            />
                          </div>

                          {getRecommendedTags(author).length > 0 ? (
                            <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-amber-800">推荐标签</p>
                                  <p className="mt-1 text-xs text-amber-700">
                                    {getRecommendedTags(author).join('、')}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleApplyRecommendedTags(author, getRecommendedTags(author))}
                                  className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-200"
                                >
                                  接受推荐
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {showClassificationDebug && author.tags.length === 0 ? (
                            <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              <p className="font-medium text-slate-700">分类调试</p>
                              <p className="mt-1 leading-5">{debug.reason}</p>
                              <p className="mt-2 text-slate-500">已抓到的摘要</p>
                              <p className="mt-1 leading-5 text-slate-700">{debug.summary}</p>
                              {debug.topCandidates.length > 0 ? (
                                <div className="mt-2 space-y-1">
                                  {debug.topCandidates.map((candidate) => (
                                    <p key={candidate.tagName} className="leading-5 text-slate-700">
                                      {candidate.tagName}：{candidate.score}/{candidate.threshold}
                                      {candidate.hits.length > 0 ? `，命中 ${candidate.hits.join('、')}` : ''}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                              </>
                            );
                          })()}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="mt-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">标签管理</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                标签上限 20 个，删除标签会同步清除博主身上的对应标记。点击标签卡片可查看该标签下的博主。
              </p>
            </div>

            <div className="flex gap-2">
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                placeholder="输入新标签，例如：美食"
                maxLength={20}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-red-300"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                新建
              </button>
            </div>

            <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {tags.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  还没有手动创建的标签。你可以直接新建，也可以先去博主列表接受系统推荐标签。
                </div>
              ) : (
                tags.map((tag) => {
                  const taggedCount = authors.filter((author) => author.tags.includes(tag.name)).length;
                  return (
                    <div
                      key={tag.id}
                      className={[
                        'flex items-center justify-between rounded-2xl border px-3 py-3 transition',
                        selectedTagId === tag.id
                          ? 'border-red-200 bg-red-50'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedTagId(tag.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-medium text-slate-900">{tag.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{taggedCount} 位博主已打标</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id)}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 transition hover:bg-slate-200"
                      >
                        删除
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedTag ? `「${selectedTag.name}」下的博主` : '选择一个标签查看博主'}
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedTag ? `${selectedTagAuthors.length} 位` : ''}
                </span>
              </div>

              {!selectedTag ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  点击上方任一标签卡片，即可查看该标签下的博主。
                </div>
              ) : selectedTagAuthors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  这个标签下还没有博主。
                </div>
              ) : (
                <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                  {selectedTagAuthors.map((author) => {
                    const recommendedTags = getRecommendedTags(author);
                    return (
                      <div
                        key={author.user_id}
                        className="rounded-2xl border border-slate-200 px-3 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-3">
                              {author.avatar_url ? (
                                <img
                                  src={author.avatar_url}
                                  alt={author.nickname}
                                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                                />
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {author.nickname}
                                </p>
                                <a
                                  href={author.profile_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 block truncate text-xs text-slate-500 hover:text-brand"
                                >
                                  {author.profile_url}
                                </a>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleFollow(author)}
                              disabled={loading}
                              className={[
                                'rounded-full px-2.5 py-1 text-[11px] transition',
                                (author.followed ?? true)
                                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
                              ].join(' ')}
                            >
                              {author.followed ?? true ? '已关注' : '关注'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleFavorite(author)}
                              aria-label={author.favorite ? '取消收藏' : '收藏博主'}
                              title={author.favorite ? '取消收藏' : '收藏博主'}
                              className={[
                                'rounded-full px-2.5 py-1 text-sm leading-none transition',
                                author.favorite
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                              ].join(' ')}
                            >
                              {author.favorite ? '★' : '☆'}
                            </button>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                              {author.tags[0] ?? '未分类'}
                            </span>
                          </div>
                        </div>

                        {recommendedTags.length > 0 ? (
                          <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-amber-800">推荐标签</p>
                                <p className="mt-1 text-xs text-amber-700">
                                  {recommendedTags.join('、')}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyRecommendedTags(author, recommendedTags)}
                                className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-200"
                              >
                                接受推荐
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-3">
                          <textarea
                            defaultValue={author.note ?? ''}
                            onBlur={(event) => handleNoteBlur(author, event.target.value)}
                            rows={2}
                            placeholder="添加备注，例如：这位主要做旅行攻略合集"
                            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-red-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mt-4 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-slate-700">
          飞书导出已预留数据结构，下一步可以继续接 F4/F5：OAuth 授权和按标签分组导出文档。
        </section>
      </section>
    </main>
  );
}
