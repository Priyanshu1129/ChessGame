const mongoose = require("mongoose");

require('../models/Games')
const dashboardGames = mongoose.model("dashboard_games")

async function addGame(GameResult) {
  try {
    // Inserting the game final result in database
    const result = await dashboardGames.create(GameResult);   
    
    console.log("result", result);
  } catch (error) {
    console.log("Error in adding Game result:", error);
    return null;
  }
}

module.exports = addGame;
