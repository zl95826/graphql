const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // I first of all need to extract the token from an incoming request.
  const authHeader = req.get('Authorization');//It's supposed to get 'Bearer '+token
  console.log(authHeader);
  if (!authHeader) {
   req.isAuth=false;
   return next();
   //with the next middleware and not execute the other code here,
   //that is why I also have the return statement.
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {//this will both verify and decode your token 
    decodedToken = jwt.verify(token, 'secret');console.log('verify',decodedToken);
  } catch (err) {
    req.isAuth=false;
    return next();
  }
  if (!decodedToken) {
    // const error = new Error('Not authenticated.');
    // error.statusCode = 401;
    // throw error;
    //If we make it past this if check, we know that we have a valid token
    req.isAuth=false;
    return next();
  }
  req.userId = decodedToken.userId;
  req.isAuth=true;
  next();
};
