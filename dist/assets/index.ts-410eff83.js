(function(){const l="xhs-following-manager-root",c="xhs_following_manager_panel_hidden";h();let r=!1;async function h(){m(),await u()}async function u(){if(document.getElementById(l))return;const e=await b(),t=document.createElement("div");t.id=l,t.style.all="initial",t.style.position="fixed",t.style.top="20px",t.style.right="20px",t.style.zIndex="2147483647";const d=t.attachShadow({mode:"open"}),i=document.createElement("style");i.textContent=`
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
      font: 500 12px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      padding: 8px 10px;
      cursor: pointer;
    }

    .show-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 0;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.9);
      color: white;
      font: 600 12px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      padding: 10px 14px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
      cursor: pointer;
    }

    .show-button.hidden {
      display: none;
    }
  `;const o=document.createElement("div");o.className=e?"panel-shell hidden":"panel-shell";const s=document.createElement("button");s.className="hide-button",s.type="button",s.textContent="隐藏";const a=document.createElement("iframe");a.className="panel-frame",a.src=chrome.runtime.getURL("src/popup/index.html?embedded=1"),a.title="小红书关注整理助手",a.allow="clipboard-read; clipboard-write";const n=document.createElement("button");n.className=e?"show-button":"show-button hidden",n.type="button",n.textContent="展开整理助手",s.addEventListener("click",async()=>{o.classList.add("hidden"),n.classList.remove("hidden"),await p(!0)}),n.addEventListener("click",async()=>{o.classList.remove("hidden"),n.classList.add("hidden"),await p(!1)}),o.append(s,a),d.append(i,o,n),document.documentElement.appendChild(t)}function m(){const e=()=>{r||(r=!0,window.setTimeout(()=>{r=!1,u()},150))};new MutationObserver(()=>{document.getElementById(l)||e()}).observe(document.documentElement,{childList:!0,subtree:!0});const d=i=>{const o=history[i];history[i]=function(...a){const n=o.apply(this,a);return e(),n}};d("pushState"),d("replaceState"),window.addEventListener("popstate",e),window.addEventListener("pageshow",e)}async function b(){return!!(await chrome.storage.local.get(c))[c]}async function p(e){await chrome.storage.local.set({[c]:e})}
})()
