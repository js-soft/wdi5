const wdi5 = require('wdi5');
const Main = require('./pageObjects/Main');

describe('wdio-ui5 bridge: advanced tests', () => {
    const viewName = 'test.Sample.view.Main';

    before(() => {
        Main.open();
    });

    it('check the binding of the username input with custom wdio_ui5_key', () => {
        // set new Username
        const newUsername = 'my New Username';

        // create selector
        const inputSelector = {
            forceSelect: true,
            wdio_ui5_key: 'mainUserInput',
            selector: {
                interaction: 'focus',
                bindingPath: {
                    propertyPath: "/Customers('TRAIH')/ContactName"
                },
                // id: 'mainUserInput',
                viewName: viewName,
                controlType: 'sap.m.Input'
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            // inputSelector.selector.interaction = 'root';
        }

        const mainUserInput = browser.asControl(inputSelector);

        // set text
        mainUserInput.enterText(newUsername);

        // get ui5 control
        // const ui5Input = browser.asControl(inputSelector);
        // test for working binding
        expect(mainUserInput.getProperty('value')).toEqual(newUsername);
    });

    it('check the binding of the username input with generated wdio_ui5_key', () => {
        // set new Username
        const newUsername = 'second new Username';

        // create selector
        const inputSelector = {
            selector: {
                interaction: 'focus',
                id: 'mainUserInput',
                viewName: viewName,
                controlType: 'sap.m.Input'
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            inputSelector.forceSelect = true;
            // inputSelector.selector.interaction = 'root';
        }

        const mainUserInput = browser.asControl(inputSelector);

        // set text
        mainUserInput.enterText(newUsername);

        // get ui5 control
        // const ui5Input = browser.asControl(inputSelector);
        // test for working binding
        expect(mainUserInput.getProperty('value')).toEqual(newUsername);
    });

    it('should test the named json model', () => {
        // #1 button test
        const buttonSelector = {
            wdio_ui5_key: 'buttonSelector',
            selector: {
                interaction: 'focus',
                bindingPath: {
                    modelName: 'testModel',
                    propertyPath: '/buttonText'
                },
                viewName: globalThis.viewName,
                controlType: 'sap.m.Button'
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            buttonSelector.forceSelect = true;
            // buttonSelector.selector.interaction = 'root';
        }

        const ui5Button = browser.asControl(buttonSelector);
        ui5Button.firePress();

        // #2 input test
        const inputSelector = {
            wdio_ui5_key: 'inputSelector',
            selector: {
                interaction: 'focus',
                bindingPath: {
                    modelName: 'testModel',
                    propertyPath: '/inputValue'
                },
                viewName: viewName,
                controlType: 'sap.m.Input'
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            inputSelector.forceSelect = true;
            // inputSelector.selector.interaction = 'root';
        }

        const ui5Input = browser.asControl(inputSelector);

        const inputText = 'new Input Value §§§';
        ui5Input.enterText(inputText);

        expect(ui5Input.getProperty('value')).toEqual(inputText);
    });
});
