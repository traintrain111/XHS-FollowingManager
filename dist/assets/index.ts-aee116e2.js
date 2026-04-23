(function(){const d="xhs-following-manager-root",c="xhs_following_manager_panel_hidden";h();let l=!1;async function h(){m(),await u()}async function u(){if(document.getElementById(d))return;const t=await b(),n=document.createElement("div");n.id=d,n.style.all="initial",n.style.position="fixed",n.style.top="56px",n.style.right="8px",n.style.zIndex="2147483647";const r=n.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=`
    .panel-shell {
      position: relative;
      width: 496px;
      height: min(88vh, 820px);
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
  `;const a=document.createElement("div");a.className=t?"panel-shell hidden":"panel-shell";const o=document.createElement("button");o.className="hide-button",o.type="button",o.textContent="›",o.setAttribute("aria-label","隐藏整理助手"),o.title="隐藏整理助手";const i=document.createElement("iframe");i.className="panel-frame",i.src=chrome.runtime.getURL("src/popup/index.html?embedded=1"),i.title="小红书关注整理助手",i.allow="clipboard-read; clipboard-write";const e=document.createElement("button");e.className=t?"show-button":"show-button hidden",e.type="button",e.textContent="‹",e.setAttribute("aria-label","展开整理助手"),e.title="展开整理助手",o.addEventListener("click",async()=>{a.classList.add("hidden"),e.classList.remove("hidden"),await p(!0)}),e.addEventListener("click",async()=>{a.classList.remove("hidden"),e.classList.add("hidden"),await p(!1)}),a.append(o,i),r.append(s,a,e),document.documentElement.appendChild(n)}function m(){const t=()=>{l||(l=!0,window.setTimeout(()=>{l=!1,u()},150))};new MutationObserver(()=>{document.getElementById(d)||t()}).observe(document.documentElement,{childList:!0,subtree:!0});const r=s=>{const a=history[s];history[s]=function(...i){const e=a.apply(this,i);return t(),e}};r("pushState"),r("replaceState"),window.addEventListener("popstate",t),window.addEventListener("pageshow",t)}async function b(){return!!(await chrome.storage.local.get(c))[c]}async function p(t){await chrome.storage.local.set({[c]:t})}
})()
