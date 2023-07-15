const mongoose = require("mongoose")
const Schema = mongoose.Schema

const dashboardUser = new Schema({

    user: {
      type: String,
      require: true,
      unique: true
    },
    email: {
      type: String,
      require: true,
      unique: true
    },
    numberDiamonds: {
      type: Number,
      default: 0
    },
    numberGames: {
      type: Number,
      default: 0
    },
    isLoggedin: {
      type: Number,
      default: 0
    },
    password: {
      type: String,
      require: true
    },
    date: {
      type: Date,
      default: Date.now()
    },
    recoveryToken:{
      type:String
    },
    profileImage:{
      type:String,
    }
 })


mongoose.model("dashboard_users", dashboardUser)