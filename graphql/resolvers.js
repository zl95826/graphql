const User=require('../models/user');
const validator=require('validator');
const bcrypt = require('bcryptjs');
const jwt=require('jsonwebtoken');
module.exports={
    hello:()=>{
        return {text:'hello',views:1}
    },
    createUser://(args,req)=>{const email=args.userInput.email;}
    async ({userInput},req)=>{
        const errors=[];
        if(!validator.isEmail(userInput.email)) { //what happens if you type: throw new Error('E-mail is invalid');
             errors.push({message:'E-mail is invalid'});
        }
        if(validator.isEmpty(userInput.password)||!validator.isLength(userInput.password,{min:6})) {
            errors.push({message:'Password is not valid'});
        }
        if(errors.length>0) {
            const error=new Error('Invalid Input');
            error.data=errors;
            error.code=422;
            throw error;
        }
        const existingUser=await User.findOne({email:userInput.email});
        if(existingUser) {const error=new Error('User exists already!');throw error;}
        const hashedPw=await bcrypt.hash(userInput.password,12);
        const user=new User({
            email:userInput.email,
            name:userInput.name,
            password:hashedPw
        });
        const createdUser=await user.save();//return that user object I created
        return {...createdUser._doc, _id:createdUser.id.toString()};
    },
    login:async ({email,password})=>{
        const user=await User.findOne({email:email});
        if(!user) {
            const error=new Error('User not found');
            error.code=401;
            throw error;
        }
        const isEqual=await bcrypt.compare(password,user.password);
        if(!isEqual) {
            const error=new Error('Password is incorrect.');
            error.code=401;
            throw error;
        }
        //email and password are all right, so let's create JWT.
        const token=jwt.sign({
            //pass the data you want to encode in the token
            userId:user._id.toString(),
            email:user.email
        },'secret',{expiresIn:'1h'});
        return {token:token, userId:user._id.toString()};
    }
}