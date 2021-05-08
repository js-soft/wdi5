const wdi5 = require('wdi5');

describe('hash-based nav', () => {
    it('should allow the deep entry to "Other" view using the Utils and the UI5 router', () => {
        const oRouteOptions = {
            sComponentId: 'container-Sample',
            sName: 'RouteOther'
        };
        wdi5().getUtils().goTo('', oRouteOptions);

        const listSelector = {
            selector: {
                id: 'PeopleList',
                viewName: 'test.Sample.view.Other'
            }
        };

        if (parseFloat(browser.getUI5Version()) <= 1.6) {
            listSelector.forceSelect = true;
            listSelector.selector.interaction = 'root';
        }

        const items = browser.asControl(listSelector).getAggregation('items');
        expect(items.length).toEqual(9);
    });

    it('should navigate to Main view via #/', () => {
        wdi5().getUtils().goTo('#/');

        const buttonSelector = {
            selector: {
                id: 'NavFwdButton',
                viewName: 'test.Sample.view.Main'
            }
        };

        if (parseFloat(browser.getUI5Version()) <= 1.6) {
            buttonSelector.forceSelect = true;
            // buttonSelector.selector.interaction = 'root';
        }

        expect(browser.asControl(buttonSelector).getProperty('visible')).toBeTruthy();
    });

    it('should allow the deep entry to "Other" view via the UI5 router directly', () => {
        const oRouteOptions = {
            sComponentId: 'container-Sample',
            sName: 'RouteOther'
        };
        browser.goTo({oRoute: oRouteOptions});

        const listSelector = {
            selector: {
                id: 'PeopleList',
                viewName: 'test.Sample.view.Other'
            }
        };

        if (parseFloat(browser.getUI5Version()) <= 1.6) {
            listSelector.forceSelect = true;
            listSelector.selector.interaction = 'root';
        }

        const list = browser.asControl(listSelector);
        expect(list.getVisible()).toBeTruthy();
    });
});
