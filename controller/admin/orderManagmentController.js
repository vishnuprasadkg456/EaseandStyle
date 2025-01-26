
const Order = require('../../model/orderSchema');
const User = require('../../model/userSchema');
const Payment = require('../../model/paymentSchema');


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
        const { orderId, status, paymentStatus } = req.body;

        console.log("payment status :", paymentStatus);
        // Fetch the order by ID
        const order = await Order.findById(orderId).populate("payment");


        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found." });
        }

        // Update order status if provided
        if (status) {
            order.status = status;
        }

        // Update payment status if provided
        const payment = await Payment.findById(order.payment);
        if (!payment) throw new Error("Payment not found");
        payment.paymentStatus = paymentStatus;
        await payment.save();

        // Save the updated order
        await order.save();
        console.log(("order payment  details :", order.payment.paymentStatus));

        res.json({ status: true, message: "Order and payment status updated successfully." });
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
        const order = await Order.findById({ _id: orderId })
            .populate('userId', 'name email phoneNumber') // Fetch user details
            .populate('orderedItems.product') // Fetch product details
            .populate('payment').exec();
            
            
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