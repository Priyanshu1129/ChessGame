const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
require("../models/Dashboard")
const dashboardUser = mongoose.model("dashboard_users")
const bcrypt = require("bcryptjs")
const passport = require("passport")
const nodemailer = require('nodemailer');
const crypto = require("crypto");
const multer = require('multer');
const path= require('path')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/profileImages/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    },
});

const upload = multer({ storage: storage });

router.get('/login', (req, res) => {
    res.render("auth/myaccount", {
        url: req.url
    })
})

router.post('/login', (req, res, next) => {
    passport.authenticate("local", {
        successRedirect: "/dashboard",
        failureRedirect: "/auth/login",
        failureFlash: true
    })(req, res, next)
})

router.get('/signup', (req, res) => {
    res.render("auth/signup")
})

router.post("/signup", upload.single('profileImage'), (req, res) => {
    var erros = []

    if (!req.body.user || typeof req.body.user == undefined || req.body.user == null) {
        erros.push({ text: "Invalid user" })
    }

    if (!req.body.email || typeof req.body.email == undefined || req.body.email == null) {
        erros.push({ text: "Invalid email" })
    }

    if (!req.body.password || typeof req.body.password == undefined || req.body.password == null) {
        erros.push({ text: "Invalid password" })
    }

    if (req.body.password.length < 4) {
        erros.push({ text: "Password too short" })
    }

    if (req.body.password != req.body.password2) {
        erros.push({ text: "Passwords must be the same" })
    }

    if (erros.length > 0) {
        res.render("auth/signup", { erros: erros })
    } else {

        dashboardUser.findOne({ email: req.body.email }).then((dashboard_users) => {

            if (dashboard_users) {
                req.flash('error_msg', 'An account with this email already exists')
                res.redirect("/auth/signup")
            } else {

                const newAccount = new dashboardUser({
                    user: req.body.user,
                    email: req.body.email,
                    password: req.body.password,
                    isLoggedin: 1
                })

                if (req.file) {
                    let profileImagePath = req.file.path;                    

                    profileImagePath= profileImagePath.replace(/\\/g, '/' ).split('/');
                    console.log(profileImagePath)
                    profileImagePath= profileImagePath.filter((item) => item);
                    profileImagePath= '/'+profileImagePath.slice(1).join('/');
                   
                    newAccount.profileImage = profileImagePath
                }               

                bcrypt.genSalt(10, (error, salt) => {
                    bcrypt.hash(newAccount.password, salt, (error, hash) => {
                        if (error) {
                            req.flash('error_msg', 'There was an error creating the account, please try again')
                            res.redirect("/auth/signup")
                        }

                        newAccount.password = hash

                        newAccount.save().then(() => {
                            req.flash('success_msg', 'Account successfully created!')
                            res.redirect("/auth/login")
                        }).catch(() => {
                            req.flash('error_msg', 'There was an error creating the account, please try again')
                            res.redirect("/auth/signup")
                        })
                    })
                })

            }


        }).catch((err) => {
            console.log(err)
            req.flash('error_msg', 'There was an internal error')
            res.redirect("/auth/signup")
        })


    }
})

router.get('/recover-password', (req, res) => {
    res.render("auth/recoverpassword")
})

