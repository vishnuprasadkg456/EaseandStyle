const Order = require("../../model/orderSchema");
const Address = require("../../model/addressSchema");
const mongoose = require("mongoose");
const Payment = require("../../model/paymentSchema");
const PDFDocument = require("pdfkit");
const User = require("../../model/userSchema");
const Wallet = require("../../model/walletSchema");
const path = require("path");


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
            .populate('userId')
            .populate({
                path: 'orderedItems.product',
                select: 'productName productImage salePrice',
            })
            .exec();


        // console.log("order details : ", order);

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
        const userId = req.session.user.id; // Ensure the user is authenticated
        const { orderId } = req.body;

        // Validate the request payload
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required.",
            });
        }

        // Fetch the order by ID
        const order = await Order.findById(orderId).populate("payment");
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        // Verify the order belongs to the user
        if (order.userId.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to cancel this order.",
            });
        }

        // Check if the order is cancelable
        const cancelableStatuses = ["Pending", "Processing"];
        if (!cancelableStatuses.includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be canceled. Current status: ${order.status}.`,
            });
        }

        // Update the order status to "Cancelled"
        order.status = "Cancelled";
        order.updatedOn = new Date();

         let wallet = await Wallet.findOne({ userId: order.userId._id });
                if (!wallet) {
                    wallet = new Wallet({
                        userId: order.userId._id,
                        balance: 0,
                        transactions: []
                    });
                }

        // Handle refund if status is being changed to "Returned" or "Return Confirmed"
        if ((order.status==="Cancelled") && 
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

        if (order.payment&&order.paymentStatus==="Paid") {
            const payment = await Payment.findById(order.payment);
       
        payment.paymentStatus = "Refunded";
        await payment.save();
       console.log("payment.paymentStatus", payment.paymentStatus);
    }


        // Save the updated order
        await order.save();

        // Respond with success
        res.status(200).json({
            success: true,
            message: "Order canceled successfully. Amount refunded to the wallet.",
        });
    } catch (error) {
        console.error("Error canceling order:", error);

        res.status(500).json({
            success: false,
            message: "An error occurred while canceling the order.",
        });
    }
};



//invoicedetails

const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.query;
        const userId = req.session.user.id;

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            console.error("Invalid orderId");
            return res.status(400).send("Invalid order ID");
        }

        const order = await Order.findOne({ _id: orderId, userId })
            .populate({
                path: "orderedItems.product",
                select: "productName salePrice",
            })
            .exec();

        if (!order) {
            console.error("Order not found");
            return res.status(404).send("Order not found");
        }

        // Set response headers for file download
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=invoice-${orderId}.pdf`
        );
        res.setHeader("Content-Type", "application/pdf");

        // Create a PDF document and pipe it to the response
        const doc = new PDFDocument();
        doc.pipe(res);

        // Add content to the PDF
        doc.fontSize(18).text("Invoice", { align: "center" });
        doc.moveDown();

        doc.fontSize(12).text(`Order ID: ${order._id}`);
        doc.text(`Order Date: ${new Date(order.createdOn).toLocaleDateString()}`);
        doc.text(`Customer: ${req.session.user.name}`);
        doc.moveDown();

        doc.text("Items Ordered:");
        doc.moveDown();
        order.orderedItems.forEach((item, index) => {
            doc.text(
                `${index + 1}. ${item.product.productName} x ${item.quantity} @ ₹${item.price} = ₹${item.quantity * item.price}`
            );
        });

        doc.moveDown();
        doc.text(`Subtotal: ₹${order.totalPrice}`);
        if (order.discount) {
            doc.text(`Discount: -₹${order.discount}`);
        }
        if (order.couponDiscount) {
            doc.text(`Coupon Discount: -₹${order.couponDiscount}`);
        }
        doc.text(`Final Amount: ₹${order.finalAmount}`);
        doc.end();
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).send("Failed to generate invoice");
    }
};
const requestReturn = async (req, res) => {
    try {
        const { orderId, returnReason } = req.body; // Add returnReason to the destructured request body
        const userId = req.session.user.id;

        // Validate the request payload
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "Order ID is required.",
            });
        }

        // Validate the return reason
        if (!returnReason || returnReason.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Return reason is required.",
            });
        }

        // Fetch the order by ID
        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found.",
            });
        }

        // Check if the order is eligible for return
        if (order.status !== "Delivered") {
            return res.status(400).json({
                success: false,
                message: "Return can only be requested for delivered orders.",
            });
        }

        // Check if a return request already exists
        if (order.status === "Return Requested" || order.status === "Returned") {
            return res.status(400).json({
                success: false,
                message: "Return request already submitted.",
            });
        }

        // Update the order status to "Return Requested" and store the return reason
        order.status = "Return Requested";
        order.returnReason = returnReason; // Save the return reason
        order.updatedOn = new Date();
        await order.save();

        // Respond with success
        res.status(200).json({
            success: true,
            message: "Return request submitted successfully.",
        });
    } catch (error) {
        console.error("Error submitting return request:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while submitting the return request.",
        });
    }
};

module.exports = {

    getOrderDetails,
    cancelOrder,
    downloadInvoice,
    requestReturn,
};
