var passwordLength = 8;
var validContentType = ["application/json"]
module.exports = 
{

isValid : function (user){
    var isValid = true;
    var password = user.password;
    if(password.length > passwordLength){
        isValid = false;
    }
    var email = user.email;
    if(email.indexOf('@')===-1){
        isValid = false;
    }
    return isValid;
},

isValidContentType : function (contentType){
    var isValid = true;
    if(validContentType.indexOf(contentType)===-1){
        isValid = false;
    }
    return isValid;
}
};