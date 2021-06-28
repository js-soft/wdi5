const wdi5 = require('wdi5');

describe('hash-based nav', () => {
    it('should allow the deep entry to "Other" view using the Utils and the UI5 router', async () => {
        const oRouteOptions = {
            sComponentId: 'container-Sample',
            sName: 'RouteOther'
        };
        await wdi5().getUtils().goTo('', oRouteOptions);

        const listSelector = {
            selector: {
                id: 'PeopleList',
                viewName: 'test.Sample.view.Other'
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            listSelector.forceSelect = true;
            listSelector.selector.interaction = 'root';
        }

        const items = await (await browser.asControl(listSelector)).getAggregation('items');
        expect(items.length).toEqual(9);
    });

    it('should navigate to Main view via #/', async () => {
        await wdi5().getUtils().goTo('#/');

        const buttonSelector = {
            selector: {
                id: 'NavFwdButton',
                viewName: 'test.Sample.view.Main'
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            buttonSelector.forceSelect = true;
            // buttonSelector.selector.interaction = 'root';
        }

        expect(await (await browser.asControl(buttonSelector)).getProperty('visible')).toBeTruthy();
    });

    it('should allow the deep entry to "Other" view via the UI5 router directly', async () => {
        const oRouteOptions = {
            sComponentId: 'container-Sample',
            sName: 'RouteOther'
        };
        await browser.goTo({oRoute: oRouteOptions});

        const listSelector = {
            selector: {
                id: 'PeopleList',
                viewName: 'test.Sample.view.Other'
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            listSelector.forceSelect = true;
            listSelector.selector.interaction = 'root';
        }

        const list = await browser.asControl(listSelector);
        expect(await list.getVisible()).toBeTruthy();
    });
});
