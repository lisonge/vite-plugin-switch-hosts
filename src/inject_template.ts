export const template2string = <T extends (args: any) => any>(
  func: T,
  arg: Parameters<T>[0]
) => {
  return `;(${func.toString()})(${JSON.stringify(arg, undefined, 2)});`;
};

export const registerServiceWorker = async ({
  hostList = [] as string[],
  scriptUrl = '/__vite_plugin_switch_hosts/service_worker.js',
}) => {
  if (!navigator.serviceWorker) {
    console.warn(
      `[vite-plugin-switch-hosts] nothing to do, because browser/origin not support serviceWorker`
    );
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register(scriptUrl, {
      scope: '/',
    });
    if (registration.active) {
      console.log('[vite-plugin-switch-hosts] service worker active');
    }
    [
      registration.installing,
      registration.waiting,
      registration.active,
    ].forEach((v) => {
      v?.postMessage(hostList);
    });
    window.setTimeout(async () => {
      await registration.update();
    });
  } catch (error) {
    console.error(
      `[vite-plugin-switch-hosts] Registration failed with ${error}`
    );
  }
};

declare let self: ServiceWorkerGlobalScope;
export const entryServiceWorker = ({
  proxyUrl = '/__vite_plugin_switch_hosts/proxy',
  proxyUrlKey = 'x-switch-hosts-proxy-url',
}) => {
  const clientId2HostListMap: Record<string, string[] | undefined> = {};
  self.addEventListener('message', (ev) => {
    if (ev.source instanceof WindowClient) {
      if (
        ev.data instanceof Array &&
        ev.data.every((s) => typeof s == 'string')
      ) {
        clientId2HostListMap[ev.source.id] = ev.data;
        console.log(`[vite-plugin-switch-hosts] update hosts`);
      }
    }
  });

  self.addEventListener('fetch', (ev) => {
    const hostList = clientId2HostListMap[ev.clientId];
    if (!(hostList && hostList instanceof Array && hostList.length > 0)) {
      return;
    }
    const { url, headers } = ev.request;
    const u = new URL(url);
    if (
      (url.startsWith('http://') || url.startsWith('https://')) &&
      !url.startsWith(location.origin) &&
      hostList.includes(u.hostname)
    ) {
      const proxyHeader = new Headers(headers);
      proxyHeader.set(proxyUrlKey, url);
      /**
       * prevent the mixing of different url caches
       */
      const realProxyUrl =
        proxyUrl +
        '/' +
        encodeURI(
          u.protocol.slice(0, u.protocol.length - 1) +
            '/' +
            u.host.replace(':', '/') +
            u.pathname +
            u.search
        );
      const req: RequestInit = {
        headers: proxyHeader,
      };
      Object.assign(req, ev.request);
      ev.respondWith(fetch(realProxyUrl, req));
    }
  });
};
