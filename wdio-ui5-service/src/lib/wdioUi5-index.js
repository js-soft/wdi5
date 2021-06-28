// @ts-check
const WDI5 = require('./WDI5');
const path = require('path');
const fs = require('fs');

/** @type {WebdriverIO.BrowserObject} store the context */
let _context = null;
/** @type {Boolean} store the status of initialization */
let _isInitialized = false;
/** @type {Boolean} store the status of UI5.waitForUI5 */
let _isUI5Ready = false;
/** @type {Boolean} stores the status of the setup process */
let _setupComplete = false;
/** @type {String} currently running sap.ui.version */
let _sapUI5Version = null;
/** @type {Object} */
const pjsonPackage = require(`./../../package.json`);

// --------- public functions ------------ //

/**
 * function library to setup the webdriver to UI5 bridge, it runs alle the initial setup
 * make sap/ui/test/RecordReplay accessible via wdio
 * attach the sap/ui/test/RecordReplay object to the application context window object as 'bridge'
 */
async function injectUI5() {
    // expect boolean
    const result = await _context.executeAsync((done) => {
        if (window.bridge) {
            // setup sap testing already done
            done(true);
        }

        if (!window.sap || !window.sap.ui) {
            // setup sap testing already cant be done due to sap namespace not present on the page
            console.error('[browser wdi5] ERR: no ui5 present on page');

            // only condition where to cancel the setup process
            done(false);
        }

        // attach the function to be able to use the extracted method later
        if (!window.bridge) {
            // create empty
            window.wdi5 = {
                createMatcher: null,
                isInitialized: false,
                Log: null,
                waitForUI5Options: {
                    timeout: 15000,
                    interval: 400
                }
            };

            // load UI5 logger
            sap.ui.require(['sap/base/Log'], (Log) => {
                // Logger is loaded -> can be use internally
                // attach logger to wdi5 to be able to use it globally
                window.wdi5.Log = Log;
                window.wdi5.Log.info('[browser wdi5] injected!');
            });

            // attach new bridge
            sap.ui.require(['sap/ui/test/RecordReplay'], (RecordReplay) => {
                window.bridge = RecordReplay;
                window.wdi5.Log.info('[browser wdi5] injected!');
                window.wdi5.isInitialized = true;

                // here setup is successfull
                // known side effect this call triggers the back to node scope, the other sap.ui.require continue to run in background in browser scope
                done(true);
            });
            // make sure the resources are required
            sap.ui.require(
                [
                    'sap/ui/test/matchers/BindingPath',
                    'sap/ui/test/matchers/I18NText',
                    'sap/ui/test/matchers/Properties',
                    'sap/ui/test/matchers/Ancestor',
                    'sap/ui/test/matchers/LabelFor'
                ],
                (BindingPath, I18NText, Properties, Ancestor, LabelFor) => {
                    /**
                     * used to dynamically create new control matchers when searching for elements
                     */
                    window.wdi5.createMatcher = (oSelector) => {
                        // Before version 1.60, the only available criteria is binding context path.
                        // As of version 1.72, it is available as a declarative matcher
                        const oldAPIVersion = 1.6;
                        // check whether we're looking for a control via regex
                        // hint: no IE support here :)
                        if (oSelector.id && oSelector.id.startsWith('/', 0)) {
                            const [sTarget, sRegEx, sFlags] = oSelector.id.match(/\/(.*)\/(.*)/);
                            oSelector.id = new RegExp(sRegEx, sFlags);
                        }
                        if (oSelector.bindingPath) {
                            // TODO: for the binding Path there is no object creation
                            // fix (?) for 'leading slash issue' in propertyPath w/ a named model
                            // openui5 issue in github is open
                            const hasNamedModel =
                                oSelector.bindingPath.modelName && oSelector.bindingPath.modelName.length > 0;
                            const isRootProperty =
                                oSelector.bindingPath.propertyPath &&
                                oSelector.bindingPath.propertyPath.charAt(0) === '/';
                            if (hasNamedModel && isRootProperty && parseFloat(sap.ui.version) < 1.81) {
                                // attach the double leading /
                                // for UI5 < 1.81
                                oSelector.bindingPath.propertyPath = `/${oSelector.bindingPath.propertyPath}`;
                            }
                            if (oldAPIVersion > parseFloat(sap.ui.version)) {
                                // for version < 1.60 create the matcher
                                oSelector.bindingPath = new BindingPath(oSelector.bindingPath);
                            }
                        }

                        if (oldAPIVersion > parseFloat(sap.ui.version)) {
                            // for version < 1.60 create the matcher
                            if (oSelector.properties) {
                                oSelector.properties = new Properties(oSelector.properties);
                            }
                            if (oSelector.i18NText) {
                                oSelector.i18NText = new I18NText(oSelector.i18NText);
                            }
                            if (oSelector.labelFor) {
                                oSelector.labelFor = new LabelFor(oSelector.labelFor);
                            }
                            if (oSelector.ancestor) {
                                oSelector.ancestor = new Ancestor(oSelector.ancestor);
                            }
                        }

                        return oSelector;
                    };

                    /**
                     * extract the multi use function to get a UI5 Control from a JSON Webobejct
                     */
                    window.wdi5.getUI5CtlForWebObj = (ui5Control) => {
                        return jQuery(ui5Control).control(0);
                    };

                    /**
                     * gets a UI5 controls' methods to proxy from browser- to Node.js-runtime
                     *
                     * @param {sap.<lib>.<Control>} control UI5 control
                     * @returns {String[]} UI5 control's method names
                     */
                    window.wdi5.retrieveControlMethods = (control) => {
                        // create keys of all parent prototypes
                        let properties = new Set();
                        let currentObj = control;
                        do {
                            Object.getOwnPropertyNames(currentObj).map((item) => properties.add(item));
                        } while ((currentObj = Object.getPrototypeOf(currentObj)));

                        // filter for:
                        let controlMethodsToProxy = [...properties.keys()].filter((item) => {
                            if (typeof control[item] === 'function') {
                                // function

                                // filter private methods
                                if (item.startsWith('_')) {
                                    return false;
                                }

                                if (item.indexOf('Render') !== -1) {
                                    return false;
                                }

                                // filter not working mehtods
                                const aFilterFunctions = ['$', 'getAggregation', 'constructor', 'getMetadata'];

                                if (aFilterFunctions.includes(item)) {
                                    return false;
                                }

                                // if not already discarded -> should be in the result
                                return true;
                            }
                            return false;
                        });

                        return controlMethodsToProxy;
                    };

                    /**
                     * replaces circular referneces in objects
                     * @returns function (key, value)
                     */
                    window.wdi5.circularReplacer = () => {
                        const seen = new WeakSet();
                        return (key, value) => {
                            if (typeof value === 'object' && value !== null) {
                                if (seen.has(value)) {
                                    return;
                                }
                                seen.add(value);
                            }
                            return value;
                        };
                    };

                    /**
                     * if parameter is JS primitive type
                     * returns {boolean}
                     * @param {*} test
                     */
                    window.wdi5.isPrimitive = (test) => {
                        return test !== Object(test);
                    };

                    /**
                     * creates a array of objects containing their id as a property
                     * @param {[sap.ui.core.Control]} aControls
                     * @return {Array} Object
                     */
                    window.wdi5.createControlIdMap = (aControls) => {
                        // the array of UI5 controls need to be mapped (remove circular reference)

                        return aControls.map((element) => {
                            // just use the absolute ID of the control
                            let item = {
                                id: element.getId()
                            };
                            return item;
                        });
                    };

                    /**
                     * creates an object containing their id as a property
                     * @param {sap.ui.core.Control} aControl
                     * @return {Object} Object
                     */
                    window.wdi5.createControlId = (aControl) => {
                        // the array of UI5 controls need to be mapped (remove circular reference)
                        if (!Array.isArray(aControl)) {
                            // if in aControls is a single control -> create an array first

                            // this is causes by sap.ui.base.ManagedObject -> get Aggregation defines its return value as:
                            // sap.ui.base.ManagedObject or sap.ui.base.ManagedObject[] or null

                            // aControls = [aControls]
                            let item = {
                                id: aControl.getId()
                            };
                            return item;
                        } else {
                            console.error('error creating new element by id of control: ' + aControl);
                        }
                    };
                }
            );
        }
    });

    if (result) {
        // set when call returns
        _isInitialized = true;
        console.log('sucessfully initialized wdio-ui5 bridge');
    } else {
        console.error('bridge was not initialized correctly');
    }
    return result;
}

