

var http = require('http');
var path = require('path');
var util = require('./util');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var bodyParser = require('body-parser');
//
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
          res.statusCode = 500;
    		  return res.send('Internal error');
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
    var search_usernumber = req.params.usernumber;
    var search_password = req.query.password;
    // find each ActiveUser with a usernamer :testUserNamber
      var query = ActiveUsers.findOne({ usernumber: search_usernumber,password: search_password});
      // execute the query at a later time
      query.exec(function (err, user) {
        if(err){
          res.statusCode = 404;
        }else{
          if(user===null){
             res.statusCode = 404;
             return res.send('No user created with usernamber '+search_usernumber);
          }else{
            res.statusCode = 200;
             return res.send(JSON.stringify(user));
          }
        }
      });
      
   
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});