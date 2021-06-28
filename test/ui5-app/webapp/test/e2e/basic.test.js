const wdi5 = require('wdi5');
const Main = require('./pageObjects/Main');

describe('ui5 basic', () => {
    globalThis.viewName = 'test.Sample.view.Main';

    before(() => {
        Main.open();
    });

    beforeEach(() => {
        wdi5().getLogger().log('beforeEach');
        wdi5().getUtils().screenshot('test-basic');
    });

    /*
     * It is important that we run each test in isolation. The running of a previous test
     * should not affect the next one. Otherwise, it could end up being very difficult to
     * track down what is causing a test to fail.
     */
    it('should have the right title', () => {
        const title = browser.getTitle();
        expect(title).toEqual('Sample UI5 Application');
    });

    it('should find a ui5 control class via .hasStyleClass', () => {
        // webdriver
        const className = 'myTestClass';

        // ui5
        const selector = {
            wdio_ui5_key: 'buttonSelector',
            selector: {
                bindingPath: {
                    modelName: 'testModel',
                    propertyPath: '/buttonText'
                },
                viewName: globalThis.viewName,
                controlType: 'sap.m.Button'
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            selector.forceSelect = true;
            selector.selector.interaction = 'root';
        }

        const control = browser.asControl(selector);
        const retrievedClassNameStatus = control.hasStyleClass(className);

        wdi5().getLogger().log('retrievedClassNameStatus', retrievedClassNameStatus);
        expect(retrievedClassNameStatus).toBeTruthy();
    });
});
