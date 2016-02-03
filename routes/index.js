var express = require('express');
var zopaas = require('../lib/zopaas');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  res.send('OK');
});

router.post('/', function(req, res, next) {
  var url = req.body.url;
  var options = {};
  options.iterations = req.body.iterations || 15;
  options.output = req.body.output || 'gzip';

  zopaas(url, options, function(err, data) {
    if (!err) {
      data.url = 'http://' + req.headers.host + '/' + data.url;
      res.send(data);
    } else {
      res.send(err);
    }
  });

});

module.exports = router;
