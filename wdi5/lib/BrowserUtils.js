// @ts-check
const fs = require('fs');
const logger = require('./Logger');
const path = require('path');
const Utils = require('./Utils');

// Singleton
module.exports = class BrowserUtil extends Utils {
    static _instance;
    path = {
        electron: `${this.context.getUrl()}`,
        currentPath: '' // default fallback for web browser
    };

    /**
     */
    constructor() {
        super(browser);

        if (this._instance) {
            return this._instance;
        }

        // not path needed for browser
        if (this.getConfig('path') && this.getConfig('path').length > 0) {
            logger.warn(
                'for this device (browser) no navigation path is needed, path: ',
                this.getConfig('path'),
                'not used'
            );
        }

        if (this.getConfig('platform') === 'electron') {
            this.path.currentPath = this.path.electron;
        } else {
            // browser
            // not needed any config -> using empty path -> wdio-ui5-service `goTo` method includes the config for `url`
        }

        this._instance = this;
        return this._instance;
    }

    /**
     * navigates in the application to a given hash
     * @param {String} hash
     */
    goTo(hash, oRoute) {
        if (hash) {
            logger.log(`Navigating to: ${this.path.currentPath}${hash}`);
            // used for electron and browser
            this.context.goTo(`${this.path.currentPath}${hash}`);

            // electron needs to have the wdi5 injected after navigation
            // -- no more as of Nov 2020 :) TODO: investigate why we don't need it
            // if (this.getConfig('platform') === 'electron') {
            // this.context.injectUI5(browser);
            // }
        } else {
            logger.log(`Navigating to: ${oRoute.sName}`);

            // only for ui5 router based navigation use this function
            this.context.goTo({oRoute: oRoute});
        }
    }

    /**
     * @deprecated use screenshot instead
     * store a screenshot (as png) in a directory
     * @param {String} fileAppendix postfixed (to screenshot filename) custom identifier for the screenshot
     */
    async takeScreenshot(fileAppendix) {
        if (this.initSuccess) {
            // make sure the UI is fully loaded -> done in wdio-ui5-service
            // this.context.waitForUI5();

            await this._writeScreenshot(fileAppendix);
        } else {
            logger.error('init of utils failed');
        }
    }

    /**
     *
     * @param {*} fileAppendix
     */
    async screenshot(fileAppendix) {
        await this.takeScreenshot(fileAppendix);
    }
};