router.post('/recover-password', async (req, res) => {

    if (!req.body.email || typeof req.body.email == undefined || req.body.email == null) {
        return res.render("auth/recover-password", { erros: "Invalid Email" })
    }


    const user = await dashboardUser.findOne({ email: req.body.email })

    if (!user) {
        return req.flash('error_msg', 'An account with this email not exists'),
            res.redirect("/auth/recover-password")
    }

    const resetToken = crypto.randomBytes(20).toString("hex");

    user.recoveryToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");



    await user.save({ validateBeforeSave: false });

    let transporter = nodemailer.createTransport({
        host: 'smtp-relay.sendinblue.com',
        port: 587,
        auth: {
            user: "bestmomentsgamescompany@gmail.com",
            pass: "ZMS5LgC16Wh3X9k4"
        }
    })

    message = {
        from: "bestmomentsgamescompany@gmail.com",
        to: req.body.email,
        subject: "Subject",
        html: `<!doctype html>
                <html lang="en-US">
                
                <head>
                    <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
                    <title>Reset Password Email Template</title>
                    <meta name="description" content="Reset Password Email Template.">
                    <style type="text/css">
                        @import url "https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700";
                        a:hover {text-decoration: underline !important;}
                        * {
                            font-family: "Rubik";
                        }
                        ::selection {
                          background: #FA6E00;
                          color: white;
                        }
                
                    </style>
                </head>
                
                <body marginheight="0" topmargin="0" marginwidth="0" style="margin: 0px; background-color: #f2f3f8;" leftmargin="0">
                    <!--100% body table-->
                    <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
                        style="font-family: 'Rubik', sans-serif;">
                        <tr>
                            <td>
                                <table style="background-color: #FA6E00; max-width:670px;  margin:0 auto;" width="100%" border="0"
                                    align="center" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="height:80px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align:center;">
                                          <a href="https://rakeshmandal.com" title="logo" target="_blank">
                                            <img src="public/img/logo/logo.png" width="250px">
                                          </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="height:20px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0"
                                                style="max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);">
                                                <tr>
                                                    <td style="height:40px;">&nbsp;</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:0 35px;">
                                                        <h1 style="color:#620000; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;">You have
                                                            requested to reset your password</h1>
                                                        <span
                                                            style="display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;"></span>
                                                        <p style="color:#455056; font-size:15px;line-height:24px; margin:0;">
                                                            A unique link to reset your
                                                            password has been generated for you. To reset your password, click the
                                                            following link and follow the instructions.
                                                        </p>
                                                        <a href="http://localhost:3000/auth/new-password/${resetToken}"
                                                            style="background:#620000;text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:3px;">Reset
                                                            Password</a>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="height:40px;">&nbsp;</td>
                                                </tr>
                                            </table>
                                        </td>
                                    <tr>
                                        <td style="height:20px;">&nbsp;</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align:center;">
                                            <p style="font-size:14px; color:#620000; line-height:18px; margin:0 0 0;">&copy; <strong>www.thepowercheckers.com</strong></p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="height:80px;">&nbsp;</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <!--/100% body table-->
                </body>
                
                </html>`
    }

    transporter.sendMail(message, function (err, info) {
        if (err) {
            return req.flash('error_msg', 'SMTP server error'),
                res.redirect("/auth/recover-password")

        } else {

            req.flash('success_msg', 'Email sent successfully!!')
            res.redirect("/auth/recover-password")
        }
    })



})

router.get('/new-password/:token', (req, res) => {
    res.render("auth/newpassword", {
        params: req.params.token
    })
})

router.post('/new-password/:token', async (req, res) => {
    var erros = []
    if (!req.body.newPassword || typeof req.body.newPassword == undefined || req.body.newPassword == null) {
        erros.push({ text: "Invalid password" })
    }

    if (!req.body.confirmPassword || typeof req.body.confirmPassword == undefined || req.body.confirmPassword == null) {
        erros.push({ text: "Invalid password" })
    }

    if (req.body.newPassword.length < 4 || req.body.confirmPassword.length < 4) {
        erros.push({ text: "Password too short" })
    }

    if (req.body.newPassword != req.body.confirmPassword) {
        erros.push({ text: "Passwords must be the same" })
    }

    if (erros.length > 0) {
        res.render(`auth/newpassword`, { erros: erros, params: req.params.token })
    } else {

        const resetPasswordHashToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");

        const user = await dashboardUser.findOne({ recoveryToken: resetPasswordHashToken })


        if (!user) {
            return req.flash('error_msg', 'Invalid token'), res.redirect(`/auth/new-password/${req.params.token}`)

        }
        bcrypt.genSalt(10, (error, salt) => {
            bcrypt.hash(req.body.newPassword, salt, async (error, hash) => {
                if (error) {
                    return req.flash('error_msg', 'There was an error updating the account, please try again'),
                        res.redirect(`/auth/new-password/${req.params.token}`)
                }
                user.password = hash
                user.recoveryToken = undefined;
                await user.save()

                req.flash('success_msg', 'Password changed successfully!!')
                res.redirect("/auth/login")

            })
        })
    }
})


module.exports = router