//this file we use it to define the queries, mutations and types

const {buildSchema}=require('graphql');

module.exports=buildSchema(`
type Post {
    _id:ID!
    title:String!
    content:String!
    imageUrl:String!
    creator:User!
    createdAt:String!
    updatedAt:String!
}
type User {
    _id:ID!
    name:String!
    email:String!
    password:String!
    status:String!
    posts:[Post!]!
}
input UserInputData {
    email:String!
    name:String!
    password:String!
}
type TestData {
    text:String
    views:Int
}
type AuthData {
    token:String!
    userId:String!
}
type Query {
    hello:TestData
    login(email:String!,password:String!):AuthData!
}
type RootMutation {
    createUser(userInput:UserInputData):User!
}
schema {
    query:Query
    mutation:RootMutation
}
`);