/**
 *
 */
async function checkForUI5Page() {
    _context.waitUntil(
        // @ts-ignore: we're in wdio sync land here
        async () => {
            const readyState = await _context.executeAsync((done) => {
                setTimeout(() => {
                    if (document.location.href != 'data:,') {
                        // make sure we are not on the initial page
                        done(document.readyState);
                    }
                }, 400);
            });
            // @ts-ignore: we're in wdio sync land here
            return readyState === 'complete';
        },
        {interval: 500, timeout: 8000}
    );

    // test for ui5
    let result = await _context.executeAsync((done) => {
        // browser context - you may not access client or console
        done(!!window.sap);
    });
    return result;
}

/**
 * internally used to execute the attach the new function calls to the wdio context object
 * https://webdriver.io/docs/customcommands.html#overwriting-native-commands
 * use wdio's hooks for setting up custom commands in the context
 * @param {WebdriverIO.BrowserObject} context
 */
function setup(context) {
    if (_setupComplete) {
        // already setup done
        return;
    }

    if (!_context) {
        _context = context;
    }

    // create an internal store of already retrieved UI5 elements
    // in the form of their wdio counterparts
    // for faster subsequent access
    if (!_context._controls) {
        console.info('creating internal control map');
        _context._controls = {};
    }

    /**
     * Find the best control selector for a DOM element. A selector uniquely represents a single element.
     * The 'best' selector is the one with which it is most likely to uniquely identify a control with the least possible inspection of the control tree.
     * @param {object} oOptions
     * @param {object} oOptions.domElement - DOM Element to search for
     * @param {object} oOptions.settings - ui5 settings object
     * @param {boolean} oOptions.settings.preferViewId
     * @param {WebdriverIO.BrowserObject} _context
     */
    _context.addCommand('getSelectorForElement', async (oOptions) => {
        const result = await _context.executeAsync((oOptions, done) => {
            window.bridge
                .waitForUI5(window.wdi5.waitForUI5Options)
                .then(() => {
                    window.wdi5.Log.info('[browser wdi5] locating domElement');
                    return window.bridge.findControlSelectorByDOMElement(oOptions);
                })
                .then((controlSelector) => {
                    window.wdi5.Log.info('[browser wdi5] controlLocator created!');
                    done(['success', controlSelector]);
                    return controlSelector;
                })
                .catch((error) => {
                    window.wdi5.Log.error('[browser wdi5] ERR: ', error);
                    done(['error', error.toString()]);
                    return error;
                });
        }, oOptions);

        if (Array.isArray(result)) {
            if (result[0] === 'error') {
                console.error('ERROR: getSelectorForElement() failed because of: ' + result[1]);
                return result[1];
            } else if (result[0] === 'success') {
                console.log(`SUCCESS: getSelectorForElement() returned:  ${JSON.stringify(result[0])}`);
                return result[1];
            }
        } else {
            // Guess: was directly returned
            return result;
        }
    });

    /**
     * retieve the sap.ui.version form app under test and saves to _sapUI5Version
     * returns the sap.ui.version string of the application under test
     */
    _context.addCommand('getUI5Version', async () => {
        if (!_sapUI5Version) {
            const resultVersion = await _context.executeAsync((done) => {
                done(sap.ui.version);
            });
            _sapUI5Version = resultVersion;
        }

        return _sapUI5Version;
    });

    /**
     * returns the sap.ui.version float number of the application under test
     */
    _context.addCommand('getUI5VersionAsFloat', async () => {
        if (!_sapUI5Version) {
            // implicit setter for _sapUI5Version
            await _context.getUI5Version();
        }

        return parseFloat(_sapUI5Version);
    });

    /**
     * uses the UI5 native waitForUI5 function to wait for all promises to be settled
     */
    _context.addCommand('waitForUI5', async () => {
        return await _waitForUI5();
    });

    /**
     * wait for ui5 and take a screenshot
     */
    _context.addCommand('screenshot', async (fileAppendix) => {
        await _waitForUI5();
        await _writeScreenshot(fileAppendix);
    });

    /**
     * take a screenshot without waiting for UI5 app using the CURRENT wdio context
     */
    _context.addCommand('writescreenshot', async (fileAppendix) => {
        await _writeScreenshot(fileAppendix);
    });

    /**
     * set relative app path -> url is not allowed to start with '/'
     */
    _context.addCommand('setUrl', async (url) => {
        _context.config.wdi5['url'] = url;
        // use the wdio.url funtion to change the url
        await _context.url(url);
        await injectUI5();
    });

    /**
     * do a navigation by changing the url hash
     * or
     * using the UI5 router with full standard parameter set
     * @param {Object} oOptions {sHash: '#/test', oRoute: {sComponentId, sName, oParameters, oComponentTargetInfo, bReplace}}
     */
    _context.addCommand('goTo', async (oOptions) => {
        // allow for method sig to be both
        //  wdi5()...goTo("#/accounts/create")
        //  wdi5()...goTo({sHash:"#/accounts/create"})
        let sHash;
        if (typeof oOptions === 'string') {
            sHash = oOptions;
        } else {
            sHash = oOptions.sHash;
        }
        const oRoute = oOptions.oRoute;

        if (sHash && sHash.length > 0) {
            const url = _context.config.wdi5['url'];

            // navigate via hash if defined
            if (url && url.length > 0 && url !== '#') {
                // prefix url config if is not just a hash (#)
                const currentUrl = await _context.getUrl();
                const alreadyNavByHash = currentUrl.includes('#');
                const navToRoot = url.startsWith('/');
                if (alreadyNavByHash && !navToRoot) {
                    await _context.url(`${currentUrl.split('#')[0]}${sHash}`);
                } else {
                    await _context.url(`${url}${sHash}`);
                }
            } else if (url && url.length > 0 && url === '#') {
                // route without the double hash
                await _context.url(`${sHash}`);
            } else {
                // just a fallback
                await _context.url(`${sHash}`);
            }
        } else if (oRoute && oRoute.sName) {
            // navigate using the ui5 router
            // sComponentId, sName, oParameters, oComponentTargetInfo, bReplace
            await _navTo(
                oRoute.sComponentId,
                oRoute.sName,
                oRoute.oParameters,
                oRoute.oComponentTargetInfo,
                oRoute.bReplace
            );
        } else {
            console.error('ERROR: navigating to another page');
        }
    });

    /**
     * this function is the main method to enable the communication with the UI5 application
     * can be accessed via the browser object in the test case `browser.asControl(selector)` whereas the selector is of type WDI5Selector
     *
     * wdio_ui5_key internally used key to store the already retrieved controls and prevent double browser access.
     * Check for object type, if wdio_ui5_key is present.
     *
     * const wdi5Selector = {
     *     wdio_ui5_key: „someCutomControlIdentifier“,
     *     selector: <sap.ui.test.RecordReplay.ControlSelector>
     * }
     *
     * wdio_ui5_key is generated based on the givven selector.
     * If wdio_ui5_key is provided with the selector the provided wdio_ui5_key is used.
     * You can force to load the control freshly from browser context by setting the 'forceSelect' parameter to true
     *
     * @param {WDI5Selector} wdi5Selector custom selector object with property wdio_ui5_key and sap.ui.test.RecordReplay.ControlSelector
     */
    _context.addCommand('asControl', async (wdi5Selector) => {
        if (!wdi5Selector.hasOwnProperty('wdio_ui5_key')) {
            // has not a wdio_ui5_key -> generate one
            wdi5Selector['wdio_ui5_key'] = _createWdioUI5KeyFromSelector(wdi5Selector.selector);
        }

        const internalKey = wdi5Selector.wdio_ui5_key;
        if (!_context._controls[internalKey] || wdi5Selector['forceSelect']) {
            // if control is not yet existent or force parameter is set -> load control

            // create WDI5 control
            let wdi5Control = new WDI5();
            wdi5Control = await wdi5Control.init(wdi5Selector, _context, wdi5Selector['forceSelect']);

            // save control
            _context._controls[internalKey] = wdi5Control;
            console.info(`creating internal control with id ${internalKey}`);

            return wdi5Control;
        } else {
            console.info(`reusing internal control with id ${internalKey}`);
            // return webui5 control from storage map
            return _context._controls[internalKey];
        }
    });

    // store the status
    _setupComplete = true;
}

