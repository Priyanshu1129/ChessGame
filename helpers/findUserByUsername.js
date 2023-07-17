const mongoose= require('mongoose')
const dashboardUser = mongoose.model("dashboard_users")

module.exports= async function findUserByUsername(username) {
    try {
        const user = await dashboardUser.findOne({ user: username });
        if (user) {
            return user;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }
}
