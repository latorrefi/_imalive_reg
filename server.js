

var http = require('http');
var path = require('path');
var util = require('./util');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var bodyParser = require('body-parser');
var q = require('q');



//
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

var mongoose = require('mongoose');
// q
mongoose.Promise = require('q').Promise;


mongoose.connection.close();
mongoose.connect('mongodb://guest:guest@ds043714.mongolab.com:43714/_imalive_reg_');


var ActiveUsers = require("mongoose/model/activeusers").ActiveUsers;
var UserNumbers = require("mongoose/model/usernumbers").UserNumbers;

router.use(bodyParser.json()); // support json encoded bodies
//router.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function() {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },

        break: function() {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}

function searchAndInsertUserNumber(toAnalyze, callback) {
    //INIT
    var query = UserNumbers.findOne({ usernumber: toAnalyze});
    // selecting the `name` and `occupation` fields
    query.select('usernumber');
    // execute the query at a later time
    query.exec(function (err, usernumber) {
        if (err){
          
        }
        if(usernumber===null){
          var number =  new UserNumbers({usernumber:toAnalyze});
          number.save(function (err) {
              if (err) {
                //KO
              }
              else{
                //OK
              }
            });
        }
    });
    //END
    callback();
}

router.post('/imalive/registeredusers/loadnumbers',function(req, res) {
  var usernumber_lenght = req.body.usernumber_lenght;
  var numbers = [];
  var i = 1;
  while(i<usernumber_lenght){
    //Generate a new random Number of ten digit
    var testUserNumber = {};
    testUserNumber = Math.floor(1000000000 + Math.random() * 9000000000);
    numbers.push(testUserNumber);
    i++;
  }
  asyncLoop(numbers.length, function(loop) {
    searchAndInsertUserNumber(numbers[loop.iteration()], function(result) {
        // Okay, for cycle could continue
        loop.next();
    })},
    function(){
                res.statusCode = 204;
                return res.send();}
  );
});

router.post('/imalive/registeredusers',function(req, res) {
    var password = req.body.password;
    var email = req.body.mail;
    var user = {};
    user.password = password;
    user.email = email;
    var created_user_number;
    if(util.isValid(user)){
    
      var query = UserNumbers.findOne({});
      // selecting the `name` and `occupation` fields
      query.select('usernumber');
      // execute the query at a later time
      var promiseCreateUserNumber = query.exec();
      promiseCreateUserNumber.then(function(newnumber) {
        created_user_number = newnumber.usernumber;
        return newnumber.remove();
        /*var deferred = q.defer();
        deferred.resolve(created_user_number);
        return deferred.promise;*/
      })
      .then(function(){
        console.log('User: ' + created_user_number);
        var newActiveUser =  new ActiveUsers({usernumber:created_user_number , password: user.password ,mail:user.email  });
        return newActiveUser.save();
      })
      .then(function(newActiveUser){
         res.statusCode = 201;
      	 res.setHeader("Access-Control-Allow-Origin", "https://imalive-reg-fe-ghiron.c9users.io");
      	 res.setHeader("Location", req.protocol + '://' + req.get('host') + req.originalUrl+'/'+newActiveUser.usernumber);
      	 res.setHeader("Content-Location", req.protocol + '://' + req.get('host') + req.originalUrl+'/'+newActiveUser.usernumber);
      	 res.setHeader("Content-Type", "application/json;charset=UTF-8");
      	 
      	 return res.send(JSON.stringify(newActiveUser));
      })
      .catch(function(err){
        // just need one of these
        console.log('error:', err);
        res.statusCode = 404;
        return res.send('Error 500');
      });
    }else{
        res.statusCode = 400;
        return res.send('Error 400');
    }
});


router.get('/imalive/registeredusers/:usernumber',function(req, res) {
    var search_usernumber = req.params.usernumber;
    var search_password = req.query.password;
    var promise =  ActiveUsers.findOne({ usernumber: search_usernumber,password: search_password}).exec();
    promise.then(function(user) {
      // do something with updated user
      if(user===null){
             res.statusCode = 404;
             return res.send('Error 600');
      }else{
          console.log('User: ' + user.usernumber);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json;charset=UTF-8");
          return res.send(JSON.stringify(user));
      }
    })
    .catch(function(err){
      // just need one of these
      console.log('error:', err);
      res.statusCode = 404;
      return res.send('Error 500');
    });
});

