const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const utils = require('util')
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer')
const hb = require('handlebars')
const readFile = utils.promisify(fs.readFile)

var bodyParser = require('body-parser')
const qrcode = require('qrcode');
const CryptoJS = require('crypto-js');


const encrypt = (text) => {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text));
};
const run = async (name, dni, pase, res) => {
    const text = 'Nombre: ' + name + "\nDNI: " + dni + "\nPase Sanitario: " + pase;
    const qrData = encrypt(text)
    const QR = await qrcode.toDataURL(qrData)
    const htmlContent = `
    <body style="
    margin: 0;
    padding: 0;
    ">
    <div style="
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, #89216B, #DA4453);
    ">
        <div style="
    display: flex;
    height: 500px;
    justify-content: center;
    align-items: center;
    ">
            <div>
                <img src="${QR}"
                    alt="qr" width="300" height="300">
            </div>
        </div>
        <div style="display: flex;justify-content: center;margin: 20px;">
            <form action="/pdf" method="post">
                <button type="submit" value="_42724506" name="name"
            style=" display: block;width: 200px;font-size: 20px; height: 50px; background-color: #1a8c57;border:
                    none;border-radius: 7px; color: #fff; margin-right: 10px;cursor:pointer">Descargar</button>
            </form>
            <form action="/inicio" method="post">
                <button type="submit" value="_42724506" name="name"
                    style="display:  block; width: 200px;font-size: 20px; height: 50px; background-color: #0d6efd;border: none;border-radius: 7px; color: #fff; margin-left: 10px; cursor:pointer">Inicio</button>
            </form>
        </div>
    </div>
</body>
    `;
    const htmlContentpdf = `
    <body style="
    margin: 0;
    padding: 0;
    ">
    <div style="
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background: linear-gradient(to right, #89216B, #DA4453);
    ">
        <div style="
    display: flex;
    height: 500px;
    justify-content: center;
    align-items: center;
    ">
            <div>
                <img src="${QR}"
                    alt="qr" width="300" height="300">
            </div>
        </div>
    </div>
</body>
    `;
    fs.writeFileSync('./public/ticket.html', htmlContent)
    fs.writeFileSync('./public/ticketpdf.html', htmlContentpdf)
    res.sendFile(path.join(__dirname + '/public/ticket.html'));
}
async function getTemplateHtml() {
    console.log("Loading template file in memory")
    try {
        const invoicePath = path.resolve("./public/ticketpdf.html");
        return await readFile(invoicePath, 'utf8');
    } catch (err) {
        return Promise.reject("Could not load html template");
    }
}
async function generatePdf(name) {
    let data = {};
    getTemplateHtml().then(async (res) => {
        // Now we have the html code of our template in res object
        // you can check by logging it on console
        // console.log(res)
        console.log("Compiing the template with handlebars")
        const template = hb.compile(res, { strict: true });
        // we have compile our code with handlebars
        const result = template(data);
        // We can use this to add dyamic data to our handlebas template at run time from database or API as per need. you can read the official doc to learn more https://handlebarsjs.com/
        const html = result;
        // we are using headless mode
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });
        const page = await browser.newPage()
        // We set the page content as the generated html by handlebars
        await page.setContent(html)
        // We use pdf function to generate the pdf in the same folder as this file.
        await page.pdf({ path: 'pdf/Entrada_TacaFest' + name + '.pdf', format: 'A5', printBackground: true})
        await browser.close();
        console.log("PDF Generated")
    }).catch(err => {
        console.error(err)
    });
}
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send(index.html)
})
app.post('/ticket', urlencodedParser, (req, res) => {
    var pase
    if (req.body.pase) {
        pase = "Entregado"
    } else {
        pase = "En puerta"
    }
    run(req.body.name, req.body.dni, pase, res)
})
app.post('/pdf', urlencodedParser, (req, res) => {
    generatePdf(req.body.name).then(() => {
        setTimeout(function () {
            res.download('pdf/Entrada_TacaFest' + req.body.name + '.pdf')
        }, 2000);
        fs.unlink('public/ticket.html', () => {
            fs.unlink('public/ticketpdf.html', () => {
            })
        })
    })

})
app.post('/inicio', urlencodedParser, (req, res) => {
    fs.unlink('pdf/Entrada_TacaFest' + req.body.name + '.pdf', () => {
        res.redirect("/")
    })

})
app.listen(port, () => {
    console.log(`Example app listening on port`)
})