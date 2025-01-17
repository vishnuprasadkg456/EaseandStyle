const mongoose = require("mongoose");
const { Schema } = mongoose;

const paymentSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: ["Credit Card", "Debit Card", "PayPal", "COD", "UPI", "Bank Transfer"],
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ["Pending", "Completed", "Failed", "Refunded"],
        default: "Pending",
        required: true,
    },
    transactionId: {
        type: String, // Unique transaction ID from the payment gateway
        required: function () {
            return this.paymentStatus === "Completed";
        },
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    createdOn: {
        type: Date,
        default: Date.now,
    },
    updatedOn: {
        type: Date,
        default: Date.now,
    },
});

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
