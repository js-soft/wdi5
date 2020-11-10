# wdio-ui5-service ![npm](https://img.shields.io/npm/v/wdi5-service)

`WebdriverIO`-plugin for `wdi5`.

It provides the `ui5`-service to `WebdriverIO`, running tests in the browser.

## Prerequisites

- UI5 app running in the browser, accessbile via `http(s)://host.ext:port`.
  Recommended tooling for this is either the official [UI5 tooling](https://github.com/SAP/ui5-tooling) (`ui5 serve`) or some standalone http server like [`soerver`](https://github.com/vobu/soerver) or [`http-server`](https://www.npmjs.com/package/http-server).
- node version >= `12.x` (`lts/erbium`)
- (optional) `yarn`
  during development, we rely on `yarn`’s workspace-features - that’s why we refer to `yarn` instead of `npm` in the docs, even though using `npm` as an equivalent shold be fine too

## Installation

To keep the module lightweight, `wdio-ui5-service` has zero dependencies.
This means you have to setup `WebdriverIO` as a prerequisite as described in https://webdriver.io/docs/gettingstarted.html.

```bash
$> npm i --save-dev @wdio/cli
$> npx wdio config # do the config boogie - this will also install dependencies
```

Add `wdio-ui5-service` as a (dev)dependency to your `package.json` via

`$> npm install wdio-ui5-service --save-dev`
or
`$> yarn add -D wdio-ui5-service`

```json
{
    "dependencies": {
        "wdio-ui5-service": "^0.0.1"
    }
}
```

Then add the `ui5`-service to the standard `wdio.conf.js`:

```javascript
...
services: [
    // other services like 'chromedriver'
    // ...
    'ui5'
]
...
```

Finally, pass in configuration options for `wdi5` in your `WebdriverIO`-conf file:

```javascript
wdi5: {
    screenshotPath: require('path').join('test', 'report', 'screenshots'),
    logLevel: 'verbose', // error | verbose | silent
    platform: 'browser', // browser | android | ios | electron
    url: 'index.html', // path to your bootstrap html file
    deviceType: 'web', // native | web
    skipInjectUI5OnStart: false // true when UI5 is not on the start page, you need to later call <wdioUI5service>.injectUI5(); manually
}
```

See [test/wdio-ui5.conf.js](test/wdio-ui5.conf.js) for a sample configuration file for browser-scope testing.

Run the tests via the `webdriver.io`-cli:

```javascript
$> npx wdio
```

### Skip UI5 initialization on startup

In cases the first open page is not an UI5 page, like on a SAP Cloud Foundry environment where the login page is opened upfront. The parameter `skipInjectUI5OnStart` set to `true` provides the feature to prospone the injection of the wdio-ui5-service into the browser context. Consequentially you have to do it later, as soon as the UI5 page to test is available. This can be done by calling `injectUI5()` on the `wdio-ui5-service`.

```javascript
const wdioUI5Service = require("wdio-ui5-service")

wdioUI5Service.injectUI5()
```

## Usage

Run-(Test-)Time usage of `wdi5` is agnostic to its' test-scope (browser or native) and centers around the global `browser`-object, be it in the browser or on a real mobile device.

Please see the top-level [README](../README.md#Usage) for API-methods and usage instructions.

## Features specific to `wdio-ui5-service` (vs. `wdi5`)

## Navigation

In the test, you can navigate the UI5 webapp via `goTo(options)` in one of two ways:

-   updating the browser hash
    ```javascript
    browser.goTo({sHash: '#/test'});
    ```
-   using the UI5 router [navTo](https://openui5.netweaver.ondemand.com/api/sap.ui.core.routing.Router#methods/navTo) function
    ```javascript
    browser.goTo(
        oRoute: {
            sComponentId,
            sName,
            oParameters,
            oComponentTargetInfo,
            bReplace
        }
    )
    ```

## License

see [top-level LICENSE file](../LICENSE)
