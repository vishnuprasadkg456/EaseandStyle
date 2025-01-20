
const Order = require('../../model/orderSchema');
const User = require('../../model/userSchema');


const getOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId') 
            .populate({
                path: 'orderedItems.product', // Populate product details within orderedItems
                select: 'productName productImage', //  productName and productImage fields
            });
        
        res.render('order-management', { orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ status: false, message: "Failed to fetch orders." });
    }
};


const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found." });
        }

        order.status = status;
        await order.save();

        res.json({ status: true, message: "Order status updated successfully." });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ status: false, message: "Failed to update order status." });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found." });
        }

        order.status = "Cancelled"; // Update the status to "Cancelled"
        await order.save();

        res.json({ status: true, message: "Order cancelled successfully." });
    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ status: false, message: "Failed to cancel the order." });
    }
};


// get order deetailed view 


const getOrderDetails = async (req, res) => {
    try {

        console.log("getOrderDetails hit")
        const { orderId } = req.params;

        // Find the order by its ID and populate necessary fields
        const order = await Order.findById({_id:orderId})
            .populate('userId', 'name email') // Fetch user details
            .populate('orderedItems.product'); // Fetch product details

        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found." });
        }

        // Render the admin order detail page with the fetched order data
        res.render('admin-order-details', { order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ status: false, message: "Failed to fetch order details." });
    }
};


module.exports = {
    getOrders,
    updateOrderStatus,
    cancelOrder,
    getOrderDetails,
 
};