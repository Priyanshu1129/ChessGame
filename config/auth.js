const localStrategy = require("passport-local").Strategy
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")


// User Model
require("../models/Dashboard")
const dashboardUser = mongoose.model("dashboard_users")


module.exports = function(passport){

    passport.use(new localStrategy({usernameField: "email", passwordField: "password"}, (email, password, done) => {

        dashboardUser.findOne({email: email}).then((dashboard_users) => {
            if(!dashboard_users){
                return done(null, false, {message: "This account does not exist"})
            }

            bcrypt.compare(password, dashboard_users.password, (error, alright) => {


                if(alright){
                    return done(null, dashboard_users)
                } else {
                    return done(null, false, {message: "Incorrect password"})
                }


            })

        })

    }))


    passport.serializeUser((dashboard_users, done) => {
        done(null, dashboard_users)
    })

    passport.deserializeUser((id, done) => {
        dashboardUser.findById(id, (err, dashboard_users) => {
            done(err, dashboard_users)
        })
    })


}