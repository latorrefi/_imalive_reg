
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

var ActiveUsers = require("mongoose/model/activeusers");

router.use(bodyParser.json()); // support json encoded bodies
//router.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

router.post('/imalive/reg/activeusers',function(req, res) {
    var password = req.body.password;
    var email = req.body.email;
    var user = {};
    user.password = password;
    user.email = email;
    var result  = "";
    if(util.isValid(user)){
      //Generate a new random Number of ten digit
      var testUserNumber = {};
      testUserNumber = Math.floor(1000000000 + Math.random() * 9000000000);
      // find each ActiveUser with a usernamer :testUserNamber
      var query = ActiveUsers.findOne({ usernumber: testUserNumber });
      // selecting the `name` and `occupation` fields
      query.select('usernumber');

      // execute the query at a later time
      query.exec(function (err, usernumber) {
        if (err){
          return 0;
        } 
        if(usernumber===null){
          var newActiveUser =  new ActiveUsers({usernumber:testUserNumber , password: user.password ,mail:user.email  });
          newActiveUser.save(function (err) {
            if (err) {
    		     res.statusCode = 500;
    		     return res.send('Internal error');
            }
            else  {
      	      res.statusCode = 201;
      	      return res.send('/imalive/reg/activeusers/'+testUserNumber);
            }
          });
        }
      });
    }else{
        res.statusCode = 400;
        return res.send('Invalid data');
    }
    
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