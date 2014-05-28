/** @module app */
var express = require('express'),
    fs = require('fs'),
    jade = require('jade'),
    mkdirp = require("mkdirp"),
    generate = require('./lib/generate'),
    config = require('./config'),
    refdoc = require('./lib/refdoc'),
    tree = require('./lib/tree');

console.log("started at " + new Date());
var versions = tree.getVersions(config, false);
var app = express();
app.use(express.compress());
// jade indenting
app.locals.pretty = true;

// macro calls
// fails with static generation - TODO: FOR SOME REASON I NEED TO USE A GLOBAL so it works???
app.locals.convertType = generate.convertType;
app.locals.autoHyperlink = generate.autoHyperlink;
app.locals.hasRefDoc = refdoc.hasRefDoc;
app.locals.getRefDoc = refdoc.getRefDoc;

app.set('views', __dirname + '/' + config.viewsDirectory);
app.set('view engine', 'jade');
config.runner = "app"; // set a flag to determine if we're running from the app server
if (config.isDebug === true) {
    app.use(express.logger('dev'));
}

app.use(config.contextPath, express.static(__dirname + '/public'));

app.get(config.contextPath, function (req, res) {
    if (config.isDebug === true) {
        console.log(new Date().toTimeString() + ", is xhr = " + req.xhr); // use this to determine if it's a permalink url or a module request url
    }
    res.render('index', { title : 'API Documentation' + config.siteName, config: config, module : null});
});

var re = new RegExp(config.moduleExtension + "$");

// apidata should be config - already used in dojoConfig // for module clicks
app.get(config.contextPath + '*', function (req, res, next) {
    // replace with regex
    if (config.isDebug === true) {
        console.log(new Date().toTimeString() + ", is xhr = " + req.xhr + ", requested = " + req.params.toString()); // use this to determine if it's a permalink url or a module request url
    }
    var requested = req.params.toString().replace(/\/$/, ""); // TODO - replace(/\/$/, ""); added, no time to look at but for example loading 1.6/dojo/Animation adds a trailing slash whilst 1.6/dojo/AdapterRegistry doesnt, something browser related? 
    var idxslash = requested.indexOf("/");
    var requestedVersion = requested.substring(0, idxslash);
    var modulefile = requested.slice(idxslash + 1);

    if (isNaN(requestedVersion)) {
        throw new Error("Version not understood - " + requestedVersion + ", " + new Date());
    }
    if (modulefile === "tree.html") {
        var treeitems = tree.getTree(requestedVersion, config);
        res.render('tree', { title : 'DOJO API Viewer', config: config, tree : treeitems, version: requestedVersion});
        return;
    }
    modulefile = modulefile.replace(re, ""); // replace the file extension
    // not sure if this is bad - handle versions earlier than 1.8 i.e. static html generated docs
	var lexicalVersions = requestedVersion.split('.');
    if (parseFloat(lexicalVersions[1]) < 8) { // not great but more than unlikely we'll use 3 dot separated versions
        // item.fullname.replace(/\./g, "/")
        var legacyfile = __dirname + '/public/api/' + requestedVersion + '/' + modulefile.replace(/\./g, "/") + '.html';
        res.sendfile(legacyfile); // could be a security issue here
        return;
    }
    var detailsFile = "./public/data/" + requestedVersion + "/details.json";
    generate.generate(detailsFile, modulefile, requestedVersion, function (err, retObjectItem) {
        if (err) {
            console.error(err);
            next();
        }
        else if (req.xhr) {
            res.render('module', { module : retObjectItem, config: config});
        } else { // permalink request
            res.render('index', {title : retObjectItem.location + config.siteName, config: config, module: retObjectItem});
        }
    });
});

app.listen(config.port);
console.log("API viewer started on port " + config.port);

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.send(500, "Sorry there's been an error, please check the logs");
});