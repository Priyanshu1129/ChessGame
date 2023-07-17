const mongoose = require("mongoose")
const Schema = mongoose.Schema

const dashboardGames = new Schema({
    user_1: {
        type: String,
        require: true
    },
    user_2: {
        type: String,
        require: true
    },
    mode: {
        type: String,
        require: true
    },
    diamondToCut:{
        type: Number,
        require: true
    },
    draw:{
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now()
    }

})

mongoose.model("dashboard_games", dashboardGames)