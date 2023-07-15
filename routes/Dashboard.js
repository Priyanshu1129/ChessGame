const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
require("../models/Dashboard");
require("../models/Games");
const dashboardUser = mongoose.model("dashboard_users");
const dashboardGame = mongoose.model("dashboard_games")
const bcrypt = require("bcryptjs");
const datetime = require("datetime")
const { isLoggedin } = require("../helpers/isLoggedin");
const path = require("path");
const fetch = require("node-fetch");
const { isDiamondSelected } = require("../helpers/isDiamondSelected");

router.get("/", isLoggedin, (req, res) => {
  res.render("dashboard/useraccount", { diamond: req.user.numberDiamonds });
});

router.get("/single-player", isLoggedin, (req, res) => {
  res.render("dashboard/single_player_game");
});

router.get("/multi-player", isLoggedin, (req, res) => {
  res.render("dashboard/multiple_player_game");
});

router.get("/history", isLoggedin, async (req, res) => {
  const history = await dashboardGame.find(
    { $or: [{ "user_1": req.user.user }, { "user_2": req.user.user }] }
  )
  const historyGames = history.map((game)=> ({
    opponent: req.user.user === game.user_1 ? game.user_2: game.user_1,
    diamonds: game.diamondToCut !== 0 ? req.user.user === game.user_1 ? 
    `+${game.diamondToCut + game.diamondToCut * 0.85}` :`-${game.diamondToCut}`:0,
    mode: game.mode,
    status: game.draw === true ? "draw" : req.user.user === game.user_1 ? "Won":"Lost",
    date: game.date.toISOString().substring(0,10)
  }))
  res.render("dashboard/history", { historyGames });
});


router.get("/competitive-game", isLoggedin, isDiamondSelected, async (req, res) => {
  const user = await dashboardUser.findOne({ _id: req.query.response }).lean()
  res.locals.user = [{
    ...user,
    numberDiamonds: req.user.numberDiamonds - Number(req.query.selectedDiamond)
  }]
  res.render("dashboard/competitive_game", {
    diamond: req.query.selectedDiamond,
    userId: req.query.response,
  });
});

router.get("/cut-diamond", isLoggedin, (req, res, next) => {
  // const diamond = req.user.numberDiamonds - Number(req.query.diamond);

  if (req.query.diamond)
    return res.redirect(
      `/dashboard/competitive-game?response=${req.user._id}&selectedDiamond=${req.query.diamond}`
    );
  else
    return res.redirect("/dashboard");

  // if (req.query.diamond) {
  //   return dashboardUser
  //     .findByIdAndUpdate(
  //       req.user._id,
  //       {
  //         numberDiamonds: diamond,
  //       },
  //       { new: true, useFindAndModify: false }
  //     )
  //     .then((response) => {
  //       // req.flash("success_msg", "Account successfully updated!");
  //       res.redirect(
  //         `/dashboard/competitive-game?response=${response._id}&selectedDiamond=${req.query.diamond}`
  //       );
  //     })
  //     .catch((error) => {
  //       console.log(error);
  //       req.flash("error_msg", "Server Error while trying to cut your diamond");
  //       res.redirect("/dashboard");
  //     });
  // }

});

router.get("/diamonds", isLoggedin, (req, res) => {
  res.render("dashboard/balance");
});

router.get("/account", isLoggedin, (req, res) => {
  res.render("dashboard/accountchanges");
});

router.post("/account", isLoggedin, (req, res) => {
  var erros = [];

  if (
    !req.body.user ||
    typeof req.body.user == undefined ||
    req.body.user == null
  ) {
    erros.push({ text: "Invalid user" });
  }

  if (
    !req.body.email ||
    typeof req.body.email == undefined ||
    req.body.email == null
  ) {
    erros.push({ text: "Invalid email" });
  }

  if (
    !req.body.oldPassword ||
    typeof req.body.oldPassword == undefined ||
    req.body.oldPassword == null
  ) {
    erros.push({ text: "Invalid password" });
  }
  if (
    !req.body.newPassword ||
    typeof req.body.newPassword == undefined ||
    req.body.newPassword == null
  ) {
    erros.push({ text: "Invalid password" });
  }
  if (
    !req.body.repeatPassword ||
    typeof req.body.repeatPassword == undefined ||
    req.body.repeatPassword == null
  ) {
    erros.push({ text: "Invalid password" });
  }

  if (
    req.body.oldPassword.length < 4 ||
    req.body.newPassword.length < 4 ||
    req.body.repeatPassword.length < 4
  ) {
    erros.push({ text: "Password too short" });
  }

  if (req.body.newPassword != req.body.repeatPassword) {
    erros.push({ text: "Passwords must be the same" });
  }

  if (erros.length > 0) {
    res.render("dashboard/accountchanges", { erros: erros });
  } else {
    dashboardUser
      .findOne({ email: req.body.email, user: req.body.user })
      .then((dashboard_users) => {
        if (dashboard_users) {
          req.flash(
            "error_msg",
            "An account with this email or user name already exists"
          );
          res.redirect("/dashboard/account");
        } else {
          bcrypt.compare(
            req.body.oldPassword,
            req.user.password,
            (err, data) => {
              //if error than throw error
              if (err) {
                req.flash("error_msg", "Password didn't match");
                res.redirect("/dashboard/account");
              }
              //if both match than you can do anything
              if (data) {
                bcrypt.genSalt(10, (error, salt) => {
                  bcrypt.hash(req.body.newPassword, salt, (error, hash) => {
                    if (error) {
                      req.flash(
                        "error_msg",
                        "There was an error updating the account, please try again"
                      );
                      res.redirect("/dashboard/account");
                    }

                    dashboardUser
                      .findByIdAndUpdate(
                        req.user._id,
                        {
                          user: req.body.user,
                          email: req.body.email,
                          password: hash,
                          isLoggedin: 1,
                        },
                        { new: true, useFindAndModify: false }
                      )
                      .then(() => {
                        req.flash(
                          "success_msg",
                          "Account successfully updated!"
                        );
                        res.redirect("/auth/login");
                      })
                      .catch((error) => {
                        req.flash(
                          "error_msg",
                          "There was an error updating the account, please try again"
                        );
                        res.redirect("/dashboard/account");
                      });
                  });
                });
              } else {
                req.flash("error_msg", "Invalid credencial");
                res.redirect("/dashboard/account");
              }
            }
          );
        }
      })
      .catch((err) => {
        req.flash("error_msg", "There was an internal error");
        res.redirect("/dashboard/account");
      });
  }
});

router.get("/support", isLoggedin, (req, res) => {
  res.render("dashboard/support-user");
});

router.get("/terms", isLoggedin, (req, res) => {
  res.render("dashboard/terms-user");
});

router.get("/privacy", isLoggedin, (req, res) => {
  res.render("dashboard/privacypolicy-user");
});

router.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "Successfully logged out!");
    res.redirect("/");
  });
});

module.exports = router;
