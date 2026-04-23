import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { storage } from '../shared/storage';
import { XHS_HOST } from '../shared/constants';
import type { Author, Tag } from '../shared/types';

type StatusTone = 'idle' | 'info' | 'success' | 'error';
type ViewMode = 'authors' | 'tags' | 'favorites';
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
  美食: [
    '美食',
    '小吃',
    '料理',
    '餐厅',
    '餐馆',
    '美味',
    '烧烤',
    '火锅',
    '甜点',
    '蛋糕',
    '饮品',
    '饮食',
    '奶茶',
    '咖啡',
    '甜品',
    '面包',
    '烘焙',
    '烹饪',
    '菜谱',
    '做饭',
    '下厨',
    '食谱',
    '厨艺',
    '吃播',
    '午餐',
    '夜宵',
    '探店',
    '早餐',
    '饮品店',
    '美食博主',
  ],
  穿搭: [
    '穿搭',
    'ootd',
    '搭配',
    'look',
    'lookbook',
    '时尚',
    '潮流',
    '潮搭',
    '服饰',
    '穿衣分享',
    '衣橱',
    '风格',
    '潮流博主',
    '造型',
    '穿衣搭配',
    '穿搭博主',
    '时尚博主',
    '外套',
    '裙子',
    '裤装',
    '鞋履',
    '买手',
    '选品',
  ],
  美妆: [
    '美妆',
    '化妆',
    '彩妆',
    '护肤',
    '口红',
    '粉底',
    '眼影',
    '腮红',
    '睫毛',
    '妆容',
    '卸妆',
    '美妆测评',
    '试色',
    '化妆教程',
    '护肤品',
    '美白',
    '补水',
    '防晒',
    '面膜',
    '保养',
    '底妆',
    '美容',
    '美甲',
    '造型师',
    '化妆师',
    '彩妆师',
    '美容顾问',
    '皮肤管理',
    '美妆博主',
  ],
  旅行: [
    '旅行',
    '旅游',
    '旅途',
    '游记',
    '攻略',
    '目的地',
    '打卡',
    '酒店',
    '景点',
    '自由行',
    '徒步',
    '露营',
    '海岛',
    '城市游',
    '旅行摄影',
    '旅行博主',
    '旅拍',
    '行程',
    '出行',
    '背包客',
    '旅游博主',
    '环球',
    '旅居',
    '在路上',
    '行走',
  ],
  户外: [
    '户外',
    '徒步',
    '露营',
    '登山',
    '野营',
    '攀岩',
    '钓鱼',
    '骑行',
    '滑雪',
    '冲浪',
    '潜水',
    '越野',
    '户外探险',
    '户外装备',
    '户外运动',
    '徒步旅行',
    '跑山',
    '户外博主',
    '探险',
  ],
  摄影: [
    '摄影',
    '摄影师',
    '拍照',
    '相机',
    '镜头',
    '摄影技巧',
    '构图',
    '光影',
    '人像',
    '风光',
    '街拍',
    '摄影约拍',
    '摄影作品',
    '滤镜',
    '修图',
    '胶片',
    '摄影教程',
    '后期',
    '纪实',
    '摄影博主',
    '记录者',
    '视觉',
  ],
  健身: [
    '健身',
    '运动',
    '健身房',
    '塑形',
    '瑜伽',
    '跑步',
    '减脂',
    '增肌',
    '健身计划',
    '练习',
    '健身打卡',
    '力量训练',
    '有氧',
    '健身分享',
    '健身餐',
    '普拉提',
    '健身教练',
    '私教',
    '营养师',
    '体能训练',
  ],
  母婴: [
    '母婴',
    '孕期',
    '怀孕',
    '产后',
    '育儿',
    '母乳喂养',
    '宝宝辅食',
    '婴儿',
    '月子',
    '幼儿',
    '亲子',
    '孕妈',
    '妈妈分享',
    '母婴用品',
    '早教',
    '育儿经验',
    '辅食',
    '亲子活动',
    '宝妈',
    '妈妈',
    '新手妈妈',
    '二胎',
    '全职妈妈',
    '宝宝',
  ],
  家居: [
    '家居',
    '装修',
    '软装',
    '家装',
    '家具',
    '收纳',
    '整理',
    '家居设计',
    '布置',
    '家居风格',
    '室内设计',
    '装饰',
    '家装分享',
    '租房改造',
    '家居美学',
    '家居分享',
    '家具测评',
    '设计师',
    '家居博主',
    '生活美学',
  ],
  知识: [
    '知识',
    '认知',
    '科普',
    '历史',
    '心理学',
    '哲学',
    '教育',
    '经济',
    '商业',
    '管理',
    '科技',
    '学习',
    '知识分享',
    '课程',
    '干货',
    '思维方式',
    '学术',
    '讲座',
    '报告',
    '科普文章',
    '笔记',
    '考研',
    '考公',
    '英语',
    '语言学习',
    '职场',
    '效率',
    '理财',
    '投资',
    '副业',
    '编程',
    '设计',
    '自我提升',
  ],
  科技数码: [
    '科技数码',
    'ai',
    '科技',
    '数码',
    '数码产品',
    '手机',
    '电脑',
    '黑科技',
    '虚拟现实',
    '软件',
    '编程',
    '机器人',
    '智能',
    '互联网',
    '极客',
    '数码测评',
    '产品评测',
    '电子设备',
    '系统',
    '测评',
    '开箱',
    '数码博主',
    '工程师',
    '程序员',
    '设备党',
    '桌面',
    'ipad',
  ],
  手工: [
    '手工',
    'diy',
    '手作',
    '手工艺',
    '手工饰品',
    '剪纸',
    '陶艺',
    '黏土',
    '手工包',
    '木工',
    '布艺',
    '手工教程',
    '工艺品',
    '装饰',
    '拼豆',
    '串珠',
    '编绳',
    '缝纫',
    '编织',
    '钩针',
    '刺绣',
    '羊毛毡',
    '手工博主',
    '手帐',
    '手账',
    '拼贴',
    '胶带',
    '贴纸',
    '文具',
  ],
  阅读: [
    '阅读',
    '书单',
    '读书',
    '荐书',
    '小说',
    '文学',
    '书评',
    '阅读分享',
    '读后感',
    '作家',
    '长篇',
    '短篇',
    '散文',
    '书摘',
    '经典名著',
    '阅读笔记',
    '名人传记',
    '读书笔记',
    '书房',
    '读书博主',
    '书虫',
    '爱书人',
  ],
  音乐: [
    '音乐',
    '唱歌',
    '翻唱',
    '原创音乐',
    '原创歌曲',
    '音乐分享',
    '歌曲推荐',
    '听歌',
    '歌单',
    'playlist',
    '单曲循环',
    '新歌',
    'live',
    '现场',
    '演出',
    '音乐现场',
    '乐队',
    '歌手',
    '音乐人',
    '独立音乐',
    'indie',
    '民谣',
    '摇滚',
    '爵士',
    '古典',
    '电子',
    '嘻哈',
    'rap',
    'r&b',
    'kpop',
    '专辑',
    'ep',
    '音源',
    '编曲',
    '作曲',
    '写歌',
    '录音',
    'demo',
    'cover',
    '吉他',
    '钢琴',
    '小提琴',
    '贝斯',
    '鼓',
    '架子鼓',
    '尤克里里',
    '键盘',
    '电子琴',
    '萨克斯',
    '长笛',
    '二胡',
    '古筝',
    '琵琶',
    '乐器演奏',
    '指弹',
    '弹唱',
    'solo',
    '音乐博主',
    '乐评',
    '听后感',
    '专辑推荐',
    '演唱会',
    '巡演',
    '音乐节',
    '练歌',
    '开嗓',
    '清唱',
    '和声',
    '伴奏',
    '扒谱',
    '练琴',
    '翻弹',
    '翻奏',
    'bgm',
  ],
  宠物: [
    '宠物',
    '猫',
    '狗',
    '猫咪',
    '狗狗',
    '宠物日常',
    '宠物护理',
    '宠物用品',
    '萌宠',
    '喵星人',
    '汪星人',
    '宠物故事',
    '宠物健康',
    '领养',
    '宠物摄影',
    '宠物视频',
    '铲屎官',
    '毛孩子',
    '养猫',
    '养狗',
    '宠物博主',
    '猫奴',
    '狗奴',
    '多猫家庭',
  ],
  生活: [
    '生活',
    '日常',
    '记录',
    '分享',
    '日记',
    '家常',
    '生活美学',
    '生活方式',
    '心情',
    '感悟',
    '日常分享',
    '生活记录',
    '自律',
    '家居小事',
    '随记',
    '生活拍照',
    '日常vlog',
    'vlog',
    '生活博主',
    '慢生活',
    '独居',
    '仪式感',
    '治愈',
    '松弛感',
  ],
  搞笑: [
    '搞笑',
    '喜剧',
    '段子',
    '整活',
    '爆笑',
    '幽默',
    '搞笑视频',
    '逗比',
    '搞笑日常',
    '搞笑分享',
    '搞笑短剧',
    '搞笑博主',
    '吐槽',
    '搞笑配音',
    '搞笑剪辑',
    '段子手',
    '沙雕',
    '脱口秀',
  ],
  绘画: [
    '绘画',
    '画画',
    '插画',
    '手绘',
    '素描',
    '水彩',
    '油画',
    '板绘',
    '漫画',
    '插画师',
    '绘画教程',
    '线稿',
    '彩铅',
    '画师',
    '艺术创作',
    '油彩',
    '速写',
    '素描练习',
    '国画',
    '原创',
    'procreate',
    '美术',
    '艺术',
  ],
  健康: [
    '健康',
    '养生',
    '饮食',
    '营养',
    '健康管理',
    '健康分享',
    '心理健康',
    '运动',
    '饮食调理',
    '健康习惯',
    '睡眠',
    '健康饮食',
    '防病',
    '疾病预防',
    '体检',
    '康复',
    '中医',
    '理疗',
    '营养师',
    '身心健康',
    '医生',
  ],
  情感: [
    '情感',
    '恋爱',
    '婚姻',
    '感情',
    '关系',
    '爱情',
    '心情',
    '共鸣',
    '情感故事',
    '情感分析',
    '情感咨询',
    '失恋',
    '亲密关系',
    '情感分享',
    '情感日记',
    '心理咨询',
    '两性关系',
    '情侣',
    '情感博主',
    '心理',
    '情绪',
    '树洞',
  ],
};
const DEFAULT_RECOMMENDATION_TAGS = Object.keys(TAG_RECOMMENDATION_KEYWORDS);
const DEFAULT_TAG_NAME_SET = new Set(DEFAULT_RECOMMENDATION_TAGS);
const NICKNAME_WEAK_KEYWORDS: Record<string, string[]> = {
  美食: ['奶茶', '咖啡', '甜品', '蛋糕', '面包'],
  宠物: ['猫', '狗'],
  知识: ['学习', '笔记', '课程', '干货'],
  生活: ['生活', '日常', '记录', '分享', 'vlog', '心情'],
  情感: ['心情', '情绪', '共鸣'],
};
const SECONDARY_COLLECT_DELAY_MIN_MS = 3200;
const SECONDARY_COLLECT_DELAY_MAX_MS = 5200;
const SECONDARY_COLLECT_BATCH_SIZE = 5;
const SECONDARY_COLLECT_BATCH_BREAK_MS = 12000;
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
  '医疗器械网络交易服务第三方平台备案',
  '互联网药品信息服务资格证书',
  '经营性-2023',
  '上海市互联网举报中心',
  '网械平台备字',
  '备案号',
  '小红书APP',
  '问题反馈',
  '复制 LaTeX 公式',
  '已复制',
];
const UNTAGGED_TAG_ID = '__untagged__';
const UNTAGGED_TAG_NAME = '无标签';
const TAG_DISPLAY_ICONS: Record<string, string> = {
  美食: '🍜',
  穿搭: '👗',
  美妆: '💄',
  旅行: '✈️',
  户外: '🏕️',
  摄影: '📷',
  健身: '💪',
  母婴: '👶',
  家居: '🏠',
  知识: '📚',
  科技数码: '💻',
  手工: '✂️',
  阅读: '📖',
  音乐: '🎵',
  宠物: '🐾',
  生活: '🌿',
  搞笑: '😂',
  绘画: '🎨',
  健康: '🩺',
  情感: '💞',
  无标签: '🏷️',
};

