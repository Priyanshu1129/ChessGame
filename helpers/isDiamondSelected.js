module.exports = {
  isDiamondSelected: function (req, res, next) {
    if (req.query.response) {
      return next();
    }
    req.flash("error_msg", "You need to select a diamond to play this game!");
    res.redirect("/dashboard");
  },
};
