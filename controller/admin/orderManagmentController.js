
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

        console.log("payment status : ", paymentStatus);

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
        if ((status === "Returned" || status === "Return Confirmed" || status === "Cancelled") &&
            order.payment.paymentStatus === "Paid") {  // Check order's payment status

            // Check if a refund transaction already exists for this order
            const refundExists = wallet.transactions.some(
                t => t.description.includes(order.orderId) && t.type === "credit"
            );

            if (!refundExists) {
                // Create new wallet transaction
                const transaction = {
                    transactionId: new mongoose.Types.ObjectId(),
                    type: "credit",
                    amount: order.finalAmount,
                    description: `Refund for order ${order.orderId}`,
                    date: new Date()
                };

                // Update wallet using findOneAndUpdate to ensure atomic operation
                wallet = await Wallet.findOneAndUpdate(
                    { userId: order.userId._id },
                    {
                        $inc: { balance: order.finalAmount },
                        $push: {
                            transactions: transaction
                        }
                    },
                    { new: true, upsert: true }
                );


                await User.findByIdAndUpdate(
                    order.userId._id,
                    {
                        $push: {
                            history: {
                                amount: order.finalAmount,
                                status: "refund",
                                date: new Date(),
                                orderId: order.orderId
                            }
                        }
                    }
                );



            }
        }

        // Update order status
        if (status) {
            order.status = status;
            order.updatedOn = new Date();
        }

        // Update payment status if provided
        // if (paymentStatus && order.payment.paymentStatus !== "Refunded") {
        //     const payment = await Payment.findById(order.payment._id);
        //     if (payment) {
        //         payment.paymentStatus = paymentStatus;
        //         await payment.save();
        //     }
        // }
        const payment = await Payment.findById(order.payment);
        if (order.status === "Returned" && order.paymentStatus === "Paid") {


            payment.paymentStatus = "Refunded";
            await payment.save();
            console.log("payment.paymentStatus", payment.paymentStatus);
        }
        if (payment) {
            payment.paymentStatus = paymentStatus;
            order.paymentStatus = paymentStatus;
            await payment.save();
        }

        // Save the updated order
        await order.save();

        // Fetch the updated wallet to get the correct balance
        const updatedWallet = await Wallet.findOne({ userId: order.userId._id });

        res.json({
            status: true,
            message: (status === "Returned" || status === "Return Confirmed" || status === "Cancelled") &&
                order.paymentStatus === "Refunded"
                ? "Order updated and amount refunded to wallet successfully."
                : "Order status updated successfully.",
            currentBalance: updatedWallet ? updatedWallet.balance : 0
        });

    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ status: false, message: "Failed to update order status." });
    }
};

// // Add this function to handle direct wallet refunds
// const refundToWallet = async (req, res) => {
//     try {
//         const { orderId } = req.body;
//         const userId = req.user._id;

//         // Find the specific order
//         const order = await Order.findById(orderId);

//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Order not found'
//             });
//         }

//         // Validate refund conditions
//         if (!['Cancelled', 'Returned', 'Return Confirmed'].includes(order.status)) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Only cancelled or returned orders can be refunded'
//             });
//         }

//         // Check if already refunded
//         if (order.paymentStatus === 'Refunded') {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Order already refunded'
//             });
//         }

//         // Find or create wallet and add transaction
//         const wallet = await Wallet.findOneAndUpdate(
//             { userId },
//             {
//                 $push: {
//                     transactions: {
//                         transactionId: new mongoose.Types.ObjectId(),
//                         type: 'credit',
//                         amount: order.finalAmount,
//                         description: `Refund for ${order.status.toLowerCase()} order ${order.orderId}`,
//                         date: new Date()
//                     }
//                 }
//             },
//             {
//                 new: true,
//                 upsert: true
//             }
//         );

//         // Update order payment status
//         order.paymentStatus = 'Refunded';
//         order.updatedOn = new Date();
//         await order.save();

//         res.json({
//             success: true,
//             message: 'Order amount refunded to wallet',
//             refundedAmount: order.finalAmount,
//             currentBalance: wallet.balance
//         });

//     } catch (error) {
//         console.error('Wallet refund error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error processing refund'
//         });
//     }
// };


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