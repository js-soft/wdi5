const wdi5 = require('wdi5');
const Main = require('./pageObjects/Main');

describe('check the generated methods on the control -> ', () => {
    const buttonSelector = {
        selector: {
            id: 'NavFwdButton',
            viewName: 'test.Sample.view.Main'
        }
    };

    const inuputSelector = {
        selector: {
            id: 'mainUserInput',
            viewName: 'test.Sample.view.Main'
        }
    };

    const dateTimeSelector = {
        selector: {
            id: 'idDateTime',
            viewName: 'test.Sample.view.Main'
        }
    };

    const listSelector = {
        selector: {
            id: 'PeopleList',
            viewName: 'test.Sample.view.Other'
        }
    };

    const checkboxSelector = {
        selector: {
            id: 'idCheckbox',
            viewName: 'test.Sample.view.Main'
        }
    };

    before(() => {
        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            buttonSelector.forceSelect = true;
            buttonSelector.selector.interaction = 'root';
            inuputSelector.forceSelect = true;
            inuputSelector.selector.interaction = 'root';
            dateTimeSelector.forceSelect = true;
            dateTimeSelector.selector.interaction = 'root';
            listSelector.forceSelect = true;
            listSelector.selector.interaction = 'root';
            checkboxSelector.forceSelect = true;
            checkboxSelector.selector.interaction = 'root';
        }

        Main.open();
    });

    beforeEach(() => {
        wdi5().getUtils().takeScreenshot('test-ui5');
    });

    afterEach(() => {
        wdi5().getUtils().takeScreenshot('test-ui5');
    });

    it('navigation button w/ text exists', () => {
        expect(browser.asControl(buttonSelector).getProperty('text')).toEqual('to Other view');
    });

    it('getProperty("text") and getText() are equivalent', () => {
        expect(browser.asControl(buttonSelector).getProperty('text')).toEqual(
            browser.asControl(buttonSelector).getText()
        );
    });

    it('sets the property of a control successfully', () => {
        const oButton = browser.asControl(buttonSelector);
        oButton.setProperty('text', 'new button text');

        expect(oButton.getText()).toEqual('new button text');
    });

    it('ui5 input method test', () => {
        const input = browser.asControl(inuputSelector);

        // text
        const inputText = 'the mighty text';
        input.setValue(inputText);
        const sTextProperty = input.getProperty('value');
        expect(input.getValue()).toEqual(sTextProperty);
        expect(input.getValue()).toEqual(inputText);

        // status enabled
        expect(input.getEnabled()).toBeTruthy();
        input.setEnabled(false);
        expect(input.getEnabled()).toBeFalsy();
        input.setEnabled(true);

        // status editable
        expect(input.getEditable()).toBeTruthy();
        input.setEditable(false);
        expect(input.getEditable()).toBeFalsy();
    });

    it('ui5 button method test', () => {
        const button = browser.asControl(buttonSelector);

        // text
        const buttonText = 'the mighty text';
        button.setText(buttonText);
        const retrievedButtonText = button.getText();
        expect(retrievedButtonText).toEqual(button.getProperty('text'));
        expect(retrievedButtonText).toEqual(buttonText);

        // status
        let result = button.getEnabled();
        expect(result).toBeTruthy();
        button.setEnabled(false);
        result = button.getEnabled();
        expect(result).toBeFalsy();
    });

    it('ui5 checkbox method test', () => {
        const checkbox = browser.asControl(checkboxSelector);

        // select
        checkbox.setSelected(true);
        expect(checkbox.getPartiallySelected()).toBeFalsy();
        expect(checkbox.getSelected()).toBeTruthy();
        checkbox.setPartiallySelected(true);
        expect(checkbox.getPartiallySelected()).toBeTruthy();

        // status
        expect(checkbox.getEnabled()).toBeTruthy();
        checkbox.setEnabled(false);
        expect(checkbox.getEnabled()).toBeFalsy();
    });

    it('ui5 dateTime method test', () => {
        const dateTimeField = browser.asControl(dateTimeSelector);

        // datetime input
        const date = new Date();
        dateTimeField.setValue(date);
        const value = dateTimeField.getValue();
        expect(value).toEqual(date.toISOString());

        // status
        expect(dateTimeField.getEnabled()).toBeTruthy();
        dateTimeField.setEnabled(false);
        expect(dateTimeField.getEnabled()).toBeFalsy();
    });

    // navigat to other view
    it('control ui5 button event test', () => {
        const oButton = browser.asControl(buttonSelector);
        oButton.firePress();
    });

    it('ui5 control list getProperty works for header', () => {
        expect(browser.asControl(listSelector).getProperty('headerText')).toEqual('...bites the dust!');
    });

    it('control id retrieval methods are equivalent', () => {
        const list = browser.asControl(listSelector);
        const listId = list.getId();
        expect(listId).toContain('PeopleList');

        expect(list.getAggregation('items').length).toEqual(list.getItems().length);
    });

    it('list method test', () => {
        const list = browser.asControl(listSelector);

        const listMode = list.getMode();
        const activeItem = list.getActiveItem();
        const isBusy = list.getBusy();

        // returns the wdi5 representation of the list
        // TODO: implement getModel and getBinding to return some more fitting value
        const model = list.getModel();
        const binding = list.getBinding('items');

        expect(listMode).toEqual('None');
        expect(activeItem).toBeFalsy();
        expect(isBusy).toBeFalsy();
        expect(model).toBeDefined();
        expect(binding).toBeDefined();
    });
});
