module.exports = {
  isLoggedin: function (req, res, next) {
    if (req.isAuthenticated() && req.user.isLoggedin == 1) {
      return next();
    }
    req.flash("error_msg", "You need to be logged to access this page!");
    res.redirect("/");
  },
};
