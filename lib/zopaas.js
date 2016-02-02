var http = require('http');
var fs = require('fs');
var shelljs = require('shelljs');

var zopaas = {
  runZopfli: function(url, options, cb) {

    var data  = {
      date: new Date().toString(),
      url: url,
      options: options,
    }

    zopaas.getFile(url, function(err, res) {

      cb(null, data);
    });

  },
  getFile: function(url, cb) {
    // var maxSize = 10485760;
    var filename = url.split('/');
    filename = filename[filename.length -1];

    var file = fs.createWriteStream(filename);
    var request = http.get(url, function(response) {
      response.pipe(file);
      file.on('close', function() {
        console.log('Got ', url)
        // file.close(cb);  // close() is async, call cb after close completes.

        shelljs.exec('/home/santiago/soft/./zopfli ' + filename, function(code, output) {
          console.log('Exit code:', code);
          console.log('Program output:', output);
          cb(null, 'done');
        });


      });
    });




  }

}
module.exports = zopaas.runZopfli;