/*router.put('/imalive/registeredusers/:usernumber',function(req, res) {
    var search_usernumber = req.params.usernumber;
    var search_password = req.query.password;
    var userToUpdate =req.body;
    var query = ActiveUsers.findOne({ usernumber: search_usernumber,password:search_password});
      // execute the query at a later time
      query.exec(function (err, user) {
        if(err){
          res.statusCode = 500;
          return res.send('Error');
        }else{
          if(user===null){
             res.statusCode = 404;
             return res.send('No user with usernamber '+search_usernumber);
          }else{
            user.password = userToUpdate.password;
            user.mail = userToUpdate.mail;
            user.save(function (err) {
                if (err){
                   res.statusCode = 500;
                  return res.send('Error Updating');
                }else{ 
                  res.statusCode = 200;
                  return res.send(JSON.stringify(user));
                }
            });
            
          }
        }
      });
      
   
});*/


router.delete('/imalive/registeredusers/:usernumber',function(req, res) {
    var search_usernumber = req.params.usernumber;
    var search_password = req.query.password;
    var query = ActiveUsers.findOne({ usernumber: search_usernumber,password:search_password});
    var promiseFindUser = query.exec();
    promiseFindUser.then(function(user){
      if(user===null){
        res.statusCode = 404;
        return res.send('Error 800');
      }else{
        return query.remove();
      }
    })
    .then(function(){
      res.statusCode = 204;
      return res.send();
    })
    .catch(function(err){
      // just need one of these
      console.log('error:', err);
      res.statusCode = 404;
      return res.send('Error 700');
    });
    /*
    // execute the query at a later time
      query.exec(function (err, user) {
        if(err){
          res.statusCode = 500;
          return res.send('Error 700');
        }else{
          if(user===null){
             res.statusCode = 404;
             return res.send('Error 800');
          }else{
            query.remove(function (err) {
                if (err){
                   res.statusCode = 500;
                  return res.send('Error 900');
                }else{ 
                  res.statusCode = 204;
                  return res.send();
                }
            });
            
          }
        }
      });
      */
   
});

router.options('/imalive/registeredusers',function(req, res) {
  res.statusCode = 204;
  res.setHeader("Access-Control-Allow-Origin", "https://imalive-reg-fe-ghiron.c9users.io");
  res.setHeader("Access-Control-Allow-Headers", "origin, content-type, accept, authorization");
  return res.send();
});  

router.patch('/imalive/registeredusers/:usernumber',function(req, res) {
    var search_usernumber = req.params.usernumber;
    var search_password = req.query.password;

    var update_user = {};
    update_user.password = req.body.reset_password;
    update_user.mail = req.body.reset_mail;
    var query = ActiveUsers.findOne({ usernumber: search_usernumber,password:search_password});
      // execute the query at a later time
      query.exec(function (err, user) {
        if(err){
          res.statusCode = 500;
          return res.send('Error 1000');
        }else{
          if(user===null){
             res.statusCode = 404;
             return res.send('Error 1100');
          }else{
            if(typeof update_user.password !== 'undefined'){
              if(util.isPasswordValid(update_user)){
                user.password = update_user.password;
              }else{
                res.statusCode = 400;
                return res.send('Error 1200');
              }
            }
            if (typeof update_user.mail !== 'undefined'){
              if(util.isMailValid(update_user)){
                user.mail = update_user.mail;
              }else{
                res.statusCode = 400;
                return res.send('Error 1300');
              }
            }
            user.save(function (err) {
                if (err){
                   res.statusCode = 500;
                  return res.send('Error 1400');
                }else{ 
                  res.statusCode = 200;
                  return res.send(JSON.stringify(user));
                }
            })
            
          }
        }
      });
      
   
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});