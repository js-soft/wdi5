const wdi5 = require('wdi5');
const Main = require('./pageObjects/Main');

describe('ui5 plugin', () => {
    const viewName = 'test.Sample.view.Main';

    before(() => {
        Main.open();
    });

    it('test the mocked cordova barcodescanner plugin', async () => {
        // ui5
        const buttonSelector = {
            selector: {
                id: 'barcodescannerplugin',
                viewName: viewName
            }
        };

        const inputSelector = {
            selector: {
                id: 'barcodeValue',
                viewName: viewName
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            buttonSelector.forceSelect = true;
            buttonSelector.selector.interaction = 'root';
            inputSelector.forceSelect = true;
            inputSelector.selector.interaction = 'root';
        }

        const button = await browser.asControl(buttonSelector);
        // open the barcode scanner
        await button.firePress();

        const input = await browser.asControl(inputSelector);
        // the app function passes the scan into the model and bind to the input value
        // 123123 is as configured in the wdio.conf file
        expect(await input.getProperty('value')).toEqual('123-123-asd');
    });

    it('test the mocked cordova barcodescanner plugin with dynamic response', async () => {
        // set the dynamic reponse
        const res = {
            scanCode: '123-123-asd-dynamic',
            format: 'QrCode'
        };

        await wdi5().getCordovaMockPluginFactory().setPluginMockReponse('phonegap-plugin-barcodescanner', res);

        // ui5
        const buttonSelector = {
            selector: {
                id: 'barcodescannerplugin',
                viewName: viewName
            }
        };

        const inputSelector = {
            selector: {
                id: 'barcodeValue',
                viewName: viewName
            }
        };

        if ((await browser.getUI5VersionAsFloat()) <= 1.6) {
            buttonSelector.forceSelect = true;
            buttonSelector.selector.interaction = 'root';
            inputSelector.forceSelect = true;
            inputSelector.selector.interaction = 'root';
        }

        const button = await browser.asControl(buttonSelector);
        // open the barcode scanner
        await button.firePress();

        const input = await browser.asControl(inputSelector);
        // the app function passes the scan into the model and bind to the input value
        // 123123 is as configured in the wdio.conf file
        expect(await input.getProperty('value')).toEqual(res.scanCode);
    });
});
