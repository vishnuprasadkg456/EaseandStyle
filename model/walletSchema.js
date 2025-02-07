const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Each user should have only one wallet
    },
    balance: {
      type: Number,
      required: true,
      default: 0, // Default wallet balance
      min: 0, // Prevent negative balances
    },
    transactions: [
      {
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          default: () => new mongoose.Types.ObjectId(), // Generate unique IDs
        },
        type: {
          type: String,
          enum: ["credit", "debit"], // Use lowercase for consistency
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0, // Ensure no negative transaction amounts
        },
        description: {
          type: String,
          default: "", // Optional description for the transaction
        },
        date: {
          type: Date,
          default: Date.now, // Automatically set the transaction date
        },
      },
    ],
    refundStatus: {
      type: String,
      enum: [
        "Not Refunded",
        "Refunded to Wallet",
        "Refunded to Original Method",
      ],
      default: "Not Refunded",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Middleware to update `updatedAt` and recalculate balance on wallet updates
walletSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  this.balance = this.transactions.reduce((total, txn) => {
    return txn.type === "credit" ? total + txn.amount : total - txn.amount;
  }, 0);

  // Ensure balance is never negative
  if (this.balance < 0) {
    return next(new Error("Wallet balance cannot be negative"));
  }
  next();
});

module.exports = mongoose.model("Wallet", walletSchema);
