const mongoose = require("mongoose");
const dashboardUser = mongoose.model("dashboard_users");

async function addDiamonds(condition, diamondsToAdd) {
  try {
    // Update the user's diamonds in the database
    const updateResult = await dashboardUser.updateOne(
      condition,
      { $inc: { numberDiamonds: diamondsToAdd } }
    );

    if (updateResult.nModified === 0) {
      console.log("User not found or diamonds not updated:", condition);
      return null;
    }

    // Fetch the updated user document
    const updatedUser = await dashboardUser.findOne(condition);

    // Return the updated diamonds count
    return updatedUser.numberDiamonds;
  } catch (error) {
    console.log("Error adding diamonds:", error);
    return null;
  }
}

module.exports = addDiamonds;
