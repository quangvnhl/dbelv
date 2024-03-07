const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://cukinacha:SMfIkhwpVg54GBnj@cluster0.b9x0pn0.mongodb.net/?retryWrites=true&w=majority";
// const uri = "mongodb://127.0.0.1:27017"
const dbCollHome = "homenew"
const dbCollBill = "billnew"

const axios = require('axios'); 
const moment = require('moment');

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render("index", {
    text : "INDEX"
  });
})

app.get('/GetName', (req, res) => {
    //console.log(req.query.name)
    const client = new MongoClient(uri);
    async function run() {
    try {
        
        // Get the database and collection on which to run the operation
        const database = client.db("dbelv");
        const homes = database.collection(dbCollHome);
        // Query for a movie that has the title 'The Room'
        const query = {};
        if(req.query.searchType == "room")
            query.room = {'$regex' : req.query.room, '$options' : 'i'};
        else
            query.name = {'$regex' : req.query.name, '$options' : 'i'};
        
        // Execute query 
        const persons = homes.find(query);
        // Print a message if no documents were found
        if ((await homes.countDocuments(query)) === 0) {
            console.log("No documents found!");
        }
        // Print returned documents
        const array_person = []
        for await (const person of persons) {
            // console.dir(person);
            array_person.push(person)
        }
        await res.send(array_person)
        
    } finally {
        await client.close();
    }
    }
    run().catch(console.dir);
})

app.get('/Count', function(req, res){
    //addFieldYear();
    //res.send("addfieldyear")
    res.render('count');
})

app.get('/Stats', (req, res) => {
    const client = new MongoClient(uri);
    async function run() {
    try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("dbelv");
        const homes = database.collection(dbCollHome);
        const bills = database.collection(dbCollBill);
        const settings = database.collection("settings");

        const countDocHome = await homes.countDocuments();
        const countDocBill = await bills.countDocuments();
        const settingLastUpdate = await settings.findOne({name: "countup"});
        // console.log("setting find one: ", settingLastUpdate.last_url);

        res.render('stats',{
            homeCount : countDocHome,
            billCount : countDocBill,
            lastUpdateTime : moment(settingLastUpdate.lastupdate).format("HH:mm:ss DD/MM/YYYY"),
            lastUpdateLink : settingLastUpdate.last_url
        });
        

    } finally {
        // Close the MongoDB client connection
        await client.close();
    }
    }
    // Run the function and handle any errors
    run().catch(console.dir);
})

app.get('/Logs', (req, res) => {
    const client = new MongoClient(uri);
    async function run() {
    try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("dbelv");
        const logs = database.collection("logs");

        const getLogs = logs.find({}).sort({time: -1}).limit(100);
        var logData = [];
        for await (const log of getLogs) {
            logData.push({
                name : log.name,
                time : moment(log.time).format("HH:mm:ss DD/MM/YYYY"),
                status : log.status,
                content : log.content
            })
        }
        res.render('log',{
            logData : logData
        });
        // console.log("logs: ", getLogs);

        // res.render('stats',{
        //     homeCount : countDocHome,
        //     billCount : countDocBill,
        //     lastUpdateTime : new Date(settingLastUpdate.lastupdate).toLocaleDateString("en-US"),
        //     lastUpdateLink : settingLastUpdate.last_url
        // });
        

    } finally {
        // Close the MongoDB client connection
        await client.close();
    }
    }
    // Run the function and handle any errors
    run().catch(console.dir);
})

app.get('/Home/:room', (req, res) => {
    const roomParam = req.params.room.split('-');
    
    if(roomParam[1]){
        const client = new MongoClient(uri);
        async function run() {
        try {
            // Connect to the "insertDB" database and access its "haiku" collection
            const database = client.db("dbelv");
            const home = database.collection(dbCollHome);
            const bill = database.collection(dbCollBill);

            const query = {
                room: roomParam[0],
                building: roomParam[1]
            };

            const getHomes = home.find(query);

            var homeData = [];
            for await (const home of getHomes) {
                homeData.push(home)
            }

            const getBills = bill.find(query);
            var billData = [];
            for await (const bill of getBills) {
                billData.push(bill)
                // console.log(bill.content)
            }

            res.render('home',{
                homeData : homeData,
                billData : billData,
                params: req.params
            });
            

        } finally {
            // Close the MongoDB client connection
            await client.close();
        }
        }
        // Run the function and handle any errors
        run().catch(console.dir);
    }
    else{
        res.send("Không đúng định dạng")
    }
})

