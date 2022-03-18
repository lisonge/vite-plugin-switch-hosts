export const template2string = <T extends (args: any) => any>(
  func: T,
  arg: Parameters<T>[0]
) => {
  return `(${func.toString()})(${JSON.stringify(arg, undefined, 2)});`;
};

export const registerServiceWorker = async ({
  hostList = [] as string[],
  scriptUrl = '/__vite_plugin_switch_hosts/service_worker.js',
  // workerHash = undefined as string | undefined,
}) => {
  if (!navigator.serviceWorker) {
    console.warn(
      `[vite-plugin-switch-hosts] will not work, because browser not support serviceWorker`
    );
    return;
  }
  try {
    const registration = await navigator.serviceWorker.register(scriptUrl, {
      scope: '/',
    });
    // if (registration.installing) {
    //   console.log('[vite-plugin-switch-hosts] Service worker installing');
    // } else if (registration.waiting) {
    //   console.log('[vite-plugin-switch-hosts] Service worker installed');
    // } else if (registration.active) {
    //   console.log('[vite-plugin-switch-hosts] Service worker active');
    // }
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
      // if (registration.waiting && registration.active) {
      //   console.log(`[vite-plugin-switch-hosts] Service worker need update`);
      //   console.log(
      //     `[vite-plugin-switch-hosts] reopen tab or enable "Update on reload" in the DevTools Application panel`
      //   );
      // }
    });

    Object.assign(window, { registration });
    // const oldWorkerHash = localStorage.getItem(
    //   'vite-plugin-switch-hosts:worker_hash'
    // );
    // if (oldWorkerHash && workerHash && oldWorkerHash != workerHash) {
    //   console.log(`[vite-plugin-switch-hosts] Service worker need update`);
    //   console.log(
    //     `[vite-plugin-switch-hosts] reopen or enable "Update on reload" in the DevTools Application panel`
    //   );
    // }
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
  hostList = [] as string[],
}) => {
  self.addEventListener('message', (ev) => {
    if (
      ev.data instanceof Array &&
      ev.data.every((s) => typeof s == 'string')
    ) {
      if (
        hostList.length != ev.data.length ||
        !hostList.every((s, i) => s == ev.data[i])
      ) {
        hostList = ev.data;
        console.log(`[vite-plugin-switch-hosts] update hosts`);
      }
    }
  });

  self.addEventListener('fetch', (ev) => {
    const { url, headers } = ev.request;
    const u = new URL(url);
    if (
      // referrer.startsWith(location.origin) &&
      (url.startsWith('http://') || url.startsWith('https://')) &&
      !url.startsWith(location.origin) &&
      hostList.includes(u.hostname)
    ) {
      // console.log(u.hostname, hostList);
      // console.log(`[vite-plugin-switch-hosts] switch host ${url}`);
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
      ev.respondWith(
        fetch(realProxyUrl, {
          ...ev.request,
          headers: proxyHeader,
        })
      );
    }
  });
};
