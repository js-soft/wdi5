const fs = require('fs');
const path = require('path');

const selectorList = {
    forceSelect: true,
    selector: {
        id: 'versionList',
        controlType: 'sap.m.List',
        interaction: 'root'
    }
};

before(() => {
    const selectorCookieAccept = {
        selector: {
            id: '__button6',
            controlType: 'sap.m.Button'
        }
    };

    if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
        selectorCookieAccept.forceSelect = true;
        selectorCookieAccept.selector.interaction = 'root';
        selectorList.forceSelect = true;
        selectorList.selector.interaction = 'root';
    }

    if ((await browser.getUI5VersionAsFloat()) > 1.6) {
        const buttonCookieAccept = browser.asControl(selectorCookieAccept);
        buttonCookieAccept.firePress();
    }
});

describe('basics', () => {
    const selectorDownloadButton = {
        selector: {
            id: 'readMoreButton',
            controlType: 'sap.m.Button',
            viewName: 'sap.ui.documentation.sdk.view.Welcome'
        }
    };

    const selectorVersionButton = {
        selector: {
            id: 'changeVersionButton',
            controlType: 'sap.m.Button',
            viewName: 'sap.ui.documentation.sdk.view.App'
        }
    };

    const selectorVersionList = {
        forceSelect: true,
        selector: {
            id: 'versionList',
            controlType: 'sap.m.List',
            interaction: 'root'
        }
    };

    before(() => {
        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            selectorDownloadButton.forceSelect = true;
            selectorDownloadButton.selector.interaction = 'root';

            selectorVersionButton.forceSelect = true;
            selectorVersionButton.selector.interaction = 'root';

            selectorVersionList.forceSelect = true;
            selectorVersionList.selector.interaction = 'root';
        }
    });

    it('should not report an error on successful $control.focus()', () => {
        const focusResult = await(await browser.asControl(selectorVersionButton)).focus();
        expect(focusResult).toBeTruthy();

        // assert focus on element also via webdriver.io api
        const wdFocusResult = focusResult.getWebElement();
        expect(wdFocusResult.isFocused()).toBeTruthy();
    });

    it('should have the right title', () => {
        const title = browser.getTitle();

        if ((await browser.getUI5VersionAsFloat()) > 1.6) {
            expect(title).toEqual('Demo Kit - OPENUI5 SDK');
        } else {
            expect(title).toEqual('OpenUI5 SDK - Demo Kit v2.0');
        }
    });

    it('should find a ui5 control by id', () => {
        const controlDownloadButton = browser.asControl(selectorDownloadButton);
        expect(controlDownloadButton.getText()).toEqual('Download');
    });

    it('should get the parent control', () => {
        const controlVersionButton = browser.asControl(selectorVersionButton);
        const headerToolbar = controlVersionButton.getParent();

        expect(headerToolbar.getVisible()).toBeTruthy();
        expect(headerToolbar.getId()).toStrictEqual('sdk---app--headerToolbar');
    });

    it('should click a ui5 button (version selector) by id', () => {
        // open the version select dialog
        const controlVersionButton = browser.asControl(selectorVersionButton);
        controlVersionButton.firePress();

        // check for visibility
        const list = browser.asControl(selectorList);
        expect(list.getVisible()).toBeTruthy();

        browser.keys('Escape'); // close popup
    });

    it('should check the length of verison list without getting all subcontrols of aggregation', () => {
        // open the version select dialog
        const controlVersionButton = browser.asControl(selectorVersionButton);
        controlVersionButton.firePress();

        const list = browser.asControl(selectorVersionList);
        const numberOfItems = list.getItems(true).length; // new param

        // not closing because of minor trouble with ui5 when closing opening this popup
        // browser.keys('Escape'); // close popup

        // check for number
        expect(numberOfItems).toBeGreaterThanOrEqual(537); // V1.86.1
    });

    it('should retieve the second control of verison list without getting all subcontrols of aggregation', () => {
        // open the version select dialog
        const controlVersionButton = browser.asControl(selectorVersionButton);
        controlVersionButton.firePress();

        const list = browser.asControl(selectorVersionList);
        const item3 = list.getItems(3); // new param

        // not closing because of minor trouble with ui5 when closing opening this popup
        // browser.keys('Escape'); // close popup

        // check for number
        expect(parseFloat(item3.getTitle())).toBeGreaterThanOrEqual(parseFloat('1.85')); // once was v1.85.2
    });

    it('should find a control w/o id locator', () => {
        const selectorWithoutId = {
            selector: {
                viewName: 'sap.ui.documentation.sdk.view.Welcome',
                controlType: 'sap.m.Button',
                properties: {
                    text: 'Get Started with UI5'
                }
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            selectorWithoutId.forceSelect = true;
            selectorWithoutId.selector.interaction = 'root';
        }

        expect(browser.asControl(selectorWithoutId).getText()).toBe('Get Started with UI5');
    });

    it('should throw an error on unsuccessful $control.focus()', () => {
        expect(() => {
            browser.asControl({selector: {id: 'doesnt_exist'}}).focus();
        }).toThrow();
    });

    it('should navigate', () => {
        if ((await browser.getUI5VersionAsFloat()) > 1.6) {
            browser.setUrl('api/sap.m.Button');
            var header = browser.asControl({selector: {id: '__xmlview0--title'}});
        } else {
            browser.goTo('#/api/sap.m.Button');
            var header = browser.asControl({selector: {id: '__xmlview5--title'}});
        }

        expect(header.getVisible()).toBeTruthy();
    });

    it('should navigate via hash', () => {
        if ((await browser.getUI5VersionAsFloat()) > 1.6) {
            browser.goTo('#events/Summary');
            var eventsHeader = browser.asControl({selector: {id: '__xmlview0--events'}});
        } else {
            browser.goTo('events/Summary');
            var eventsHeader = browser.asControl({selector: {id: '__xmlview6--events'}});
        }
        expect(eventsHeader.getVisible()).toBeTruthy();
    });
});

