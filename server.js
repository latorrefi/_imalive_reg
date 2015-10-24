//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
var util = require('./util');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var bodyParser = require('body-parser');
//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(bodyParser.json()); // support json encoded bodies
//router.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

router.post('/imalive/reg/activeusers',function(req, res) {
    var password = req.body.password;
    var result  = "";
    if(util.isValid(password)){
      //
      res.statusCode = 201;
      result = '{"number": "","password":'+password+'}';
    }else{
      res.statusCode = 400;
    }
    return res.send(result);
});


router.get('/imalive/reg/activeusers/:usernumber',function(req, res) {
    var usernumber = req.params.usernumber;
    res.statusCode = 404;
    return res.send('No user created with password '+usernumber);
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
