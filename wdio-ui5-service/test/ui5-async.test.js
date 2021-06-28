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

before(async () => {
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
        const buttonCookieAccept = await browser.asControl(selectorCookieAccept);
        await buttonCookieAccept.firePress();
    }
});

describe('basics (async tests)', () => {
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

    before(async () => {
        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            selectorDownloadButton.forceSelect = true;
            selectorDownloadButton.selector.interaction = 'root';

            selectorVersionButton.forceSelect = true;
            selectorVersionButton.selector.interaction = 'root';

            selectorVersionList.forceSelect = true;
            selectorVersionList.selector.interaction = 'root';
        }
    });

    it('should not report an error on successful $control.focus()', async () => {
        const selectorVersionButtonControl = await browser.asControl(selectorVersionButton);
        const focusResult = await selectorVersionButtonControl.focus();
        expect(focusResult).toBeTruthy();

        // assert focus on element also via webdriver.io api
        const wdFocusResult = await focusResult.getWebElement();
        expect(await wdFocusResult.isFocused()).toBeTruthy();
    });

    it('should have the right title', async () => {
        const title = await browser.getTitle();

        if ((await browser.getUI5VersionAsFloat()) > 1.6) {
            expect(title).toEqual('Demo Kit - OPENUI5 SDK');
        } else {
            expect(title).toEqual('OpenUI5 SDK - Demo Kit v2.0');
        }
    });

    it('should find a ui5 control by id with async mehtod chaning', async () => {
        expect(await (await browser.asControl(selectorDownloadButton)).getText()).toEqual('Download');
    });

    it('should get the parent control', async () => {
        const controlVersionButton = await browser.asControl(selectorVersionButton);
        const headerToolbar = await controlVersionButton.getParent();

        expect(await headerToolbar.getVisible()).toBeTruthy();
        expect(await headerToolbar.getId()).toStrictEqual('sdk---app--headerToolbar');
    });

    it('should click a ui5 button (version selector) by id', async () => {
        // open the version select dialog
        const controlVersionButton = await browser.asControl(selectorVersionButton);
        await controlVersionButton.firePress();

        // check for visibility
        const list = await browser.asControl(selectorList);
        expect(await list.getVisible()).toBeTruthy();

        browser.keys('Escape'); // close popup
    });

    it('should check the length of verison list without getting all subcontrols of aggregation', async () => {
        // open the version select dialog
        const controlVersionButton = await browser.asControl(selectorVersionButton);
        await controlVersionButton.firePress();

        const list = await browser.asControl(selectorVersionList);
        const items = await list.getItems(true); // new param

        // not closing because of minor trouble with ui5 when closing opening this popup
        // browser.keys('Escape'); // close popup

        // check for number
        expect(items.length).toBeGreaterThanOrEqual(595); // V1.91.0
    });

    it('should retieve the second control of verison list without getting all subcontrols of aggregation', async () => {
        // open the version select dialog
        const controlVersionButton = await browser.asControl(selectorVersionButton);
        await controlVersionButton.firePress();

        const list = await browser.asControl(selectorVersionList);
        const item3 = await list.getItems(3); // new param

        // not closing because of minor trouble with ui5 when closing opening this popup
        // browser.keys('Escape'); // close popup

        // check for number
        const number = await item3.getTitle();
        expect(parseFloat(number)).toBeGreaterThanOrEqual(parseFloat('1.85')); // once was v1.85.2
    });

    it('should find a control w/o id locator', async () => {
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

        expect(await (await browser.asControl(selectorWithoutId)).getText()).toBe('Get Started with UI5');
    });

    it('should expect an not existing control to no have $control.focus', async () => {
        const noControl = await browser.asControl({selector: {id: 'doesnt_exist'}});
        expect(noControl.focus).toBeUndefined();
    });

    it('should navigate', async () => {
        if ((await browser.getUI5VersionAsFloat()) > 1.6) {
            await browser.setUrl('api/sap.m.Button');
            var header = await browser.asControl({
                selector: {id: 'title', viewName: 'sap.ui.documentation.sdk.view.SubApiDetail'}
            });
        } else {
            await browser.goTo('#/api/sap.m.Button');
            var header = await browser.asControl({selector: {id: '__xmlview5--title'}});
        }

        expect(await header.getVisible()).toBeTruthy();
    });

    it('should navigate via hash', async () => {
        if ((await browser.getUI5VersionAsFloat()) > 1.6) {
            await browser.goTo('#events/Summary');
            var eventsHeader = await browser.asControl({
                selector: {id: 'events', viewName: 'sap.ui.documentation.sdk.view.SubApiDetail'}
            });
        } else {
            await browser.goTo('events/Summary');
            var eventsHeader = await browser.asControl({selector: {id: '__xmlview6--events'}});
        }
        expect(await eventsHeader.getVisible()).toBeTruthy();
    });
});

describe('screenshots (async tests)', () => {
    it('should validate screenshots capability', async () => {
        await browser.screenshot('ui5-sdk-page');

        // seed to wait some time until the screenshot is actually saved to the file system before reading it again
        setTimeout(() => {
            const screenShotPath = path.join('wdio-ui5-service', 'test', 'report', 'screenshots');
            const screenshots = fs.readdirSync(screenShotPath);
            const ours = screenshots.find((shot) => shot.match(/.*ui5-sdk-page.*/));
            expect(ours).toMatch(/.*ui5-sdk-page.*/);
        }, 1500);
    });

    it('should validate screenshots capability with unnamed screenshot', async () => {
        await browser.screenshot();

        // seed to wait some time until the screenshot is actually saved to the file system before reading it again
        setTimeout(() => {
            const screenShotPath = path.join('wdio-ui5-service', 'test', 'report', 'screenshots');
            const screenshots = fs.readdirSync(screenShotPath);
            const ours = screenshots.find((shot) => shot.match(/.*-browser-screenshot.png/));
            expect(ours).toMatch(/.*-browser-screenshot.png/);
        }, 1500);
    });
});
