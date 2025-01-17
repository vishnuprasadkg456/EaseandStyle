const Order = require("../../model/orderSchema");
const Address = require("../../model/addressSchema");

const getUserOrders = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = req.session.user;
        
        const orders = await Order.find({ userId })
            .populate({
                path: 'orderedItems.product',
                select: 'productName productImage'
            })
            .sort({ createdAt: -1 });

        res.render('profile', {
            orders,
            user,
            page: 'Profile'
        });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const userId = req.session.user.id;
        const user = req.session.user;

        const order = await Order.findOne({ _id: orderId, userId })
            .populate({
                path: 'orderedItems.product',
                select: 'productName productImage salePrice'
            })
            .populate('address');

        if (!order) {
            console.error("Order not found");
            return res.redirect('/profile');
        }

        res.render('orderDetails', {
            order,
            user,
            page: 'Order Details'
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.redirect('/profile');
    }
};

module.exports = {
    getUserOrders,
    getOrderDetails
};
