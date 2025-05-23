/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const modules = {
  root: {
    moz: {},
  },
  "windowglobal-in-root": {
    moz: {},
  },
  windowglobal: {
    moz: {},
  },
};

// eslint-disable-next-line mozilla/lazy-getter-object-name
ChromeUtils.defineESModuleGetters(modules.root, {
  browser:
    "chrome://remote/content/webdriver-bidi/modules/root/browser.sys.mjs",
  browsingContext:
    "chrome://remote/content/webdriver-bidi/modules/root/browsingContext.sys.mjs",
  emulation:
    "chrome://remote/content/webdriver-bidi/modules/root/emulation.sys.mjs",
  input: "chrome://remote/content/webdriver-bidi/modules/root/input.sys.mjs",
  log: "chrome://remote/content/webdriver-bidi/modules/root/log.sys.mjs",
  network:
    "chrome://remote/content/webdriver-bidi/modules/root/network.sys.mjs",
  permissions:
    "chrome://remote/content/webdriver-bidi/modules/root/permissions.sys.mjs",
  script: "chrome://remote/content/webdriver-bidi/modules/root/script.sys.mjs",
  session:
    "chrome://remote/content/webdriver-bidi/modules/root/session.sys.mjs",
  storage:
    "chrome://remote/content/webdriver-bidi/modules/root/storage.sys.mjs",
  webExtension:
    "chrome://remote/content/webdriver-bidi/modules/root/webExtension.sys.mjs",
});

// eslint-disable-next-line mozilla/lazy-getter-object-name
ChromeUtils.defineESModuleGetters(modules["windowglobal-in-root"], {
  browsingContext:
    "chrome://remote/content/webdriver-bidi/modules/windowglobal-in-root/browsingContext.sys.mjs",
  log: "chrome://remote/content/webdriver-bidi/modules/windowglobal-in-root/log.sys.mjs",
  network:
    "chrome://remote/content/webdriver-bidi/modules/windowglobal-in-root/network.sys.mjs",
  script:
    "chrome://remote/content/webdriver-bidi/modules/windowglobal-in-root/script.sys.mjs",
});

// eslint-disable-next-line mozilla/lazy-getter-object-name
ChromeUtils.defineESModuleGetters(modules.windowglobal, {
  _configuration:
    "chrome://remote/content/webdriver-bidi/modules/windowglobal/_configuration.sys.mjs",
  browsingContext:
    "chrome://remote/content/webdriver-bidi/modules/windowglobal/browsingContext.sys.mjs",
  emulation:
    "chrome://remote/content/webdriver-bidi/modules/windowglobal/emulation.sys.mjs",
  input:
    "chrome://remote/content/webdriver-bidi/modules/windowglobal/input.sys.mjs",
  log: "chrome://remote/content/webdriver-bidi/modules/windowglobal/log.sys.mjs",
  network:
    "chrome://remote/content/webdriver-bidi/modules/windowglobal/network.sys.mjs",
  script:
    "chrome://remote/content/webdriver-bidi/modules/windowglobal/script.sys.mjs",
});
