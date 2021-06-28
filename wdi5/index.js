const BrowserUtils = require('./lib/BrowserUtils');
const NativeUtils = require('./lib/NativeUtils');
const cordovaMockPluginFactory = require('./lib/cordova-plugin-mocks/factory');
const logger = require('./lib/Logger');
const wdioUI5Service = require('wdio-ui5-service').default;
let _instance = null;

class _ {
    _utilInstance = null;
    deviceType = '';

    /**
     * FACTORY
     * @param {*} webcontext String
     */
    constructor(webcontext) {
        // create new instance

        // set device type based on config
        // doesn't matter if read from browser or dervice -> device independent
        if (browser.config) {
            this.deviceType = browser.config.wdi5 ? browser.config.wdi5.deviceType : 'native'; // {web | native}
        } else if (driver.config) {
            // just to make sure anyways
            this.deviceType = driver.config.wdi5 ? driver.config.wdi5.deviceType : 'native'; // {web | native}
        } else {
            logger.error('no config found something went terribly wrong during the initialitation of the wdconf !');
        }

        // create Util instance
        if (this.deviceType === 'web') {
            this._utilInstance = new BrowserUtils();
        } else if (this.deviceType === 'native') {
            this._utilInstance = new NativeUtils(webcontext);
        } else {
            logger.error(
                `requested device type: ${deviceType} is not supported use one of type (String): {web | native} instead`
            );
        }

        if (!this._utilInstance) {
            logger.error('WDI5 Utils were not created correctly');
        }

        return this;
    }

    /**
     * return the instantiated utils
     */
    getUtils() {
        return this._utilInstance;
    }

    /**
     * @retun logger
     */
    getLogger() {
        return logger;
    }

    /**
     * @retun plugin factory for cordova plugins
     */
    getCordovaMockPluginFactory() {
        return cordovaMockPluginFactory;
    }
}

module.exports = async (context, webcontext) => {
    if (!_instance) {
        // create new if parameters are supplied
        _instance = new _(webcontext);

        // wdio-ui5-service setup
        if (wdioUI5Service) {
            new wdioUI5Service().startWDI5();
        } else {
            console.error('Dependency wdio-ui-service not found!');
        }

        const result = await context.executeAsync((done) => {
            done(window.location.href);
        });
        console.log(`window.location.href: ${result}`);

        // create mocks for plugins
        cordovaMockPluginFactory.setup(_instance, context);

        // set loglevel once
        logger.setLoglevel(_instance.getUtils().getConfig('logLevel'));
    } else if (webcontext && _instance.getUtils() instanceof NativeUtils) {
        // WDI5 instance already exists but new webcontext is provided
        logger.log('update with provided webcontext');
        _instance._setWebcontext(webcontext);
    } else {
        logger.log('reusing instance of WDI5');
    }

    return _instance;
};
