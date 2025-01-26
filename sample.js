

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { addressId, paymentMethod } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized. Please log in." });
        }

        // Fetch user's cart
        const cart = await Cart.findOne({ userId }).populate({
            path: "items.productId",
            select: "productName salePrice stock",
        });

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty. Add items to proceed." });
        }

        // Fetch the selected address
        const addressData = await Address.findOne({ userId });
        const selectedAddress = addressData?.address.find(
            (addr) => addr._id.toString() === addressId
        );

        if (!selectedAddress) {
            return res.status(404).json({ message: "Selected address not found." });
        }

        // Calculate order totals
        let subtotal = 0;
        cart.items.forEach((item) => {
            subtotal += item.productId.salePrice * item.quantity;
        });

        const discount = cart.discount || 0;
        const couponDiscount = cart.couponDiscount ;
        const finalAmount = cart.finalPrice

        

        // Create the order
        const newOrder = new Order({
            userId,
            orderedItems: cart.items.map((item) => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.productId.salePrice,
            })),
            totalPrice: subtotal,
            discount,
            couponDiscount,
            finalAmount,
            addressRef: selectedAddress._id,
            address: { 
                addressType: selectedAddress.addressType,
                name: selectedAddress.name,
                landMark : selectedAddress.landMark,
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phone: selectedAddress.phone,
                altPhone: selectedAddress.altPhone,
            },
            status: "Pending",
        });

        const savedOrder = await newOrder.save();

        
        // Create payment record
        const newPayment = new Payment({
            paymentId: uuidv4(),
            orderId:savedOrder._id,
            userId,
            amount: finalAmount,
            paymentMethod,
            status: "Pending", // Update status later upon confirmation
        });

        const savedPayment = await newPayment.save();

        savedOrder.payment = savedPayment._id;
        await savedOrder.save();


        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for product: ${product.productName}`,
                });
            }
        }

        // Update product stock
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            product.stock -= item.quantity;
            await product.save();
        }

       

        
         await Cart.updateOne(
            { userId },
            { 
                $set: { 
                    items: [], 
                    discount: 0, 
                    couponDiscount: 0, 
                    finalPrice: 0, 
                    appliedCoupon: null 
                } 
            }
        );

        res.status(200).json({
            message: "Order placed successfully!",
            orderId: savedOrder._id,
        });
    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).json({ message: "Failed to place the order. Please try again." });
    }
};

