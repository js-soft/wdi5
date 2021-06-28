const Page = require('./Page');

class Other extends Page {
    allNames = [
        'Nancy Davolio',
        'Andrew Fuller',
        'Janet Leverling',
        'Margaret Peacock',
        'Steven Buchanan',
        'Michael Suyama',
        'Robert King',
        'Laura Callahan',
        'Anne Dodsworth'
    ];
    _viewName = 'test.Sample.view.Other';

    open(accountId) {
        super.open(`#/Other`);
    }

    getList() {
        const listSelector = {
            wdio_ui5_key: 'PeopleList',
            selector: {
                id: 'PeopleList',
                viewName: this._viewName
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            listSelector.forceSelect = true;
            listSelector.selector.interaction = 'root';
        }

        return browser.asControl(listSelector);
    }

    getListItmes() {
        return this.getList().getAggregation('items');
    }
}

module.exports = new Other();
