const Order = require("../../model/orderSchema");
const Address = require("../../model/addressSchema");
const mongoose = require("mongoose");



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
            .populate({
                path: 'orderedItems.product',
                select: 'productName productImage salePrice'
            })
            .populate('address');

        if (!order) {
            console.error("Order not found");
            return res.redirect('/profile');
        }

        res.render('order-details', {
            order,
            user,
            address: order.address,
            page: 'Order Details'
        });
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.redirect('/profile');
    }
};

// const getOrderDetails = async(req,res)=>{

//     try{

//         const orderId = req.query.orderId;
//         const userId = req.session.user.id;
//         const user = req.session.user;

//         const order = await Order.findOne({ _id: orderId, userId })
//                     .populate({
//                         path: 'orderedItems.product',
//                         select: 'productName productImage salePrice'
//                     })
//                     .populate('address');


        
//         res.render('order-details', {
//             order,
//             user,
//             page: 'Order Details'
//         });

//     }catch(error){
//         console.error("Error fetching order details:", error);
//         res.redirect("/profile");
//     }

// }

module.exports = {
   
    getOrderDetails
};