app.get('/CountUp', function(req, res){
    const client = new MongoClient(uri);
    const dataResponse = {};
    const dataLog = {};
    // res.setHeader('content-type', 'text/plain');
    res.type('json');
    getCountNext(client, function(next, countupnext){
        console.log(next);
        getDataURL(next, function(data){
            const dataUpdate = {last_url:next, session_countup_from:countupnext};
            dataLog.content = next; // log content
            dbUpdateCountUpSetting(dataUpdate);
            console.log(data)
            if(data.khachhang){
                console.log("get url co du lieu")
                const query = {name: data.khachhang, building: data.building, room: data.room};
                
                console.log("query check: ", query);
                
                dbGetHome(query, function(count){
                    const dataRecord = query;
                    dataRecord.invoice = data.sobangke;
                    dataResponse.query = dataRecord;
                    dataResponse.time = new Date().getTime();

                    if(count==0){
                        console.log("them du lieu")
                        dataResponse.statusAction = "ADD"
                        dataLog.status = "ADD"
                        query.year = data.invoicedate
                        dbInsertHome(query);
                        dbInsertLog(dataLog);
                        res.send(dataResponse)
                    }
                    else{
                        dataResponse.statusAction = "SKIP"
                        dataLog.status = "SKIP"
                        dbInsertLog(dataLog);
                        res.send(dataResponse)
                    }
                    
                    //res.render("pages/GetDB", {countup: next});
                });

                // INSERT BILL HERE
                const bill = {}
                bill.name = data.khachhang;
                bill.building = data.building;
                bill.room = data.room;
                bill.invoice_number = data.sobangke;
                bill.invoice_date = data.invoicedate;
                bill.total_money_month = data.tongphatsinhthang;
                bill.service_fee = data.phidichvu;
                bill.debt_previous_period = data.nokytruoc;
                bill.water_fee = "";
                bill.water_use = "";
                dbInsertBill(bill);
                
            }
            else{
                console.log("ko co du lieu")
                dataResponse.statusAction = "NO DATA"
                dataLog.status = "NO DATA"
                dbInsertLog(dataLog);
                res.send(dataResponse)
                //res.render("pages/GetDB", {countup: next});
            }
            

        });
        
    });
    // res.render("pages/GetDB", {countup: numberCountNext});
     
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})



// FUNCTIONS
function dbInsertBill(data){
    const client = new MongoClient(uri);
    async function run() {
    try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("dbelv");
        
        const bills = database.collection(dbCollBill);

        // INSERT LOG
        const insertBill = await bills.insertOne(data);
        console.log("Insert Bill => ", insertBill)

    } finally {
        // Close the MongoDB client connection
        await client.close();
    }
    }
    // Run the function and handle any errors
    run().catch(console.dir);
}


function dbInsertLog(data){
    const client = new MongoClient(uri);
    async function run() {
    try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("dbelv");
        
        const logs = database.collection("logs");

        // INSERT LOG
        const insertLog = await logs.insertOne({
            name : "bill",
            status : data.status,
            content : data.content,
            time: new Date().getTime()
        });
        console.log("Insert Log => ", insertLog)

    } finally {
        // Close the MongoDB client connection
        await client.close();
    }
    }
    // Run the function and handle any errors
    run().catch(console.dir);
}

function dbUpdateCountUpSetting(data){
    const client = new MongoClient(uri);
    async function run() {
    try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("dbelv");
        const settings = database.collection("settings");
        data.lastupdate = new Date().getTime();
        
        const updateResult = await settings.updateOne({ name: "countup" }, { $set: data });
        console.log('Updated documents =>', updateResult);

       

    } finally {
        // Close the MongoDB client connection
        await client.close();
    }
    }
    // Run the function and handle any errors
    run().catch(console.dir);
}

function dbInsertHome(data){
    console.log(data)
    const client = new MongoClient(uri);
    async function run() {
    try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("dbelv");
        const home = database.collection(dbCollHome);
        
        // Insert the defined document into the "haiku" collection
        const result = await home.insertOne(data);
        // Print the ID of the inserted document
        console.log(`A document was inserted with the _id: ${result.insertedId}`);
    } finally {
        // Close the MongoDB client connection
        await client.close();
    }
    }
    // Run the function and handle any errors
    run().catch(console.dir);
}

function dbGetHome(data, callback){
    // const count = 0;
    const client = new MongoClient(uri);
    async function run() {
    try {
        // Connect to the "insertDB" database and access its "haiku" collection
        const database = client.db("dbelv");
        const home = database.collection(dbCollHome);
        
                    
        // Execute query 
        const findResult = await home.find(data).toArray();

        callback(findResult.length);
                //    count = findResult.length;

    } finally {
        // Close the MongoDB client connection
        await client.close();
    }
    }
    // Run the function and handle any errors
    run().catch(console.dir);

    // await count;
    // await return count;
}


