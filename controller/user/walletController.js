const Wallet = require("../../model/walletSchema");
const Payment = require("../../model/paymentSchema");
const Order = require("../../model/orderSchema");
const User = require("../../model/userSchema");

const Razorpay = require("razorpay");
const crypto = require("crypto");
const env = require("dotenv").config();


const refundCodWallet = async (req, res) => {


    try {

        const { orderId } = req.body;
        const userId = req.user._id;

        // Find the specific order
        const order = await Order.findById(orderId);
        console.log("wallet order details ", order);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Validate refund conditions
        if (order.status !== 'Cancelled' || order.payment.paymentMethod !== 'COD') {
            return res.status(400).json({
                success: false,
                message: 'Only cancelled COD orders can be refunded'
            });
        }

        // Check if already refunded
        if (order.refundStatus === 'Refunded to Wallet') {
            return res.status(400).json({
                success: false,
                message: 'Order already refunded'
            });
        }

        // Find or create wallet
        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            });
        }

        // Add refund transaction
        wallet.transactions.push({
            type: 'credit',
            amount: order.finalAmount,
            description: `Refund for cancelled COD order #${order.orderId}`
        });

        // Save wallet and update order
        await Promise.all([
            wallet.save(),
            Order.findByIdAndUpdate(orderId, {
                refundStatus: 'Refunded to Wallet'
            })
        ]);

        res.json({
            success: true,
            message: 'Order amount refunded to wallet',
            refundedAmount: order.finalAmount
        });


    } catch (error) {

        console.error('Wallet refund error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing refund'
        });
    }

}


const getWalletData = async (req, res) => {
    try {
        const userId = req.session.user.id;

        // Find the user and populate their wallet information
        const user = await User.findById(userId).populate('wallet');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Find or create wallet if it doesn't exist
        let wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) {
            wallet = new Wallet({
                userId: user._id,
                balance: 0,
                transactions: []
            });
            await wallet.save();
            
            // Update user with wallet reference
            user.wallet = wallet._id;
            await user.save();
        }

        res.status(200).json({
            success: true,
            walletData: {
                balance: wallet.balance,
                transactions: wallet.transactions.map(transaction => ({
                    transactionId: transaction.transactionId,
                    type: transaction.type,
                    amount: transaction.amount,
                    description: transaction.description,
                    date: transaction.date
                })),
                refundStatus: wallet.refundStatus
            }
        });

    } catch (error) {
        console.error("Error fetching wallet data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch wallet data"
        });
    }
};




const addMoneyToWallet = async (req, res) => {
    try {
        const userId = req.session.user.id; // Assuming session contains logged-in user
        const { amount } = req.body;

        // Validate the amount
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        // Create a Razorpay order
        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: amount * 100, // Convert to smallest currency unit (paise)
            currency: "INR",
            receipt: `wallet_${Date.now()}`,
        };

        const order = await instance.orders.create(options);

        // Update wallet balance and add transaction history
        await User.updateOne(
            { _id: userId },
            {
                $inc: { wallet: amount }, // Increment wallet balance
                $push: {
                    history: {
                        amount,
                        status: "Credit",
                        date: new Date(),
                    },
                },
            }
        );

        res.json({
            success: true,
            message: "Money added to wallet successfully.",
            order,
        });
    } catch (error) {
        console.error("Error adding money to wallet:", error);
        res.status(500).json({
            success: false,
            message: "An error occurred while adding money to wallet.",
        });
    }
};





module.exports = {
    refundCodWallet,
    getWalletData,
    addMoneyToWallet

}