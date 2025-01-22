const Order = require("../../model/orderSchema");
const Address = require("../../model/addressSchema");
const mongoose = require("mongoose");
const Payment = require("../../model/paymentSchema");



const getOrderDetails = async (req, res) => {
    try {

        const orderId = req.query.orderId;
        const userId = req.session.user.id;
        const user = req.session.user;


        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            console.error("Invalid orderId");
            return res.redirect('/profile');
        }

        const order = await Order.findOne({ _id: orderId, userId })
            .populate('payment')
            .populate({
                path: 'orderedItems.product',
                select: 'productName productImage salePrice',
            })
            .exec();


        console.log("order details : ", order);

        if (!order) {
            console.error("Order not found");
            return res.redirect('/profile');
        }

        const addressData = await Address.findOne({ userId });
        const orderAddress = order.address

        console.log("order adddress : ", orderAddress);

        res.render('order-details', {
            order,
            user,
            address: orderAddress,
            page: 'Order Details'
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.redirect('/profile');
    }
};




const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;

        // Validate the request payload
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required",
            });
        }

        // Fetch the order by ID
        const order = await Order.findById(orderId).populate("payment"); // Populate payment if it's a reference
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // Check if the order is cancelable
        const cancelableStatuses = ["Pending", "Processing"];
        if (!cancelableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be canceled. Current status: ${order.status}`,
            });
        }

        // Update the order status to "Cancelled"
        order.status = "Cancelled";
        order.updatedOn = new Date();

        // If there's an associated payment, update the payment status
        if (order.payment) {
            const payment = await Payment.findById(order.payment);
            if (payment && payment.paymentStatus !== "Refunded") {
                payment.paymentStatus = "Refunded";
                await payment.save();
            }
        }

        // Save the updated order
        await order.save();

        res.status(200).json({
            success: true,
            message: "Order canceled successfully",
        });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while canceling the order",
        });
    }
};


module.exports = {

    getOrderDetails,
    cancelOrder,
};
