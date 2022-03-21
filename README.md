# vite-plugin-switch-hosts

switch hosts by service worker for each origin in browser without modify system hosts file

## feature

- switch hosts
- different origin can use different hosts simultaneously
- without modify system hosts file

## limitation

- current origin must support [service worker](https://developer.mozilla.org/docs/Web/API/Service_Worker_API). in other words, `location.hostname` is `localhost` or match `127.x.y.z`, or `location.protocol` must be `https:`

- target domain must use http or https, websocket is not supported

- redirect url will follow in proxy dev server, not found a better solution yet

## install

```shell
pnpm add -D vite-plugin-switch-hosts
```

## config

[SwitchHostsOption](./src/index.ts#L17)

```ts
export interface SwitchHostsOption {
  /**
   * host -> another_host
   */
  dns?: Record<string, string>;
}
```

## example

see [test/example/vite.config.ts](./test/example/vite.config.ts)
