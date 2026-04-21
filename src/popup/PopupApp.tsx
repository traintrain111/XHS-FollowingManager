import { useEffect, useState } from 'react';
import { storage } from '../shared/storage';
import { XHS_HOST } from '../shared/constants';
import type { Author, Tag } from '../shared/types';

type StatusTone = 'idle' | 'success' | 'error';
type ViewMode = 'authors' | 'tags';
type ScanMode = 'page' | 'auto';

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function scanAuthorsInActivePage(mode: ScanMode): Promise<{
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
    func: async (expectedHost: string, scanMode: ScanMode) => {
      type PageAuthor = {
        user_id: string;
        nickname: string;
        profile_url: string;
        tags: string[];
      };

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
          if (firstLine && !firstLine.startsWith('http')) {
            return firstLine;
          }
        }

        return '';
      };

      const delay = (ms: number) =>
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, ms);
        });

      const getProfileAnchors = () =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/user/profile/"]'));

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
        const settleDelay = 1800;
        const maxRounds = 120;
        const target = getBestScrollTarget();
        const useWindow = !target;
        let stableRounds = 0;
        let rounds = 0;
        let previousUniqueProfiles = getUniqueProfileCount();
        let previousScrollTop = useWindow ? window.scrollY : (target?.scrollTop ?? 0);

        for (rounds = 1; rounds <= maxRounds; rounds += 1) {
          const viewportHeight = useWindow
            ? window.innerHeight
            : (target?.clientHeight ?? window.innerHeight);
          const scrollStep = Math.max(viewportHeight * 1.15, 1200);

          if (useWindow) {
            window.scrollBy({ top: scrollStep, behavior: 'auto' });
          } else if (target) {
            target.scrollTop += scrollStep;
          }

          scrollLastAnchorIntoView(target ?? null);
          await delay(settleDelay);
          await delay(500);

          const currentUniqueProfiles = getUniqueProfileCount();
          const currentScrollTop = useWindow ? window.scrollY : (target?.scrollTop ?? 0);
          const scrollHeight = useWindow
            ? Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
            : (target?.scrollHeight ?? 0);
          const clientHeight = useWindow
            ? window.innerHeight
            : (target?.clientHeight ?? 0);
          const remaining = scrollHeight - (currentScrollTop + clientHeight);
          const nearBottom = remaining <= Math.max(clientHeight * 0.2, 48);
          const noNewProfiles = currentUniqueProfiles <= previousUniqueProfiles;
          const noFurtherScroll = currentScrollTop <= previousScrollTop;

          if ((nearBottom && noNewProfiles) || (noNewProfiles && noFurtherScroll)) {
            stableRounds += 1;
          } else {
            stableRounds = 0;
          }

          previousUniqueProfiles = Math.max(previousUniqueProfiles, currentUniqueProfiles);
          previousScrollTop = Math.max(previousScrollTop, currentScrollTop);

          if (stableRounds >= 6) {
            break;
          }
        }

        if (useWindow) {
          window.scrollTo({ top: 0, behavior: 'auto' });
        } else if (target) {
          target.scrollTop = 0;
        }

        return {
          rounds: Math.min(rounds, maxRounds),
          detectedProfiles: getUniqueProfileCount(),
          usedScrollableContainer: Boolean(target),
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
            };

      const anchors = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href*="/user/profile/"]'),
      );
      const authorMap = new Map<string, PageAuthor>();

      for (const anchor of anchors) {
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

        authorMap.set(userId, {
          user_id: userId,
          nickname,
          profile_url: profileUrl,
          tags: [],
        });
      }

      return {
        success: true,
        message: '',
        authors: Array.from(authorMap.values()),
        diagnostics,
      };
    },
    args: [XHS_HOST, mode],
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
  const [tagDraft, setTagDraft] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('authors');
  const [statusText, setStatusText] = useState('打开小红书搜索结果页，并勾选“已关注”筛选后开始扫描。');
  const [statusTone, setStatusTone] = useState<StatusTone>('idle');

  useEffect(() => {
    void refreshData();
  }, []);

  const untaggedAuthors = authors.filter((author) => author.tags.length === 0);
  const groupedAuthors = [
    ...(untaggedAuthors.length > 0 ? [{ label: '未分类', authors: untaggedAuthors }] : []),
    ...tags
      .map((tag) => ({
        label: tag.name,
        authors: authors.filter((author) => author.tags.includes(tag.name)),
      }))
      .filter((group) => group.authors.length > 0),
  ];

  async function refreshData() {
    const [nextAuthors, nextTags] = await Promise.all([storage.getAuthors(), storage.getTags()]);
    setAuthors(nextAuthors);
    setTags(nextTags);
  }

  async function handleScanClick(mode: ScanMode) {
    setLoading(true);
    setStatusTone('idle');
    setStatusText(
      mode === 'auto'
        ? '插件正在自动滚动搜索结果页并持续搜集，请暂时不要切换标签页...'
        : '正在扫描当前搜索结果页，请先确保你已经勾选“已关注”筛选...',
    );

    try {
      const { authors: scannedAuthors, diagnostics } = await scanAuthorsInActivePage(mode);
      if (scannedAuthors.length === 0) {
        throw new Error('当前页面还没有可识别的博主卡片，请先滚动搜索结果页加载更多内容。');
      }

      const response = await storage.upsertAuthors(scannedAuthors);
      await refreshData();
      setStatusTone('success');
      setStatusText(
        response.added > 0
          ? `${
              mode === 'auto' ? '自动搜集完成' : '扫描完成'
            }，新增 ${response.added} 位已关注博主。${
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
      setLoading(false);
    }
  }

  async function handleCreateTag() {
    try {
      await storage.createTag(tagDraft);
      setTagDraft('');
      await refreshData();
      setStatusTone('success');
      setStatusText('标签已创建，可以开始给已搜集的博主打标。');
    } catch (error) {
      setStatusTone('error');
      setStatusText(error instanceof Error ? error.message : '创建标签失败。');
    }
  }

  async function handleDeleteTag(tagId: string) {
    await storage.deleteTag(tagId);
    await refreshData();
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

        <div className="mt-4 flex items-end justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">已入库博主</p>
            <p className="mt-1 text-3xl font-semibold">{authors.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">标签数</p>
            <p className="mt-1 text-2xl font-semibold">{tags.length}</p>
          </div>
        </div>

        {viewMode === 'authors' ? (
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">已搜集博主</h2>
              <span className="text-xs text-slate-500">按标签分组展示</span>
            </div>

            {authors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                还没有数据。先去搜索结果页勾选“已关注”，再点击上方按钮扫描当前页。
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
                          <div className="flex items-start justify-between gap-3">
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
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                              {author.tags.length}/5 标签
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {tags.length === 0 ? (
                              <span className="text-xs text-slate-400">先创建标签后再打标</span>
                            ) : (
                              tags.map((tag) => {
                                const active = author.tags.includes(tag.name);
                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleToggleTag(author, tag.name)}
                                    className={[
                                      'rounded-full border px-2.5 py-1 text-xs transition',
                                      active
                                        ? 'border-red-200 bg-red-50 text-red-600'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                                    ].join(' ')}
                                  >
                                    {active ? '已标记' : '+ 标签'} {tag.name}
                                  </button>
                                );
                              })
                            )}
                          </div>
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
                标签上限 20 个，删除标签会同步清除博主身上的对应标记。
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
                  还没有标签，先创建几个分组吧。
                </div>
              ) : (
                tags.map((tag) => {
                  const taggedCount = authors.filter((author) => author.tags.includes(tag.name)).length;
                  return (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{tag.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{taggedCount} 位博主已打标</p>
                      </div>
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
          </section>
        )}

        <section className="mt-4 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-slate-700">
          飞书导出已预留数据结构，下一步可以继续接 F4/F5：OAuth 授权和按标签分组导出文档。
        </section>
      </section>
    </main>
  );
}
