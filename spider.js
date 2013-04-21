var stylus = require('stylus'),
    fs = require('fs'),
    nib = require('nib'),
    jade = require('jade'),
    mkdirp = require("mkdirp"),
    generate = require('./lib/generate'),
    envConfig = require('./lib/config'),
    config = envConfig.appConfig;

// hardcoded config atm - move to configurable arguments object with these as defaults - mixins
//var details = __dirname +'/public/scripts/apidata/version/details.xml'; // only dojo exists
//var details = __dirname +'/public/scripts/apidata/version/details_dijit.xml'; // dijit/_WidgetBase good 1 to try
//var details = __dirn  ame +'/public/scripts/apidata/version/details_huge.xml'; // all mods
//var details = __dirname +'/public/scripts/apidata/version/details_all.xml'; // latest doc parse with all packs 
var details = __dirname + '/public/scripts/apidata/version/details.json'; // latest doc parse with all packs
/*
var config = {dojobase: 'scripts/dojo-release-1.8.3',
                        theme: 'claro',
                        version: '1.8_not_implemented_yet',
                        detailsFile: details,
                        staticfolder : __dirname + '/staticoutput/'
                     };
*/
/* config.generate='live' (default), config.generate='static' static html, maybe add template config e.g. mobile or flat structure e.g. non tab container */

// testing macro calls
// fails with static generation - todo: FOR SOME REASON I NEED TO USE A GLOBAL so it works???

convertType = generate.convertType;
autoHyperlink = generate.autoHyperlink;


function compile(str, path) {
    return stylus(str)
    .set('filename', path)
    .use(nib());
}

console.log("Static API viewer generation started");
// generate index  config.version config.staticfolder
var indexjade = __dirname + "/views/index.jade";
var data = fs.readFileSync(indexjade, "utf8");

var fn = jade.compile(data, {filename: indexjade, pretty: true});
var indexhtml = fn({ title : 'Home', config: config});
// generate modules
var staticFolder = process.cwd() + config.staticFolder;
mkdirp.sync(staticFolder);
fs.writeFileSync(staticFolder + "/index.html", indexhtml);
var starttime = new Date().getTime();
// get details json (so it can iterate over the objects, generate html and so it's also cached)
generate.loadDetails(config.detailsFile,  config.version, function (details) {
    var versionfolder = staticFolder + config.version + "/";
    Object.keys(details).forEach(function (item) {
        var itemlcl = details[item];
        var modulefile = itemlcl.location;
        generate.generate(config.detailsFile, modulefile, config, function (retObjectItem) {
            // modulefile.match(/[^/]* /); // move to regex
            var patharr = modulefile.split("/");

            var modname =  patharr.pop();
            if (patharr.length > 0) { // means a path - do this better
                if (!fs.existsSync(versionfolder + patharr.join("/"))) {
                    mkdirp.sync(versionfolder + patharr.join("/"));
                }
            }
            var modulejade = __dirname + "/views/module.jade";
            var data = fs.readFileSync(modulejade, "utf8");
            var fn = jade.compile(data, {filename: modulejade, pretty: true, autoHyperlink: autoHyperlink, convertType: convertType});
            var html = fn({ module : retObjectItem, config: config, autoHyperLink: autoHyperlink});
            fs.writeFileSync(versionfolder + patharr.join("/") + "/" + modname + ".html", html);
            console.log("wrote file " + versionfolder + modulefile);
        });
    });
});

process.on('exit', function () {
    console.log("elapsed time = " + (new Date().getTime() - starttime) + " ms");
});
// end generate modules