function taskCountUp(res, fn_GetCountNext, fn_GetDataUrl){

}

function addDataHome(){
    const client = new MongoClient(uri);
    async function run() {
        try {
          const database = client.db('dbelv');
          const settings = database.collection('settings');
          // Query for a movie that has the title 'Back to the Future'
          const query = { name: 'countup' };
          const countup = await settings.findOne(query);
          const numberCountUpFrom = parseInt(countup.session_countup_from);
          const numberCountNext = numberCountUpFrom + 1;
          console.log(numberCountNext);
          const URLGetCountNext = countup.curl+'00'+String(numberCountNext);
          console.log(URLGetCountNext);
          callback(URLGetCountNext);
        } finally {
          // Ensures that the client will close when you finish/error
          
          await client.close();
        }
      }
      run().catch(console.dir);
}

function getCountNext(client, callback){
    async function run() {
        try {
          const database = client.db('dbelv');
          const settings = database.collection('settings');
          // Query for a movie that has the title 'Back to the Future'
          const query = { name: 'countup' };
          const countup = await settings.findOne(query);
          const numberCountUpFrom = parseInt(countup.session_countup_from);
          const numberCountNext = numberCountUpFrom + 1;
          console.log(numberCountNext);
          const URLGetCountNext = countup.curl+'00'+String(numberCountNext);
          console.log(URLGetCountNext);
          callback(URLGetCountNext, '00'+String(numberCountNext));
        } finally {
          // Ensures that the client will close when you finish/error
          
          await client.close();
        }
      }
      run().catch(console.dir);
}

function getDataURL(url, callback){
    const testURL = "https://bdcadmin.s-tech.info/admin/bill/detail/HDELV_0010674";
    const invoice_number = url.split('/');
    console.log(invoice_number[invoice_number.length - 1])
    axios.get(url)
  .then(function (response) {
    // handle success
    const data = {};
    const valid = false;
    if(response.status == 200){
        const split_khachhang = response.data.split("Khách Hàng: ");
        // console.log(split_khachhang)
        if(split_khachhang.length > 1){
            const khachhang = split_khachhang[1].split("</");
            // console.log(khachhang[0]);

            const split_canho = response.data.split("Căn hộ: ");
            const canho = split_canho[1].split("</");
            // console.log(canho[0]);

            const detail_canho = canho[0].split("-");

            const split_invoicenumber = response.data.split("Số bảng kê: ");
            const invoice_number = split_invoicenumber[1].split("</");

            const split_invoicedate = response.data.split("Ngày: ");
            const invoice_date = split_invoicedate[1].split("</");


            const split_totalrow = response.data.split("Tổng Cộng");
            const totalrow = split_totalrow[1].split("</tr");

            const split_totalrow_strong = totalrow[0].split(' </strong');
            // console.log(split_totalrow_strong[3])

            // const split_totalmoneymonth = [];
            // console.log(split_totalrow_strong[3].split('<strong> '))
            // if( typeof(split_totalrow_strong[3]) != "undefined" )
                const split_totalmoneymonth = split_totalrow_strong[3].split('<strong> ');
            

            // const split_previousperioddebt = []
            // if( typeof(split_totalrow_strong[2]) != "undefined" )
            const split_previousperioddebt = split_totalrow_strong[2].split('<strong> ');

            const split_servicerow = response.data.split("Phí dịch vụ");


            var phidichvu = "";
            
            // console.log( split_servicerow[1] )
            var servicerow = [];
            if( typeof(split_servicerow[1]) != "undefined" )
                servicerow = split_servicerow[1].split("</tr");

            // console.log(servicerow.length)
            var split_servicerow_strong = [];
            if(servicerow.length)
                split_servicerow_strong = servicerow[0].split(' </strong');

            var split_servicefee = []
            if( typeof(split_servicerow_strong[2]) != "undefined" ){
                split_servicefee = split_servicerow_strong[2].split('<strong>')
                phidichvu = split_servicefee[1]
            }

            // console.log(split_previousperioddebt[1]);

            data.khachhang = khachhang[0];
            data.nokytruoc = split_previousperioddebt[1] ? split_previousperioddebt[1] : "";
            data.phidichvu = phidichvu;
            data.tongphatsinhthang = split_totalmoneymonth[1] ? split_totalmoneymonth[1] : "";
            data.sobangke = invoice_number[0];
            data.invoicedate = invoice_date[0];
            data.building = detail_canho[1] ? detail_canho[1] : "";
            data.room = detail_canho[0];
        }
        

        

        // console.log(data)
    }
    callback(data);
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  })
  .finally(function () {
    // always executed
  });
}
