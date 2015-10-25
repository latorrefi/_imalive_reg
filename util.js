var passwordLength = 8;
var validContentType = ["application/json"]
module.exports = 
{

isValid : function (password){
    var isValid = true;
    if(password.length > passwordLength){
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