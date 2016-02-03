var http = require('http');
var fs = require('fs');
var path = require('path');
var shelljs = require('shelljs');
var config = require('../config/config.js');
var debug = require('debug')('zopaas:zopaas');

var zopaas = {
  runZopfli: function(url, options, cb) {
    if (global.dbg) debug('=> runZopfli() :: Started');

    var response = {};
    response.timeElapsed = new Date();

    // Get file
    zopaas.getFile(url, function(err, fileName) {
      if (!err) {
        // Compress file
        zopaas.compressFile(fileName, options, function(err, compressedFile) {
          if (!err) {
            // Get size data and comp ratio
            zopaas.getSizes(compressedFile, function(err, sizeData) {
              if (!err) {
                // Assemble response
                response.url = 'output/' + compressedFile;
                response.sizeOriginal = sizeData.sizeOriginal;
                response.sizeCompressed = sizeData.sizeCompressed;
                response.percentage = sizeData.percentage;
                response.timeElapsed = (new Date() - response.timeElapsed) + 'ms';

                // Done !
                if (global.dbg) debug('=> runZopfli() :: Done');
                cb(null, response);
              } else {
                if (global.dbg) debug('=> runZopfli()(3) :: ' + err.message);
                cb(err, null);
                return false;
              }
            });
          } else {
            if (global.dbg) debug('=> runZopfli()(2) :: ' + err.message);
            cb(err, null);
            return false;
          }
        });
      } else {
        if (global.dbg) debug('=> runZopfli()(1) :: ' + err.message);
        cb(err, null);
        return false;
      }
    });
  },
  getFile: function(url, cb) {
    if (global.dbg) debug('=> runZopfli() => getFile() :: ' + url);
    var size = 0;
    var fileTooLarge = false;
    var timeExpired = false;
    var done = false;

    // Get filename
    var fileName = url.split('/');
    fileName = fileName[fileName.length -1];

    // Get file
    shelljs.cd(path.join(global.rootDir, 'files/download/'));
    var file = fs.createWriteStream(fileName);
    var reqFile = http.get(url, function(response) {

      // Setup timeout
      var timeoutHandle = setTimeout( function(){
        if (done === false) {
          timeExpired = true;
          cb({message:'Error: Timeout expired'}, null);
          reqFile.abort();
          return false;
        }
      }, config.requestTimeout );

      // On data check we are within the permitted maxSourceFileSize
      response.on('data', function(data) {
        size += data.length;
        if (size > config.maxSourceFileSize) {
          reqFile.abort();
          fileTooLarge = true;
        }
      });

      // Pipe to file, handle close & error
      response.pipe(file);
      file.on('close', function() {
        if (!timeExpired) {
          if (fileTooLarge) {
            // File too large
            if (global.dbg) debug('=> runZopfli() => getFile() :: Error: Source file too large.');
            done = true;
            cb({ message: 'Error: Source file too large.' }, null);
          } else {
            // Done OK
            if (global.dbg) debug('=> runZopfli() => getFile() :: Done');
            done = true;
            cb(null, fileName);
          }
        }
      }).on('error', function (err) {
        if (fileTooLarge) {
          if (global.dbg) debug('=> runZopfli() => getFile() :: Error: Source file too large.');
          done = true;
          cb({ message: 'Error: Source file too large.' }, null);
          return false;
        } else {
          if (global.dbg) debug('=> runZopfli() => getFile() :: Error: ' + err.message);
          done = true;
          cb(err, null);
          return false;
        }
      });
    });
  },
  compressFile: function(fileName, options, cb) {
    if (global.dbg) debug('=> runZopfli() => compressFile() :: ' + fileName);

    // Parse options
    var iterations = typeof options.iterations == 'number' &&
                       options.iterations < config.maxIterations &&
                       options.iterations > 5 ?
                          options.iterations : config.defaultIterations;
    var iterations_string = '--i' + iterations + ' ';

    var output = '';
    var extension = '';
    if (options.output == 'zlib') {
      output = '--zlib ';
      extension = '.zlib';
    } else if (options.output == 'deflate') {
      output = '--deflate ';
      extension = '.deflate';
    } else {
      output = '--gzip ';
      extension = '.gz';
    }

    shelljs.cd(path.join(global.rootDir, 'files/download/'));
    shelljs.exec('/home/santiago/soft/zopfli/./zopfli ' + iterations_string + output + fileName, function(code, output) {
      if (code === 0) {
        shelljs.mv('-f', fileName + extension, path.join(global.rootDir, 'public/output/'));
        if (global.dbg) debug('=> runZopfli() => compressFile() :: Done');

        cb(null, fileName + extension);

      } else {
        console.log('Something went wrong.');
        shelljs.cd('../..');
        cb('Error: ' + output, null);
      }

    });
  },
  getSizes: function(compressedFile, cb) {
    if (global.dbg) debug('=> runZopfli() => getSizes() :: ' + compressedFile);
    var sizeData = {}
    var fileNameArr = compressedFile.split('.');
    fileNameArr.pop();
    var fileName = fileNameArr.join('.');

    // Get original size
    shelljs.exec('stat -c "%s" ' + path.join(global.rootDir, 'files/download/') + fileName, {silent:true}, function(code, output) {
      if (code === 0) {
        // Save original size and strip new line
        sizeData.sizeOriginal = output.replace(/(\r\n|\n|\r)/gm,"");

        // Get compressed size
        shelljs.exec('stat -c "%s" ' + path.join(global.rootDir, 'public/output/') + compressedFile, {silent:true}, function(code, output) {
          if (code === 0) {
            // Save compressed size and strip new line
            sizeData.sizeCompressed = output.replace(/(\r\n|\n|\r)/gm,"");

            // Calculate compression percentage
            sizeData.percentage = Math.round(sizeData.sizeCompressed * 100 / sizeData.sizeOriginal);
            sizeData.percentage.toFixed(4);

            if (global.dbg) debug('=> runZopfli() => getSizes() :: Done');

            cb(null, sizeData);

          } else {
            cb('Something went wrong in getSizes()(2)', null);
          }
        });

      } else {
        cb('Something went wrong in getSizes()(1)', null);
      }

    });
  }
}
module.exports = zopaas.runZopfli;