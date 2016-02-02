var express = require('express');
var zopaas = require('../lib/zopaas');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  res.send('OK');
});

router.post('/', function(req, res, next) {
  console.log(req.body);
  var url = req.body.url;
  var options = {};
  options.iterations = req.body.iterations || 15;
  options.output = req.body.output || 'gzip';

  zopaas(url, options, function(err, data) {
    if (!err) {
      res.send(data);
    } else {
      res.send(err);
    }
  });

});


module.exports = router;
