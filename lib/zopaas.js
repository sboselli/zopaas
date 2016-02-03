var http = require('http');
var fs = require('fs');
var path = require('path');
var shelljs = require('shelljs');
var debug = require('debug')('zopaas:zopaas');

var zopaas = {
  runZopfli: function(url, options, cb) {
    if (global.dbg) debug('=> runZopfli() :: Started');

    var data  = {
      date: new Date().toString(),
      url: url,
      options: options,
    }

    zopaas.getFile(url, function(err, fileName) {
      zopaas.compressFile(fileName, function(err, compressedFile) {
        cb(null, compressedFile);
        if (global.dbg) debug('=> runZopfli() :: Done');
      });
    });

  },
  getFile: function(url, cb) {
    // var maxSize = 10485760;
    if (global.dbg) debug('=> runZopfli() => getFile() :: ' + url);
    // Get filename
    var fileName = url.split('/');
    fileName = fileName[fileName.length -1];

    // Get file
    shelljs.cd(path.join(global.rootDir, 'files/download/'));
    var file = fs.createWriteStream(fileName);
    var request = http.get(url, function(response) {
      response.pipe(file);
      file.on('close', function() {
        if (global.dbg) debug('=> runZopfli() => getFile() :: Done');
        cb(null, fileName);
      });
    });
  },
  compressFile: function(fileName, cb) {
    if (global.dbg) debug('=> runZopfli() => compressFile() :: ' + fileName);

    var response = {};

    shelljs.cd(path.join(global.rootDir, 'files/download/'));
    shelljs.exec('/home/santiago/soft/zopfli/./zopfli ' + fileName, function(code, output) {
      if (code === 0) {
        shelljs.mv('-f', fileName+'.gz', path.join(global.rootDir, 'public/output/'));

        if (global.dbg) debug('=> runZopfli() => compressFile() :: Done');

        // Get size data and comp ratio
        zopaas.getSizes(fileName, function(err, sizeData) {
          // Assemble response
          response.url = 'output/' + fileName+'.gz';
          response.sizeOriginal = sizeData.sizeOriginal;
          response.sizeCompressed = sizeData.sizeCompressed;
          response.percentage = sizeData.percentage;

          // Start the unravel..
          cb(null, response);
        });

      } else {
        console.log('Something went wrong.');
        shelljs.cd('../..');
        cb('Error: ' + output);
      }

    });
  },
  getSizes: function(fileName, cb) {
    if (global.dbg) debug('=> runZopfli() => getSizes() :: ' + fileName);
    var sizeData = {}

    // Get original size
    shelljs.exec('stat -c "%s" ' + path.join(global.rootDir, 'files/download/') + fileName, {silent:true}, function(code, output) {
      if (code === 0) {
        // Save size orig and strip new line
        sizeData.sizeOriginal = output.replace(/(\r\n|\n|\r)/gm,"");

        // Get compressed size
        shelljs.exec('stat -c "%s" ' + path.join(global.rootDir, 'public/output/') + fileName + '.gz', {silent:true}, function(code, output) {
          if (code === 0) {
            // Save size compressed and strip new line
            sizeData.sizeCompressed = output.replace(/(\r\n|\n|\r)/gm,"");

            // Calculate compression percentage
            sizeData.percentage = Math.round(sizeData.sizeCompressed * 100 / sizeData.sizeOriginal);
            sizeData.percentage.toFixed(4);

            if (global.dbg) debug('=> runZopfli() => getSizes() :: Done');

            cb(null, sizeData);

          } else {
            cb('Something went wrong in getSizes()(2)');
          }
        });

      } else {
        cb('Something went wrong in getSizes()(1)');
      }

    });
  }
}
module.exports = zopaas.runZopfli;