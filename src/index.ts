import { promises as dns } from 'dns';
import http from 'http';
import https from 'https';
import type { LookupFunction } from 'net';
import fetch, { Headers } from 'node-fetch';
import type { Plugin } from 'vite';
import {
  entryServiceWorker,
  registerServiceWorker,
  template2string,
} from './inject_template';
import { isIpV4, isIpV6 } from './util';

/**
 * current origin must support [service worker](https://developer.mozilla.org/docs/Web/API/Service_Worker_API). in other words, `location.hostname` is `localhost` or match `127.x.y.z`, or `location.protocol` must be `https:`
 */
export interface SwitchHostsOption {
  /**
   * domain -> ip/another_domain
   */
  dns?: Record<string, string>;
}

const baseURL = '/__vite_plugin_switch_hosts';
const scriptUrl = '/service_worker.js';
const registerUrl = '/register.js';
const proxyUrl = '/proxy';
const proxyUrlKey = 'x-switch-hosts-proxy-url';

export default (option?: SwitchHostsOption): Plugin => {
  let command: 'build' | 'serve' = 'serve';
  const dnsRecord = option?.dns ?? {};
  const lookup: LookupFunction = async (hostname, options, callback) => {
    const ip = dnsRecord[hostname];
    if (typeof ip == 'string') {
      if (isIpV4(ip)) {
        callback(null, ip, 4);
        return;
      } else if (isIpV6(ip)) {
        callback(null, ip, 6);
        return;
      }
    }
    // here ip is hostname, use CNAME
    const { address, family } = await dns.lookup(ip ?? hostname);
    callback(null, address, family);
  };

  const httpAgent = new http.Agent({
    keepAlive: true,
    // @ts-ignore
    lookup,
  });
  const httpsAgent = new https.Agent({
    keepAlive: true,
    lookup,
  });

  const staticDnsAgent = (scheme: string) => {
    return scheme.startsWith('http:') ? httpAgent : httpsAgent;
  };
  return {
    name: 'switch-hosts',
    configResolved(resolvedConfig) {
      command = resolvedConfig.command;
    },
    transformIndexHtml() {
      if (command != 'serve') {
        return;
      }
      return [
        {
          tag: 'script',
          injectTo: 'head',
          attrs: {
            src: baseURL + registerUrl,
          },
        },
      ];
    },
    configureServer(server) {
      server.middlewares.use(baseURL, async (req, res, next) => {
        // console.log(req.url);
        if (req.url?.startsWith(scriptUrl)) {
          Object.entries({
            'access-control-allow-origin': '*',
            'access-control-expose-headers': '*',
            'content-type': 'text/javascript;\x20charset=utf-8',
            'Service-Worker-Allowed': '/',
          }).forEach(([k, v]) => {
            res.setHeader(k, v);
          });
          res.write(
            template2string(entryServiceWorker, {
              proxyUrl: baseURL + proxyUrl,
              proxyUrlKey,
              hostList: Object.keys(dnsRecord),
            })
          );
          res.end();
        } else if (req.url == registerUrl) {
          Object.entries({
            'access-control-allow-origin': '*',
            'access-control-expose-headers': '*',
            'content-type': 'text/javascript;\x20charset=utf-8',
            'Service-Worker-Allowed': '/',
            'Cache-control': 'no-store',
          }).forEach(([k, v]) => {
            res.setHeader(k, v);
          });
          res.write(
            template2string(registerServiceWorker, {
              scriptUrl: baseURL + scriptUrl,
              hostList: Object.keys(dnsRecord),
            })
          );
          res.end();
        } else if (req.url?.startsWith(proxyUrl)) {
          const rawUrl = req.headers[proxyUrlKey];
          if (typeof rawUrl == 'string') {
            // console.log(rawUrl);
            const headers = new Headers();
            Object.entries(req.headers).forEach(([k, v]) => {
              if (typeof v == 'string') {
                headers.set(k, v);
              } else if (v instanceof Array) {
                v.forEach((v2) => {
                  headers.append(k, v2);
                });
              }
            });
            [proxyUrlKey, 'host', 'content-length'].forEach((v) => {
              headers.delete(v);
            });
            const response = await fetch(rawUrl, {
              headers,
              method: req.method,
              body: req.read(),
              agent: staticDnsAgent(rawUrl),
            });
            res.statusCode = response.status;
            response.headers.forEach((v, k) => {
              if (
                !['connection', 'content-length', 'content-encoding'].includes(
                  k
                )
              ) {
                res.setHeader(k, v);
              }
            });
            const bf = await response.buffer();
            res.write(bf);
            res.end();
            return;
          } else {
            next();
          }
        } else {
          next();
        }
      });
    },
  };
};