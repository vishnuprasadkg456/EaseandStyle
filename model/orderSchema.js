const mongoose = require ("mongoose");
const {Schema} = mongoose;
const {v4 : uuidv4} = require('uuid');

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true,
    },
    orderedItems: [
        {
            product: {
                type: Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            price: {
                type: Number,
                required: true,
                min: 0,
            },
        },
    ],
    totalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
    },
    finalAmount: {
        type: Number,
    },
    address: {
        type: Schema.Types.ObjectId,
        ref: "Address",
        required: true,
    },
    payment: {
        type: Schema.Types.ObjectId,
        ref: "Payment", // Reference to the Payment schema
    },
    invoiceDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        required: true,
        enum: [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Return Request",
            "Returned",
        ],
        default: "Pending",
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true,
    },
    updatedOn: {
        type: Date,
        default: Date.now,
    },
    deliveryDate: {
        type: Date,
        default: function () {
            return new Date(this.createdOn.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
        },
        validate: {
            validator: function (value) {
                return value > this.createdOn;
            },
            message: "Delivery date must be after the order creation date.",
        },
    },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
