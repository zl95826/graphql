const User=require('../models/user');
const Post=require('../models/post');
const validator=require('validator');
const bcrypt = require('bcryptjs');
const jwt=require('jsonwebtoken');
const {clearImage}=require('../util/file');
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
        const hashedPw=await bcrypt.hash(userInput.password,12);//must hash the password
        const user=new User({
            email:userInput.email,
            name:userInput.name,
            password:hashedPw
        });//An instance of a model is called a document. Created a user document.
        const createdUser=await user.save();//save the document to database and return that user object I created
        return {...createdUser._doc, _id:createdUser.id.toString()};
    },
    login:async ({email,password})=>{
        const user=await User.findOne({email:email});console.log(user);
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
    },
    createPost:async ({postInput},req)=>{
        if(!req.isAuth) {
            const error=new Error('Not authenticated!');
            error.code=401;
            throw error;
        }
        //the following code to validate the input
        const errors=[];
        if(validator.isEmpty(postInput.title)||!validator.isLength(postInput.title,{min:5})) {
            errors.push({message:'Title is invalid.'});
        }
        if(validator.isEmpty(postInput.content)||!validator.isLength(postInput.content,{min:5})) {
            errors.push({message:'Content is invalid.'});
        }
        if(errors.length>0) {
            const error=new Error('Invalid Input');
            error.data=errors;
            error.code=422;
            throw error;
        }
        const user=await User.findById(req.userId);
        if(!user) {
            const error=new Error('Invalid user');
            error.code=401;
            throw error;
        }
        const post=new Post({
            title:postInput.title,
            imageUrl:postInput.imageUrl,
            content:postInput.content,
            creator:user
        });
        const createdPost=await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
            ...createdPost._doc,
            _id:createdPost._id.toString(),
            createdAt:createdPost.createdAt.toISOString(),
            updatedAt:createdPost.updatedAt.toISOString()
        }
    },
    posts:async ({page},req)=>{//won't care about the first argument for now, but I will need the request to find out whether the user is authenticated.
        if(!req.isAuth) {
            const error=new Error('Not authenticated!');
            error.code=401;
            throw error;
        }
        if(!page) {page=1;}
        const perPage=2;
        const totalPosts=await Post.find().countDocuments();
        const posts=await Post.find().sort({createdAt:-1}).skip((page-1)*perPage).limit(perPage).populate('creator');
        console.log(posts);
        return {posts:posts.map(p=>{return {
            ...p._doc,
            _id:p._id.toString(),
            createdAt:p.createdAt.toISOString(),
            updatedAt:p.updatedAt.toISOString()
        }}),totalPosts:totalPosts}

    },
    post:async ({id},req)=>{
        if(!req.isAuth) {
            const error=new Error('Not authenticated!');
            error.code=401;
            throw error;
        }
        const post=await Post.findById(id).populate('creator');
        console.log('post',post);
        if(!post) {
            const error=new Error('No post found!');
            error.code=404;
            throw error;
        }
        return {
            ...post._doc,
            _id:post._id.toString(),
            createdAt:post.createdAt.toISOString(),
            updatedAt:post.updatedAt.toISOString()

        }
    },
    updatePost:async ({id,postInput},req)=>{
        if(!req.isAuth) {
            const error=new Error('Not authenticated!');
            error.code=401;
            throw error;
        }
        const post=await Post.findById(id).populate('creator');
        if(!post) {
            const error=new Error('No post found!');
            error.code=404;
            throw error;
        }
        if(post.creator._id.toString()!==req.userId.toString()) {//req.userId is set in the auth.js
            const error=new Error('Not Authorized!');
            error.code=403;
            throw error;
        }
        const errors=[];
        if(validator.isEmpty(postInput.title)||!validator.isLength(postInput.title,{min:5})) {
            errors.push({message:'Title is invalid.'});
        }
        if(validator.isEmpty(postInput.content)||!validator.isLength(postInput.content,{min:5})) {
            errors.push({message:'Content is invalid.'});
        }
        if(errors.length>0) {
            const error=new Error('Invalid Input');
            error.data=errors;
            error.code=422;
            throw error;
        }
        post.title=postInput.title;
        post.content=postInput.content;
        if(postInput.imageUrl!=='undefined') {post.imageUrl=postInput.imageUrl;}
        const updatedPost=await post.save();
        return {
            ...updatedPost._doc,
            _id:updatedPost._id.toString(),
            createdAt:updatedPost.createdAt.toISOString(),
            updatedAt:updatedPost.updatedAt.toISOString()
        }
    },
    deletePost:async ({id},req)=>{
        if(!req.isAuth) {
            const error=new Error('Not authenticated!');
            error.code=401;
            throw error;
        }
        const post=await Post.findById(id);
        if(!post) {
            const error=new Error('No post found!');
            error.code=404;
            throw error;
        }
        if(post.creator.toString()!==req.userId.toString()) {
            const error=new Error('Not Authorized!');
            error.code=403;
            throw error;
        }
        clearImage(post.imageUrl);//post.imageUrl: this is the path of the image on my server
        await Post.findByIdAndRemove(id);
        const user=await User.findById(req.userId);
        user.posts.pull(id);//Pulls/removes items from the array atomically
        await user.save();
        return true;
    },
    user:async (args,req)=>{
        if(!req.isAuth) {
            const error=new Error('Not authenticated!');
            error.code=401;
            throw error;
        }
        const user=await User.findById(req.userId);
        if(!user) {
            const error=new Error('No user found!');
            error.code=404;
            throw error;
        }
        return {...user._doc,_id:user._id.toString()};
    },
    updateStatus:async ({status},req)=>{
        if(!req.isAuth) {
            const error=new Error('Not authenticated!');
            error.code=401;
            throw error;
        }
        const user=await User.findById(req.userId);
        if(!user) {
            const error=new Error('No user found!');
            error.code=404;
            throw error;
        }
        user.status=status;
        await user.save();
        return {...user._doc,_id:user._id.toString()};
    }
    
}