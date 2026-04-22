const PANEL_ROOT_ID = 'xhs-following-manager-root';
const PANEL_STATE_KEY = 'xhs_following_manager_panel_hidden';

void bootstrapFloatingPanel();

let mountScheduled = false;

async function bootstrapFloatingPanel(): Promise<void> {
  installLifecycleHooks();
  await mountFloatingPanel();
}

async function mountFloatingPanel(): Promise<void> {
  if (document.getElementById(PANEL_ROOT_ID)) {
    return;
  }

  const hidden = await getHiddenState();
  const root = document.createElement('div');
  root.id = PANEL_ROOT_ID;
  root.style.all = 'initial';
  root.style.position = 'fixed';
  root.style.top = '56px';
  root.style.right = '8px';
  root.style.zIndex = '2147483647';

  const shadow = root.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .panel-shell {
      position: relative;
      width: 404px;
      height: min(84vh, 760px);
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.22);
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid rgba(226, 232, 240, 0.95);
      backdrop-filter: blur(12px);
    }

    .panel-shell.hidden {
      display: none;
    }

    .panel-frame {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
      background: white;
    }

    .hide-button {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 2;
      border: 0;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.78);
      color: white;
      font: 700 16px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .show-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.9);
      color: white;
      font: 700 18px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      width: 42px;
      height: 42px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
      cursor: pointer;
    }

    .show-button.hidden {
      display: none;
    }
  `;

  const panelShell = document.createElement('div');
  panelShell.className = hidden ? 'panel-shell hidden' : 'panel-shell';

  const hideButton = document.createElement('button');
  hideButton.className = 'hide-button';
  hideButton.type = 'button';
  hideButton.textContent = '›';
  hideButton.setAttribute('aria-label', '隐藏整理助手');
  hideButton.title = '隐藏整理助手';

  const iframe = document.createElement('iframe');
  iframe.className = 'panel-frame';
  iframe.src = chrome.runtime.getURL('src/popup/index.html?embedded=1');
  iframe.title = '小红书关注整理助手';
  iframe.allow = 'clipboard-read; clipboard-write';

  const showButton = document.createElement('button');
  showButton.className = hidden ? 'show-button' : 'show-button hidden';
  showButton.type = 'button';
  showButton.textContent = '‹';
  showButton.setAttribute('aria-label', '展开整理助手');
  showButton.title = '展开整理助手';

  hideButton.addEventListener('click', async () => {
    panelShell.classList.add('hidden');
    showButton.classList.remove('hidden');
    await setHiddenState(true);
  });

  showButton.addEventListener('click', async () => {
    panelShell.classList.remove('hidden');
    showButton.classList.add('hidden');
    await setHiddenState(false);
  });

  panelShell.append(hideButton, iframe);
  shadow.append(style, panelShell, showButton);
  document.documentElement.appendChild(root);
}

function installLifecycleHooks(): void {
  const scheduleMount = () => {
    if (mountScheduled) {
      return;
    }

    mountScheduled = true;
    window.setTimeout(() => {
      mountScheduled = false;
      void mountFloatingPanel();
    }, 150);
  };

  const observer = new MutationObserver(() => {
    if (!document.getElementById(PANEL_ROOT_ID)) {
      scheduleMount();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const wrapHistoryMethod = (methodName: 'pushState' | 'replaceState') => {
    const original = history[methodName];
    history[methodName] = function wrappedHistoryMethod(...args) {
      const result = original.apply(this, args);
      scheduleMount();
      return result;
    };
  };

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
  window.addEventListener('popstate', scheduleMount);
  window.addEventListener('pageshow', scheduleMount);
}

async function getHiddenState(): Promise<boolean> {
  const result = await chrome.storage.local.get(PANEL_STATE_KEY);
  return Boolean(result[PANEL_STATE_KEY]);
}

async function setHiddenState(hidden: boolean): Promise<void> {
  await chrome.storage.local.set({ [PANEL_STATE_KEY]: hidden });
}
