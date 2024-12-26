// Import the User model from the userSchema file
const User = require("../../model/userSchema");

// Controller function to retrieve customer information
const customerInfo = async (req, res) => {
    try {
        // Initialize the search query string
        let search = "";
        if (req.query.search) {
            // If a search query is provided, use it
            search = req.query.search;
        }

        // Set the default page number to 1
        let page = 1;
        if (req.query.page) {
            // If a page query is provided, use it
            page = req.query.page;
        }

        const limit = 3; // Limit the number of results per page

        // Fetch user data based on the search query, excluding admin users
        const userData = await User.find({
            isAdmin: false, // Only non-admin users
            $or: [
                // Match users where the name or email partially matches the search query
                { name: { $regex: ".*" + search + ".*" } },
                { email: { $regex: ".*" + search + ".*" } }
            ],
        })
            .limit(limit * 1) // Limit the number of results per page
            .skip((page - 1) * limit) // Skip results for previous pages
            .exec(); // Execute the query

        // Count the total number of documents matching the search criteria
        const count = await User.find({
            isAdmin: false, // Only non-admin users
            $or: [
                // Match users where the name or email partially matches the search query
                { name: { $regex: ".*" + search + ".*" } },
                { email: { $regex: ".*" + search + ".*" } }
            ],
        }).countDocuments();

        // Render the 'customers' view with retrieved data
        res.render('customers', {
            data: userData, // Send the user data to the view
            totalPages: Math.ceil(count / limit), // Calculate total pages
            currentPage: page, // Indicate the current page
            searchQuery: search // Pass the search query
        });

    } catch (error) {
        // Log and handle any errors that occur
        console.error("Error fetching customer information:", error);
       res.redirect("/pageerror");
    }
};

const customerBlocked = async (req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/users");
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const customerunBlocked = async (req,res)=>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/users");
    } catch (error) {
        res.redirect("/pageerror");
        
    }
}

// Export the customerInfo function to use it in routes
module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked
};
