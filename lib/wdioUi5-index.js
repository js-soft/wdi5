// @ts-check
const logger = require('./Logger');
const WDI5 = require('./WDI5');

/** @type {WebdriverIO.BrowserObject} store the context */
let _context = null;
/** @type {Boolean} store the status of initialization */
let _isInitialized = false;
/** @type {Boolean} store the status of UI5.waitForUI5 */
let _isUI5Ready = false;

/**
 * function library to setup the webdriver to UI5 bridge, it runs alle the initial setup
 * make sap/ui/test/RecordReplay accessible via wdio
 * attach the sap/ui/test/RecordReplay object to the application context window object as 'bridge'
 * @param {WebdriverIO.BrowserObject} context
 */
function injectUI5(context) {
    // expect boolean
    const result = context.executeAsync((done) => {
        if (window.bridge) {
            // setup sap testing already done
            done(true);
        }

        if (!window.sap || !window.sap.ui) {
            // setup sap testing already cant be done due to sap namespace not present on the page
            console.error('[browser wdio-ui5] ERR: no ui5 present on page');

            // only condition where to cancel the setup process
            done(false);
        }

        // attach the function to be able to use the extracted method later
        if (!window.wdi5 && !window.bridge) {
            // create empty
            window.wdi5 = {
                createMatcher: null,
                isInitialized: false,
                Log: null
            };

            // load UI5 logger
            sap.ui.require(['sap/base/Log'], (Log) => {
                // Logger is loaded -> can be use internally
                // attach logger to wdi5 to be able to use it globally
                window.wdi5.Log = Log;
                window.wdi5.Log.info('[browser wdio-ui5] injected!');
            });

            // attach new bridge
            sap.ui.require(['sap/ui/test/RecordReplay'], (RecordReplay) => {
                window.bridge = RecordReplay;
                window.wdi5.Log.info('[browser wdio-ui5] injected!');
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
                        const fVersion = 1.6;

                        if (oSelector.bindingPath) {
                            // TODO: for the binding Path there is no object creation
                            // fix (?) for "leading slash issue" in propertyPath w/ a named model
                            // openui5 issue in github is open
                            const hasNamedModel =
                                oSelector.bindingPath.modelName && oSelector.bindingPath.modelName.length > 0;
                            const isRootProperty =
                                oSelector.bindingPath.propertyPath &&
                                oSelector.bindingPath.propertyPath.charAt(0) === '/';
                            if (hasNamedModel && isRootProperty) {
                                // attach the double leading /
                                oSelector.bindingPath.propertyPath = `/${oSelector.bindingPath.propertyPath}`;
                            }
                            if (fVersion > parseFloat(sap.ui.version)) {
                                // for version < 1.60 create the matcher
                                oSelector.bindingPath = new BindingPath(oSelector.bindingPath);
                            }
                        }
                        if (oSelector.properties) {
                            if (fVersion > parseFloat(sap.ui.version)) {
                                // for version < 1.60 create the matcher
                                oSelector.properties = new Properties(oSelector.properties);
                            }
                        }
                        if (oSelector.i18NText) {
                            if (fVersion > parseFloat(sap.ui.version)) {
                                // for version < 1.60 create the matcher
                                oSelector.i18NText = new I18NText(oSelector.i18NText);
                            }
                        }
                        if (oSelector.labelFor) {
                            if (fVersion > parseFloat(sap.ui.version)) {
                                // for version < 1.60 create the matcher
                                oSelector.labelFor = new LabelFor(oSelector.labelFor);
                            }
                        }
                        if (oSelector.ancestor) {
                            if (fVersion > parseFloat(sap.ui.version)) {
                                // for version < 1.60 create the matcher
                                oSelector.ancestor = new Ancestor(oSelector.ancestor);
                            }
                        }
                        return oSelector;
                    };

                    /**
                     * extract the musti use function to get a UI5 Control from a JSON Webobejct
                     */
                    window.wdi5.getUI5CtlForWebObj = (ui5Control) => {
                        return jQuery(ui5Control).control(0);
                    };
                }
            );
        }
    });

    if (result) {
        // set when call returns
        _isInitialized = true;
        logger.log('sucessfully initialized wdio-ui5 bridge');
    } else {
        logger.error('bridge was not initialized correctly');
    }
    return result;
}

/**
 * check for UI5 via the RecordReplay.waitForUI5 method
 * @param {WebdriverIO.BrowserObject} context
 */
function _checkForUI5Ready(context) {
    if (_isInitialized) {
        // can only be executed when RecordReplay is attached
        const result = context.executeAsync((done) => {
            window.bridge
                .waitForUI5()
                .then(() => {
                    window.wdi5.Log.info('[browser wdio-ui5] UI5 is ready');
                    console.log('[browser wdio-ui5] UI5 is ready');
                    done(true);
                })
                .catch((error) => {
                    console.error(error);
                });
        });
        _isUI5Ready = !!result;
        return result;
    }
    return false;
}

/**
 * can be called to make sure before you access any eg. DOM Node the ui5 framework is done loading
 */
