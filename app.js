const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');

const graphqlHTTP = require('express-graphql');
const schema=require('./graphql/schema');
const resolver=require('./graphql/resolvers');
const auth=require('./middleware/auth');
const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if(req.method==='OPTIONS') {return res.sendStatus(200);}//deal with preflight request
  next();
});
app.use(auth);
//This middleware will now run on every request that reaches my graphql endpoint
//but it will not deny the request if there is no token.

app.use('/graphql',graphqlHTTP({
  schema:schema,
  rootValue:resolver,
  graphiql: true,
  formatError(err) {
    //formatError this configuration allows you to add more error information
    //which receives the error detected by graphql and allows you to return your own format.
    if(!err.originalError) {
      return err;
    }
    const data=err.originalError.data;
    const message=err.message||'An error occurred';
    //const message=err.originalError.message||'An error occurred';
    const code=err.originalError.code||500;
    return {message:message,status:code,data:data}
    //I can return my own errors object
  }
}))
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    'mongodb+srv://bettyMongo:.../messages?retryWrites=true&w=majority',{ useNewUrlParser: true }
  )
  .then(result => {
    app.listen(8080);
  })
  .catch(err => console.log(err));
