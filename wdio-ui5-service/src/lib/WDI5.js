/**
 * This is a bridge object to use from selector to UI5 control
 * This can be seen as a generic representation of a UI5 control used to interact with the UI5 control
 * This does not adjust the funcitonality based on a UI5 control type
 */
module.exports = class WDI5 {
    /** @type {WebdriverIO.BrowserObject} */
    _context = null;
    /**
     * control retrieved from browser-/native-context,
     * transferred to node-context
     * @typedef {Object} WDI5ControlSelector selected UI5 control
     * @property {String} wdio_ui5_key unique (wdi5-internal) key representing the UI5 control (selector)
     *
     */
    /** @type {WDI5ControlSelector} */
    _controlSelector = null;
    /** @type {[WebdriverIO.Element | String]} */
    _webElement = null;
    /** @type {[WebdriverIO.Element | String]} */
    _webdriverRepresentation = null;
    /** @type {String} */
    _wdio_ui5_key = null;
    /** @type {Array | String} */
    _generatedUI5Methods = null;
    /** @type {Boolean} */
    _initialisation = false;
    /** @type {Boolean} */
    _forceSelect = false;

    /**
     * create a new bridge return object for a UI5 control
     */
    constructor(controlSelector, context, forceSelect) {
        return this;
    }

    async init(controlSelector, context, forceSelect) {
        this._context = context;
        this._controlSelector = controlSelector;
        this._wdio_ui5_key = controlSelector.wdio_ui5_key;
        this._forceSelect = forceSelect;

        // fire getControl just once when creating this webui5 object
        const controlResult = await this._getControl();

        if (typeof controlResult[0] === 'string' && controlResult[0].toLowerCase().includes('error:')) {
            // result is string and has error text -> its an error
            console.error('[WDI5] Something went wrong retrieving the control: ' + this._wdio_ui5_key);
            return this;
        } else {
            this._webElement = controlResult[0];

            // dynamic function bridge
            this._generatedUI5Methods = controlResult[1];
            await this._attachControlBridge(this._generatedUI5Methods);

            // set the sucesfull init param
            this._initialisation = true;
        }

        return this;
    }

    // --- public methods Getter ---

    /**
     * @return {Boolean} whether this control was sucessfull initialised
     */
    getInitStatus() {
        return this._initialisation;
    }

    /**
     * @return {WebdriverIO.Element} the webdriver Element
     */
    async getWebElement() {
        if (this._forceSelect) {
            await this.renewWebElementReference();
        }
        return this._webdriverRepresentation;
    }

    /**
     * bridge to UI5 control getAggregation Method
     * @param {String} name
     * @return {any} content of the UI5 aggregation with name of parameter
     */
    async getAggregation(name) {
        if (this._forceSelect) {
            await this.renewWebElementReference();
        }
        return await this._getAggregation(name);
    }

    /**
     * enters a text into this UI5 control
     * @param {*} text
     * @return {WDI5} this for method chaining
     */
    async enterText(text) {
        // if (this._forceSelect) {
        //     this.renewWebElementReference();
        // }

        const oOptions = {
            enterText: text,
            selector: this._controlSelector.selector,
            clearTextFirst: true,
            interactionType: 'ENTER_TEXT'
        };
        await this._interactWithControl(oOptions);
        return this;
    }

    /**
     * used to update the wdio control reference
     * this can be used to manually trigger an control reference update after a ui5 control rerendering
     * this method is also used wdi5 interally to implement the extended forceSelect option
     */
    async renewWebElementReference() {
        const newWebElement = (await this._getControl())[0];
        this._webElement = newWebElement;
        return newWebElement;
    }

    // --- private methods ---

    /**
     * retrieve UI5 control represenation of a UI5 control's aggregation
     *
     * @param {Array} aControls strings of IDs of aggregation items
     * @param {WebdriverIO.BrowserObject} context
     * @returns {WDI5[]} instances of wdi5 class per control in the aggregation
     */
    async _retrieveElements(aControls, context = this._context) {
        let aResultOfPromises = [];

        // check the validity of param
        if (aControls) {
            // loop through items
            aControls.forEach((item) => {
                // item id -> create selector
                const selector = {
                    wdio_ui5_key: item.id, // plugin-internal, not part of RecordReplay.ControlSelector
                    selector: {
                        id: item.id
                    }
                };

                // get WDI5 control
                aResultOfPromises.push(context.asControl(selector));
            });

            return await Promise.all(aResultOfPromises);
        } else {
            console.warn(this._wdio_ui5_key + ' has no aControls');
        }
    }

    /**
     * retrieve UI5 control represenation of a UI5 control's aggregation
     *
     * @param {webElement} eControl ID
     * @param {WebdriverIO.BrowserObject} context
     * @returns {WDI5[]} instances of wdi5 class per control in the aggregation
     */
    async _retrieveElement(eControl, context = this._context) {
        let eResult = {};

        // check the validity of param
        if (eControl) {
            // item id -> create selector
            const selector = {
                wdio_ui5_key: eControl.id, // plugin-internal, not part of RecordReplay.ControlSelector
                selector: {
                    id: eControl.id
                }
            };

            // get WDI5 control
            eResult = await context.asControl(selector);
        } else {
            console.warn(this._wdio_ui5_key + ' has no aControls');
        }

        return eResult;
    }

    /**
     * attaches to the instance of this class the functions given in the parameter sReplFunctionNames
     *
     * @param {Array} sReplFunctionNames
     */
    async _attachControlBridge(sReplFunctionNames) {
        // check the validity of param
        if (sReplFunctionNames) {
            sReplFunctionNames.forEach(async (sMethodName) => {
                this[sMethodName] = this._executeControlMethod.bind(this, sMethodName, this._webElement, this._context);
            });
        } else {
            console.warn(this._wdio_ui5_key + ' has no sReplFunctionNames');
        }
    }

    /**
     * runtime - proxied browser-time UI5 controls' method at Node.js-runtime
     *
     * @param {String} methodName UI5 control method
     * @param {WebdriverIO.Element} webElement representation of selected UI5 control in wdio
     * @param {WebdriverIO.BrowserObject} context points to either browser- or native-runtime context
     * @param  {...any} args proxied arguments to UI5 control method at runtime
     */
    async _executeControlMethod(methodName, webElement = this._webElement, context = this._context, ...args) {
        if (this._forceSelect) {
            this._webElement = await this.renewWebElementReference();
        }
        // special case for custom data attached to a UI5 control:
        // pass the arguments to the event handler (like UI5 handles and expects them) also
        // also here in Node.js runtime
        if (methodName === 'fireEvent') {
            if (args[1] && typeof args[1]['eval'] === 'function') {
                return await this._fireEvent(args[0], args[1], webElement, context);
            }
        }
        // returns the array of [0: "status", 1: result]

        // regular browser-time execution of UI5 control method
        const result = await context.executeAsync(
            (webElement, methodName, args, done) => {
                window.bridge.waitForUI5(window.wdi5.waitForUI5Options).then(() => {
                    // DOM to UI5
                    const oControl = window.wdi5.getUI5CtlForWebObj(webElement);
                    // execute the function
                    let result = oControl[methodName].apply(oControl, args);
                    const metadata = oControl.getMetadata();
                    if (Array.isArray(result)) {
                        // expect the method call delivers non-primitive results (like getId())
                        // but delivers a complex/structured type
                        // -> currenlty, only getAggregation(...) is supported
                        result = window.wdi5.createControlIdMap(result);
                        done(['success', result, 'aggregation']);
                    } else {
                        // ui5 api <control>.focus() doesn't have return value
                        if (methodName === 'focus' && result === undefined) {
                            done([
                                'success',
                                `called focus() on wdi5 representation of a ${metadata.getElementName()}`,
                                'element'
                            ]);
                        } else if (result === undefined || result === null) {
                            done([
                                'error',
                                `function ${methodName} does not exist on control ${metadata.getElementName()}!`,
                                'none'
                            ]);
                        } else {
                            // result mus be a primitive
                            if (window.wdi5.isPrimitive(result)) {
                                // getter
                                done(['success', result, 'result']);
                            } else {
                                // object, replacer function
                                // TODO: create usefull content from result
                                // result = JSON.stringify(result, window.wdi5.circularReplacer());

                                // check if of control to verify if the method result is a different control
                                if (result && result.getId && oControl.getId() !== result.getId()) {
                                    // ui5 function like get parent might return another ui5 control -> return it to check with this wdi5 instance
                                    result = window.wdi5.createControlId(result);
                                    done(['success', result, 'newElement']);
                                } else {
                                    done([
                                        'success',
                                        `instance of wdi5 representation of a ${metadata.getElementName()}`,
                                        'element'
                                    ]);
                                }
                            }
                        }
                    }
                });
            },
            webElement,
            methodName,
            args
        );

        // create logging
        this._writeResultLog(result, methodName);

        switch (result[2]) {
            case 'newElement':
                // retrieve and return another instance of a wdi5 control
                return await this._retrieveElement(result[1]);
            case 'element':
                // return $self after a called method of the wdi5 instance to allow method chaining
                return this;
            case 'result':
                // return result on array index 1 anyways
                return result[1];
            case 'aggregation': // also applies for getAggregation convenience methods such as $ui5control.getItems()
                // check weather to retrieve all elements in the aggreation as ui5 control
                if ((args.length > 0 && typeof args[0] === 'boolean' && args[0] === false) || args.length === 0) {
                    // get all if param is false or undefined
                    return await this._retrieveElements(result[1]);
                } else if (args[0] && typeof args[0] === 'number') {
                    if (args[0] <= result[1].length) {
                        // retieve only one
                        // need some code of separate feature branch here
                        const wdioElement = result[1][args[0]];
                        return await this._retrieveElement(wdioElement);
                    } else {
                        console.error(
                            `tried to get an control at index: ${args[0]} of an aggregation outside of aggregation length: ${result[1].length}`
                        );
                    }
                } else {
                    // return wdio elements
                    return result[1];
                }
            case 'none':
                return null;
            default:
                return null;
        }
    }

    /**
     * time itensive
     * @param {String} aggregationName
     * @param {WebdriverIO.Element} webElement
     * @param {WebdriverIO.BrowserObject} context
     * @return {any}
     */
    async _getAggregation(aggregationName, webElement = this._webElement, context = this._context) {
        const result = await context.executeAsync(
            (webElement, aggregationName, done) => {
                window.bridge.waitForUI5(window.wdi5.waitForUI5Options).then(() => {
                    // DOM to UI5
                    try {
                        let oControl = window.wdi5.getUI5CtlForWebObj(webElement);
                        let cAggregation = oControl.getAggregation(aggregationName);
                        // if getAggregation retrieves an element only it has to be transformed to an array
                        if (cAggregation && !Array.isArray(cAggregation)) {
                            cAggregation = [cAggregation];
                        }
                        let result = window.wdi5.createControlIdMap(cAggregation);
                        done(['success', result]);
                    } catch (e) {
                        done(['error', e.toString()]);
                    }
                });
            },
            webElement,
            aggregationName
        );

        this._writeResultLog(result, '_getAggregation()');

        let wdiItems = [];
        if (result[0] === 'success') {
            wdiItems = await this._retrieveElements(result[1]);
        }

        // else return empty array
        return wdiItems;
    }

    /**
     * @deprecated
     * @param {String} propertyName
     * @param {any} propertyValue
     * @param {WebdriverIO.Element} webElement
     * @param {WebdriverIO.BrowserObject} context
     */
    async _setProperty(propertyName, propertyValue, webElement = this._webElement, context = this._context) {
        const result = await context.executeAsync(
            (webElement, propertyName, propertyValue, done) => {
                window.bridge.waitForUI5(window.wdi5.waitForUI5Options).then(() => {
                    try {
                        let oControl = window.wdi5.getUI5CtlForWebObj(webElement);
                        oControl.setProperty(propertyName, propertyValue);
                        done(['success', ` '${propertyName}' is now '${propertyValue.toString()}'`]);
                    } catch (error) {
                        window.wdi5.Log.error(`[browser wido-ui5] setProperty failed because of: ${error}`);
                        done(['error', error.toString()]);
                    }
                });
            },
            webElement,
            propertyName,
            propertyValue
        );

        this._writeResultLog(result, '_setProperty()');
        return result[1];
    }

    /**
     * @deprecated
     * @param {String} className
     * @param {WebdriverIO.Element} webElement
     * @param {WebdriverIO.BrowserObject} context
     */
    async _hasStyleClass(className, webElement = this._webElement, context = this._context) {
        const result = await context.executeAsync(
            (webElement, className, done) => {
                window.bridge.waitForUI5(window.wdi5.waitForUI5Options).then(() => {
                    try {
                        const foundUI5Control = window.wdi5.getUI5CtlForWebObj(webElement);
                        done(['success', foundUI5Control.hasStyleClass(className)]);
                    } catch (e) {
                        done(['error', e.toString()]);
                    }
                });
            },
            webElement,
            className
        );

        this._writeResultLog(result, '_hasStyleClass()');
        return result[1];
    }

    /**
     * @deprecated
     * get the property value of a UI5 control
     * @param {WebdriverIO.Element} webElement
     * @param {String} propertyName
     * @param {WebdriverIO.BrowserObject} context
     * @return {any} value of the UI5 property
     */
    async _getProperty(propertyName, webElement = this._webElement, context = this._context) {
        // returns the array of [0: "status", 1: result]
        const result = await context.executeAsync(
            (webElement, propertyName, done) => {
                window.bridge.waitForUI5(window.wdi5.waitForUI5Options).then(() => {
                    // DOM to UI5
                    let oControl = window.wdi5.getUI5CtlForWebObj(webElement);
                    let sProperty = '';
                    switch (propertyName) {
                        case 'id':
                            sProperty = oControl.getId();
                            break;

                        default:
                            sProperty = oControl.getProperty(propertyName);
                            break;
                    }
                    if (sProperty === undefined || sProperty === null) {
                        done(['error', `property ${propertyName} not existent in control !`]);
                    } else {
                        done(['success', sProperty]);
                    }
                });
            },
            webElement,
            propertyName
        );

        // create logging
        this._writeResultLog(result, '_getProperty()');
        // return result on array index 1 anyways
        return result[1];
    }

    // --- private actions ---

    /**
     * Interact with specific control.
     * @param {object} oOptions
     * @param {sap.ui.test.RecordReplay.ControlSelector} oOptions.selector - UI5 type
     * @param {sap.ui.test.RecordReplay.InteractionType} oOptions.interactionType - UI5 type
     * @param {string} oOptions.enterText
     * @param {boolean} oOptions.clearTextFirst
     * @param {object} context
     */
    async _interactWithControl(oOptions, context = this._context) {
        const result = await context.executeAsync((oOptions, done) => {
            window.bridge
                .waitForUI5(window.wdi5.waitForUI5Options)
                .then(() => {
                    window.wdi5.Log.info('[browser wdi5] locating controlSelector');
                    oOptions.selector = window.wdi5.createMatcher(oOptions.selector);
                    if (parseFloat(sap.ui.version) <= 1.6) {
                        // implementing legacy api < 1.60
                        window.bridge.findDOMElementByControlSelector(oOptions).then((control, arg) => {
                            const ui5Control = window.wdi5.getUI5CtlForWebObj(control);
                            oOptions.control = ui5Control;
                            return window.bridge.interactWithControl(oOptions);
                        });
                    } else {
                        return window.bridge.interactWithControl(oOptions);
                    }
                })
                .then((result) => {
                    window.wdi5.Log.info('[browser wdi5] interaction complete! - Message: ' + result);
                    done(['success', result]);
                })
                .catch((error) => {
                    window.wdi5.Log.error('[browser wdi5] ERR: ', error);
                    done(['error', error.toString()]);
                });
        }, oOptions);

        this._writeResultLog(result, '_interactWithControl()');
        return result[1];
    }

    /**
     * fire a named event on a UI5 control
     * @param {String} eventName
     * @param {any} oOptions
     * @param {WebdriverIO.Element} webElement
     * @param {WebdriverIO.BrowserObject} context
     */
    async _fireEvent(eventName, oOptions, webElement = this._webElement, context = this._context) {
        // Check the options have a eval property
        if (oOptions && oOptions.eval) {
            oOptions = '(' + oOptions.eval.toString() + ')';
        }

        const result = await context.executeAsync(
            (webElement, eventName, oOptions, done) => {
                window.bridge.waitForUI5(window.wdi5.waitForUI5Options).then(() => {
                    window.wdi5.Log.info('[browser wdi5] working ' + eventName + ' for ' + webElement);
                    // DOM to ui5
                    let oControl = window.wdi5.getUI5CtlForWebObj(webElement);
                    if (oControl && oControl.hasListeners(eventName)) {
                        window.wdi5.Log.info('[browser wdi5] firing ' + eventName + ' on ' + webElement);
                        // element existent and has the target event
                        try {
                            // eval the options indicated by option of type string
                            if (typeof oOptions === 'string') {
                                oOptions = eval(oOptions)();
                            }
                            oControl.fireEvent(eventName, oOptions);
                            // convert to boolean
                            done(['success', true]);
                        } catch (e) {
                            done(['error', e.toString()]);
                        }
                    } else {
                        window.wdi5.Log.error("[browser wdi5] couldn't find " + webElement);
                        done(['error', false]);
                    }
                });
            },
            webElement,
            eventName,
            oOptions
        );
        this._writeResultLog(result, '_fireEvent()');
        return result[1];
    }

    // --- private internal ---

    /**
     * retrieve a DOM element via UI5 locator
     * @param {sap.ui.test.RecordReplay.ControlSelector} controlSelector
     * @param {WebdriverIO.BrowserObject} context
     * @return {[WebdriverIO.Element | String, [aProtoFunctions]]} UI5 control or error message, array of function names of this control
     */
    async _getControl(controlSelector = this._controlSelector, context = this._context) {
        // check whether we have a "by id regex" locator request
        if (controlSelector.selector.id && typeof controlSelector.selector.id === 'object') {
            // make it a string for serializing into browser-scope and
            // further processing there
            controlSelector.selector.id = controlSelector.selector.id.toString();
        }
        let result = await context.executeAsync((controlSelector, done) => {
            window.bridge
                .waitForUI5(window.wdi5.waitForUI5Options)
                .then(() => {
                    window.wdi5.Log.info('[browser wdi5] locating ' + JSON.stringify(controlSelector));
                    controlSelector.selector = window.wdi5.createMatcher(controlSelector.selector);
                    return window.bridge.findDOMElementByControlSelector(controlSelector);
                })
                .then((domElement) => {
                    // window.wdi5.Log.info('[browser wdi5] control located! - Message: ' + JSON.stringify(domElement));
                    // ui5 control
                    const ui5Control = window.wdi5.getUI5CtlForWebObj(domElement);
                    const id = ui5Control.getId();
                    window.wdi5.Log.info(`[browser wdi5] control with id: ${id} located!`);
                    const aProtoFunctions = window.wdi5.retrieveControlMethods(ui5Control);
                    // @type [String, String?, String, "Array of Strings"]
                    done(['success', domElement, id, aProtoFunctions]);
                })
                .catch((error) => {
                    window.wdi5.Log.error('[browser wdi5] ERR: ', error);
                    done(['error', error.toString()]);
                });
        }, controlSelector);

        // save the webdriver representation by control id
        if (result[2]) {
            // only if the result is valid
            this._webdriverRepresentation = await $(`#${result[2]}`);
        }

        this._writeResultLog(result, '_getControl()');

        return [result[1], result[3]];
    }

    /**
     * create log based on the status of result[0]
     * @param {Array} result
     * @param {*} functionName
     */
    _writeResultLog(result, functionName) {
        if (result[0] === 'error') {
            console.error(`ERROR: call of ${functionName} failed because of: ${result[1]}`);
        } else if (result[0] === 'success') {
            console.log(`SUCCESS: call of function ${functionName} returned: ${JSON.stringify(result[1])}`);
        } else {
            console.warn(`Unknown status: ${functionName} returned: ${JSON.stringify(result[1])}`);
        }
    }
};