function getTagDisplayIcon(tagName: string) {
  return TAG_DISPLAY_ICONS[tagName] ?? '🏷️';
}

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

function getRandomDelay(minMs: number, maxMs: number) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
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
  shouldStop?: () => boolean,
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
    if (shouldStop?.()) {
      break;
    }

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
      if (shouldStop?.()) {
        continue;
      }
      await delay(SECONDARY_COLLECT_SETTLE_MS);
      if (shouldStop?.()) {
        continue;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: createdTabId },
        func: async () => {
          const normalizeText = (input: string) =>
            input.replace(/\s+/g, ' ').replace(/[|｜]+/g, ' ').trim();
          const wait = (ms: number) =>
            new Promise<void>((resolve) => {
              window.setTimeout(resolve, ms);
            });
          const verificationPatterns = [
            '安全验证',
            '为保护账号安全',
            '扫码验证身份',
            '已登录该账号的「小红书APP」',
            '二维码1分钟失效',
          ];
          const noiseSummaryPatterns = [
            '行吟信息科技（上海）有限公司',
            '行吟信息科技(上海)有限公司',
            '版权所有',
            '沪ICP备',
            '增值电信业务经营许可证',
            '网络文化经营许可证',
            '医疗器械网络交易服务第三方平台备案',
            '互联网药品信息服务资格证书',
            '经营性-2023',
            '上海市互联网举报中心',
            '网械平台备字',
            '备案号',
            '小红书APP',
            '问题反馈',
            '复制 LaTeX 公式',
            '已复制',
          ];

          const shouldIgnoreText = (text: string) =>
            /^关注$|^粉丝$|^获赞与收藏$|^IP属地/.test(text) ||
            /^编辑资料$|^发消息$|^私信$/.test(text) ||
            /^小红书号[:：]/.test(text) ||
            /^[0-9.]+万?$/.test(text) ||
            noiseSummaryPatterns.some((pattern) => text.includes(pattern));

          const avatarUrl =
            document.querySelector<HTMLImageElement>(
              'img[class*="avatar"], img[class*="user"], img[alt*="头像"]',
            )?.src || undefined;

          let mainElement: HTMLElement = (document.querySelector('main') ?? document.body) as HTMLElement;
          let markerElement: HTMLElement | undefined;
          let statsElement: HTMLElement | undefined;

          const findAnchors = () => {
            mainElement = (document.querySelector('main') ?? document.body) as HTMLElement;
            const elements = Array.from(mainElement.querySelectorAll<HTMLElement>('*'));
            const combinedMarker = elements.find((element) => {
              const text = normalizeText(element.innerText || '');
              return text.includes('小红书号') && text.includes('IP属地') && text.length <= 160;
            });
            const xhsIdMarker = elements.find((element) => {
              const text = normalizeText(element.innerText || '');
              return text.includes('小红书号') && text.length <= 120;
            });
            const ipMarker = elements.find((element) => {
              const text = normalizeText(element.innerText || '');
              return text.includes('IP属地') && text.length <= 120;
            });
            const stats = elements.find((element) => {
              const text = normalizeText(element.innerText || '');
              return text.includes('关注') && text.includes('粉丝') && text.includes('获赞与收藏');
            });

            markerElement = combinedMarker ?? xhsIdMarker ?? ipMarker;
            statsElement = stats;
          };

          for (let attempt = 0; attempt < 8; attempt += 1) {
            findAnchors();
            if (markerElement) {
              break;
            }
            await wait(600);
          }

          const isStatsText = (text: string) =>
            text.includes('关注') && text.includes('粉丝') && text.includes('获赞与收藏');

          const collectReadableTexts = (element: HTMLElement, markerText: string) => {
            const candidates = new Set<string>();
            const directText = normalizeText(element.innerText || '');
            if (
              directText &&
              directText !== markerText &&
              !shouldIgnoreText(directText) &&
              !isStatsText(directText) &&
              directText.length >= 4 &&
              directText.length <= 160
            ) {
              candidates.add(directText);
            }

            Array.from(element.querySelectorAll<HTMLElement>('p, span, div'))
              .map((node) => normalizeText(node.innerText || ''))
              .filter((text) => text.length >= 4 && text.length <= 160)
              .filter((text) => text !== markerText)
              .filter((text) => !shouldIgnoreText(text))
              .filter((text) => !isStatsText(text))
              .forEach((text) => {
                candidates.add(text);
              });

            return Array.from(candidates);
          };

          const collectIntroFromMarker = () => {
            if (!markerElement) {
              return [];
            }

            const markerText = normalizeText(markerElement.innerText || '');
            const markerRect = markerElement.getBoundingClientRect();
            const statsRect = statsElement?.getBoundingClientRect();
            const upperBound = markerRect.bottom - 8;
            const lowerBound = statsRect
              ? Math.min(statsRect.top - 8, markerRect.bottom + 240)
              : markerRect.bottom + 240;
            const candidates = new Set<string>();

            let currentChild: HTMLElement | null = markerElement;
            for (let level = 0; level < 4 && currentChild?.parentElement; level += 1) {
              const parent = currentChild.parentElement as HTMLElement;
              const siblings = Array.from(parent.children) as HTMLElement[];
              const currentIndex = siblings.indexOf(currentChild);

              for (let siblingIndex = currentIndex + 1; siblingIndex < siblings.length; siblingIndex += 1) {
                const sibling = siblings[siblingIndex];
                if (!sibling || sibling === statsElement) {
                  break;
                }

                const siblingText = normalizeText(sibling.innerText || '');
                if (!siblingText) {
                  continue;
                }

                if (isStatsText(siblingText)) {
                  break;
                }

                const rect = sibling.getBoundingClientRect();
                const isBelowMarker = rect.top >= upperBound && rect.bottom <= lowerBound + 12;
                const isAlignedToProfileColumn =
                  rect.left >= markerRect.left - 48 && rect.left <= markerRect.right + 160;

                if (!isBelowMarker || !isAlignedToProfileColumn) {
                  continue;
                }

                collectReadableTexts(sibling, markerText).forEach((text) => {
                  candidates.add(text);
                });
              }

              if (parent === mainElement) {
                break;
              }

              currentChild = parent;
            }

            Array.from(mainElement.querySelectorAll<HTMLElement>('p, span, div'))
              .filter((element) => {
                if (element === markerElement || element === statsElement) {
                  return false;
                }

                const text = normalizeText(element.innerText || '');
                if (!text || shouldIgnoreText(text) || isStatsText(text)) {
                  return false;
                }

                const rect = element.getBoundingClientRect();
                if (rect.height <= 0 || rect.width <= 0) {
                  return false;
                }

                const isBelowMarker = rect.top >= upperBound && rect.bottom <= lowerBound + 12;
                const isAlignedToProfileColumn =
                  rect.left >= markerRect.left - 40 && rect.left <= markerRect.right + 120;
                const isReadableLength = text.length >= 4 && text.length <= 120;
                const isNotHugeBlock = rect.height <= 180;

                return isBelowMarker && isAlignedToProfileColumn && isReadableLength && isNotHugeBlock;
              })
              .forEach((element) => {
                collectReadableTexts(element, markerText).forEach((text) => {
                  candidates.add(text);
                });
              });

            return Array.from(candidates);
          };

          const collectLineRangeFromAncestor = () => {
            if (!markerElement) {
              return [];
            }

            let current: HTMLElement | null = markerElement;
            for (let level = 0; level < 5 && current; level += 1) {
              const textLines = (current.innerText || '')
                .split('\n')
                .map(normalizeText)
                .filter(Boolean);
              const markerIndex = textLines.findIndex((line) =>
                line.includes('小红书号') || line.includes('IP属地'),
              );
              const statsIndex = textLines.findIndex((line) => isStatsText(line));

              if (markerIndex >= 0) {
                const betweenLines = textLines
                  .slice(markerIndex + 1, statsIndex >= 0 ? statsIndex : undefined)
                  .filter((line) => line.length >= 2 && line.length <= 120)
                  .filter((line) => !shouldIgnoreText(line))
                  .filter((line) => !isStatsText(line))
                  .filter((line) => !line.includes('男') && !line.includes('女'));

                if (betweenLines.length > 0) {
                  return betweenLines;
                }
              }

              current = current.parentElement;
            }

            return [];
          };

          const introLineCandidates = [
            ...collectLineRangeFromAncestor(),
            ...collectIntroFromMarker(),
          ];

          const compactMetaFallback = [
            document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
            document.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? '',
          ]
            .map(normalizeText)
            .filter((text) => text.length >= 2)
            .filter((text) => !shouldIgnoreText(text));

          const summaryParts = (
            introLineCandidates.length > 0 ? introLineCandidates : markerElement ? [] : compactMetaFallback
          )
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
        if (shouldStop?.()) {
          break;
        }
        await delay(getRandomDelay(SECONDARY_COLLECT_DELAY_MIN_MS, SECONDARY_COLLECT_DELAY_MAX_MS));
        if ((index + 1) % SECONDARY_COLLECT_BATCH_SIZE === 0) {
          if (shouldStop?.()) {
            break;
          }
          await delay(SECONDARY_COLLECT_BATCH_BREAK_MS);
        }
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
    stopped?: boolean;
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
        const stopAttributeName = 'data-xhs-stop-scan-session';
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
        const isStopped = () =>
          document.documentElement.getAttribute(stopAttributeName) === nextSessionId;

        document.documentElement.removeAttribute(stopAttributeName);
        mergeCollectedAuthors(collectedAuthors, collectAuthorsFromVisibleDom());
        previousCollectedCount = collectedAuthors.size;
        reportProgress(0, collectedAuthors.size, Boolean(target));

        for (rounds = 1; rounds <= maxRounds; rounds += 1) {
          if (isStopped()) {
            break;
          }

          const containerStep = Math.max((target?.clientHeight ?? window.innerHeight) * 1.05, 900);
          const windowStep = Math.max(window.innerHeight * 1.05, 900);

          if (target) {
            target.scrollTop += containerStep;
          }

          window.scrollBy({ top: windowStep, behavior: 'auto' });
          scrollLastAnchorIntoView(target);
          await delay(settleDelay);
          if (isStopped()) {
            break;
          }
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
        const stopped = isStopped();
        document.documentElement.removeAttribute(stopAttributeName);

        return {
          rounds: Math.min(rounds, maxRounds),
          detectedProfiles: collectedAuthors.size,
          usedScrollableContainer: Boolean(target),
          stopped,
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

async function stopScanInActivePage(sessionId: string): Promise<void> {
  const tab = await getActiveTab();
  if (!tab.id) {
    throw new Error('未找到当前标签页。');
  }

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (nextSessionId: string) => {
      document.documentElement.setAttribute('data-xhs-stop-scan-session', nextSessionId);
    },
    args: [sessionId],
  });
}

export function PopupApp() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeScanSessionId, setActiveScanSessionId] = useState<string | null>(null);
  const [isSecondaryCollectRunning, setIsSecondaryCollectRunning] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('authors');
  const [tagEditorAuthorId, setTagEditorAuthorId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('打开小红书搜索结果页，并勾选“已关注”筛选后开始扫描。');
  const [statusTone, setStatusTone] = useState<StatusTone>('idle');
  const secondaryCollectStopRequestedRef = useRef(false);

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

      setStatusTone('info');
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
    if (viewMode === 'favorites' && !author.favorite) {
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
  const untaggedAuthors = filteredAuthors.filter((author) => author.tags.length === 0);
  const recommendationTagPool = [...new Set([...tags.map((tag) => tag.name), ...DEFAULT_RECOMMENDATION_TAGS])];
  const normalizedTagMap = new Map(recommendationTagPool.map((tagName) => [tagName.toLowerCase(), tagName]));
  const groupedAuthors = [
    ...(untaggedAuthors.length > 0 ? [{ label: '未分类', authors: untaggedAuthors }] : []),
    ...tags
      .map((tag) => ({
        label: tag.name,
        authors: filteredAuthors.filter((author) => author.tags.includes(tag.name)),
      }))
      .filter((group) => group.authors.length > 0),
  ];
  const untaggedTagCount = authors.filter((author) => author.tags.length === 0).length;
  const selectedTag =
    selectedTagId === UNTAGGED_TAG_ID
      ? { id: UNTAGGED_TAG_ID, name: UNTAGGED_TAG_NAME }
      : (tags.find((tag) => tag.id === selectedTagId) ?? null);
  const selectedTagAuthors = selectedTag
    ? selectedTag.id === UNTAGGED_TAG_ID
      ? authors.filter((author) => author.tags.length === 0)
      : authors.filter((author) => author.tags.includes(selectedTag.name))
    : [];

  function pushLog(message: string) {
    setActivityLogs((current) => [message, ...current].slice(0, 14));
  }

  function getTagScoreDetails(author: Author) {
    const nicknameText = author.nickname.toLowerCase().replace(/\s+/g, ' ');
    const summaryText = (author.profile_summary ?? '').toLowerCase().replace(/\s+/g, ' ');
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
            summaryText.includes(normalizedTagName) &&
            normalizedTagName.includes(tagName.toLowerCase())
          ) {
            score += 1;
            hits.push(`标签联想:${originalTagName}`);
          }
        }

        // Only use fuzzy matching for custom tags to avoid default-tag false positives.
        if (!DEFAULT_TAG_NAME_SET.has(tagName)) {
          for (const segment of getTwoCharSegments(tagName.toLowerCase())) {
            if (segment.length >= 2 && summaryText.includes(segment)) {
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
      .slice(0, 1)
      .map((item) => item.tagName);

    return scoredRecommendations;
  }

  function getAuthorsWithRecommendations(sourceAuthors: Author[]) {
    return sourceAuthors
      .map((author) => ({
        author,
        recommendedTags: getRecommendedTags(author),
      }))
      .filter((item) => item.recommendedTags.length > 0);
  }

  function getAutoGeneratedTagCandidates(sourceAuthors: Author[]) {
    const counter = new Map<string, number>();

    for (const { author, recommendedTags } of getAuthorsWithRecommendations(sourceAuthors)) {
      if (author.tags.length > 0) {
        continue;
      }

      for (const tagName of recommendedTags) {
        counter.set(tagName, (counter.get(tagName) ?? 0) + 1);
      }
    }

    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tagName, count]) => ({ tagName, count }));
  }

  const authorsWithRecommendations = getAuthorsWithRecommendations(authors);

  async function refreshData() {
    const [nextAuthors, nextTags] = await Promise.all([storage.getAuthors(), storage.getTags()]);
    const nextUntaggedCount = nextAuthors.filter((author) => author.tags.length === 0).length;
    setAuthors(nextAuthors);
    setTags(nextTags);
    setSelectedTagId((current) => {
      if (!current) {
        return nextUntaggedCount > 0 ? UNTAGGED_TAG_ID : (nextTags[0]?.id ?? null);
      }
      if (current === UNTAGGED_TAG_ID) {
        return nextUntaggedCount > 0 ? UNTAGGED_TAG_ID : (nextTags[0]?.id ?? null);
      }
      return nextTags.some((tag) => tag.id === current)
        ? current
        : (nextUntaggedCount > 0 ? UNTAGGED_TAG_ID : (nextTags[0]?.id ?? null));
    });
  }

  async function handleScanClick(mode: ScanMode) {
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setLoading(true);
    setActiveScanSessionId(sessionId);
    setStatusTone('info');
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
        diagnostics?.stopped
          ? `自动搜集已手动停止，当前先保留已累计识别到的 ${response.added + response.merged} 位博主。`
          : response.added > 0
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
      if (mode === 'auto' && diagnostics?.stopped) {
        pushLog(
          `自动搜集：用户手动停止。本轮已滚动 ${diagnostics.rounds} 次，累计识别 ${diagnostics.detectedProfiles} 位候选博主。`,
        );
      }
    } catch (error) {
      setStatusTone('error');
      setStatusText(error instanceof Error ? error.message : '扫描失败，请稍后重试。');
    } finally {
      setActiveScanSessionId(null);
      setLoading(false);
    }
  }

  async function handleStopAutoScan() {
    if (!activeScanSessionId) {
      return;
    }

    try {
      await stopScanInActivePage(activeScanSessionId);
      setStatusTone('info');
      setStatusText('已发送停止指令，正在结束当前自动滚动搜集并保留已抓到的结果...');
      pushLog('自动搜集：已发送停止指令，正在等待当前轮次结束。');
    } catch (error) {
      setStatusTone('error');
      setStatusText(error instanceof Error ? error.message : '停止自动滚动失败，请稍后重试。');
    }
  }

  function handleStopSecondaryCollect() {
    if (!isSecondaryCollectRunning) {
      return;
    }

    secondaryCollectStopRequestedRef.current = true;
    setStatusTone('info');
    setStatusText('已发送停止指令，正在结束当前二次搜集并保留已补充的资料...');
    pushLog('二次搜集：已发送停止指令，正在等待当前轮次结束。');
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
      await storage.toggleAuthorTag(author.user_id, tagName);
      await refreshData();
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

  async function handleDeleteAuthor(author: Author) {
    const confirmed = window.confirm(`确认将 ${author.nickname} 从插件入库列表中删除吗？`);
    if (!confirmed) {
      return;
    }

    await storage.deleteAuthor(author.user_id);
    if (tagEditorAuthorId === author.user_id) {
      setTagEditorAuthorId(null);
    }
    await refreshData();
    setStatusTone('success');
    setStatusText(`已将 ${author.nickname} 从入库博主中删除。`);
    pushLog(`入库博主：已删除 ${author.nickname}。`);
  }

  function toggleTagEditor(authorId: string) {
    setTagEditorAuthorId((current) => (current === authorId ? null : authorId));
  }

  function renderAuthorTagEditor(author: Author) {
    const isEditing = tagEditorAuthorId === author.user_id;
    const availableTagPool = recommendationTagPool;
    const alignClass = author.avatar_url ? 'ml-[52px]' : '';

    return (
      <div className={alignClass}>
        <div className="flex flex-wrap items-center gap-2">
          {author.tags.length > 0 ? (
            author.tags.map((tagName) => (
              <button
                key={`${author.user_id}-${tagName}`}
                type="button"
                onClick={() => toggleTagEditor(author.user_id)}
                className={[
                  'rounded-full px-2 py-1 text-[11px] transition',
                  isEditing
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {tagName}
              </button>
            ))
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">未分类</span>
          )}
          <button
            type="button"
            onClick={() => toggleTagEditor(author.user_id)}
            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            ＋
          </button>
        </div>

        {isEditing ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {availableTagPool.length === 0 ? (
              <span className="text-xs text-slate-400">暂无可用标签</span>
            ) : (
              availableTagPool.map((tagName) => {
                const isSelected = author.tags.includes(tagName);
                const isDisabled = !isSelected && author.tags.length >= 2;

                return (
                  <button
                    key={`${author.user_id}-picker-${tagName}`}
                    type="button"
                    onClick={() => handleToggleTag(author, tagName)}
                    disabled={isDisabled}
                    className={[
                      'rounded-full border px-2.5 py-1 text-xs transition',
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                      isDisabled && 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 hover:border-slate-200',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {tagName}
                  </button>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    );
  }

  async function handleToggleFollow(author: Author) {
    const followed = author.followed ?? true;
    const targetAction = followed ? 'unfollow' : 'follow';
    const actionLabel = followed ? '取消关注' : '关注';

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

      const results = await chrome.scripting.executeScript({
        target: { tabId: createdTabId },
        func: async (action: 'follow' | 'unfollow') => {
          const normalize = (text: string) => text.replace(/\s+/g, '').trim();
          const delay = (ms: number) =>
            new Promise<void>((resolve) => {
              window.setTimeout(resolve, ms);
            });
          const targetTexts =
            action === 'unfollow'
              ? ['已关注', '已关注中', '关注中']
              : ['关注', '+关注'];

          for (let attempt = 0; attempt < 16; attempt += 1) {
            const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
            const targetButton = buttons.find((button) => {
              const text = normalize(button.innerText || button.textContent || '');
              return targetTexts.some((candidate) => text.includes(candidate));
            });

            if (targetButton) {
              targetButton.click();
              await delay(action === 'unfollow' ? 650 : 420);
              return { success: true };
            }

            await delay(180);
          }

          return { success: false, reason: '未找到可操作的关注按钮。' };
        },
        args: [targetAction],
      });

      const result = results[0]?.result;
      if (!result?.success) {
        throw new Error(result?.reason || `${actionLabel}失败，请稍后重试。`);
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

  async function handleSecondaryCollect() {
    const candidates = authors.filter((author) => author.tags.length === 0);
    if (candidates.length === 0) {
      setStatusTone('idle');
      setStatusText('当前没有待二次搜集的未分类博主。');
      pushLog('二次搜集：当前没有待处理的未分类博主。');
      return;
    }

    const shouldAutoClassify = window.confirm(
      `将对 ${candidates.length} 位未分类博主执行慢速二次搜集。这个过程会慢速打开主页补抓简介，仍有一定风控风险。\n\n点击“确定”：二次搜集完成后自动分类\n点击“取消”：只补充资料，不自动分类`,
    );

    setLoading(true);
    setIsSecondaryCollectRunning(true);
    secondaryCollectStopRequestedRef.current = false;
    setStatusTone('idle');
    setStatusText('正在慢速二次搜集：逐个打开博主主页补抓资料...');
    pushLog(
      `二次搜集开始：准备处理 ${candidates.length} 位未分类博主。${
        shouldAutoClassify ? '本轮结束后会自动分类。' : '本轮只补资料，不自动分类。'
      }`,
    );

    try {
      const updates = await collectAuthorProfileSummariesSlowly(
        candidates,
        (finished, total, nickname) => {
          setStatusText(
            `正在慢速二次搜集 ${finished + 1}/${total}：${nickname}。每位博主之间会额外等待几秒。`,
          );
        },
        () => secondaryCollectStopRequestedRef.current,
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

      if (secondaryCollectStopRequestedRef.current) {
        const nextTags = await storage.getTags();
        setTags(nextTags);
        setAuthors(nextAuthors);
        setStatusTone('success');
        setStatusText(`二次搜集已手动停止，已先保留 ${updates.length} 位博主本轮补充到的资料。`);
        pushLog(`二次搜集结束：用户手动停止，本轮保留了 ${updates.length} 位博主的补充资料。`);
        return;
      }

      const generatedTagCandidates = getAutoGeneratedTagCandidates(nextAuthors);
      if (generatedTagCandidates.length > 0) {
        pushLog(
          `二次搜集：系统从本轮资料里生成了标签候选 -> ${generatedTagCandidates
            .map(({ tagName, count }) => `${tagName}(${count})`)
            .join('、')}。`,
        );
      }

      if (!shouldAutoClassify) {
        setStatusTone('success');
        setStatusText('二次搜集完成，已补充资料。你可以稍后再决定是否分类。');
        pushLog('二次搜集结束：已补充资料，本轮按开始时设置不自动分类。');
        return;
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
          `${author.nickname}：二次搜集后自动分类 -> ${recommendedTags.join('、')}。原因：${details
            .map((item) => `${item.tagName}(${item.score}/${item.threshold}${item.hits.length > 0 ? `，${item.hits.join('、')}` : ''}${item.matchedSummarySnippets.length > 0 ? `，摘要片段：${item.matchedSummarySnippets.join(' / ')}` : ''})`)
            .join('；')}`,
        );
      }

      const nextTags = await storage.getTags();
      setTags(nextTags);
      setAuthors(appliedAuthors);
      const remainingUntyped = appliedAuthors.filter((author) => author.tags.length === 0).length;
      setStatusTone(appliedCount > 0 ? 'success' : 'error');
      setStatusText(
        appliedCount > 0
          ? `二次搜集完成，并已为 ${appliedCount} 位博主自动打上标签。仍有 ${remainingUntyped} 位未分类。`
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
      secondaryCollectStopRequestedRef.current = false;
      setIsSecondaryCollectRunning(false);
      setLoading(false);
    }
  }

  async function handleNoteBlur(author: Author, note: string) {
    const nextAuthors = await storage.updateAuthorNote(author.user_id, note);
    setAuthors(nextAuthors);
  }

  return (
    <main className="w-[472px] bg-[radial-gradient(circle_at_top,_rgba(254,226,226,0.9),_rgba(255,255,255,1)_50%)] p-5 text-slate-900">
      <section className="rounded-3xl bg-white/90 p-4 shadow-panel ring-1 ring-slate-200">
        {viewMode === 'authors' ? (
          <>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">
                XHS Following Manager
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">小红书关注整理助手</h1>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                打开小红书搜索结果页，并勾选“已关注”筛选后开始扫描。
              </p>
            </div>

            <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              {loading && activeScanSessionId ? (
                <button
                  type="button"
                  onClick={handleStopAutoScan}
                  className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm transition hover:bg-amber-50"
                >
                  停止滚动
                </button>
              ) : null}
              {isSecondaryCollectRunning ? (
                <button
                  type="button"
                  onClick={handleStopSecondaryCollect}
                  className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 shadow-sm transition hover:bg-sky-50"
                >
                  停止搜集
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleScanClick('page')}
              disabled={loading}
              className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-[1px] hover:border-red-200 hover:bg-red-50/60 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {loading ? '处理中...' : '扫描当前页'}
            </button>
            <button
              type="button"
              onClick={() => handleScanClick('auto')}
              disabled={loading}
              className="rounded-[20px] bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] px-3 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.14)] transition hover:-translate-y-[1px] hover:brightness-105 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? '处理中...' : '自动滚动搜集'}
            </button>
            <button
              type="button"
              onClick={handleSecondaryCollect}
              disabled={loading || authors.filter((author) => author.tags.length === 0).length === 0}
              className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-[1px] hover:border-red-200 hover:bg-red-50/60 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              二次搜集
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setViewMode('tags')}
              className="rounded-[18px] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50"
            >
              标签
            </button>
            <button
              type="button"
              onClick={() => setViewMode('favorites')}
              className="rounded-[18px] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:bg-slate-50"
            >
              收藏夹
            </button>
            <button
              type="button"
              onClick={handleClearAuthors}
              disabled={loading || authors.length === 0}
              className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              清空入库博主
            </button>
          </div>
        </div>

        {statusTone !== 'idle' ? (
          <div
            className={[
              'mt-3 rounded-2xl px-3 py-2 text-sm',
              statusTone === 'info' && 'bg-emerald-50 text-emerald-700',
              statusTone === 'success' && 'bg-emerald-50 text-emerald-700',
              statusTone === 'error' && 'bg-rose-50 text-rose-700',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {statusText}
          </div>
        ) : null}

        <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-600">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-700">运行日志</p>
            <span className="text-slate-400">最近 {activityLogs.length} 条</span>
          </div>
          {activityLogs.length === 0 ? (
            <p className="mt-2 leading-5 text-slate-500">还没有日志。开始扫描、自动分类或二次搜集后，这里会显示命中原因。</p>
          ) : (
            <div className="mt-2 space-y-2">
              {activityLogs.map((log, index) => (
                <p key={`${index}-${log.slice(0, 12)}`} className="leading-5 text-slate-700">
                  {log}
                </p>
              ))}
            </div>
          )}
        </div>
          </>
        ) : (
          <div className="relative mb-4 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setViewMode('authors')}
              className="absolute left-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              返回
            </button>
            <h1 className="text-2xl font-semibold text-slate-900">
              {viewMode === 'tags' ? '标签管理' : '收藏夹'}
            </h1>
          </div>
        )}

        {viewMode === 'authors' || viewMode === 'favorites' ? (
          <section className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  {viewMode === 'favorites' ? '收藏博主' : '已搜集博主'}
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {viewMode === 'favorites'
                    ? `${authors.filter((author) => author.favorite).length} 位收藏`
                    : `${authors.length} 位`}
                </span>
              </div>
              {viewMode === 'authors' ? (
                <span className="text-xs text-slate-500">
                  {authors.filter((author) => author.tags.length > 0).length} 位已自动分类
                </span>
              ) : null}
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
                {viewMode === 'favorites' ? '收藏夹里还没有博主。' : '没有匹配到相关博主，试试别的关键词。'}
              </div>
            ) : (
              <div className="space-y-4">
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
                          className="relative rounded-2xl border border-slate-200 px-3 py-3"
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteAuthor(author)}
                            aria-label="删除入库博主"
                            title="删除入库博主"
                            className="absolute -left-1.5 -top-1.5 z-10 h-6 w-6 rounded-full border border-slate-200 bg-white text-xs leading-none text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                          >
                            ×
                          </button>
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
                                  <TruncatedNickname nickname={author.nickname} />
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
                            </div>
                          </div>

                          <div className="mt-3">{renderAuthorTagEditor(author)}</div>

                          <div className="mt-3">
                            <textarea
                              defaultValue={author.note ?? ''}
                              onBlur={(event) => handleNoteBlur(author, event.target.value)}
                              rows={2}
                              placeholder="添加备注，例如：探店风格稳定，后续归到美食精选"
                              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-red-300"
                            />
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
              <p className="text-xs leading-5 text-slate-500">
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

            <div className="mt-4">
              {tags.length === 0 && untaggedTagCount === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  还没有手动创建的标签。你可以直接新建，也可以先去博主列表接受系统推荐标签。
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {tags.map((tag) => {
                      const taggedCount = authors.filter((author) => author.tags.includes(tag.name)).length;

                      return (
                        <div
                          key={tag.id}
                          className={[
                            'relative rounded-[20px] border px-2.5 py-2.5 transition',
                            selectedTagId === tag.id
                              ? 'border-red-200 bg-red-50'
                              : 'border-slate-200 bg-white hover:border-slate-300',
                          ].join(' ')}
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(tag.id)}
                            aria-label={`删除标签 ${tag.name}`}
                            title={`删除标签 ${tag.name}`}
                            className="absolute right-2 top-2 h-5 w-5 rounded-full bg-slate-100 text-[10px] leading-none text-slate-500 transition hover:bg-slate-200"
                          >
                            ×
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTagId(tag.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-center gap-1.5 pr-5">
                              <span className="text-base leading-none">{getTagDisplayIcon(tag.name)}</span>
                              <p className="truncate text-sm font-medium text-slate-900">{tag.name}</p>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{taggedCount}</p>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {untaggedTagCount > 0 ? (
                    <div
                      className={[
                        'mt-2 rounded-[20px] border px-3 py-3 transition',
                        selectedTagId === UNTAGGED_TAG_ID
                          ? 'border-red-200 bg-red-50'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedTagId(UNTAGGED_TAG_ID)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{getTagDisplayIcon(UNTAGGED_TAG_NAME)}</span>
                          <p className="text-sm font-medium text-slate-900">{UNTAGGED_TAG_NAME}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{untaggedTagCount} 位博主未打标</p>
                      </button>
                    </div>
                  ) : null}
                </>
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
                <div className="space-y-2">
                  {selectedTagAuthors.map((author) => (
                    <div
                      key={author.user_id}
                      className="relative rounded-2xl border border-slate-200 px-3 py-3"
                    >
                        <button
                          type="button"
                          onClick={() => handleDeleteAuthor(author)}
                          aria-label="删除入库博主"
                          title="删除入库博主"
                          className="absolute -left-1.5 -top-1.5 z-10 h-6 w-6 rounded-full border border-slate-200 bg-white text-xs leading-none text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                        >
                          ×
                        </button>
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
                                <TruncatedNickname nickname={author.nickname} />
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
                          </div>
                        </div>

                        <div className="mt-3">{renderAuthorTagEditor(author)}</div>

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
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function TruncatedNickname({ nickname }: { nickname: string }) {
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useLayoutEffect(() => {
    const checkTruncation = () => {
      const element = textRef.current;
      if (!element) {
        setIsTruncated(false);
        return;
      }

      setIsTruncated(element.scrollWidth > element.clientWidth + 1);
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => {
      window.removeEventListener('resize', checkTruncation);
    };
  }, [nickname]);

  return (
    <div className="group relative">
      <p ref={textRef} className="truncate text-sm font-medium text-slate-900">
        {nickname}
      </p>
      {isTruncated ? (
        <span className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden max-w-[240px] whitespace-normal rounded-xl bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
          {nickname}
        </span>
      ) : null}
    </div>
  );
}