// public
module.exports = {
    injectUI5,
    setup,
    checkForUI5Page
};

// --------- private functions ------------ //

/**
 * can be called to make sure before you access any eg. DOM Node the ui5 framework is done loading
 * @returns {Boolean} if the UI5 page is fully loaded and ready to interact.
 */
async function _waitForUI5() {
    if (_isInitialized) {
        // injectUI5 was already called and was successful attached
        return await _checkForUI5Ready();
    } else {
        if (injectUI5()) {
            return await _checkForUI5Ready();
        } else {
            return false;
        }
    }
}

/**
 * check for UI5 via the RecordReplay.waitForUI5 method
 */
async function _checkForUI5Ready() {
    if (_isInitialized) {
        // can only be executed when RecordReplay is attached
        const result = await _context.executeAsync((done) => {
            window.bridge
                .waitForUI5(window.wdi5.waitForUI5Options)
                .then(() => {
                    window.wdi5.Log.info('[browser wdi5] UI5 is ready');
                    done(true);
                })
                .catch((error) => {
                    console.error(error);
                });
        });
        return result;
    }
    return false;
}

/**
 * generates date string with format M-d-hh-mm-ss
 * @returns {String}
 */
function _getDateString() {
    var x = new Date();
    return `${x.getMonth() + 1}-${x.getDate()}-${x.getHours()}-${x.getMinutes()}-${x.getSeconds()}`;
}