function waitForUI5() {
    if (_isInitialized) {
        // injectUI5 was already called and was successful attached
        if (_isUI5Ready) {
            // is already set to ready=true
            return true;
        } else {
            return _checkForUI5Ready(_context);
        }
    } else {
        if (injectUI5(_context)) {
            return _checkForUI5Ready(_context);
        } else {
            return false
        }
    }
}

/**
 * internally used to execute the attach the new function calls to the wdio context object
 * https://webdriver.io/docs/customcommands.html#overwriting-native-commands
 * use wdio's hooks for setting up custom commands in the context
 * @param {WebdriverIO.BrowserObject} context
 */
function setup(context) {
    if (!_context) {
        _context = context;
    }

    // create an internal store of already retrieved UI5 elements
    // in the form of their wdio counterparts
    // for faster subsequent access
    if (!context._controls) {
        logger.info('creating internal control map');
        context._controls = {};
    }

    /**
     * Find the best control selector for a DOM element. A selector uniquely represents a single element.
     * The 'best' selector is the one with which it is most likely to uniquely identify a control with the least possible inspection of the control tree.
     * @param {object} oOptions
     * @param {object} oOptions.domElement - DOM Element to search for
     * @param {object} oOptions.settings - ui5 settings object
     * @param {boolean} oOptions.settings.preferViewId
     * @param {WebdriverIO.BrowserObject} context
     */
    context.addCommand('getSelectorForElement', (oOptions) => {
        const result = context.executeAsync((oOptions, done) => {
            window.bridge
                .waitForUI5()
                .then(() => {
                    window.wdi5.Log.info('[browser wdio-ui5] locating domElement');
                    return window.bridge.findControlSelectorByDOMElement(oOptions);
                })
                .then((controlSelector) => {
                    window.wdi5.Log.info('[browser wdio-ui5] controlLocator created!');
                    done(['success', controlSelector]);
                    return controlSelector;
                })
                .catch((error) => {
                    window.wdi5.Log.error('[browser wdio-ui5] ERR: ', error);
                    done(['error', error.toString()]);
                    return error;
                });
        }, oOptions);

        if (Array.isArray(result)) {
            if (result[0] === 'error') {
                logger.error('ERROR: getSelectorForElement() failed because of: ' + result[1]);
                return result[1];
            } else if (result[0] === 'success') {
                logger.log(`SUCCESS: getSelectorForElement() returned:  ${JSON.stringify(result[0])}`);
                return result[1];
            }
        } else {
            // Guess: was directly returned
            return result;
        }
    });

    /**
     * creates a string valid as object key from a selector
     * @param {sap.ui.test.RecordReplay.ControlSelector} selector
     * @returns {String} wdio_ui5_key
     */
    function createWdioUI5KeyFromSelector(selector) {

        var orEmpty = (string) => {
            return string || "-";
        };
        const wdi5_ui5_key = stripNonValidCharactersForKey(`${orEmpty(selector.id)}_${orEmpty(selector.viewName)}_${orEmpty(selector.controlType)}_${orEmpty(selector.bindingPath)}_${orEmpty(selector.I18NText)}_${orEmpty(selector.labelFor)}_${orEmpty(selector.properties)}`);
        return wdi5_ui5_key;
    };

    /**
     * to generate an object key from any string
     * @param {String} key
     * @returns {String}
     */
    function stripNonValidCharactersForKey(key) {
        key = key.split('.').join('')
            .split('/').join('')
            .split(' ').join('')
            .split('>').join('')
            .split('_-').join('')
            .split('-').join('')
            .toLowerCase();
        return key;
    };

    async function createWdi5Control(wdi5Selector, context) {

        // create WDI5 control
        const wdi5Control = new WDI5(wdi5Selector, context);

        // save control
        context._controls[wdi5Selector.wdio_ui5_key] = wdi5Control;
        logger.info(`creating internal control with id ${wdi5Selector.wdio_ui5_key}`);

        return wdi5Control;
    };

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
    context.addCommand('asControl', async (wdi5Selector) => {

        if (!wdi5Selector.hasOwnProperty('wdio_ui5_key')) {
            // has not a wdio_ui5_key -> generate one
            wdi5Selector['wdio_ui5_key'] = createWdioUI5KeyFromSelector(wdi5Selector.selector);
        }

        const internalKey = wdi5Selector.wdio_ui5_key;
        if (!context._controls[internalKey] || wdi5Selector['forceSelect']) {
            // if control is not yet existent or force parameter is set -> load control

            // create WDI5 control
            const wdi5Control = new WDI5(wdi5Selector, context);

            // save control
            context._controls[internalKey] = wdi5Control;
            logger.info(`creating internal control with id ${internalKey}`);

            return wdi5Control;
        } else {
            logger.info(`reusing internal control with id ${internalKey}`);
            // return webui5 control from storage map
            return context._controls[internalKey];
        }

    });
}

module.exports = {
    injectUI5,
    setup,
    waitForUI5
};
