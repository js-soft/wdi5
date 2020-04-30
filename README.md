[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Overview

A repository showcasing UI5's RecordReplay API in conjuntion with WebdriverIO.

End to end enhancement testing package for UI5 with Webdriver

This test framework has different parts of provided functionality.
- webdriver to UI5 bridge
- Utils for platform abstraction

# When to use

You are looking for a end-to-end testing framework for crossplatform UI5 application build with corodva and UI5. Your application is an UI5 web application running on different platforms like Android, iOS and Electron using cordova as a wrapper.

-   Uiveri5 is not working due to eg. use of appium
-   You still would like to make use of UI5 handy functions like
    - control selectors and other function known from the sap.ui.test namespace.
    - make sure UI5 is already ready to start testing
    -  etc.

## Supported Platforms

| Platform | Notes |
| -------- | ----- |
| Browser | Google Chrome (latest) |
| Electron |  |
| Android |  |
| Apple iOS |  |

# How it works

## webdriver - UI5 bridge

To access the application's runtime environment this framework uses Webdriver API function `executeAsync`. This allows to write and call methods in the environment of the running application. The two objects `wdi5` and `bridge` are attached to the browser's `window` object to enhance the capabilities.

## WDI5Selector

Is a plain Javascript object to enhance a `sap.ui.test.RecordReplay.ControlSelector` with the property `wdio_ui5_key`.
```Javascript
const wdi5Selector = {
    wdio_ui5_key: „someCutomControlIdentifier“,
    selector: <sap.ui.test.RecordReplay.ControlSelector>
}
```

## WDI5
This class is instantiated by the `asControl` function located in `wdioUi5-index` and returned to the test as object containing the request selector and the reference to the corresponding UI5 control.

## Utils

To be able to support different platforms the util classes create an abstraction layer of distinctive supported functionality.

# Environment

-   WebDriverIO v5
-   UI5
-   Mocha

The package contains wdio and selenium dependencies.

## Prerequisites

UI5 Webapplication running in any browser or on any or multiple of appium and electron supported devices.

# Getting Started

## How to use
### Config
in your `wdio.conf.js` a config object `wdi5` following optional, but recommended, properties to use all functionality.

| Property       | Description   |
| -------------  | ------------- |
| screenshotPath | location for screenshot ouput from project root |
| logLevel | possible values: verbose, error (default), silent |
| platform | possible values: android, electron, ios, browser |

custom properties can be set and will be available via the `utils.getConfig` method.

## UI5 Bridge

### How to use it

After initialization the functionality is attached to the Webdriver browser/ device object and can be called from there.

The main featue is devilerd with the provided `asControl` function which returns the WDIO frameworks own bridge object of a UI5 control. This return object of instance `WDI5` provides multiple functions bridged to the UI5 control under the hood.

Methods to check status of a control.
- hasStyleClass
- getProperty
- getAggregation
- isVisible

Methods to change the status of a control.
- setProperty

Methods to execute an action on a control. These functions return the the object of type WebUi5 to allow method chaning.
- enterText
- press
- fireEvent

Make sure when you call a method on a control the underlying UI5 control type supports the method. Eg. call `press()` action on a `sap.m.Button` but not on a `sap.m.Text`.

### Helper

In case you are not able to create an explicit selector to your control, but you are able to find it via any webdriver strategy, you can use the `getSelectorForElement` method of the bridge. This function gets the webdriver element as parameter and returns a selector which can then beeing used in the `asControl` function.

#### Example calls

```javascript
const selector = {...} // cerate selector for a sap.m.Input on a view
const oTinput = browser.asControl(selector) // retuns a WebUi5 obejct
oTinput.enterText('some Text').hasStyleClass("customStyleClass")
```

### Under the Hood

Bridge to UI5
Init the needed package parts
`wdi().getWDioUi5().init()`

Return values of the `done function of executeAsync` are 'Likewise, any WebElements in the script result will be returned to the client as WebElement JSON objects.' -> https://github.com/webdriverio/webdriverio/issues/2728#issuecomment-388330067

| Method | SAP RecordReplay Method | Description |
| ------ | ----------------------- | ----------- |
| getSelectorForElement | findControlSelectorByDOMElement | Find the best control selector for a DOM element. A selector uniquely represents a single element. The 'best' selector is the one with which it is most likely to uniquely identify a control with the least possible inspection of the control tree. |
| getControl | findDOMElementByControlSelector | Find DOM element representation of a control specified by a selector object. |
| interactWithControl | interactWithControl | Interact with specific control. |
| waitForUI5 | waitForUI5 | Wait for UI5 to complete processing, poll until all asynchronous work is finished, or timeout. |

### Types of Control Selectors

sap.ui.test.RecordReplay.ControlSelector

| selector | description |
| -------- | ----------- |
| id | supported |
| viewName | supported |
| controlType | supported |
| bindingPath | supported |
| I18NText | tbd |
| Anchestor | tbd |
| labelFor | tbd |
| properties | supported |

### Create Control Selector

```javascript
// create selector
const selector = { // wdio-ui5 selector
    wdio_ui5_key: "mainUserInput", // unique internal key to map and find a control
    selector: { // sap.ui.test.RecordReplay.ControlSelector
        id: "mainUserInput", // ID of a control (global or within viewName, if viewName is defined)
        bindingPath: { // internally object of sap.ui.test.matchers.BindingPath is created
            propertyPath: "/Customers('TRAIH')/ContactName"
        },
        properties: { // internally object of sap.ui.test.matchers.Properites is created
            value: "Helvetius Nagy"
        },
        viewName: "test.Sample.view.Main",
        controlType: "sap.m.Input"
    }
}
```

WDI5 can help you to create a `sap.ui.test.RecordReplay.ControlSelector` selector by calling eg. `wdi5().getSelectorHelper().createBindingPathSelector(...)` with your parameters in the order: `viewName, controlType, modelName, propertyPath, path`.

#### Flaws

[OpenUI5 Issue](https://github.com/SAP/openui5/issues/2887) sap/ui/test/matchers/BindingPath cannot locate control by named model and root property

If you use a named model and a root property there is an issue in UI5 control selector.
```javascript
        bindingPath: { // internally object of sap.ui.test.matchers.BindingPath is created
            modelName: "myModelName",
            propertyPath: "/Value" // a double slash in created internally to fix the issue
        },
```

The function `_getFormattedPath` in [`BindingPath.js`](https://github.com/SAP/openui5/blob/master/src/sap.ui.core/src/sap/ui/test/matchers/BindingPath.js) does `substring(1)` if it is a named model.

This was tmp fixed in `wdio-ui5 - createMatchers` function. In case this will be fixed by UI5 this need to be adjusted.

## Logger

You can also use the WDI5 logger by calling `wdi5().getLogger()` it supports all console logging functions.

The log level is set by the config or by `wdi5().getLogger().setLoglevel()`

## Utils

The `Utils` allow to have platform specific implementations of features such as screenshot or navigation, but rely on the same method call for the test.

### Appium

#### Contexts

[Context in Appium](http://appium.io/docs/en/commands/context/set-context/)
Context switching and generated context IDs.
For some reason the contexts were "NATIVE_APP" and "WEBAPP_<webcontext>" until April 2. Then it changed to "NATIVE_APP" and "WEBAPP_<some generated number>". Which is also fine after a fix was implemented.

### Electron

Known pitfall is the chromedriver version. Make sure you run the fitting `electron-chromedriver` version to your electron version. Conflicts may occur with the browser `chromedriver` version.

# Contribute

## Debug

1. `npm run _startApp`
2. launch the VSCode debugger task

## Package Contents

`wdio-ui.js` contains the UI5 bridge.

`WebUi5.js` Class of communication objects UI5 - test framework.

`Utils.js` Class with cross platform functionality.

`BrowserUtils.js` inherits from Utils, Class with browser specific override functionality.

`NativeUtils.js` inherits from Utils, Class with native platform specific override functionality.

`Logger.js` wraps the basic JS native console statements to use the loglevel config.

## Webdriver - UI5 bridge

To add functionality to the bridge you need to enhance and add code in the bridge class. Enhance the `WebUI5` class to make the new methods available to the tester when using this framework.

## Return Type of the `executeAsync` function

The function `executeAsync` has defined return types [mentioned here](https://github.com/webdriverio/webdriverio/issues/999). So the return type is custom defined as an array of two elements first is a string representing the status, second is the value for the status.

## Utils
Due to different platform implementations you need to instantiate the correct Util class.
For different platforms a set of specifically implemented utils.

`wdi.<Utils>.init()`


## Commitlint

There is a `commit-msg` hook upon which [`husky`](#Husky) will run a check
for whether the formatting policy for the commit message defined by
[`commitizen`](#Commitizen) has been fulfilled.

The format for the message and options for the type can be found
[here](https://github.com/streamich/git-cz#commit-message-format)

## Git Hooks with Husky

The project uses [husky](https://github.com/typicode/husky) to
work with git hooks. Git hooks will be enabled when installing `husky`
via `npm install`. If all goes as planned, you should see something like this
during the run of `npm install`:

```sh
husky > setting up git hooks
husky > done
```

# Todos

- Webdriver Update -> Version 6.*.*
- make use of the Chrome Testrecorder extention: https://chrome.google.com/webstore/detail/ui5-test-recorder/hcpkckcanianjcbiigbklddcpfiljmhj
- Check winston logger (https://www.npmjs.com/package/winston)
- export sap.ui.router to make navigation more easy
- use other method than jQuery (`jQuery(ui5Control).control(0)`) to get UI5 control, since jQuery will be dropped by UI5


# Test

The UI5 app used for the package test is based on [ui5-ecosystem-showcase](https://github.com/petermuessig/ui5-ecosystem-showcase)

Run the `npm run _test` command with parameter `--spec ./test/ui5-app/test/e2e/test-ui5-ad.js` to test a single file

# License

This work is dual-licensed under Apache 2.0 and the Derived Beer-ware License. The official license will be Apache 2.0 but finally you can choose between one of them if you use this work.

When you like this stuff, buy [@vobu](https://twitter.com/vobu) or @[@The_dominiK](https://twitter.com/The_dominiK) a beer when you see them.