/**
 *
 * @param {*} fileAppendix
 */
async function _writeScreenshot(fileAppendix) {
    // if config param screenshotsDisabled is set to true -> no screenshots will be taken
    if (_context.config.wdi5['screenshotsDisabled']) {
        console.log('screenshot skipped du to config parameter');
        return;
    }

    // browser.screenshot returns the screenshot as a base64 string
    const screenshot = await _context.takeScreenshot();
    const seed = _getDateString();

    let _path = _context.config.wdi5['screenshotPath'];
    if (_path === undefined || _path.length === 0) {
        _path = this.pjsonPackage.screenshotPath;
        if (_path === undefined || _path.length === 0) {
            // fallback to root
            _path = '/screenshots';
        }
    }

    if (fileAppendix && fileAppendix.length > 0) {
        // extend the filename with a leading dash
        fileAppendix = '-' + fileAppendix;
    }
    // set deafult name for variable -> prevent issue #64
    const filename = fileAppendix ? fileAppendix : '-screenshot';

    const platform = _context.config.wdi5['platform'];

    // make path cross-platform
    _path = path.resolve(_path, `${seed}-${platform}${filename}.png`);
    // async
    fs.writeFile(_path, screenshot, 'base64', function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log(`screenshot at ${_path} created`);
        }
    });
}

