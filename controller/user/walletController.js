const Wallet = require("../../model/walletSchema");
const Payment = require("../../model/paymentSchema");
const Order = require("../../model/orderSchema");


const refundCodWallet = async (req,res)=>{


    try{

        const { orderId } = req.body;
        const userId = req.user._id;

        // Find the specific order
        const order = await Order.findById(orderId);
        console.log("wallet order details ",order);
        
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


    }catch(error){

        console.error('Wallet refund error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing refund' 
        });
    }

}



const getWallet = async (req, res) => {
    try {
        const userId = req.user._id; // Ensure req.user is populated (via middleware)

        // Fetch wallet data for the user
        const wallet = await Wallet.findOne({ userId });

        // Render the profile page and pass wallet data
        res.render("profile", {
            user: req.user, // Other user data (if required)
            wallet: wallet || { balance: 0, transactions: [] }, // Default empty wallet if not found
        });
    } catch (error) {
        console.error("Error rendering user profile:", error);
        res.status(500).send("Internal Server Error");
    }
};



module.exports = {
    refundCodWallet,
    getWallet

}