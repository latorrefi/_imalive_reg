{"changed":true,"filter":false,"title":"server.js","tooltip":"/server.js","value":"\n\nvar http = require('http');\nvar path = require('path');\nvar util = require('./util');\nvar config = require('./config');\n\nvar async = require('async');\nvar socketio = require('socket.io');\nvar express = require('express');\nvar bodyParser = require('body-parser');\n//var bcrypt = require('bcrypt-nodejs');\nvar q = require('q');\nvar jwt = require('jwt-simple');\nvar moment = require('moment');\nvar crypto = require('crypto');\n\n//\n//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.\n//\nvar router = express();\nvar server = http.createServer(router);\nvar io = socketio.listen(server);\n\nvar mongoose = require('mongoose');\n// q\nmongoose.Promise = require('q').Promise;\n\n\nmongoose.connection.close();\nmongoose.connect(config.database);\n\n\nvar ActiveUsers = require(\"mongoose/model/activeusers\").ActiveUsers;\nvar LoggedUsers = require(\"mongoose/model/loggedusers\").LoggedUsers;\nvar UserNumbers = require(\"mongoose/model/usernumbers\").UserNumbers;\n\nrouter.use(bodyParser.json()); // support json encoded bodies\n//router.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies\nrouter.set('jwtTokenSecret', config.secret);\n\nvar realm = \"imalive_reg\",\n  opaque;\n\n\nfunction asyncLoop(iterations, func, callback) {\n    var index = 0;\n    var done = false;\n    var loop = {\n        next: function() {\n            if (done) {\n                return;\n            }\n\n            if (index < iterations) {\n                index++;\n                func(loop);\n\n            } else {\n                done = true;\n                callback();\n            }\n        },\n\n        iteration: function() {\n            return index - 1;\n        },\n\n        break: function() {\n            done = true;\n            callback();\n        }\n    };\n    loop.next();\n    return loop;\n}\n\nfunction searchAndInsertUserNumber(toAnalyze, callback) {\n    //INIT\n    var query = UserNumbers.findOne({ usernumber: toAnalyze});\n    // selecting the `name` and `occupation` fields\n    query.select('usernumber');\n    // execute the query at a later time\n    query.exec(function (err, usernumber) {\n        if (err){\n          \n        }\n        if(usernumber===null){\n          var number =  new UserNumbers({usernumber:toAnalyze});\n          number.save(function (err) {\n              if (err) {\n                //KO\n              }\n              else{\n                //OK\n              }\n            });\n        }\n    });\n    //END\n    callback();\n}\n\nrouter.post('/imalive/registeredusers/loadnumbers',function(req, res) {\n  var usernumber_lenght = req.body.usernumber_lenght;\n  var numbers = [];\n  var i = 1;\n  while(i<usernumber_lenght){\n    //Generate a new random Number of ten digit\n    var testUserNumber = {};\n    testUserNumber = Math.floor(1000000000 + Math.random() * 9000000000);\n    numbers.push(testUserNumber);\n    i++;\n  }\n  asyncLoop(numbers.length, function(loop) {\n    searchAndInsertUserNumber(numbers[loop.iteration()], function(result) {\n        // Okay, for cycle could continue\n        loop.next();\n    })},\n    function(){\n      res.statusCode = 204;\n      return res.send();}\n  );\n});\n\nrouter.post('/imalive/registeredusers',function(req, res) {\n    var password = req.body.password;\n    var email = req.body.mail;\n    var user = {};\n    user.password = password;\n    user.email = email;\n    var created_user_number;\n    if(util.isValid(user)){\n    \n      var query = UserNumbers.findOne({});\n      // selecting the `name` and `occupation` fields\n      query.select('usernumber');\n      // execute the query at a later time\n      var promiseCreateUserNumber = query.exec();\n      promiseCreateUserNumber.then(function(newnumber) {\n        created_user_number = newnumber.usernumber;\n        return newnumber.remove();\n        /*var deferred = q.defer();\n        deferred.resolve(created_user_number);\n        return deferred.promise;*/\n      })\n      .then(function(){\n        console.log('User: ' + created_user_number);\n        //var hash = bcrypt.hashSync(user.password);\n        var hash = md5(created_user_number + ':' + realm + ':' + user.password);\n        var newActiveUser =  new ActiveUsers({usernumber:created_user_number , password: hash ,mail:user.email  });\n        return newActiveUser.save();\n      })\n      .then(function(newActiveUser){\n         res.statusCode = 201;\n      \t res.setHeader(\"Access-Control-Allow-Origin\", \"https://imalive-reg-fe-ghiron.c9users.io\");\n      \t res.setHeader(\"Location\", req.protocol + '://' + req.get('host') + req.originalUrl+'/'+newActiveUser.usernumber);\n      \t res.setHeader(\"Content-Location\", req.protocol + '://' + req.get('host') + req.originalUrl+'/'+newActiveUser.usernumber);\n      \t res.setHeader(\"Content-Type\", \"application/json;charset=UTF-8\");\n      \t \n      \t return res.send(JSON.stringify(newActiveUser));\n      })\n      .catch(function(err){\n        // just need one of these\n        console.log('error:', err);\n        res.statusCode = 404;\n        return res.send('Error 500');\n      });\n    }else{\n        res.statusCode = 400;\n        return res.send('Error 400');\n    }\n});\n\n\nrouter.get('/imalive/registeredusers/:usernumber',function(req, res) {\n    var search_usernumber = req.params.usernumber;\n    var search_password = req.query.password;\n    var promise =  ActiveUsers.findOne({ usernumber: search_usernumber,password: search_password}).exec();\n    promise.then(function(user) {\n      // do something with updated user\n      if(user===null){\n             res.statusCode = 404;\n             return res.send('Error 600');\n      }else{\n          console.log('User: ' + user.usernumber);\n          res.statusCode = 200;\n          res.setHeader(\"Content-Type\", \"application/json;charset=UTF-8\");\n          return res.send(JSON.stringify(user));\n      }\n    })\n    .catch(function(err){\n      // just need one of these\n      console.log('error:', err);\n      res.statusCode = 404;\n      return res.send('Error 500');\n    });\n});\n\n/*router.put('/imalive/registeredusers/:usernumber',function(req, res) {\n    var search_usernumber = req.params.usernumber;\n    var search_password = req.query.password;\n    var userToUpdate =req.body;\n    var query = ActiveUsers.findOne({ usernumber: search_usernumber,password:search_password});\n      // execute the query at a later time\n      query.exec(function (err, user) {\n        if(err){\n          res.statusCode = 500;\n          return res.send('Error');\n        }else{\n          if(user===null){\n             res.statusCode = 404;\n             return res.send('No user with usernamber '+search_usernumber);\n          }else{\n            user.password = userToUpdate.password;\n            user.mail = userToUpdate.mail;\n            user.save(function (err) {\n                if (err){\n                   res.statusCode = 500;\n                  return res.send('Error Updating');\n                }else{ \n                  res.statusCode = 200;\n                  return res.send(JSON.stringify(user));\n                }\n            });\n            \n          }\n        }\n      });\n      \n   \n});*/\n\n\nrouter.delete('/imalive/registeredusers/:usernumber',function(req, res) {\n    var search_usernumber = req.params.usernumber;\n    var search_password = req.query.password;\n    var query = ActiveUsers.findOne({ usernumber: search_usernumber,password:search_password});\n    var promiseFindUser = query.exec();\n    promiseFindUser.then(function(user){\n      if(user===null){\n        res.statusCode = 404;\n        return res.send('Error 800');\n      }else{\n        return query.remove();\n      }\n    })\n    .then(function(){\n      res.statusCode = 204;\n      return res.send();\n    })\n    .catch(function(err){\n      // just need one of these\n      console.log('error:', err);\n      res.statusCode = 500;\n      return res.send('Error 700');\n    });\n});\n\nrouter.options('/imalive/registeredusers',function(req, res) {\n  res.statusCode = 204;\n  res.setHeader(\"Access-Control-Allow-Origin\", \"https://imalive-reg-fe-ghiron.c9users.io\");\n  res.setHeader(\"Access-Control-Allow-Headers\", \"origin, content-type, accept, authorization\");\n  return res.send();\n});\n\nrouter.options('/imalive/loggedusers',function(req, res) {\n  res.statusCode = 204;\n  res.setHeader(\"Access-Control-Allow-Origin\", \"https://imalive-reg-fe-ghiron.c9users.io\");\n  res.setHeader(\"Access-Control-Allow-Headers\", \"origin, content-type, accept, authorization\");\n  return res.send();\n});\n\nrouter.patch('/imalive/registeredusers/:usernumber',function(req, res) {\n    var search_usernumber = req.params.usernumber;\n    var search_password = req.query.password;\n\n    var update_user = {};\n    update_user.password = req.body.reset_password;\n    update_user.mail = req.body.reset_mail;\n    var query = ActiveUsers.findOne({ usernumber: search_usernumber,password:search_password});\n    var promiseFindUser = query.exec();\n    promiseFindUser.then(function(user){\n      if(user===null){\n        res.statusCode = 404;\n        return res.send('Error 1100');\n      }else{\n        if(typeof update_user.password !== 'undefined'){\n          if(util.isPasswordValid(update_user)){\n            user.password = update_user.password;\n          }else{\n            res.statusCode = 400;\n            return res.send('Error 1200');\n          }\n        }\n        if (typeof update_user.mail !== 'undefined'){\n          if(util.isMailValid(update_user)){\n            user.mail = update_user.mail;\n          }else{\n            res.statusCode = 400;\n            return res.send('Error 1300');\n          }\n        }\n        return user.save();\n      }\n    })\n    .then(function(user){\n      res.statusCode = 200;\n      return res.send(JSON.stringify(user));\n    })\n    .catch(function(err){\n      // just need one of these\n      console.log('error:', err);\n      res.statusCode = 500;\n      return res.send('Error 900');\n    });\n});\n\nfunction md5(msg) {\n  return crypto.createHash('md5').update(msg).digest('hex');\n}\n\nopaque = md5(realm);\n\nfunction authenticate(res) {\n  res.writeHead(401, {\n    'WWW-Authenticate' : 'Digest realm=\"' + realm + '\"'\n    + ',qop=\"auth\",nonce=\"' + Math.random() + '\"'\n    + ',opaque=\"' + opaque + '\"'});\n\n  res.end('Authorization required.');\n}\n\nfunction parseAuth(auth) {\n  var authObj = {};\n  auth.split(', ').forEach(function (pair) {\n    pair = pair.split('=');\n    authObj[pair[0]] = pair[1].replace(/\"/g, '');\n  });\n  return authObj;\n}\n\nrouter.post('/imalive/loggedusers',function(req, res) {\n  var auth, digest = {};\n  if (!req.headers.authorization) {\n    authenticate(res);\n    return;\n  }\n  auth = req.headers.authorization.replace(/^Digest /, '');\n  auth = parseAuth(auth);\n  //var password = req.body.password;\n  var usernumber = auth.username;\n  var query = ActiveUsers.findOne({ usernumber: usernumber});\n  // execute the query at a later time\n  var promiseCreateUserNumber = query.exec();\n  promiseCreateUserNumber.then(function(user) {\n    if(user!==undefined){\n      digest.ha1 = user.password;\n      digest.ha2 = md5(req.method + ':' + auth.uri);\n      digest.response = md5([\n        digest.ha1,\n        auth.nonce, auth.nc, auth.cnonce, auth.qop,\n        digest.ha2\n      ].join(':'));\n      \n      if (auth.response !== digest.response) { authenticate(res); return; }\n      \n      //if(bcrypt.compareSync(password, user.password)){\n        var expires = moment().add(7,'days').valueOf();\n        var token = jwt.encode({\n          iss: user.usernumber,\n          exp: expires\n        }, router.get('jwtTokenSecret'));\n        var newLoggeduser =  new LoggedUsers({usernumber:usernumber , token: token ,expires:expires  });\n        return newLoggeduser.save();\n      //}else{\n      //  res.statusCode = 404;\n      //  return res.send('Error 400'); \n      //}\n    }else{\n      authenticate(res); return;\n    }\n      /*var deferred = q.defer();\n        deferred.resolve(created_user_number);\n        return deferred.promise;*/\n    })\n    .then(function(newLoggedUser){\n         res.statusCode = 201;\n      \t res.setHeader(\"Access-Control-Allow-Origin\", \"https://imalive-reg-fe-ghiron.c9users.io\");\n      \t res.setHeader(\"Location\", req.protocol + '://' + req.get('host') + req.originalUrl+'/'+newLoggedUser.usernumber);\n      \t res.setHeader(\"Content-Location\", req.protocol + '://' + req.get('host') + req.originalUrl+'/'+newLoggedUser.usernumber);\n      \t res.setHeader(\"Content-Type\", \"application/json;charset=UTF-8\");\n      \t \n      \t return res.send(JSON.stringify(newLoggedUser));\n      })\n      .catch(function(err){\n        // just need one of these\n        console.log('error:', err);\n        res.statusCode = 500;\n        return res.send('Error 500');\n      });\n    \n});\n\nrouter.get('/imalive/loggedusers/:usernumber',function(req, res) {\n    var search_usernumber = parseInt(req.params.usernumber);\n    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];\n    if (token) {\n      try {\n        var decoded = jwt.decode(token, router.get('jwtTokenSecret'));\n        // handle token here\n        if (decoded.exp <= Date.now()) {\n          res.end('Error 1200', 400);\n        }\n        if(decoded.iss===search_usernumber){\n          var promise =  LoggedUsers.findOne({ usernumber: search_usernumber}).exec();\n          promise.then(function(user) {\n            if(user===null){\n              res.statusCode = 404;\n              return res.send('Error 1200');\n            }else{\n              console.log('User: ' + user.usernumber);\n              res.statusCode = 200;\n              res.setHeader(\"Content-Type\", \"application/json;charset=UTF-8\");\n              return res.send(JSON.stringify(user));\n            }\n          })\n          .catch(function(err){\n            // just need one of these\n            console.log('error:', err);\n            res.statusCode = 404;\n            return res.send('Error 1100');\n          });\n        }else{\n          return res.status(403).send('Error 1000');\n        }\n      } catch (err) {\n        return res.status(403).send('Error 900');\n      }\n    } else {\n      return res.status(403).send('Error 800');\n    }\n});\n\nrouter.delete('/imalive/loggedusers/:usernumber',function(req, res) {\n    var search_usernumber = parseInt(req.params.usernumber);\n    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];\n    if (token) {\n      try {\n        var decoded = jwt.decode(token, router.get('jwtTokenSecret'));\n        // handle token here\n        if (decoded.exp <= Date.now()) {\n          res.end('Access token has expired', 400);\n        }\n        if(decoded.iss===search_usernumber){\n          var promise =  LoggedUsers.findOne({ usernumber: search_usernumber}).exec();\n          promise.then(function(user) {\n            if(user===null){\n              res.statusCode = 404;\n              return res.send('Error 1200');\n            }else{\n              console.log('User: ' + user.usernumber);\n              res.statusCode = 200;\n              res.setHeader(\"Content-Type\", \"application/json;charset=UTF-8\");\n              return res.send(JSON.stringify(user));\n            }\n          })\n          .catch(function(err){\n            // just need one of these\n            console.log('error:', err);\n            res.statusCode = 404;\n            return res.send('Error 1100');\n          });\n        }else{\n          return res.status(403).send('Error 1000');\n        }\n      } catch (err) {\n        return res.status(403).send('Error 900');\n      }\n    } else {\n      return res.status(403).send('Error 800');\n    }\n    /*var promise =  ActiveUsers.findOne({ usernumber: search_usernumber,password: search_password}).exec();\n    promise.then(function(user) {\n      // do something with updated user\n      if(user===null){\n             res.statusCode = 404;\n             return res.send('Error 600');\n      }else{\n          console.log('User: ' + user.usernumber);\n          res.statusCode = 200;\n          res.setHeader(\"Content-Type\", \"application/json;charset=UTF-8\");\n          return res.send(JSON.stringify(user));\n      }\n    })\n    .catch(function(err){\n      // just need one of these\n      console.log('error:', err);\n      res.statusCode = 404;\n      return res.send('Error 500');\n    });*/\n});\n\nserver.listen(process.env.PORT || 3000, process.env.IP || \"0.0.0.0\", function(){\n  var addr = server.address();\n  console.log(\"Server listening at\", addr.address + \":\" + addr.port);\n});","undoManager":{"mark":89,"position":100,"stack":[[{"start":{"row":355,"column":6},"end":{"row":356,"column":0},"action":"insert","lines":["",""],"id":6352},{"start":{"row":356,"column":0},"end":{"row":356,"column":6},"action":"insert","lines":["      "]}],[{"start":{"row":339,"column":5},"end":{"row":339,"column":6},"action":"remove","lines":[" "],"id":6353}],[{"start":{"row":339,"column":4},"end":{"row":339,"column":5},"action":"remove","lines":["r"],"id":6354}],[{"start":{"row":339,"column":3},"end":{"row":339,"column":4},"action":"remove","lines":["a"],"id":6355}],[{"start":{"row":339,"column":2},"end":{"row":339,"column":3},"action":"remove","lines":["v"],"id":6356}],[{"start":{"row":335,"column":2},"end":{"row":336,"column":0},"action":"insert","lines":["",""],"id":6357},{"start":{"row":336,"column":0},"end":{"row":336,"column":2},"action":"insert","lines":["  "]}],[{"start":{"row":335,"column":2},"end":{"row":335,"column":30},"action":"insert","lines":["var auth, user, digest = {};"],"id":6358}],[{"start":{"row":335,"column":12},"end":{"row":335,"column":16},"action":"remove","lines":["user"],"id":6359}],[{"start":{"row":335,"column":11},"end":{"row":335,"column":12},"action":"remove","lines":[" "],"id":6360}],[{"start":{"row":335,"column":10},"end":{"row":335,"column":11},"action":"remove","lines":[","],"id":6361}],[{"start":{"row":342,"column":2},"end":{"row":342,"column":3},"action":"insert","lines":["/"],"id":6362}],[{"start":{"row":342,"column":3},"end":{"row":342,"column":4},"action":"insert","lines":["/"],"id":6363}],[{"start":{"row":349,"column":59},"end":{"row":349,"column":63},"action":"insert","lines":["user"],"id":6364}],[{"start":{"row":349,"column":63},"end":{"row":349,"column":64},"action":"insert","lines":["-"],"id":6365}],[{"start":{"row":349,"column":63},"end":{"row":349,"column":64},"action":"remove","lines":["-"],"id":6366}],[{"start":{"row":349,"column":63},"end":{"row":349,"column":64},"action":"insert","lines":["."],"id":6367}],[{"start":{"row":359,"column":6},"end":{"row":359,"column":7},"action":"insert","lines":["/"],"id":6368}],[{"start":{"row":359,"column":7},"end":{"row":359,"column":8},"action":"insert","lines":["/"],"id":6369}],[{"start":{"row":367,"column":6},"end":{"row":367,"column":7},"action":"insert","lines":["/"],"id":6370}],[{"start":{"row":367,"column":7},"end":{"row":367,"column":8},"action":"insert","lines":["/"],"id":6371}],[{"start":{"row":368,"column":6},"end":{"row":368,"column":7},"action":"insert","lines":["/"],"id":6372}],[{"start":{"row":368,"column":7},"end":{"row":368,"column":8},"action":"insert","lines":["/"],"id":6373}],[{"start":{"row":369,"column":6},"end":{"row":369,"column":7},"action":"insert","lines":["/"],"id":6374}],[{"start":{"row":369,"column":7},"end":{"row":369,"column":8},"action":"insert","lines":["/"],"id":6375}],[{"start":{"row":370,"column":6},"end":{"row":370,"column":7},"action":"insert","lines":["/"],"id":6376}],[{"start":{"row":370,"column":7},"end":{"row":370,"column":8},"action":"insert","lines":["/"],"id":6377}],[{"start":{"row":11,"column":0},"end":{"row":11,"column":1},"action":"insert","lines":["/"],"id":6378}],[{"start":{"row":11,"column":1},"end":{"row":11,"column":2},"action":"insert","lines":["/"],"id":6379}],[{"start":{"row":148,"column":50},"end":{"row":149,"column":0},"action":"insert","lines":["",""],"id":6383},{"start":{"row":149,"column":0},"end":{"row":149,"column":8},"action":"insert","lines":["        "]}],[{"start":{"row":149,"column":8},"end":{"row":149,"column":27},"action":"insert","lines":["created_user_number"],"id":6385}],[{"start":{"row":149,"column":26},"end":{"row":149,"column":27},"action":"remove","lines":["r"],"id":6386}],[{"start":{"row":149,"column":25},"end":{"row":149,"column":26},"action":"remove","lines":["e"],"id":6387}],[{"start":{"row":149,"column":24},"end":{"row":149,"column":25},"action":"remove","lines":["b"],"id":6388}],[{"start":{"row":149,"column":23},"end":{"row":149,"column":24},"action":"remove","lines":["m"],"id":6389}],[{"start":{"row":149,"column":22},"end":{"row":149,"column":23},"action":"remove","lines":["u"],"id":6390}],[{"start":{"row":149,"column":21},"end":{"row":149,"column":22},"action":"remove","lines":["n"],"id":6391}],[{"start":{"row":149,"column":20},"end":{"row":149,"column":21},"action":"remove","lines":["_"],"id":6392}],[{"start":{"row":149,"column":19},"end":{"row":149,"column":20},"action":"remove","lines":["r"],"id":6393}],[{"start":{"row":149,"column":18},"end":{"row":149,"column":19},"action":"remove","lines":["e"],"id":6394}],[{"start":{"row":149,"column":17},"end":{"row":149,"column":18},"action":"remove","lines":["s"],"id":6395}],[{"start":{"row":149,"column":16},"end":{"row":149,"column":17},"action":"remove","lines":["u"],"id":6396}],[{"start":{"row":149,"column":15},"end":{"row":149,"column":16},"action":"remove","lines":["_"],"id":6397}],[{"start":{"row":149,"column":14},"end":{"row":149,"column":15},"action":"remove","lines":["d"],"id":6398}],[{"start":{"row":149,"column":13},"end":{"row":149,"column":14},"action":"remove","lines":["e"],"id":6399}],[{"start":{"row":149,"column":12},"end":{"row":149,"column":13},"action":"remove","lines":["t"],"id":6400}],[{"start":{"row":149,"column":11},"end":{"row":149,"column":12},"action":"remove","lines":["a"],"id":6401}],[{"start":{"row":149,"column":10},"end":{"row":149,"column":11},"action":"remove","lines":["e"],"id":6402}],[{"start":{"row":149,"column":9},"end":{"row":149,"column":10},"action":"remove","lines":["r"],"id":6403}],[{"start":{"row":149,"column":8},"end":{"row":149,"column":9},"action":"remove","lines":["c"],"id":6404}],[{"start":{"row":149,"column":8},"end":{"row":149,"column":63},"action":"insert","lines":["md5(auth.username + ':' + realm + ':' + user.password);"],"id":6405}],[{"start":{"row":149,"column":12},"end":{"row":149,"column":25},"action":"remove","lines":["auth.username"],"id":6406},{"start":{"row":149,"column":12},"end":{"row":149,"column":31},"action":"insert","lines":["created_user_number"]}],[{"start":{"row":149,"column":8},"end":{"row":149,"column":19},"action":"insert","lines":["var hash = "],"id":6407}],[{"start":{"row":148,"column":8},"end":{"row":148,"column":9},"action":"insert","lines":["/"],"id":6408}],[{"start":{"row":148,"column":9},"end":{"row":148,"column":10},"action":"insert","lines":["/"],"id":6409}],[{"start":{"row":350,"column":23},"end":{"row":350,"column":59},"action":"remove","lines":["auth.username + ':' + realm + ':' + "],"id":6410}],[{"start":{"row":350,"column":22},"end":{"row":350,"column":23},"action":"remove","lines":["("],"id":6411}],[{"start":{"row":350,"column":21},"end":{"row":350,"column":22},"action":"remove","lines":["5"],"id":6412}],[{"start":{"row":350,"column":20},"end":{"row":350,"column":21},"action":"remove","lines":["d"],"id":6413}],[{"start":{"row":350,"column":19},"end":{"row":350,"column":20},"action":"remove","lines":["m"],"id":6414}],[{"start":{"row":350,"column":32},"end":{"row":350,"column":33},"action":"remove","lines":[")"],"id":6415}],[{"start":{"row":455,"column":0},"end":{"row":456,"column":0},"action":"insert","lines":["",""],"id":6416}],[{"start":{"row":456,"column":0},"end":{"row":513,"column":3},"action":"insert","lines":["router.get('/imalive/loggedusers/:usernumber',function(req, res) {","    var search_usernumber = parseInt(req.params.usernumber);","    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];","    if (token) {","      try {","        var decoded = jwt.decode(token, router.get('jwtTokenSecret'));","        // handle token here","        if (decoded.exp <= Date.now()) {","          res.end('Access token has expired', 400);","        }","        if(decoded.iss===search_usernumber){","          var promise =  LoggedUsers.findOne({ usernumber: search_usernumber}).exec();","          promise.then(function(user) {","            if(user===null){","              res.statusCode = 404;","              return res.send('Error 1200');","            }else{","              console.log('User: ' + user.usernumber);","              res.statusCode = 200;","              res.setHeader(\"Content-Type\", \"application/json;charset=UTF-8\");","              return res.send(JSON.stringify(user));","            }","          })","          .catch(function(err){","            // just need one of these","            console.log('error:', err);","            res.statusCode = 404;","            return res.send('Error 1100');","          });","        }else{","          return res.status(403).send('Error 1000');","        }","      } catch (err) {","        return res.status(403).send('Error 900');","      }","    } else {","      return res.status(403).send('Error 800');","    }","    /*var promise =  ActiveUsers.findOne({ usernumber: search_usernumber,password: search_password}).exec();","    promise.then(function(user) {","      // do something with updated user","      if(user===null){","             res.statusCode = 404;","             return res.send('Error 600');","      }else{","          console.log('User: ' + user.usernumber);","          res.statusCode = 200;","          res.setHeader(\"Content-Type\", \"application/json;charset=UTF-8\");","          return res.send(JSON.stringify(user));","      }","    })","    .catch(function(err){","      // just need one of these","      console.log('error:', err);","      res.statusCode = 404;","      return res.send('Error 500');","    });*/","});"],"id":6417}],[{"start":{"row":456,"column":7},"end":{"row":456,"column":10},"action":"remove","lines":["get"],"id":6418},{"start":{"row":456,"column":7},"end":{"row":456,"column":8},"action":"insert","lines":["d"]}],[{"start":{"row":456,"column":8},"end":{"row":456,"column":9},"action":"insert","lines":["e"],"id":6419}],[{"start":{"row":456,"column":9},"end":{"row":456,"column":10},"action":"insert","lines":["l"],"id":6420}],[{"start":{"row":456,"column":10},"end":{"row":456,"column":11},"action":"insert","lines":["e"],"id":6421}],[{"start":{"row":456,"column":11},"end":{"row":456,"column":12},"action":"insert","lines":["t"],"id":6422}],[{"start":{"row":456,"column":12},"end":{"row":456,"column":13},"action":"insert","lines":["e"],"id":6423}],[{"start":{"row":435,"column":4},"end":{"row":453,"column":9},"action":"remove","lines":["/*var promise =  ActiveUsers.findOne({ usernumber: search_usernumber,password: search_password}).exec();","    promise.then(function(user) {","      // do something with updated user","      if(user===null){","             res.statusCode = 404;","             return res.send('Error 600');","      }else{","          console.log('User: ' + user.usernumber);","          res.statusCode = 200;","          res.setHeader(\"Content-Type\", \"application/json;charset=UTF-8\");","          return res.send(JSON.stringify(user));","      }","    })","    .catch(function(err){","      // just need one of these","      console.log('error:', err);","      res.statusCode = 404;","      return res.send('Error 500');","    });*/"],"id":6424}],[{"start":{"row":435,"column":2},"end":{"row":435,"column":4},"action":"remove","lines":["  "],"id":6425}],[{"start":{"row":435,"column":0},"end":{"row":435,"column":2},"action":"remove","lines":["  "],"id":6426}],[{"start":{"row":434,"column":5},"end":{"row":435,"column":0},"action":"remove","lines":["",""],"id":6427}],[{"start":{"row":405,"column":19},"end":{"row":405,"column":43},"action":"remove","lines":["Access token has expired"],"id":6428},{"start":{"row":405,"column":19},"end":{"row":405,"column":20},"action":"insert","lines":["E"]}],[{"start":{"row":405,"column":20},"end":{"row":405,"column":21},"action":"insert","lines":["r"],"id":6429}],[{"start":{"row":405,"column":21},"end":{"row":405,"column":22},"action":"insert","lines":["r"],"id":6430}],[{"start":{"row":405,"column":22},"end":{"row":405,"column":23},"action":"insert","lines":["p"],"id":6431}],[{"start":{"row":405,"column":23},"end":{"row":405,"column":24},"action":"insert","lines":["r"],"id":6432}],[{"start":{"row":405,"column":23},"end":{"row":405,"column":24},"action":"remove","lines":["r"],"id":6433}],[{"start":{"row":405,"column":22},"end":{"row":405,"column":23},"action":"remove","lines":["p"],"id":6434}],[{"start":{"row":405,"column":22},"end":{"row":405,"column":23},"action":"insert","lines":["o"],"id":6435}],[{"start":{"row":405,"column":23},"end":{"row":405,"column":24},"action":"insert","lines":["r"],"id":6436}],[{"start":{"row":405,"column":24},"end":{"row":405,"column":25},"action":"insert","lines":[" "],"id":6437}],[{"start":{"row":405,"column":25},"end":{"row":405,"column":26},"action":"insert","lines":["1"],"id":6438}],[{"start":{"row":405,"column":26},"end":{"row":405,"column":27},"action":"insert","lines":["2"],"id":6439}],[{"start":{"row":405,"column":27},"end":{"row":405,"column":28},"action":"insert","lines":["3"],"id":6440}],[{"start":{"row":405,"column":28},"end":{"row":405,"column":29},"action":"insert","lines":["0"],"id":6441}],[{"start":{"row":405,"column":28},"end":{"row":405,"column":29},"action":"remove","lines":["0"],"id":6442}],[{"start":{"row":405,"column":27},"end":{"row":405,"column":28},"action":"remove","lines":["3"],"id":6443}],[{"start":{"row":405,"column":27},"end":{"row":405,"column":28},"action":"insert","lines":["0"],"id":6444}],[{"start":{"row":405,"column":28},"end":{"row":405,"column":29},"action":"insert","lines":["0"],"id":6445}],[{"start":{"row":264,"column":4},"end":{"row":264,"column":5},"action":"remove","lines":[" "],"id":6446}],[{"start":{"row":264,"column":3},"end":{"row":264,"column":4},"action":"remove","lines":[" "],"id":6447}],[{"start":{"row":264,"column":3},"end":{"row":265,"column":0},"action":"insert","lines":["",""],"id":6448}],[{"start":{"row":265,"column":0},"end":{"row":266,"column":0},"action":"insert","lines":["",""],"id":6449}],[{"start":{"row":266,"column":0},"end":{"row":271,"column":3},"action":"insert","lines":["router.options('/imalive/registeredusers',function(req, res) {","  res.statusCode = 204;","  res.setHeader(\"Access-Control-Allow-Origin\", \"https://imalive-reg-fe-ghiron.c9users.io\");","  res.setHeader(\"Access-Control-Allow-Headers\", \"origin, content-type, accept, authorization\");","  return res.send();","});"],"id":6450}],[{"start":{"row":266,"column":25},"end":{"row":266,"column":35},"action":"remove","lines":["registered"],"id":6451},{"start":{"row":266,"column":25},"end":{"row":266,"column":26},"action":"insert","lines":["l"]}],[{"start":{"row":266,"column":26},"end":{"row":266,"column":27},"action":"insert","lines":["o"],"id":6452}],[{"start":{"row":266,"column":27},"end":{"row":266,"column":28},"action":"insert","lines":["g"],"id":6453}],[{"start":{"row":266,"column":28},"end":{"row":266,"column":29},"action":"insert","lines":["g"],"id":6454}],[{"start":{"row":266,"column":29},"end":{"row":266,"column":30},"action":"insert","lines":["e"],"id":6455}],[{"start":{"row":266,"column":30},"end":{"row":266,"column":31},"action":"insert","lines":["d"],"id":6456}]]},"ace":{"folds":[],"customSyntax":"javascript","scrolltop":3598,"scrollleft":0,"selection":{"start":{"row":266,"column":31},"end":{"row":266,"column":31},"isBackwards":false},"options":{"guessTabSize":true,"useWrapMode":false,"wrapToView":true},"firstLineState":{"row":256,"state":"start","mode":"ace/mode/javascript"}},"timestamp":1456092176157}