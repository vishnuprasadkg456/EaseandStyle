const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../model/userSchema");
const env = require("dotenv").config();




passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                isAdmin: 0 // Ensure this matches your schema
            });
            await user.save();
        }
        
        // Transform user into session-friendly format
        const sessionUser = {
            _id: user._id,
            id: user._id, // Include both for compatibility
            name: user.name,
            email: user.email,
            googleId: user.googleId
        };
        
        return done(null, sessionUser);
    } catch (error) {
        console.error("Error in Google strategy:", error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            return done(null, false);
        }
        
        // Transform user into session-friendly format
        const sessionUser = {
            _id: user._id,
            id: user._id,
            name: user.name,
            email: user.email,
            googleId: user.googleId
        };
        
        done(null, sessionUser);
    } catch (err) {
        done(err, null);
    }
});


module.exports = passport;