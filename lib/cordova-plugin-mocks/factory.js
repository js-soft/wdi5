const logger = require('../Logger');

/**
 * plugin mock factory
 * to create a proper abstraction, the test doesn't need to know where the mock happens at runtime
 *
 * * How to mock a plugin
 * ----------------------
 * 1. Put the exact cordova plugin name and its' mock countpart into: wdi5: { plugins: { : {} } }.
 * 1.1 Maps source to mock at wdi5 runtime
 *
 * 2. Implement the plugin mock to override the needed plugin javascript functions, and call the `registerPlugin` function of the plugin factory. The third parameter is the critical:
 * The function passed to the register function will be executed in the browser's webapp context!
 * 2.1 This will trigger an attach of the mock funtions to the web app browser context.
 *
 * 3. The mock function will be automatically called by the app
 */
module.exports = {
    // Object of plugin names read from config
    _pluginListConfig: {},
    // instanziated list of plugins
    _pluginList: {
        android: {},
        ios: {},
        browser: {},
        electron: {}
    },
    // index
    _: null,
    _context: null,
    // name of platform under test
    _platform: '',

    /**
     * call to trigger the init process
     * @param {index} _ WDI5 framework index.js
     * @param {WebdriverIO.BrowserObject} context
     */
    setup(_, context) {
        this._ = _;
        this._context = context;

        this._injectPlugins(this._.getUtils().getConfig().plugins);
        this._platform = this._.getUtils().getConfig('platform');
        this._pluginListConfig = this._getPluginConfig();
    },

    /**
     * called by the plugins to register
     * each plugin needs to register itself
     * the passed function will be executed in the webcontext and thus all defined objects will be attached to the webcontext
     * @param {String} pluginName
     * @param {String} platform name
     * @param {function} setupFunction
     */
    registerPlugin(pluginName, platform, setupFunction) {
        if (!this._pluginList[platform][pluginName]) {
            // register new plugin
            this._pluginList[platform][pluginName] = setupFunction;

            // execute setup just for plugins for the current platform
            if (platform === this._platform) {
                this._callPluginSetup(pluginName, setupFunction);
            }
        } else {
            // plugin with this name already registered
            logger.error(`plugin with the name: ${pluginName} already registered`);
        }
    },

    /**
     * private
     * attach the plugin config from wdi5.plugins.config to window.wdi5.plugins
     * executes the setup to attach the namespace and functions to the window.wdi5 object
     * @param {WDI5.plugin.configuration} pluginConf
     */
    _injectPlugins(pluginConf) {
        const sPluginConf = JSON.stringify(pluginConf);
        const result = this._context.executeAsync((sPluginConf, done) => {
            // attach the function to be able to use the extracted method later
            if (!window.wdi5) {
                window.wdi5 = {};
            }
            try {
                // attach function to be called from the plugin mock
                window.wdi5.plugins = JSON.parse(sPluginConf);
                /**
                 * @param {String} pluginName
                 * @returns {*} plugin config
                 */
                window.wdi5.getPluginConfigForPlugin = (pluginName) => {
                    return window.wdi5.plugins[pluginName];
                };
                /**
                 * @param {String} pluginName
                 * @param {String} property
                 * @returns {*} plugin config for property
                 */
                window.wdi5.getPluginConfigForPluginWithProperty = (pluginName, property) => {
                    return window.wdi5.plugins[pluginName][property];
                };

                /**
                 *
                 * @param {*} pluginName
                 * @param {*} resp
                 */
                window.wdi5.setPluginMockReponse = (pluginName, resp) => {
                    window.wdi5.plugins[pluginName]['dynResp'] = resp;
                };

                /**
                 *
                 * @param {*} pluginName
                 */
                window.wdi5.getPluginMockResponse = (pluginName) => {
                    return window.wdi5.plugins[pluginName]['dynResp']
                }

                done(true);
            } catch (e) {
                done(false);
            }
        }, sPluginConf);

        if (result) {
            // set when call returns
            logger.log('plugin config was initialized correctly');
        } else {
            logger.error('plugin config was NOT initialized correctly');
        }
        return result;
    },

    /**
     * reads the wdi5 config and saves to the plugin list
     * @returns {WDI5.plugins} map of plugins in the WDI5 config
     */
    _getPluginConfig() {
        const pluginConfigList = this._.getUtils().getConfig('plugins');
        if (pluginConfigList) {
            Object.keys(pluginConfigList).forEach((name) => {
                // load plugin
                const config = pluginConfigList[name];
                this._loadPluginWithName(name, config);
            });

            return pluginConfigList;
        } else {
            // no plugin config found
            logger.log('no plugins in config defined');
            // eventually return {}
            return {};
        }
    },

    /**
     * use node require to load a plugin file
     * @param {String} pluginName
     * @param {Object} config object read from *.conf.js
     * @returns the result of node.js require of the file with name of the parameter
     */
    _loadPluginWithName(pluginName, config) {

        let path = `./${pluginName}`;
        if (config.path) {
            // set custom path if existent
            if (config.path.indexOf(".js") !== -1) {
                // cut the .js file ending
                var file = config.path.substring(0, config.path.length - 3);
            }
            path = "../../" + file;
        }

        // load from plugin config list
        return require(`${path}`);
    },

    /**
     * call setup on each registered plugin
     */
    _callPluginSetup(pluginName, setupFunction) {
        // stringyfy the provided function to be able to inject it to the webapp context
        const sSetupFunction = '(' + setupFunction.toString() + ')';

        const result = this._context.executeAsync(
            (sSetupFunction, pluginName, done) => {
                // create cordova plugin mock as base
                if (!window.cordova) {
                    window.cordova = {
                        plugins: {}
                    };
                }

                try {
                    // attach
                    // the return value is unused
                    eval(sSetupFunction)();
                    // call success
                    done(['success', '']);
                } catch (e) {
                    const error = `[browser wdio-ui5] ERR executing the plugin function: ${pluginName}, because of: ${e}`;
                    window.wdi5.Log.error(error);
                    done(['error', error]);
                }
            },
            sSetupFunction,
            pluginName
        );

        if (result[0] === 'success') {
            // do something with the result[1]
        } else if (result[0] === 'error') {
            logger.error(result[1]);
        }
    },

    /**
     *
     * @param {*} pluginName
     * @param {*} response
     */
    setPluginMockReponse(pluginName, response) {
        const result = this._context.executeAsync((pluginName, response, done) => {
            window.wdi5.setPluginMockReponse(pluginName, response)
            done();
        }, pluginName, response);

        return result;
    }
};
