var passwordLength = 8;
module.exports = 
{

isValid : function (password){
    var isValid = true;
    if(password.length > passwordLength){
        isValid = false;
    }
    return isValid;
}
};