/**
 * creates a string valid as object key from a selector
 * @param {sap.ui.test.RecordReplay.ControlSelector} selector
 * @returns {String} wdio_ui5_key
 */
function _createWdioUI5KeyFromSelector(selector) {
    const orEmpty = (string) => {
        return string || '-';
    };
    const wdi5_ui5_key = _stripNonValidCharactersForKey(
        `${orEmpty(selector.id)}_${orEmpty(selector.viewName)}_${orEmpty(selector.controlType)}_${orEmpty(
            JSON.stringify(selector.bindingPath)
        )}_${orEmpty(JSON.stringify(selector.I18NText))}_${orEmpty(selector.labelFor)}_${orEmpty(
            JSON.stringify(selector.properties)
        )}`
    );
    return wdi5_ui5_key;
}

/**
 * to generate an object key from any string
 * @param {String} key
 * @returns {String}
 */
function _stripNonValidCharactersForKey(key) {
    return key
        .split('.')
        .join('')
        .split('/')
        .join('')
        .split(' ')
        .join('')
        .split('>')
        .join('')
        .split('_-')
        .join('')
        .split('-')
        .join('')
        .toLowerCase();
}

/**
 * navigates to a UI5 route using the Component router
 * @param {String} sComponentId
 * @param {String} sName
 * @param {Object} oParameters
 * @param {Object} oComponentTargetInfo
 * @param {Boolean} bReplace
 */
async function _navTo(sComponentId, sName, oParameters, oComponentTargetInfo, bReplace) {
    const result = await _context.executeAsync(
        (sComponentId, sName, oParameters, oComponentTargetInfo, bReplace, done) => {
            window.bridge.waitForUI5(window.wdi5.waitForUI5Options).then(() => {
                window.wdi5.Log.info(`[browser wdi5] navigation to ${sName} triggered`);

                const router = sap.ui.getCore().getComponent(sComponentId).getRouter();
                const hashChanger =
                    parseFloat(sap.ui.version) < 1.75
                        ? sap.ui.core.routing.HashChanger.getInstance()
                        : router.getHashChanger();

                // on success result is the router
                hashChanger.attachEvent('hashChanged', (oEvent) => {
                    done(['success', parseFloat(sap.ui.version) < 1.75 ? hashChanger.getHash() : hashChanger.hash]);
                });

                // get component and trigger router
                // sName, oParameters?, oComponentTargetInfo?, bReplace?
                router.navTo(sName, oParameters, oComponentTargetInfo, bReplace);
                // return hashChanger.hash;
                return parseFloat(sap.ui.version) < 1.75 ? hashChanger.getHash() : hashChanger.hash;
            });
        },
        sComponentId,
        sName,
        oParameters,
        oComponentTargetInfo,
        bReplace
    );

    if (Array.isArray(result)) {
        if (result[0] === 'error') {
            console.error('ERROR: navigation using UI5 router failed because of: ' + result[1]);
            return result[1];
        } else if (result[0] === 'success') {
            console.log(`SUCCESS: navigation using UI5 router to hash:  ${JSON.stringify(result[0])} was successfull`);
            return result[1];
        }
    } else {
        // Guess: was directly returned
        return result;
    }
}
