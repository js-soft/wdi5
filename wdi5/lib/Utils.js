// @ts-check
const logger = require('./Logger');
const path = require('path');
const fs = require('fs');

/**
 * Abstract super class
 */
module.exports = class Util {
    context = {};
    initSuccess = false;
    pjsonPackage = require(`./../package.json`);

    /**
     * @abstract: Do not instantiate -> use the child classes !!!
     * @param {object} context bla fasel
     */
    constructor(context) {
        if (context) {
            this.initSuccess = true;
        }
        if (this.initSuccess) {
            this.context = context;
        }
    }

    /**
     * if property is provided the value of property will be returned
     * if no property is provided the whole config will be returned.
     * @param {String} property
     */
    getConfig(property) {
        if (this.initSuccess) {
            if (property) {
                try {
                    return this.context.config.wdi5[property];
                } catch (e) {
                    logger.error(e);
                }
            }
            return this.context.config.wdi5;
        } else {
            logger.error('init of utils failed');
        }
    }

    /**
     * the take screenshot function is provided by wdio-ui5-service
     * @param {*} fileAppendix
     */
    async _writeScreenshot(fileAppendix) {
        // mandatory to use the provided writescreenshot method in native app environment (after switching the to native context)
        await this.context.writescreenshot(fileAppendix);
    }
};
