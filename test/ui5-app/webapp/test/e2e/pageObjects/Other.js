const wdi5 = require("../../../../../../index")
const Page = require("./Page")

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
        super.open(`#/Other`)
    }

    getList() {
        const listSelector = {
            wdio_ui5_key: "PeopleList",
            selector: {
                id: 'PeopleList',
                viewName: this._viewName
            }
        };

        return browser.asControl(listSelector)
    }

    getListItmes() {
        return this.getList().getAggregation('items');
    }
}

module.exports = new Other()
