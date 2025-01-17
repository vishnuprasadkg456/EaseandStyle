const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        items: [
            {
                productId: {
                    type: Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                quantity: {
                    type: Number,
                    default: 1,
                    validate: {
                        validator: (value) => value > 0,
                        message: "Quantity must be greater than zero",
                    },
                },
                price: {
                    type: Number,
                    required: true,
                    default: function() {
                        return this.productId.salePrice;
                    }
                },
                totalPrice: {
                    type: Number,
                    required: true,
                    default: function () {
                        return this.salePrice * this.quantity;
                    },
                },
                status: {
                    type: String,
                    default: "placed",
                },
                cancellationReason: {
                    type: String,
                    default: "none",
                },
            },
        ],
        discount: {
            type: Number,
            default: 0,
        },
        finalPrice: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);
cartSchema.virtual("cartTotal").get(function () {
    return this.items.reduce((total, item) => total + item.price * item.quantity, 0);
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
