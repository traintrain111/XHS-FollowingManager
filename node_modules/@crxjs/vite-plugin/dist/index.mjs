import { simple } from 'acorn-walk';
import { createHash } from 'crypto';
import debug$5 from 'debug';
import { join, normalize, dirname, basename, isAbsolute, relative, resolve, parse as parse$1 } from 'pathe';
import { Subject, filter, ReplaySubject, switchMap, of, startWith, map, BehaviorSubject, mergeMap, firstValueFrom, takeUntil, first, toArray, retry, concatWith, Subscription, buffer } from 'rxjs';
import fsx from 'fs-extra';
import { performance } from 'perf_hooks';
import { rollup } from 'rollup';
import * as lexer from 'es-module-lexer';
import { readFile as readFile$1 } from 'fs/promises';
import MagicString from 'magic-string';
import convertSourceMap from 'convert-source-map';
import pc from 'picocolors';
import { createLogger, version } from 'vite';
import { readFileSync, existsSync, promises } from 'fs';
import { createRequire } from 'module';
import fg from 'fast-glob';
import { parse } from 'node-html-parser';
import jsesc from 'jsesc';

const pluginName$1 = "crx:optionsProvider";
const pluginOptionsProvider = (options) => {
  return {
    name: pluginName$1,
    api: {
      crx: {
        // during testing this can be null, we don't provide options through the test config
        options
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }
  };
};
const getOptions = async ({
  plugins
}) => {
  if (typeof plugins === "undefined") {
    throw new Error("config.plugins is undefined");
  }
  const awaitedPlugins = await Promise.all(plugins);
  let options;
  for (const p of awaitedPlugins.flat()) {
    if (isCrxPlugin(p)) {
      if (p.name === pluginName$1) {
        const plugin = p;
        options = plugin.api.crx.options;
        if (options)
          break;
      }
    }
  }
  if (typeof options === "undefined") {
    throw Error("Unable to get CRXJS options");
  }
  return options;
};
function isCrxPlugin(p) {
  return !!p && typeof p === "object" && !(p instanceof Promise) && !Array.isArray(p) && p.name.startsWith("crx:");
}

var workerHmrClient = "const ownOrigin = `chrome-extension://${chrome.runtime.id}`;\nself.addEventListener(\"fetch\", (fetchEvent) => {\n  const url = new URL(fetchEvent.request.url);\n  if (url.origin === ownOrigin) {\n    fetchEvent.respondWith(sendToServer(fetchEvent.request));\n  }\n});\nasync function sendToServer(req) {\n  const url = new URL(req.url);\n  const requestHeaders = new Headers(req.headers);\n  url.protocol = __SERVER_PROTO__ + \":\";\n  url.host = \"localhost\";\n  url.port = __SERVER_PORT__;\n  url.searchParams.set(\"t\", Date.now().toString());\n  const response = await fetch(url.href.replace(/=$|=(?=&)/g, \"\"), {\n    headers: requestHeaders\n  });\n  const responseHeaders = new Headers(response.headers);\n  responseHeaders.set(\n    \"Content-Type\",\n    responseHeaders.get(\"Content-Type\") ?? \"text/javascript\"\n  );\n  responseHeaders.set(\n    \"Cache-Control\",\n    responseHeaders.get(\"Cache-Control\") ?? \"\"\n  );\n  return new Response(response.body, {\n    headers: responseHeaders\n  });\n}\nconst ports = /* @__PURE__ */ new Set();\nchrome.runtime.onConnect.addListener((port) => {\n  if (port.name === \"@crx/client\") {\n    ports.add(port);\n    port.onDisconnect.addListener((port2) => {\n      if (chrome.runtime.lastError) {\n        console.error(chrome.runtime.lastError);\n      }\n      ports.delete(port2);\n    });\n    port.onMessage.addListener((message) => {\n    });\n    port.postMessage({ data: JSON.stringify({ type: \"connected\" }) });\n  }\n});\nfunction notifyContentScripts(payload) {\n  const data = JSON.stringify(payload);\n  for (const port of ports)\n    port.postMessage({ data });\n}\nconsole.log(\"[vite] connecting...\");\nconst socketProtocol = __HMR_PROTOCOL__ || (location.protocol === \"https:\" ? \"wss\" : \"ws\");\nconst socketToken = __HMR_TOKEN__;\nconst socketHost = `${__HMR_HOSTNAME__ || location.hostname}:${__HMR_PORT__}`;\nconst socket = new WebSocket(\n  `${socketProtocol}://${socketHost}?token=${socketToken}`,\n  \"vite-hmr\"\n);\nconst base = __BASE__ || \"/\";\nsocket.addEventListener(\"message\", async ({ data }) => {\n  handleSocketMessage(JSON.parse(data));\n});\nfunction isCrxHmrPayload(x) {\n  return x.type === \"custom\" && x.event.startsWith(\"crx:\");\n}\nfunction handleSocketMessage(payload) {\n  if (isCrxHmrPayload(payload)) {\n    handleCrxHmrPayload(payload);\n  } else if (payload.type === \"connected\") {\n    console.log(`[vite] connected.`);\n    const interval = setInterval(() => socket.send(\"ping\"), __HMR_TIMEOUT__);\n    socket.addEventListener(\"close\", () => clearInterval(interval));\n  }\n}\nfunction handleCrxHmrPayload(payload) {\n  notifyContentScripts(payload);\n  switch (payload.event) {\n    case \"crx:runtime-reload\":\n      console.log(\"[crx] runtime reload\");\n      chrome.runtime.reload();\n      break;\n  }\n}\nasync function waitForSuccessfulPing(ms = 1e3) {\n  while (true) {\n    try {\n      await fetch(`${base}__vite_ping`);\n      break;\n    } catch (e) {\n      await new Promise((resolve) => setTimeout(resolve, ms));\n    }\n  }\n}\nsocket.addEventListener(\"close\", async ({ wasClean }) => {\n  if (wasClean)\n    return;\n  console.log(`[vite] server connection lost. polling for restart...`);\n  await waitForSuccessfulPing();\n  handleCrxHmrPayload({\n    type: \"custom\",\n    event: \"crx:runtime-reload\"\n  });\n});\n";

const _debug = (id) => debug$5("crx").extend(id);
const hash = (data, length = 5) => createHash("sha1").update(data).digest("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, length);
const isString = (x) => typeof x === "string";
function isObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
const isResourceByMatch = (x) => "matches" in x;
function decodeManifest(code) {
  const tree = this.parse(code);
  let literal;
  let templateElement;
  simple(tree, {
    Literal(node) {
      literal = node;
    },
    TemplateElement(node) {
      templateElement = node;
    }
  });
  let manifestJson = literal?.value;
  if (!manifestJson)
    manifestJson = templateElement?.value?.cooked;
  if (!manifestJson)
    throw new Error("unable to parse manifest code");
  let result = JSON.parse(manifestJson);
  if (typeof result === "string")
    result = JSON.parse(result);
  return result;
}
function encodeManifest(manifest) {
  const json = JSON.stringify(JSON.stringify(manifest));
  return `export default ${json}`;
}
function parseJsonAsset(bundle, key) {
  const asset = bundle[key];
  if (typeof asset === "undefined")
    throw new TypeError(`OutputBundle["${key}"] is undefined.`);
  if (asset.type !== "asset")
    throw new Error(`OutputBundle["${key}"] is not an OutputAsset.`);
  if (typeof asset.source !== "string")
    throw new TypeError(`OutputBundle["${key}"].source is not a string.`);
  return JSON.parse(asset.source);
}
const getMatchPatternOrigin = (pattern) => {
  if (pattern.startsWith("<"))
    return pattern;
  const [schema, rest] = pattern.split("://");
  const slashIndex = rest.indexOf("/");
  const isSlashAfterOriginPresent = slashIndex !== -1;
  const origin = isSlashAfterOriginPresent ? rest.slice(0, slashIndex) : rest;
  const root = `${schema}://${origin}`;
  if (isSlashAfterOriginPresent) {
    return `${root}/*`;
  }
  return root;
};

function defineClientValues(code, config) {
  let options = config.server.hmr;
  options = options && typeof options !== "boolean" ? options : {};
  const host = options.host || null;
  const protocol = options.protocol || null;
  const timeout = options.timeout || 3e4;
  const overlay = options.overlay !== false;
  let hmrPort;
  if (isObject(config.server.hmr)) {
    hmrPort = config.server.hmr.clientPort || config.server.hmr.port;
  }
  if (config.server.middlewareMode) {
    hmrPort = String(hmrPort || 24678);
  } else {
    hmrPort = String(hmrPort || options.port || config.server.port);
  }
  let hmrBase = config.base;
  if (options.path) {
    hmrBase = join(hmrBase, options.path);
  }
  if (hmrBase !== "/") {
    hmrPort = normalize(`${hmrPort}${hmrBase}`);
  }
  return code.replace(`__MODE__`, JSON.stringify(config.mode)).replace(`__BASE__`, JSON.stringify(config.base)).replace(`__DEFINES__`, serializeDefine(config.define || {})).replace(`__HMR_TOKEN__`, JSON.stringify(config.webSocketToken || "")).replace(`__HMR_PROTOCOL__`, JSON.stringify(protocol)).replace(`__HMR_HOSTNAME__`, JSON.stringify(host)).replace(`__HMR_PORT__`, JSON.stringify(hmrPort)).replace(`__HMR_TIMEOUT__`, JSON.stringify(timeout)).replace(`__HMR_ENABLE_OVERLAY__`, JSON.stringify(overlay)).replace(
    `__SERVER_PROTO__`,
    JSON.stringify(config.server.https ? "https" : "http")
  ).replace(
    `__SERVER_PORT__`,
    JSON.stringify(config.server.port?.toString())
  );
  function serializeDefine(define) {
    let res = `{`;
    for (const key in define) {
      const val = define[key];
      res += `${JSON.stringify(key)}: ${typeof val === "string" ? `(${val})` : JSON.stringify(val)}, `;
    }
    return res + `}`;
  }
}

class RxMap extends Map {
  static isChangeType = {
    clear: (x) => x.type === "clear",
    delete: (x) => x.type === "delete",
    set: (x) => x.type === "set"
  };
  change$;
  constructor(iterable) {
    super(iterable);
    const change$ = new Subject();
    this.change$ = change$.asObservable();
    const changeMethodKeys = ["clear", "set", "delete"];
    for (const type of changeMethodKeys) {
      const method = this[type];
      this[type] = function(...args) {
        const result = method.call(this, ...args);
        change$.next({ type, key: args[0], value: args[1], map: this });
        return result;
      }.bind(this);
    }
  }
}

const outputFiles = new RxMap();

_debug("file-writer").extend("utilities");
function sanitizeUnderscorePrefix(fileName) {
  const dir = dirname(fileName);
  let base = basename(fileName);
  while (base.startsWith("_")) {
    base = base.slice(1);
  }
  if (!base) {
    base = "file";
  }
  return dir === "." ? base : join(dir, base);
}
function prefix$1(prefix2, text) {
  return text.startsWith(prefix2) ? text : prefix2 + text;
}
function strip(prefix2, text) {
  return text?.startsWith(prefix2) ? text?.slice(prefix2.length) : text;
}
function formatFileData(script) {
  script.id = prefix$1("/", script.id);
  if (script.fileName)
    script.fileName = strip("/", script.fileName);
  if (script.loaderName)
    script.loaderName = strip("/", script.loaderName);
  return script;
}
function getFileName({ type, id }) {
  let fileName = id.replace(/t=\d+&/, "").replace(/\?t=\d+$/, "").replace(/^\//, "").replace(/\?/g, "__").replace(/&/g, "_").replace(/=/g, "--");
  if (fileName.includes("node_modules/")) {
    fileName = `vendor/${fileName.split("node_modules/").pop().replace(/\//g, "-")}`;
  } else if (fileName.startsWith("@")) {
    fileName = `vendor/${fileName.slice("@".length).replace(/\//g, "-")}`;
  } else if (fileName.startsWith(".vite/deps/")) {
    fileName = `vendor/${fileName.slice(".vite/deps/".length)}`;
  }
  fileName = sanitizeUnderscorePrefix(fileName);
  switch (type) {
    case "iife":
      return `${fileName}.iife.js`;
    case "loader":
      return `${fileName}-loader.js`;
    case "module":
      return `${fileName}.js`;
    case "asset":
      return fileName;
    default:
      throw new Error(
        `Unexpected script type "${type}" for "${JSON.stringify({
          type,
          id
        })}"`
      );
  }
}
function getOutputPath(server, fileName) {
  const {
    root,
    build: { outDir }
  } = server.config;
  const target = isAbsolute(outDir) ? join(outDir, fileName) : join(root, outDir, fileName);
  return target;
}
function getViteUrl({ type, id }) {
  if (type === "asset") {
    throw new Error(`File type "${type}" not implemented.`);
  } else if (type === "iife") {
    throw new Error(`File type "${type}" not implemented.`);
  } else if (type === "loader") {
    throw new Error("Vite does not transform loader files.");
  } else if (type === "module") {
    if (id.startsWith("/@id/"))
      return id.slice("/@id/".length).replace("__x00__", "\0");
    return prefix$1("/", id);
  } else {
    throw new Error(`Invalid file type: "${type}"`);
  }
}
async function fileReady(script) {
  const fileName = getFileName(script);
  const file = outputFiles.get(fileName);
  if (!file)
    throw new Error("unknown script type and id");
  const { deps } = await file.file;
  await Promise.all(deps.map(fileReady));
}

const viteClientId = "/@vite/client";
const customElementsId = "/@webcomponents/custom-elements";
const contentHmrPortId = "/@crx/client-port";
const manifestId = "/@crx/manifest";
const preambleId = "/@crx/client-preamble";
const stubId = "/@crx/stub";
const workerClientId = "/@crx/client-worker";
const contentCssPrefix = "/@crx/content-css/";
function isContentCssId(id) {
  return id.startsWith(contentCssPrefix);
}
function getContentCssId(index) {
  return `${contentCssPrefix}${index}`;
}
function getContentCssIndex(id) {
  if (!isContentCssId(id))
    return null;
  const indexStr = id.slice(contentCssPrefix.length);
  const index = parseInt(indexStr, 10);
  return isNaN(index) ? null : index;
}

const pluginBackground = () => {
  let config;
  let browser;
  return [
    {
      name: "crx:background-client",
      apply: "serve",
      resolveId(source) {
        if (source === `/${workerClientId}`)
          return workerClientId;
      },
      load(id) {
        if (id === workerClientId) {
          const base = `${config.server.https ? "https" : "http"}://localhost:${config.server.port}/`;
          return defineClientValues(
            workerHmrClient.replace("__BASE__", JSON.stringify(base)),
            config
          );
        }
      }
    },
    {
      name: "crx:background-loader-file",
      // this should happen after other plugins; the loader file is an implementation detail
      enforce: "post",
      async config(config2) {
        const opts = await getOptions(config2);
        browser = opts.browser || "chrome";
      },
      configResolved(_config) {
        config = _config;
      },
      renderCrxManifest(manifest) {
        const worker = browser === "firefox" ? manifest.background?.scripts[0] : manifest.background?.service_worker;
        let loader;
        if (config.command === "serve") {
          const proto = config.server.https ? "https" : "http";
          const port = config.server.port?.toString();
          if (typeof port === "undefined")
            throw new Error("server port is undefined in watch mode");
          if (browser === "firefox") {
            loader = `import('${proto}://localhost:${port}/@vite/env');
`;
            loader += `import('${proto}://localhost:${port}${workerClientId}');
`;
            if (worker)
              loader += `import('${proto}://localhost:${port}/${worker}');
`;
          } else {
            loader = `import '${proto}://localhost:${port}/@vite/env';
`;
            loader += `import '${proto}://localhost:${port}${workerClientId}';
`;
            if (worker)
              loader += `import '${proto}://localhost:${port}/${worker}';
`;
          }
        } else if (worker) {
          loader = `import './${worker}';
`;
        } else {
          return null;
        }
        const refId = this.emitFile({
          type: "asset",
          // fileName b/c service worker must be at root of crx
          fileName: getFileName({ type: "loader", id: "service-worker" }),
          source: loader
        });
        if (browser !== "firefox") {
          manifest.background = {
            service_worker: this.getFileName(refId),
            type: "module"
          };
        } else {
          manifest.background = {
            scripts: [this.getFileName(refId)],
            type: "module"
          };
        }
        return manifest;
      }
    }
  ];
};

var contentHmrPort = "function isCrxHMRPayload(x) {\n  return x.type === \"custom\" && x.event.startsWith(\"crx:\");\n}\nclass HMRPort {\n  port;\n  callbacks = /* @__PURE__ */ new Map();\n  constructor() {\n    setInterval(() => {\n      try {\n        this.port?.postMessage({ data: \"ping\" });\n      } catch (error) {\n        if (error instanceof Error && error.message.includes(\"Extension context invalidated.\")) {\n          location.reload();\n        } else\n          throw error;\n      }\n    }, __CRX_HMR_TIMEOUT__);\n    setInterval(this.initPort, 5 * 60 * 1e3);\n    this.initPort();\n  }\n  initPort = () => {\n    this.port?.disconnect();\n    this.port = chrome.runtime.connect({ name: \"@crx/client\" });\n    this.port.onDisconnect.addListener(this.handleDisconnect.bind(this));\n    this.port.onMessage.addListener(this.handleMessage.bind(this));\n    this.port.postMessage({ type: \"connected\" });\n  };\n  handleDisconnect = () => {\n    if (this.callbacks.has(\"close\"))\n      for (const cb of this.callbacks.get(\"close\")) {\n        cb({ wasClean: true });\n      }\n  };\n  handleMessage = (message) => {\n    const forward = (data) => {\n      if (this.callbacks.has(\"message\"))\n        for (const cb of this.callbacks.get(\"message\")) {\n          cb({ data });\n        }\n    };\n    const payload = JSON.parse(message.data);\n    if (isCrxHMRPayload(payload)) {\n      if (payload.event === \"crx:runtime-reload\") {\n        console.log(\"[crx] runtime reload\");\n        setTimeout(() => location.reload(), 500);\n      } else {\n        forward(JSON.stringify(payload.data));\n      }\n    } else {\n      forward(message.data);\n    }\n  };\n  addEventListener = (event, callback) => {\n    const cbs = this.callbacks.get(event) ?? /* @__PURE__ */ new Set();\n    cbs.add(callback);\n    this.callbacks.set(event, cbs);\n  };\n  send = (data) => {\n    if (this.port)\n      this.port.postMessage({ data });\n    else\n      throw new Error(\"HMRPort is not initialized\");\n  };\n}\n\nexport { HMRPort };\n";

var contentDevLoader = "(function () {\n  'use strict';\n\n  const injectTime = performance.now();\n  (async () => {\n    if (__PREAMBLE__)\n      await import(\n        /* @vite-ignore */\n        chrome.runtime.getURL(__PREAMBLE__)\n      );\n    await import(\n      /* @vite-ignore */\n      chrome.runtime.getURL(__CLIENT__)\n    );\n    const { onExecute } = await import(\n      /* @vite-ignore */\n      chrome.runtime.getURL(__SCRIPT__)\n    );\n    onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });\n  })().catch(console.error);\n\n})();\n";

var contentDevMainLoader = "(function () {\n  'use strict';\n\n  const injectTime = performance.now();\n  (async () => {\n    console.warn(__SCRIPT__, \"Content-script doesn't support HMR because the world is MAIN\");\n    const { onExecute } = await import(\n      /* @vite-ignore */\n      __SCRIPT__\n    );\n    onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });\n  })().catch(console.error);\n\n})();\n";

var contentProLoader = "(function () {\n  'use strict';\n\n  const injectTime = performance.now();\n  (async () => {\n    const { onExecute } = await import(\n      /* @vite-ignore */\n      chrome.runtime.getURL(__SCRIPT__)\n    );\n    onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });\n  })().catch(console.error);\n\n})();\n";

var contentProMainLoader = "(function () {\n  'use strict';\n\n  const injectTime = performance.now();\n  (async () => {\n    const { onExecute } = await import(\n      /* @vite-ignore */\n      __SCRIPT__\n    );\n    onExecute?.({ perf: { injectTime, loadTime: performance.now() - injectTime } });\n  })().catch(console.error);\n\n})();\n";

const contentScripts = new RxMap();
contentScripts.change$.pipe(filter(RxMap.isChangeType.set)).subscribe(({ map, value }) => {
  const keyNames = [
    "refId",
    "id",
    "fileName",
    "loaderName",
    "resolvedId",
    "scriptId"
  ];
  for (const keyName of keyNames) {
    const key = value[keyName];
    if (typeof key === "undefined" || map.has(key)) {
      continue;
    } else {
      map.set(key, value);
    }
  }
});
function hashScriptId(script) {
  return hash(`${script.type}&${script.id}`);
}
function createDevLoader({
  preamble,
  client,
  fileName
}) {
  return contentDevLoader.replace(/__PREAMBLE__/g, JSON.stringify(preamble)).replace(/__CLIENT__/g, JSON.stringify(client)).replace(/__SCRIPT__/g, JSON.stringify(fileName)).replace(/__TIMESTAMP__/g, JSON.stringify(Date.now()));
}
function createProLoader({ fileName }) {
  return contentProLoader.replace(/__SCRIPT__/g, JSON.stringify(fileName));
}
function createDevMainLoader({
  fileName
}) {
  return contentDevMainLoader.replace(/__SCRIPT__/g, JSON.stringify(fileName)).replace(/__TIMESTAMP__/g, JSON.stringify(Date.now()));
}
function createProMainLoader({ fileName }) {
  return contentProMainLoader.replace(/__SCRIPT__/g, JSON.stringify(fileName));
}

const serverEvent$ = new ReplaySubject(1);
const close$ = serverEvent$.pipe(
  filter((e) => e.type === "close"),
  switchMap((e) => of(e))
);
const start$ = serverEvent$.pipe(
  filter((e) => e.type === "start"),
  switchMap((e) => of(e))
);
const fileWriterEvent$ = new ReplaySubject(1);
const buildEnd$ = fileWriterEvent$.pipe(
  filter((e) => e.type === "build_end"),
  switchMap((e) => of(e))
);
fileWriterEvent$.pipe(
  filter((e) => e.type === "build_start"),
  switchMap((e) => of(e))
);
const allFilesReady$ = buildEnd$.pipe(
  switchMap(() => outputFiles.change$.pipe(startWith({ type: "start" }))),
  map(() => [...outputFiles.values()]),
  switchMap((files) => Promise.allSettled(files.map(({ file }) => file)))
);
const timestamp$ = new BehaviorSubject(Date.now());
allFilesReady$.subscribe(() => {
  timestamp$.next(Date.now());
});
const isRejected = (x) => x?.status === "rejected";
const fileWriterError$ = allFilesReady$.pipe(
  mergeMap((results) => results.filter(isRejected)),
  map((rejected) => ({ err: rejected.reason, type: "error" }))
);
firstValueFrom(
  fileWriterError$.pipe(
    takeUntil(serverEvent$.pipe(first(({ type }) => type === "close"))),
    toArray()
  )
);
function prepFileData(fileId) {
  const fileName = getFileName(fileId);
  if (fileId.type === "asset") {
    return prepAsset(fileName, fileId);
  } else {
    return prepScript(fileName, fileId);
  }
}
function prepAsset(fileName, { id, source }) {
  return ($) => $.pipe(
    mergeMap(async ({ server }) => {
      const target = getOutputPath(server, fileName);
      return {
        target,
        source: source ?? await readFile$1(join(server.config.root, id)),
        deps: []
      };
    })
  );
}
function prepScript(fileName, script) {
  return ($) => $.pipe(
    // get script contents from dev server
    mergeMap(async ({ server }) => {
      const target = getOutputPath(server, fileName);
      const viteUrl = getViteUrl(script);
      const transformResult = await server.transformRequest(viteUrl);
      if (!transformResult)
        throw new TypeError(`Unable to load "${script.id}" from server.`);
      const { deps = [], dynamicDeps = [], map: map2 } = transformResult;
      let { code } = transformResult;
      try {
        if (map2 && server.config.build.sourcemap === "inline") {
          code = code.replace(/\n*\/\/# sourceMappingURL=[^\n]+/g, "");
          const sourceMap = convertSourceMap.fromObject(map2).toComment();
          code += `
${sourceMap}
`;
        }
      } catch (error) {
        console.warn("Failed to inline source map", error);
      }
      return {
        target,
        code,
        deps: [...deps, ...dynamicDeps].flat(),
        server
      };
    }),
    // retry in case of dependency rebundle
    retry({ count: 10, delay: 100 }),
    // patch content scripts
    mergeMap(async ({ target, server, ...rest }) => {
      const plugins = server.config.plugins;
      let { code, deps } = rest;
      for (const plugin of plugins) {
        const r = await plugin.renderCrxDevScript?.(code, script);
        if (typeof r === "string")
          code = r;
      }
      return { target, code, deps };
    }),
    mergeMap(async ({ target, code, deps }) => {
      await lexer.init;
      const [imports] = lexer.parse(code, fileName);
      const depSet = new Set(deps);
      const magic = new MagicString(code);
      for (const i of imports)
        if (i.n) {
          depSet.add(i.n);
          const fileName2 = getFileName({ type: "module", id: i.n });
          const fullImport = code.substring(i.s, i.e);
          magic.overwrite(i.s, i.e, fullImport.replace(i.n, `/${fileName2}`));
        }
      return { target, source: magic.toString(), deps: [...depSet] };
    })
  );
}
async function allFilesReady() {
  await firstValueFrom(allFilesReady$);
}

const { outputFile } = fsx;
const debug$4 = _debug("file-writer");
async function start({
  server
}) {
  serverEvent$.next({ type: "start", server });
  const plugins = server.config.plugins.filter(
    (p) => p.name?.startsWith("crx:")
  );
  const { rollupOptions, outDir } = server.config.build;
  const inputOptions = {
    input: "index.html",
    ...rollupOptions,
    plugins
  };
  const rollupOutputOptions = [rollupOptions.output].flat()[0];
  const outputOptions = {
    ...rollupOutputOptions,
    dir: outDir,
    format: "es"
  };
  fileWriterEvent$.next({ type: "build_start" });
  const build = await rollup(inputOptions);
  await build.write(outputOptions);
  fileWriterEvent$.next({ type: "build_end" });
  await allFilesReady();
}
async function close() {
  serverEvent$.next({ type: "close" });
}
function add(script) {
  const fileName = getFileName(script);
  debug$4(
    "add: script.id=%s script.type=%s fileName=%s",
    script.id,
    script.type,
    fileName
  );
  let file = outputFiles.get(fileName);
  if (typeof file === "undefined") {
    file = formatFileData({
      ...script,
      fileName,
      file: write(script)
    });
    outputFiles.set(file.fileName, file);
    debug$4("add: stored new file %s", file.fileName);
  } else {
    const isVirtualModule = script.id.startsWith("/@id/") || script.id.startsWith("/__");
    if (isVirtualModule) {
      debug$4(
        "add: virtual module already exists, triggering re-write for %s",
        fileName
      );
      file.file = write(script);
      outputFiles.set(fileName, file);
    }
  }
  return file;
}
function update(_id) {
  const id = prefix$1("/", _id);
  const types = ["iife", "module"];
  const updatedFiles = [];
  debug$4("update called: _id=%s id=%s", _id, id);
  for (const type of types) {
    const fileName = getFileName({ id, type });
    debug$4("update: looking for fileName=%s", fileName);
    const scriptFile = outputFiles.get(fileName);
    if (scriptFile) {
      debug$4("update: found file, calling write()");
      scriptFile.file = write({ id, type });
      updatedFiles.push(scriptFile);
      outputFiles.set(fileName, scriptFile);
    }
  }
  debug$4("update: returning %d files", updatedFiles.length);
  return updatedFiles;
}
async function write(fileId) {
  const start2 = performance.now();
  const deps = await firstValueFrom(
    // wait for start event
    start$.pipe(
      // prepare either asset or script contents
      prepFileData(fileId),
      // output file and add dependencies to file writer
      mergeMap(async ({ target, source, deps: deps2 }) => {
        const files = deps2.map((id) => {
          const r = [add({ id, type: "module" })];
          if (id.includes("?import")) {
            const [imported] = id.split("?import");
            r.push(add({ id: imported, type: "asset" }));
          }
          return r;
        }).flat();
        if (source instanceof Uint8Array)
          await outputFile(target, source);
        else
          await outputFile(target, source, { encoding: "utf8" });
        return files;
      }),
      // abort write operation on close event
      takeUntil(close$),
      concatWith(of([]))
    )
  );
  const close2 = performance.now();
  return { start: start2, close: close2, deps };
}

const pluginContentScripts = () => {
  const pluginName = "crx:content-scripts";
  let server;
  let preambleCode;
  let hmrTimeout;
  let sub = new Subscription();
  const worldMainIds = /* @__PURE__ */ new Set();
  const findWorldMainIds = async (config, env) => {
    const { manifest: _manifest } = await getOptions(config);
    const manifest = await (typeof _manifest === "function" ? _manifest(env) : _manifest);
    (manifest.content_scripts || []).forEach(({ world, js }) => {
      if (world === "MAIN" && js) {
        js.forEach((path) => worldMainIds.add(prefix$1("/", path)));
      }
    });
    if (worldMainIds.size) {
      const name = `[${pluginName}]`;
      const message = pc.yellow(
        [
          `${name} Some content-scripts don't support HMR because the world is MAIN:`,
          ...[...worldMainIds].map((id) => `  ${id}`)
        ].join("\r\n")
      );
      console.log(message);
    }
  };
  return [
    {
      name: pluginName,
      apply: "serve",
      async config(config, env) {
        await findWorldMainIds(config, env);
        const { contentScripts: contentScripts2 = {} } = await getOptions(config);
        hmrTimeout = contentScripts2.hmrTimeout ?? 5e3;
        preambleCode = preambleCode ?? contentScripts2.preambleCode;
      },
      async configureServer(_server) {
        server = _server;
        if (typeof preambleCode === "undefined" && server.config.plugins.some(
          ({ name = "none" }) => name.toLowerCase().includes("react") && !name.toLowerCase().includes("preact")
        )) {
          try {
            const react = await import('@vitejs/plugin-react');
            preambleCode = react.default.preambleCode;
          } catch (error) {
            preambleCode = false;
          }
        }
        sub.add(
          contentScripts.change$.pipe(filter(RxMap.isChangeType.set)).subscribe(({ value: script }) => {
            const { type, id } = script;
            if (type === "loader") {
              let preamble = { fileName: "" };
              if (preambleCode)
                preamble = add({ type: "module", id: preambleId });
              const client = add({ type: "module", id: viteClientId });
              const file = add({ type: "module", id });
              const loader = add({
                type: "asset",
                id: getFileName({ type: "loader", id }),
                source: worldMainIds.has(file.id) ? createDevMainLoader({
                  fileName: `./${file.fileName.split("/").at(-1)}`
                }) : createDevLoader({
                  preamble: preamble.fileName,
                  client: client.fileName,
                  fileName: file.fileName
                })
              });
              script.fileName = loader.fileName;
            } else if (type === "iife") {
              throw new Error("IIFE content scripts are not implemented");
            } else {
              const file = add({ type: "module", id });
              script.fileName = file.fileName;
            }
          })
        );
      },
      resolveId(source) {
        if (source === preambleId)
          return preambleId;
        if (source === contentHmrPortId)
          return contentHmrPortId;
      },
      load(id) {
        if (id === preambleId && typeof preambleCode === "string") {
          const defined = preambleCode.replace(/__BASE__/g, server.config.base);
          return defined;
        }
        if (id === contentHmrPortId) {
          const defined = contentHmrPort.replace(
            "__CRX_HMR_TIMEOUT__",
            JSON.stringify(hmrTimeout)
          );
          return defined;
        }
      },
      closeBundle() {
        sub.unsubscribe();
        sub = new Subscription();
      }
    },
    {
      name: pluginName,
      apply: "build",
      enforce: "pre",
      async config(config, env) {
        await findWorldMainIds(config, env);
        return {
          ...config,
          build: {
            ...config.build,
            rollupOptions: {
              ...config.build?.rollupOptions,
              // keep exports for content script module api
              preserveEntrySignatures: config.build?.rollupOptions?.preserveEntrySignatures ?? "exports-only"
            }
          }
        };
      },
      generateBundle(_options, bundle) {
        for (const [key, script] of contentScripts)
          if (key === script.refId) {
            if (script.type === "module") {
              const fileName = this.getFileName(script.refId);
              script.fileName = fileName;
            } else if (script.type === "loader") {
              const fileName = this.getFileName(script.refId);
              script.fileName = fileName;
              const bundleFileInfo = bundle[fileName];
              const shouldUseLoader = !(bundleFileInfo.type === "chunk" && bundleFileInfo.imports.length === 0 && bundleFileInfo.dynamicImports.length === 0 && bundleFileInfo.exports.length === 0);
              if (shouldUseLoader) {
                const refId = this.emitFile({
                  type: "asset",
                  name: getFileName({
                    type: "loader",
                    id: basename(script.id)
                  }),
                  source: worldMainIds.has(script.id) ? createProMainLoader({
                    fileName: `./${fileName.split("/").at(-1)}`
                  }) : createProLoader({ fileName })
                });
                script.loaderName = this.getFileName(refId);
              } else {
                bundleFileInfo.code = `(function(){${bundleFileInfo.code}})()
`;
              }
            } else if (script.type === "iife") {
              throw new Error("IIFE content scripts are not implemented");
            }
            contentScripts.set(script.refId, formatFileData(script));
          }
      }
    }
  ];
};

const pluginContentScriptsCss = () => {
  let injectCss;
  return {
    name: "crx:content-scripts-css",
    enforce: "post",
    async config(config) {
      const { contentScripts: contentScripts2 = {} } = await getOptions(config);
      injectCss = contentScripts2.injectCss ?? true;
    },
    renderCrxManifest(manifest) {
      if (injectCss) {
        if (manifest.content_scripts) {
          for (const script of manifest.content_scripts)
            if (script.js)
              for (const fileName of script.js)
                if (contentScripts.has(fileName)) {
                  const { css } = contentScripts.get(fileName);
                  if (css?.length)
                    script.css = [script.css ?? [], css].flat();
                } else {
                  throw new Error(
                    `Content script is undefined by fileName: ${fileName}`
                  );
                }
        }
      }
      return manifest;
    }
  };
};

const contentCssEntries = /* @__PURE__ */ new Map();
function getContentCssEntries() {
  return Array.from(contentCssEntries.values());
}
function clearContentCssEntries() {
  contentCssEntries.clear();
}
function registerContentCssEntry(index, cssFiles) {
  const virtualId = getContentCssId(index);
  const entry = { index, cssFiles, virtualId };
  contentCssEntries.set(index, entry);
  return entry;
}
const pluginDeclaredContentScripts = () => {
  return {
    name: "crx:content-scripts-declared-css",
    apply: "serve",
    resolveId(source) {
      if (isContentCssId(source)) {
        return source;
      }
    },
    load(id) {
      if (!isContentCssId(id))
        return;
      const index = getContentCssIndex(id);
      if (index === null)
        return;
      const entry = contentCssEntries.get(index);
      if (!entry) {
        console.warn(
          `[crx:content-scripts-declared-css] No CSS entry found for index ${index}`
        );
        return "";
      }
      const cssImports = entry.cssFiles.map((cssPath) => {
        const importPath = cssPath.startsWith("/") ? cssPath : `/${cssPath}`;
        return `import "${importPath}";`;
      }).join("\n");
      return cssImports + "\n";
    }
  };
};

const _dynamicScriptRegEx = /\b(import.meta).CRX_DYNAMIC_SCRIPT_(.+?)[,;]/gm;
const dynamicScriptRegEx = () => {
  _dynamicScriptRegEx.lastIndex = 0;
  return _dynamicScriptRegEx;
};
const pluginDynamicContentScripts = () => {
  let config;
  return [
    {
      name: "crx:dynamic-content-scripts-loader",
      enforce: "pre",
      configResolved(_config) {
        config = _config;
      },
      configureServer(server) {
        return () => {
          server.middlewares.use(async (req, res, next) => {
            try {
              await allFilesReady();
              next();
            } catch (error) {
              let err;
              if (error instanceof Error) {
                err = error;
              } else if (typeof error === "string") {
                err = new Error(error);
              } else {
                err = new Error(
                  `Unexpected error "${error}" in middleware for "${req.url}"`
                );
              }
              server.ws.send({
                type: "error",
                err: {
                  message: err.message,
                  stack: err.stack ?? "no stack available"
                }
              });
            }
          });
        };
      },
      async resolveId(_source, importer) {
        if (importer && _source.includes("?script")) {
          const url = new URL(_source, "stub://stub");
          if (url.searchParams.has("script")) {
            const [source] = _source.split("?");
            const resolved = await this.resolve(source, importer, {
              skipSelf: true
            });
            if (!resolved)
              throw new Error(
                `Could not resolve dynamic script: "${_source}" from "${importer}"`
              );
            const { id } = resolved;
            let type = "loader";
            if (url.searchParams.has("module")) {
              type = "module";
            } else if (url.searchParams.has("iife")) {
              type = "iife";
            }
            const scriptId = hashScriptId({ type, id });
            const resolvedId = `${id}?scriptId=${scriptId}`;
            let script = contentScripts.get(resolvedId);
            if (typeof script === "undefined") {
              let refId;
              let fileName;
              let loaderName;
              if (config.command === "build") {
                refId = this.emitFile({
                  type: "chunk",
                  id,
                  name: basename(id)
                });
              } else {
                refId = scriptId;
                const relId = relative(config.root, id);
                fileName = getFileName({
                  type: type === "iife" ? "iife" : "module",
                  id: relId
                });
                if (type === "loader")
                  loaderName = getFileName({ type, id: relId });
              }
              script = formatFileData({
                type,
                id: relative(config.root, id),
                isDynamicScript: true,
                fileName,
                loaderName,
                refId,
                scriptId,
                matches: []
              });
              contentScripts.set(script.id, script);
            }
            return resolvedId;
          } else if (url.searchParams.has("scriptId")) {
            return _source;
          }
        }
      },
      async load(id) {
        const index = id.indexOf("?scriptId=");
        if (index > -1) {
          const scriptId = id.slice(index + "?scriptId=".length);
          const script = contentScripts.get(scriptId);
          if (config.command === "build") {
            return `export default import.meta.CRX_DYNAMIC_SCRIPT_${script.refId};`;
          } else if (typeof script.fileName === "string") {
            return `export default ${JSON.stringify(script.fileName)};`;
          } else {
            throw new Error(
              `Content script fileName is undefined: "${script.id}"`
            );
          }
        }
      }
    },
    {
      name: "crx:dynamic-content-scripts-build",
      apply: "build",
      /**
       * Replace dynamic script placeholders during build.
       *
       * Can't use `renderChunk` b/c pre plugin crx:content-scripts uses
       * `generateBundle` to emit loaders. Must come after "enforce: pre".
       */
      generateBundle(options, bundle) {
        for (const chunk of Object.values(bundle))
          if (chunk.type === "chunk") {
            if (dynamicScriptRegEx().test(chunk.code)) {
              const replaced = chunk.code.replace(
                dynamicScriptRegEx(),
                (match, p1, scriptKey) => {
                  const script = contentScripts.get(scriptKey);
                  if (typeof script === "undefined")
                    throw new Error(
                      `Content script refId is undefined: "${match}"`
                    );
                  if (typeof script.fileName === "undefined")
                    throw new Error(
                      `Content script fileName is undefined: "${script.id}"`
                    );
                  return `${JSON.stringify(
                    `/${script.loaderName ?? script.fileName}`
                  )}${match.split(scriptKey)[1]}`;
                }
              );
              chunk.code = replaced;
            }
          }
      }
    }
  ];
};

const { remove } = fsx;
const logger = createLogger("error", { prefix: "crxjs" });
const pluginFileWriter = () => {
  fileWriterError$.subscribe((error) => {
    logger.error(error.err.message, { error: error.err });
  });
  return [
    {
      name: "crx:file-writer-empty-out-dir",
      apply: "serve",
      enforce: "pre",
      async configResolved(config) {
        if (config.build.emptyOutDir) {
          await remove(config.build.outDir);
        }
      }
    },
    {
      name: "crx:file-writer",
      apply: "serve",
      configureServer(server) {
        server.httpServer?.on("listening", async () => {
          try {
            await start({ server });
          } catch (error) {
            console.error(error);
            server.close();
          }
        });
        server.httpServer?.on("close", () => close());
      },
      closeBundle() {
        outputFiles.clear();
      }
    }
  ];
};

const _require = typeof require === "undefined" ? createRequire(import.meta.url) : require;
const customElementsPath = _require.resolve(customElementsId.slice(1));
const customElementsCode = readFileSync(customElementsPath, "utf8");
const customElementsMap = readFileSync(`${customElementsPath}.map`, "utf8");
const pluginFileWriterPolyfill = () => {
  return {
    name: "crx:file-writer-polyfill",
    apply: "serve",
    enforce: "pre",
    resolveId(source) {
      if (source === customElementsId) {
        return customElementsId;
      }
    },
    load(id) {
      if (id === customElementsId) {
        return { code: customElementsCode, map: customElementsMap };
      }
    },
    renderCrxDevScript(code, { type, id }) {
      if (type === "module" && id === viteClientId) {
        const magic = new MagicString(code);
        magic.prepend(`import '${customElementsId}';`);
        magic.prepend(`import { HMRPort } from '${contentHmrPortId}';`);
        const ws = "new WebSocket";
        const index = code.indexOf(ws);
        magic.overwrite(index, index + ws.length, "new HMRPort");
        return magic.toString();
      }
    }
  };
};

async function manifestFiles(manifest, options = {}) {
  let locales = [];
  if (manifest.default_locale)
    locales = await fg("_locales/**/messages.json", options);
  const rulesets = manifest.declarative_net_request?.rule_resources.flatMap(
    ({ path }) => path
  ) ?? [];
  const contentScripts = manifest.content_scripts?.flatMap(({ js }) => js) ?? [];
  const contentStyles = manifest.content_scripts?.flatMap(({ css }) => css);
  const serviceWorker = manifest.background && "service_worker" in manifest.background ? manifest.background.service_worker : void 0;
  const backgroundScripts = manifest.background && "scripts" in manifest.background ? manifest.background.scripts : void 0;
  const background = serviceWorker ? [serviceWorker].filter(isString) : backgroundScripts ? backgroundScripts.filter(isString) : [];
  const htmlPages = htmlFiles(manifest);
  const icons = [
    Object.values(
      isString(manifest.icons) ? [manifest.icons] : manifest.icons ?? {}
    ),
    Object.values(
      isString(manifest.action?.default_icon) ? [manifest.action?.default_icon] : manifest.action?.default_icon ?? {}
    )
  ].flat();
  let webAccessibleResources = [];
  if (manifest.web_accessible_resources) {
    const resources = await Promise.all(
      manifest.web_accessible_resources.flatMap(({ resources: resources2 }) => resources2).map(async (r) => {
        if (["*", "**/*"].includes(r))
          return void 0;
        if (fg.isDynamicPattern(r))
          return fg(r, options);
        return r;
      })
    );
    webAccessibleResources = [...new Set(resources.flat())].filter(isString);
  }
  return {
    contentScripts: [...new Set(contentScripts)].filter(isString),
    contentStyles: [...new Set(contentStyles)].filter(isString),
    html: htmlPages,
    icons: [...new Set(icons)].filter(isString),
    locales: [...new Set(locales)].filter(isString),
    rulesets: [...new Set(rulesets)].filter(isString),
    background,
    webAccessibleResources
  };
}
async function dirFiles(dir) {
  const files = await fg(join(dir, "**", "*"));
  return files;
}
function htmlFiles(manifest) {
  const files = [
    manifest.action?.default_popup,
    Object.values(manifest.chrome_url_overrides ?? {}),
    manifest.devtools_page,
    manifest.options_page,
    manifest.options_ui?.page,
    manifest.sandbox?.pages,
    manifest.side_panel?.default_path
  ].flat().filter(isString).map((s) => s.split(/[#?]/)[0]).sort();
  return [...new Set(files)];
}

const pluginFileWriterPublic = () => {
  let config;
  return {
    name: "crx:file-writer-public",
    apply: "serve",
    configResolved(_config) {
      config = _config;
    },
    async generateBundle() {
      const publicDir = isAbsolute(config.publicDir) ? config.publicDir : resolve(config.root, config.publicDir);
      const files = await dirFiles(publicDir);
      for (const filepath of files) {
        const source = await readFile$1(filepath);
        const fileName = relative(publicDir, filepath);
        this.emitFile({ type: "asset", source, fileName });
      }
    }
  };
};

const debug$3 = _debug("file-writer").extend("hmr");
const isCustomPayload = (p) => {
  return p.type === "custom";
};
const hmrPayload$ = new Subject();
const crxHMRPayload$ = hmrPayload$.pipe(
  filter((p) => !isCustomPayload(p)),
  buffer(allFilesReady$),
  mergeMap((pps) => {
    let fullReload;
    const payloads = [];
    for (const p of pps)
      if (p.type === "full-reload") {
        fullReload = p;
      } else {
        payloads.push(p);
      }
    if (fullReload)
      payloads.push(fullReload);
    return payloads;
  }),
  map((p) => {
    switch (p.type) {
      case "full-reload": {
        const fullReload = {
          type: "full-reload",
          path: p.path && getViteUrl({ id: p.path, type: "module" })
        };
        return fullReload;
      }
      case "prune": {
        const prune = {
          type: "prune",
          paths: p.paths.map((id) => getViteUrl({ id, type: "module" }))
        };
        return prune;
      }
      case "update": {
        debug$3("update payload with %d updates", p.updates.length);
        for (const u of p.updates) {
          debug$3(
            "update item: path=%s acceptedPath=%s type=%s",
            u.path,
            u.acceptedPath,
            u.type
          );
          const isVirtualModule = u.path.startsWith("/@id/") || u.path.startsWith("/__");
          if (isVirtualModule) {
            debug$3("updating virtual module: %s", u.path);
            update(u.path);
          }
        }
        const update_ = {
          type: "update",
          updates: p.updates.map(({ acceptedPath: ap, path: p2, ...rest }) => ({
            ...rest,
            acceptedPath: prefix$1("/", getFileName({ id: ap, type: "module" })),
            path: prefix$1("/", getFileName({ id: p2, type: "module" }))
          }))
        };
        return update_;
      }
      default:
        return p;
    }
  }),
  filter((p) => {
    switch (p.type) {
      case "full-reload":
        return typeof p.path === "undefined";
      case "prune":
        return p.paths.length > 0;
      case "update":
        return p.updates.length > 0;
      default:
        return true;
    }
  }),
  map((data) => {
    debug$3(`hmr payload`, data);
    return {
      type: "custom",
      event: "crx:content-script-payload",
      data
    };
  })
);

function isImporter(file) {
  const seen = /* @__PURE__ */ new Set();
  const pred = (changedNode) => {
    seen.add(changedNode);
    if (changedNode.file === file)
      return true;
    for (const parentNode of changedNode.importers) {
      const unseen = !seen.has(parentNode);
      if (unseen && pred(parentNode))
        return true;
    }
    return false;
  };
  return pred;
}

const debug$2 = _debug("hmr");
const crxRuntimeReload = {
  type: "custom",
  event: "crx:runtime-reload"
};
const pluginHMR = () => {
  let inputManifestFiles;
  let decoratedSend;
  let config;
  let subs;
  return [
    {
      name: "crx:hmr",
      apply: "serve",
      enforce: "pre",
      // server hmr host should be localhost
      async config({ server = {}, ...config2 }) {
        if (server.hmr === false)
          return;
        if (server.hmr === true)
          server.hmr = {};
        server.hmr = server.hmr ?? {};
        server.hmr.host = "localhost";
        return { server, ...config2 };
      },
      // server should ignore outdir
      configResolved(_config) {
        config = _config;
        const { watch = {} } = config.server;
        config.server.watch = watch;
        watch.ignored = watch.ignored ? [...new Set([watch.ignored].flat())] : [];
        const outDir = isAbsolute(config.build.outDir) ? config.build.outDir : join(config.root, config.build.outDir, "**/*");
        if (!watch.ignored.includes(outDir))
          watch.ignored.push(outDir);
      },
      configureServer(server) {
        if (server.ws.send !== decoratedSend) {
          const { send } = server.ws;
          decoratedSend = (payload) => {
            if (payload.type === "error") {
              send({
                type: "custom",
                event: "crx:content-script-payload",
                data: payload
              });
            } else {
              hmrPayload$.next(payload);
            }
            send(payload);
          };
          server.ws.send = decoratedSend;
          subs = new Subscription(() => subs = new Subscription());
          subs.add(fileWriterError$.subscribe(send));
          subs.add(
            crxHMRPayload$.subscribe((payload) => {
              send(payload);
            })
          );
        }
      },
      closeBundle() {
        subs.unsubscribe();
      },
      // background changes require a full extension reload
      handleHotUpdate({ modules, server }) {
        const { root } = server.config;
        const relFiles = /* @__PURE__ */ new Set();
        const fsFiles = /* @__PURE__ */ new Set();
        const virtualModules = /* @__PURE__ */ new Set();
        for (const m of modules) {
          if (m.id?.startsWith(root)) {
            relFiles.add(m.id.slice(server.config.root.length));
          } else if (m.url?.startsWith("/@fs")) {
            fsFiles.add(m.url);
          } else if (m.id?.startsWith("\0") || m.url?.startsWith("/@id/__x00__")) {
            const virtualId = m.url ?? m.id;
            if (virtualId) {
              virtualModules.add(virtualId);
              debug$2("virtual module detected:", virtualId);
            }
          }
        }
        fsFiles.forEach((file) => update(file));
        virtualModules.forEach((file) => update(file));
        if (inputManifestFiles.background.length) {
          const background = prefix$1("/", inputManifestFiles.background[0]);
          if (relFiles.has(background) || modules.some(isImporter(join(server.config.root, background)))) {
            debug$2("sending runtime reload");
            server.ws.send(crxRuntimeReload);
          }
        }
        for (const [key, script] of contentScripts)
          if (key === script.id) {
            if (isContentCssId(script.id)) {
              const cssEntries = getContentCssEntries();
              const entry = cssEntries.find((e) => e.virtualId === script.id);
              if (entry) {
                const changedCssFiles = [...relFiles].filter(
                  (relFile) => entry.cssFiles.some(
                    (cssFile) => relFile === prefix$1("/", cssFile) || relFile.endsWith(cssFile)
                  )
                );
                if (changedCssFiles.length > 0) {
                  changedCssFiles.forEach((relFile) => update(relFile));
                  update(script.id);
                  virtualModules.forEach((file) => update(file));
                }
              }
            } else {
              if (relFiles.has(script.id) || modules.some(isImporter(join(server.config.root, script.id)))) {
                relFiles.forEach((relFile) => update(relFile));
                virtualModules.forEach((file) => update(file));
              }
            }
          }
      }
    },
    {
      name: "crx:hmr",
      apply: "serve",
      enforce: "post",
      // get final output manifest for handleHotUpdate 👆
      async transformCrxManifest(manifest) {
        inputManifestFiles = await manifestFiles(manifest, { cwd: config.root });
        return null;
      },
      renderCrxDevScript(code, { id: _id, type }) {
        if (type === "module" && _id !== "/@vite/client" && code.includes("createHotContext")) {
          const id = _id.replace(/t=\d+&/, "");
          const escaped = id.replace(/([?&.])/g, "\\$1");
          const regexp = new RegExp(
            `(?<=createHotContext\\(")${escaped}(?="\\))`
          );
          const fileUrl = prefix$1("/", getFileName({ id, type }));
          const replaced = code.replace(regexp, fileUrl);
          return replaced;
        } else {
          return code;
        }
      }
    }
  ];
};

function printStr(dir) {
  return `  ${pc.magentaBright("B R O W S E R")}
  ${pc.greenBright("E X T E N S I O N")}
  ${pc.blueBright("T O O L S")}
  
  ${pc.green("\u279C")}  ${pc.bold("CRXJS")}: ${pc.green(`Load ${pc.cyan(dir)} as unpacked extension`)}`;
}
const pluginPrint = () => {
  let outDir = "dist";
  return [
    {
      name: "crx:print",
      enforce: "pre",
      configResolved(resolvedConfig) {
        outDir = resolvedConfig.build.outDir;
      },
      configureServer(server) {
        server.printUrls = () => {
          console.log(printStr(outDir));
        };
      }
    }
  ];
};

var loader = "try {\n  for (const p of JSON.parse(SCRIPTS)) {\n    const url = new URL(p, \"https://stub\");\n    url.searchParams.set(\"t\", Date.now().toString());\n    const req = url.pathname + url.search;\n    await import(\n      /* @vite-ignore */\n      req\n    );\n  }\n} catch (error) {\n  console.error(error);\n}\n";

function extractScriptsAndRemove(html) {
  const root = parse(html);
  const scripts = root.querySelectorAll("script");
  const scriptSrcs = scripts.map((el) => el.getAttribute("src"));
  scripts.forEach((el) => el.remove());
  return { scriptSrcs, html: root.toString() };
}

const pluginName = "crx:html-inline-scripts";
const debug$1 = _debug(pluginName);
const prefix = "@crx/inline-script";
const isInlineTag = (t) => t.tag === "script" && !t.attrs?.src;
const toKey = (ctx) => {
  const { dir, name } = parse$1(ctx.path);
  return join(prefix, dir, name);
};
const pluginHtmlInlineScripts = () => {
  const pages = /* @__PURE__ */ new Map();
  const auditTransformIndexHtml = (p) => {
    let transform;
    if (typeof p.transformIndexHtml === "function") {
      transform = p.transformIndexHtml;
      p.transformIndexHtml = auditor;
    } else if (typeof p.transformIndexHtml === "object") {
      transform = p.transformIndexHtml.transform;
      p.transformIndexHtml.transform = auditor;
    }
    async function auditor(_html, ctx) {
      const result = await transform(_html, ctx);
      if (!result || typeof result === "string")
        return result;
      let html;
      let tags;
      if (Array.isArray(result)) {
        tags = new Set(result);
      } else {
        tags = new Set(result.tags);
        html = result.html;
      }
      const scripts = [];
      for (const t of tags)
        if (t.tag === "script") {
          tags.delete(t);
          scripts.push(t);
        }
      const key = toKey(ctx);
      const page = pages.get(key);
      page.scripts.push(...scripts);
      pages.set(key, page);
      return html ? { html, tags: [...tags] } : [...tags];
    }
  };
  let base;
  const prePlugin = {
    name: "crx:html-auditor-pre",
    transformIndexHtml(html, ctx) {
      const key = toKey(ctx);
      pages.set(key, {
        ...ctx,
        scripts: [
          {
            tag: "script",
            attrs: {
              type: "module",
              src: join(base, "@vite/client")
            },
            injectTo: "head-prepend"
          }
        ]
      });
    }
  };
  const postPlugin = {
    name: "crx:html-auditor-post",
    // this hook isn't audited b/c we add it after we set up the auditors
    transformIndexHtml(html, ctx) {
      const key = toKey(ctx);
      const p = pages.get(key);
      if (p?.scripts.some(isInlineTag)) {
        const { scriptSrcs, html: cleanedHtml } = extractScriptsAndRemove(html);
        p.scripts.push(
          ...scriptSrcs.map((src) => ({
            tag: "script",
            attrs: { src, type: "module" }
          }))
        );
        const loader2 = {
          tag: "script",
          attrs: { src: `${key}?t=${Date.now()}`, type: "module" }
        };
        return { html: cleanedHtml, tags: [loader2] };
      }
      return p?.scripts ?? void 0;
    }
  };
  return {
    name: "crx:html-auditor",
    apply: "serve",
    configResolved(config) {
      base = config.base;
      const plugins = config.plugins;
      for (const p of plugins)
        auditTransformIndexHtml(p);
      plugins.unshift(prePlugin);
      plugins.push(postPlugin);
    },
    configureServer(server) {
      const { transformIndexHtml } = server;
      server.transformIndexHtml = async function auditor(url, html, originalUrl) {
        let result = await transformIndexHtml(url, html, originalUrl);
        if (result.includes(prefix))
          result = result.replace(/\s+<script.+?@vite\/client.+?script>/, "");
        return result;
      };
    },
    resolveId(source) {
      const i = source.indexOf(prefix);
      if (i > -1)
        return source.slice(i);
    },
    load(id) {
      if (id.startsWith(prefix)) {
        const page = pages.get(id);
        if (page) {
          const inline = page.scripts.filter(isInlineTag).map((t) => t.children).join("\n");
          const dir = dirname(page.path);
          const scripts = page.scripts.map(({ attrs }) => attrs?.src).filter(isString).filter((src) => src !== "/@vite/client").map((src) => src.startsWith(".") ? resolve(dir, src) : src);
          const json = `"${jsesc(JSON.stringify(scripts), {
            quotes: "double"
          })}"`;
          return [inline, loader.replace("SCRIPTS", json)].join("\n");
        } else {
          debug$1("page missing %s", id);
        }
      }
    }
  };
};

var loadingPageScript = "const VITE_URL = \"%PROTO%://localhost:%PORT%\";\ndocument.body.innerHTML = /* html */\n`\n<style>\n  :root {\n    color-scheme: light;\n    --ink: #111827;\n    --muted: #5f6b7a;\n    --muted-subtle: rgba(95, 107, 122, 0.7);\n    --muted-hint: rgba(95, 107, 122, 0.6);\n    --card: #ffffff;\n    --badge-bg: rgba(17, 24, 39, 0.04);\n    --accent: #ff6b2c;\n    --accent-2: #2563eb;\n    --link-underline: rgba(37, 99, 235, 0.45);\n    --glow-1: rgba(37, 99, 235, 0.12);\n    --glow-2: rgba(255, 107, 44, 0.1);\n    --button-grad-1: #ff7a43;\n    --button-grad-2: #ff9a73;\n    --button-shadow: rgba(255, 107, 44, 0.18);\n    --button-shadow-hover: rgba(255, 107, 44, 0.22);\n    --pulse: rgba(255, 107, 44, 0.6);\n    --pulse-ring: rgba(255, 107, 44, 0.5);\n  }\n\n  @media (prefers-color-scheme: dark) {\n    :root {\n      color-scheme: dark;\n      --ink: #e5e7eb;\n      --muted: #a3aab5;\n      --muted-subtle: rgba(163, 170, 181, 0.78);\n      --muted-hint: rgba(163, 170, 181, 0.6);\n      --card: #0f172a;\n      --badge-bg: rgba(148, 163, 184, 0.16);\n      --accent: #ff8a5a;\n      --accent-2: #7aa2ff;\n      --link-underline: rgba(122, 162, 255, 0.45);\n      --glow-1: rgba(96, 165, 250, 0.14);\n      --glow-2: rgba(251, 146, 60, 0.16);\n      --button-grad-1: #f07b4d;\n      --button-grad-2: #f39a76;\n      --button-shadow: rgba(240, 123, 77, 0.16);\n      --button-shadow-hover: rgba(240, 123, 77, 0.2);\n      --pulse: rgba(255, 138, 90, 0.65);\n      --pulse-ring: rgba(255, 138, 90, 0.5);\n    }\n  }\n\n  * {\n    margin: 0;\n    padding: 0;\n    box-sizing: border-box;\n  }\n\n  body {\n    font-family: \"IBM Plex Sans\", \"Inter\", -apple-system, system-ui, sans-serif;\n    color: var(--ink);\n    background: transparent;\n    width: 420px;\n    height: 250px;\n    margin: 0;\n    padding: 0 !important;\n  }\n\n  #app {\n    background: var(--card);\n    position: relative;\n    overflow: hidden;\n    display: flex;\n    flex-direction: column;\n    min-height: 100%;\n    padding: 24px 24px 20px;\n    gap: 14px;\n    justify-content: center;\n  }\n\n  #app::before {\n    content: \"\";\n    position: absolute;\n    inset: 0;\n    background:\n      radial-gradient(240px 140px at 100% 0%, var(--glow-1), transparent 70%),\n      radial-gradient(220px 140px at 0% 100%, var(--glow-2), transparent 70%);\n    pointer-events: none;\n  }\n\n  .header {\n    position: relative;\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    align-items: flex-start;\n    padding-right: 96px;\n  }\n\n  .header-text {\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n  }\n\n  .badge {\n    display: inline-flex;\n    align-items: center;\n    gap: 8px;\n    font-size: 10px;\n    letter-spacing: 0.08em;\n    text-transform: uppercase;\n    color: var(--muted);\n    background: var(--badge-bg);\n    border-radius: 999px;\n    padding: 6px 10px;\n    white-space: nowrap;\n    position: absolute;\n    top: 0;\n    right: 0;\n  }\n\n  .pulse {\n    width: 8px;\n    height: 8px;\n    border-radius: 50%;\n    background: var(--accent);\n    box-shadow: 0 0 0 0 var(--pulse);\n    animation: pulse 1.6s ease-in-out infinite;\n  }\n\n  h1 {\n    font-size: clamp(18px, 4vw, 22px);\n    letter-spacing: -0.02em;\n    line-height: 1.25;\n  }\n\n  p {\n    margin: 0;\n    color: var(--muted);\n    font-size: 13px;\n    line-height: 1.6;\n  }\n\n  .subtle {\n    color: var(--muted-subtle);\n    font-size: 12px;\n  }\n\n  a {\n    color: var(--accent-2);\n    text-decoration: none;\n    border-bottom: 1px dashed var(--link-underline);\n  }\n\n  .content {\n    display: flex;\n    flex-direction: column;\n    gap: 10px;\n  }\n\n  .footer {\n    display: flex;\n    flex-direction: column;\n    gap: 10px;\n    align-items: center;\n  }\n\n  .actions {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 12px;\n    justify-content: center;\n  }\n\n  button {\n    appearance: none;\n    border: none;\n    border-radius: 999px;\n    background: linear-gradient(135deg, var(--button-grad-1), var(--button-grad-2));\n    color: white;\n    padding: 8px 14px;\n    font-size: 12px;\n    font-weight: 600;\n    cursor: pointer;\n    box-shadow: 0 8px 16px var(--button-shadow);\n    transition: transform 160ms ease, box-shadow 160ms ease;\n  }\n\n  button:hover {\n    transform: translateY(-1px);\n    box-shadow: 0 10px 20px var(--button-shadow-hover);\n  }\n\n  button:focus-visible {\n    outline: 2px solid var(--accent-2);\n    outline-offset: 2px;\n  }\n\n  .hint {\n    font-size: 11px;\n    color: var(--muted-hint);\n    text-align: center;\n  }\n\n  @keyframes pulse {\n    0% { box-shadow: 0 0 0 0 var(--pulse-ring); }\n    70% { box-shadow: 0 0 0 10px rgba(255, 107, 44, 0); }\n    100% { box-shadow: 0 0 0 0 rgba(255, 107, 44, 0); }\n  }\n</style>\n\n<div id=\"app\">\n  <div class=\"header\">\n    <span class=\"badge\"><span class=\"pulse\"></span>dev server</span>\n    <div class=\"header-text\">\n      <h1>CRXJS DEV MODE</h1>\n      <p class=\"subtle\">Connecting to the Vite dev server\\u2026</p>\n    </div>\n  </div>\n\n  <div class=\"content\">\n    <p>\n      Cannot connect to <a href=\"${VITE_URL}\">${VITE_URL}</a>.\n      Make sure Vite is running, then reload the extension.\n    </p>\n    <p>This page will close automatically after the extension reloads.</p>\n  </div>\n\n  <div class=\"footer\">\n    <div class=\"actions\">\n      <button>Reload Extension</button>\n    </div>\n    <div class=\"hint\">Tip: if the URL is wrong, restart Vite so it picks the right port.</div>\n  </div>\n</div>\n`;\ndocument.body.querySelector(\"button\")?.addEventListener(\"click\", () => {\n  chrome.runtime.reload();\n});\nlet tries = 0;\nlet ready = false;\ndo {\n  try {\n    await fetch(VITE_URL);\n    ready = true;\n  } catch {\n    const timeout = Math.min(100 * Math.pow(2, ++tries), 5e3);\n    console.log(`[CRXJS] Vite Dev Server is not available on ${VITE_URL}`);\n    console.log(`[CRXJS] Retrying in ${timeout}ms...`);\n    await new Promise((resolve) => setTimeout(resolve, timeout));\n  }\n} while (!ready);\nlocation.reload();\n";

var loadingPageHtml = "<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <title>CRXJS DEV MODE</title>\n    <script src=\"%SCRIPT%\" type=\"module\"></script>\n  </head>\n  <body>\n    <p>An unknown error occurred. Failed to load the script.</p>\n  </body>\n</html>\n";

const { readFile } = promises;
const pluginManifest = () => {
  let manifest;
  let plugins = [];
  let refId;
  let config;
  return [
    {
      name: "crx:manifest-init",
      enforce: "pre",
      async config(config2, env) {
        const { manifest: _manifest } = await getOptions(config2);
        manifest = await (typeof _manifest === "function" ? _manifest(env) : _manifest);
        if (manifest.manifest_version !== 3)
          throw new Error(
            `CRXJS does not support Manifest v${manifest.manifest_version}, please use Manifest v3`
          );
        if (env.command === "serve") {
          const {
            contentScripts: js,
            background: sw,
            html
          } = await manifestFiles(manifest, { cwd: config2.root });
          const { entries = [] } = config2.optimizeDeps ?? {};
          let { input = [] } = config2.build?.rollupOptions ?? {};
          if (typeof input === "string")
            input = [input];
          else
            input = Object.values(input);
          input = input.map((f) => {
            let result = f;
            if (isAbsolute(f)) {
              result = relative(config2.root ?? process.cwd(), f);
            }
            return result;
          });
          const set = new Set([entries, input].flat());
          for (const x of [js, sw, html].flat())
            set.add(x);
          return {
            ...config2,
            optimizeDeps: {
              ...config2.optimizeDeps,
              entries: [...set]
            }
          };
        }
      },
      // Use configResolved to get plugins for rolldown-vite (Vite 7) compatibility
      // In rolldown-vite, buildStart doesn't receive options.plugins, so we grab
      // them from the resolved config instead
      configResolved(resolvedConfig) {
        if (resolvedConfig.plugins) {
          plugins = resolvedConfig.plugins;
        }
      },
      buildStart(options) {
        if (options.plugins)
          plugins = options.plugins;
      }
    },
    {
      name: "crx:manifest-loader",
      enforce: "pre",
      buildStart(options) {
        if (typeof options.input !== "undefined" && !("ssr" in this)) {
          refId = this.emitFile({
            type: "chunk",
            id: manifestId,
            name: "crx-manifest.js",
            preserveSignature: "strict"
          });
        }
      },
      resolveId(source) {
        if (source === manifestId)
          return manifestId;
        return null;
      },
      load(id) {
        if (id === manifestId)
          return encodeManifest(manifest);
        return null;
      }
    },
    {
      name: "crx:stub-input",
      enforce: "pre",
      options({ input, ...options }) {
        let finalInput = input;
        if (isString(input) && input.endsWith("index.html")) {
          finalInput = stubId;
        }
        if (config.command === "serve") {
          if (Array.isArray(input)) {
            finalInput = input.filter((x) => !x.endsWith(".html"));
          } else if (typeof input === "object") {
            for (const [key, value] of Object.entries(input))
              if (value.endsWith(".html"))
                delete input[key];
          }
        }
        return { input: finalInput, ...options };
      },
      resolveId(source) {
        if (source === stubId)
          return stubId;
        return null;
      },
      load(id) {
        if (id === stubId)
          return `console.log('stub')`;
        return null;
      },
      generateBundle(options, bundle) {
        for (const [key, chunk] of Object.entries(bundle)) {
          if (chunk.type === "chunk" && chunk.facadeModuleId === stubId) {
            delete bundle[key];
            break;
          }
        }
      }
    },
    {
      name: "crx:manifest-post",
      enforce: "post",
      configResolved(_config) {
        config = _config;
        const plugins2 = config.plugins;
        const crx = plugins2.findIndex(
          ({ name }) => name === "crx:manifest-post"
        );
        const [plugin] = plugins2.splice(crx, 1);
        plugins2.push(plugin);
      },
      async transform(code, id) {
        if (id !== manifestId)
          return;
        let manifest2 = decodeManifest.call(this, code);
        for (const plugin of plugins) {
          try {
            const m = structuredClone(manifest2);
            const result = await plugin.transformCrxManifest?.call(this, m);
            manifest2 = result ?? manifest2;
          } catch (error) {
            if (error instanceof Error)
              error.message = `[${plugin.name}] ${error.message}`;
            throw error;
          }
        }
        if (config.command === "serve") {
          clearContentCssEntries();
          if (manifest2.content_scripts)
            for (let i = 0; i < manifest2.content_scripts.length; i++) {
              const {
                js = [],
                css = [],
                matches = []
              } = manifest2.content_scripts[i];
              if (css.length > 0) {
                const cssEntry = registerContentCssEntry(i, css);
                contentScripts.set(
                  cssEntry.virtualId,
                  formatFileData({
                    type: "loader",
                    id: cssEntry.virtualId,
                    matches,
                    refId: hashScriptId({
                      type: "loader",
                      id: cssEntry.virtualId
                    }),
                    fileName: getFileName({
                      type: "loader",
                      id: cssEntry.virtualId
                    })
                  })
                );
              }
              for (const id2 of js) {
                contentScripts.set(
                  prefix$1("/", id2),
                  formatFileData({
                    type: "loader",
                    id: id2,
                    matches,
                    refId: hashScriptId({ type: "loader", id: id2 }),
                    fileName: getFileName({ type: "loader", id: id2 })
                  })
                );
              }
            }
        } else {
          if (manifest2.content_scripts)
            for (const { js = [], matches = [] } of manifest2.content_scripts)
              for (const file of js) {
                const id2 = join(config.root, file);
                const refId2 = this.emitFile({
                  type: "chunk",
                  id: id2,
                  name: basename(file)
                });
                contentScripts.set(
                  file,
                  formatFileData({
                    type: "loader",
                    id: file,
                    refId: refId2,
                    matches
                  })
                );
              }
          if (manifest2.background && "service_worker" in manifest2.background) {
            const file = manifest2.background.service_worker;
            const id2 = join(config.root, file);
            const refId2 = this.emitFile({
              type: "chunk",
              id: id2,
              name: basename(file)
            });
            manifest2.background.service_worker = refId2;
          }
          if (manifest2.background && "scripts" in manifest2.background) {
            const file = manifest2.background.scripts[0];
            const id2 = join(config.root, file);
            const refId2 = this.emitFile({
              type: "chunk",
              id: id2,
              name: basename(file)
            });
            manifest2.background.scripts = [refId2];
          }
          for (const file of htmlFiles(manifest2)) {
            const id2 = join(config.root, file);
            this.emitFile({
              type: "chunk",
              id: id2,
              name: basename(file)
            });
          }
        }
        const encoded = encodeManifest(manifest2);
        return { code: encoded, map: null };
      },
      async generateBundle(options, bundle) {
        const manifestName = this.getFileName(refId);
        const manifestJs = bundle[manifestName];
        let manifest2 = decodeManifest.call(this, manifestJs.code);
        if (config.command === "serve") {
          if (manifest2.content_scripts) {
            const cssEntries = getContentCssEntries();
            const cssEntryMap = new Map(cssEntries.map((e) => [e.index, e]));
            for (let i = 0; i < manifest2.content_scripts.length; i++) {
              const script = manifest2.content_scripts[i];
              const cssEntry = cssEntryMap.get(i);
              const jsLoaders = (script.js || []).map(
                (id) => getFileName({ id, type: "loader" })
              );
              if (cssEntry) {
                const cssLoader = getFileName({
                  id: cssEntry.virtualId,
                  type: "loader"
                });
                script.js = [cssLoader, ...jsLoaders];
              } else {
                script.js = jsLoaders;
              }
            }
          }
        } else {
          if (manifest2.background && "service_worker" in manifest2.background) {
            const ref = manifest2.background.service_worker;
            const name = this.getFileName(ref);
            manifest2.background.service_worker = name;
          }
          if (manifest2.background && "scripts" in manifest2.background) {
            const ref = manifest2.background.scripts[0];
            const name = this.getFileName(ref);
            manifest2.background.scripts = [name];
          }
          manifest2.content_scripts = manifest2.content_scripts?.map(
            ({ js = [], ...rest }) => {
              return {
                js: js.map((id) => {
                  const script = contentScripts.get(id);
                  const fileName = script?.loaderName ?? script?.fileName;
                  if (typeof fileName === "undefined")
                    throw new Error(
                      `Content script fileName is undefined: "${id}"`
                    );
                  return fileName;
                }),
                ...rest
              };
            }
          );
        }
        for (const plugin of plugins) {
          try {
            const m = structuredClone(manifest2);
            const result = await plugin.renderCrxManifest?.call(this, m, bundle);
            manifest2 = result ?? manifest2;
          } catch (error) {
            const name = `[${plugin.name}]`;
            let message = error;
            if (error instanceof Error) {
              message = pc.red(
                `${name} ${error.stack ? error.stack : error.message}`
              );
            } else if (typeof error === "string") {
              message = pc.red(`${name} ${error}`);
            }
            console.log(message);
            throw new Error(`Error in ${plugin.name}.renderCrxManifest`);
          }
        }
        const assetTypes = [
          "contentStyles",
          "icons",
          "locales",
          "rulesets",
          "webAccessibleResources"
        ];
        const files = await manifestFiles(manifest2, { cwd: config.root });
        await Promise.all(
          assetTypes.map((k) => files[k]).flat().map(async (f) => {
            if (typeof bundle[f] === "undefined") {
              let filename = join(config.root, f);
              if (!existsSync(filename))
                filename = join(config.publicDir, f);
              if (!existsSync(filename)) {
                const viteMajorVersion = parseInt(version.split(".")[0]);
                if (viteMajorVersion < 4 && filename.endsWith(".map") && config.build.sourcemap === true) {
                  return;
                }
                throw new Error(
                  `ENOENT: Could not load manifest asset "${f}".
Manifest assets must exist in one of these directories:
Project root: "${config.root}"
Public dir: "${config.publicDir}"`
                );
              }
              this.emitFile({
                type: "asset",
                fileName: f,
                // TODO: cache source buffer
                source: await readFile(filename)
              });
            }
          })
        );
        if (config.command === "serve" && files.html.length) {
          const refId2 = this.emitFile({
            type: "asset",
            name: "loading-page.js",
            source: loadingPageScript.replace("%PROTO%", config.server.https ? "https" : "http").replace("%PORT%", `${config.server.port ?? 0}`)
          });
          const loadingPageScriptName = this.getFileName(refId2);
          files.html.map(
            (f) => this.emitFile({
              type: "asset",
              fileName: f,
              source: loadingPageHtml.replace(
                "%SCRIPT%",
                `/${loadingPageScriptName}`
              )
            })
          );
        }
        const manifestJson = bundle["manifest.json"];
        if (typeof manifestJson === "undefined") {
          this.emitFile({
            type: "asset",
            fileName: "manifest.json",
            source: JSON.stringify(manifest2, null, 2) + "\n"
          });
        } else {
          manifestJson.source = JSON.stringify(manifest2, null, 2) + "\n";
        }
        delete bundle[manifestName];
      }
    }
  ];
};

function compileFileResources(fileName, {
  chunks,
  files,
  config
}, resources = {
  assets: /* @__PURE__ */ new Set(),
  css: /* @__PURE__ */ new Set(),
  imports: /* @__PURE__ */ new Set()
}, processedFiles = /* @__PURE__ */ new Set()) {
  if (processedFiles.has(fileName)) {
    return resources;
  }
  processedFiles.add(fileName);
  const chunk = chunks.get(fileName);
  if (chunk) {
    const { modules, facadeModuleId, imports, dynamicImports } = chunk;
    for (const x of imports)
      resources.imports.add(x);
    for (const x of dynamicImports)
      resources.imports.add(x);
    for (const x of [...imports, ...dynamicImports])
      compileFileResources(x, { chunks, files, config }, resources, processedFiles);
    for (const m of Object.keys(modules))
      if (m !== facadeModuleId) {
        const key = prefix$1("/", relative(config.root, m.split("?")[0]));
        const script = contentScripts.get(key);
        if (script)
          if (typeof script.fileName === "undefined") {
            throw new Error(`Content script fileName for ${m} is undefined`);
          } else {
            resources.imports.add(script.fileName);
            compileFileResources(
              script.fileName,
              { chunks, files, config },
              resources,
              processedFiles
            );
          }
      }
  }
  const file = files.get(fileName);
  if (file) {
    const { assets = [], css = [] } = file;
    for (const x of assets)
      resources.assets.add(x);
    for (const x of css)
      resources.css.add(x);
  }
  return resources;
}

const defineManifest = (manifest) => manifest;
const defineDynamicResource = ({
  matches = ["http://*/*", "https://*/*"],
  use_dynamic_url = false
}) => ({
  matches,
  resources: [DYNAMIC_RESOURCE],
  use_dynamic_url
});
const DYNAMIC_RESOURCE = "<dynamic_resource>";

const debug = _debug("web-acc-res");
const pluginWebAccessibleResources = () => {
  let config;
  let injectCss;
  let browser;
  let userWantsViteManifest;
  return [
    {
      name: "crx:web-accessible-resources",
      apply: "serve",
      enforce: "post",
      async config(config2) {
        const opts = await getOptions(config2);
        browser = opts.browser || "chrome";
      },
      renderCrxManifest(manifest) {
        manifest.web_accessible_resources = manifest.web_accessible_resources ?? [];
        manifest.web_accessible_resources = manifest.web_accessible_resources.map(({ resources, ...rest }) => ({
          resources: resources.filter((r) => r !== DYNAMIC_RESOURCE),
          ...rest
        })).filter(({ resources }) => resources.length);
        const war = {
          // all web origins can access
          matches: ["<all_urls>"],
          // all resources are web accessible
          resources: ["**/*", "*"],
          // change the extension origin on every reload
          use_dynamic_url: false
        };
        if (browser === "firefox") {
          delete war.use_dynamic_url;
        }
        manifest.web_accessible_resources.push(war);
        return manifest;
      }
    },
    {
      name: "crx:web-accessible-resources",
      apply: "build",
      enforce: "post",
      async config({ build, ...config2 }, { command }) {
        const opts = await getOptions(config2);
        const contentScripts2 = opts.contentScripts || {};
        browser = opts.browser || "chrome";
        injectCss = contentScripts2.injectCss ?? true;
        userWantsViteManifest = build?.manifest;
        return { ...config2, build: { ...build, manifest: command === "build" } };
      },
      configResolved(_config) {
        config = _config;
      },
      async renderCrxManifest(manifest, bundle) {
        const { web_accessible_resources: _war = [] } = manifest;
        const dynamicScriptMatches = /* @__PURE__ */ new Set();
        let dynamicScriptDynamicUrl = false;
        const web_accessible_resources = [];
        for (const r of _war) {
          const i = r.resources.indexOf(DYNAMIC_RESOURCE);
          if (i > -1 && isResourceByMatch(r)) {
            r.resources = [...r.resources];
            r.resources.splice(i, 1);
            for (const p of r.matches)
              dynamicScriptMatches.add(p);
            dynamicScriptDynamicUrl = r.use_dynamic_url ?? false;
          }
          if (r.resources.length > 0)
            web_accessible_resources.push(r);
        }
        if (dynamicScriptMatches.size === 0) {
          dynamicScriptMatches.add("http://*/*");
          dynamicScriptMatches.add("https://*/*");
        }
        if (contentScripts.size > 0) {
          const viteMajorVersion = parseInt(version.split(".")[0]);
          const manifestPath = viteMajorVersion > 4 ? ".vite/manifest.json" : "manifest.json";
          const viteManifest = parseJsonAsset(
            bundle,
            manifestPath
          );
          const viteFiles = /* @__PURE__ */ new Map();
          for (const [, file] of Object.entries(viteManifest))
            viteFiles.set(file.file, file);
          if (viteFiles.size === 0)
            return null;
          const bundleChunks = /* @__PURE__ */ new Map();
          for (const chunk of Object.values(bundle))
            if (chunk.type === "chunk")
              bundleChunks.set(chunk.fileName, chunk);
          const moduleScriptResources = /* @__PURE__ */ new Map();
          for (const [
            key,
            { id, fileName, matches, type, isDynamicScript = false }
          ] of contentScripts)
            if (key === id) {
              if (isDynamicScript || matches.length)
                if (typeof fileName === "undefined") {
                  throw new Error(
                    `Content script filename is undefined for "${id}"`
                  );
                } else {
                  const { assets, css, imports } = compileFileResources(
                    fileName,
                    { chunks: bundleChunks, files: viteFiles, config }
                  );
                  contentScripts.get(key).css = [...css];
                  if (type === "loader" || isDynamicScript)
                    imports.add(fileName);
                  const resource = {
                    matches: isDynamicScript ? [...dynamicScriptMatches] : matches,
                    resources: [...assets, ...imports],
                    use_dynamic_url: isDynamicScript ? dynamicScriptDynamicUrl : false
                  };
                  if (isDynamicScript || !injectCss) {
                    resource.resources.push(...css);
                  }
                  if (resource.resources.length)
                    if (type === "module") {
                      moduleScriptResources.set(fileName, resource);
                    } else {
                      resource.matches = resource.matches.map(
                        getMatchPatternOrigin
                      );
                      web_accessible_resources.push(resource);
                    }
                }
            }
          for (const r of web_accessible_resources)
            if (isResourceByMatch(r))
              for (const res of r.resources)
                moduleScriptResources.delete(res);
          web_accessible_resources.push(...moduleScriptResources.values());
        }
        const hashedResources = /* @__PURE__ */ new Map();
        const combinedResources = [];
        for (const r of web_accessible_resources)
          if (isResourceByMatch(r)) {
            const { matches, resources, use_dynamic_url = false } = r;
            const key = JSON.stringify([use_dynamic_url, matches.sort()]);
            const combined = hashedResources.get(key) ?? /* @__PURE__ */ new Set();
            for (const res of resources)
              combined.add(res);
            hashedResources.set(key, combined);
          } else {
            combinedResources.push(r);
          }
        for (const [key, resources] of hashedResources)
          if (resources.size > 0) {
            const [use_dynamic_url, matches] = JSON.parse(key);
            combinedResources.push({
              matches,
              resources: [...resources],
              use_dynamic_url
            });
          }
        if (browser === "firefox") {
          for (const war of combinedResources) {
            delete war.use_dynamic_url;
          }
        }
        for (const war of combinedResources) {
          const resourcesWithMaps = [];
          for (const res of war.resources) {
            resourcesWithMaps.push(res);
            if (bundle[res]?.type === "chunk") {
              const chunk = bundle[res];
              if (chunk.map) {
                const sourcemapFileName = chunk.sourcemapFileName || `${chunk.fileName}.map`;
                const viteMajorVersion = parseInt(version.split(".")[0]);
                if (sourcemapFileName in bundle || viteMajorVersion < 4 && config.build.sourcemap == true) {
                  resourcesWithMaps.push(sourcemapFileName);
                }
              }
            }
          }
          war.resources = resourcesWithMaps;
        }
        if (combinedResources.length === 0)
          delete manifest.web_accessible_resources;
        else
          manifest.web_accessible_resources = combinedResources;
        if (!userWantsViteManifest) {
          const viteMajorVersion = parseInt(version.split(".")[0]);
          const manifestPath = viteMajorVersion > 4 ? ".vite/manifest.json" : "manifest.json";
          if (bundle[manifestPath]) {
            debug(
              "Removing Vite manifest: %s (userWantsViteManifest=%s)",
              manifestPath,
              userWantsViteManifest
            );
            delete bundle[manifestPath];
          }
        }
        return manifest;
      }
    }
  ];
};

const crx = (options) => {
  contentScripts.clear();
  return [
    pluginOptionsProvider(options),
    pluginBackground(),
    pluginContentScripts(),
    pluginDeclaredContentScripts(),
    pluginDynamicContentScripts(),
    pluginFileWriter(),
    pluginFileWriterPublic(),
    pluginFileWriterPolyfill(),
    pluginHtmlInlineScripts(),
    pluginWebAccessibleResources(),
    pluginContentScriptsCss(),
    pluginHMR(),
    pluginManifest(),
    pluginPrint()
  ].flat();
};
const chromeExtension = crx;

export { allFilesReady, chromeExtension, crx, defineDynamicResource, defineManifest, fileReady as filesReady };
