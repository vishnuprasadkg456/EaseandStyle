
const Order = require('../../model/orderSchema');
const User = require('../../model/userSchema');
const Wallet = require('../../model/walletSchema');
const Payment = require('../../model/paymentSchema');
const mongoose = require('mongoose');


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

        // Find order and populate necessary fields
        const order = await Order.findById(orderId)
            .populate("payment")
            .populate("userId");

        if (!order) {
            return res.status(404).json({ status: false, message: "Order not found." });
        }

        // Get or create user's wallet
        let wallet = await Wallet.findOne({ userId: order.userId._id });
        if (!wallet) {
            wallet = new Wallet({
                userId: order.userId._id,
                balance: 0,
                transactions: []
            });
        }

        console.log("wallet details", wallet);
        // Handle refund if status is being changed to "Returned" or "Return Confirmed"
        if ((status === "Returned" || status === "Return Confirmed") && 
            order.payment.paymentStatus === "Paid" &&
            wallet.refundStatus === "Not Refunded") {
            
            // Create new wallet transaction
            const transaction = {
                transactionId: new mongoose.Types.ObjectId(),
                type: "credit",
                amount: order.finalAmount,
                description: `Refund for order ${order.orderId}`,
                date: new Date()
            };

            // Add transaction to wallet
            wallet.transactions.push(transaction);
            wallet.refundStatus = 'Refunded to Wallet';

            // Update user's history
            const user = await User.findById(order.userId._id);
            if (user) {
                user.history.push({
                    amount: order.finalAmount,
                    status: "refund",
                    date: new Date(),
                    orderId: order.orderId
                });
                await user.save();
            }

            // Update payment status to refunded
            const payment = await Payment.findById(order.payment._id);
            if (payment) {
                payment.paymentStatus = "Refunded";
                await payment.save();
            }

            // Save wallet changes
            await wallet.save();
        }

        // Update order status
        if (status) {
            order.status = status;
        }

        // Update payment status if provided
        if (paymentStatus && order.payment) {
            const payment = await Payment.findById(order.payment._id);
            if (payment) {
                payment.paymentStatus = paymentStatus;
                await payment.save();
            }
        }

        // Save the updated order
        await order.save();

        res.json({ 
            status: true, 
            message: (status === "Returned" || status === "Return Confirmed") && 
                    order.payment.paymentStatus === "Paid"
                ? "Order updated and amount refunded to wallet successfully." 
                : "Order and payment status updated successfully."
        });

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

        if (!order.returnReason) {
            order.returnReason = "No reason provided";
        }
        // Render the admin order detail page with the fetched order data
        res.render('admin-order-details', { order });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).json({ status: false, message: "Failed to fetch order details." });
    }
};


const confirmReturn = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        order.status = "Return Confirmed";
        await order.save();
        res.json({ success: true, message: "Return confirmed successfully." });
    } catch (error) {
        console.error("Error confirming return:", error);
        res.status(500).json({ success: false, message: "Failed to confirm return." });
    }
};

const rejectReturn = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        order.status = "Return Rejected";
        await order.save();
        res.json({ success: true, message: "Return rejected successfully." });
    } catch (error) {
        console.error("Error rejecting return:", error);
        res.status(500).json({ success: false, message: "Failed to reject return." });
    }
};


module.exports = {
    getOrders,
    updateOrderStatus,
    cancelOrder,
    getOrderDetails,
    confirmReturn,
    rejectReturn

};