describe('locate ui5 control via regex', () => {
    /**
     * click the version list button to open a popup on the sdk site
     * then close it via "esc" key
     * @param {String|RegExp} idRegex
     */
    function _assert(idRegex) {
        const selector = {
            forceSelect: true, // make sure we're retrieving from scratch
            selector: {
                id: idRegex
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            selector.forceSelect = true;
            selector.selector.interaction = 'root';
        }

        browser.asControl(selector).firePress();
        expect(browser.asControl(selectorList).getVisible()).toBeTruthy();

        browser.keys('Escape'); // close popup
    }
    it('plain regex /.../', () => {
        return _assert(/.*changeVersionButton$/);
    });

    it('plain regex + flags /.../gmi', () => {
        return _assert(/.*changeVersionButton$/gim);
    });
    it('new RegEx(/.../flags)', () => {
        return _assert(new RegExp(/.*changeVersionButton$/));
    });

    it('new RegEx(/.../flags)', () => {
        return _assert(new RegExp(/.*changeVersionButton$/gi));
    });

    it('new RegEx("string")', () => {
        return _assert(new RegExp('.*changeVersionButton$'));
    });

    it('new RegEx("string", "flags")', () => {
        return _assert(new RegExp('.*changeVersionButton$', 'gmi'));
    });

    it('regex shorthand matchers are handled properly', () => {
        return _assert(/.*change\w.*Button$/);
    });
});

describe('screenshots', () => {
    it('should validate screenshots capability', () => {
        browser.screenshot('ui5-sdk-page');

        // seed to wait some time until the screenshot is actually saved to the file system before reading it again
        setTimeout(() => {
            const screenShotPath = path.join('wdio-ui5-service', 'test', 'report', 'screenshots');
            const screenshots = fs.readdirSync(screenShotPath);
            const ours = screenshots.find((shot) => shot.match(/.*ui5-sdk-page.*/));
            expect(ours).toMatch(/.*ui5-sdk-page.*/);
        }, 1500);
    });

    it('should validate screenshots capability with unnamed screenshot', () => {
        browser.screenshot();

        // seed to wait some time until the screenshot is actually saved to the file system before reading it again
        setTimeout(() => {
            const screenShotPath = path.join('wdio-ui5-service', 'test', 'report', 'screenshots');
            const screenshots = fs.readdirSync(screenShotPath);
            const ours = screenshots.find((shot) => shot.match(/.*-browser-screenshot.png/));
            expect(ours).toMatch(/.*-browser-screenshot.png/);
        }, 1500);
    });
});
