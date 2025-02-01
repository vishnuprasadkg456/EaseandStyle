const Order = require('../../model/orderSchema');
const Coupon = require('../../model/couponSchema');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const moment = require('moment');



const getSalesPage = async (req,res)=>{
    try{

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // Get overall stats
        const overall = await Order.aggregate([
            {
                $match: {
                    status: 'Delivered',
                    paymentStatus: 'Paid'
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$finalAmount' },
                    totalOrders: { $count: {} },
                    totalDiscount: { $sum: { $add: ['$discount', '$couponDiscount'] } }
                }
            }
        ]);

        // Get today's detailed report
        const todayReport = await Order.aggregate([
            {
                $match: {
                    createdOn: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    },
                    status: 'Delivered',
                    paymentStatus: 'Paid'
                }
            },
            {
                $unwind: '$orderedItems' // Decompose the array to individual items
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdOn' } },
                    orderCount: { $sum: 1 },
                    totalSales: { $sum: '$finalAmount' },
                    totalDiscount: { $sum: { $add: ['$discount', '$couponDiscount'] } },
                    totalItems: { $sum: '$orderedItems.quantity' } // Sum all quantities
                }
            }
        ]);
        
        // Get coupon counts
        const [activeCoupons, inactiveCoupons] = await Promise.all([
            Coupon.countDocuments({ isListed: true }),
            Coupon.countDocuments({ isListed: false })
        ]);

       // Add new aggregations for top products, categories, and brands
       const [topProducts, topCategories, topBrands] = await Promise.all([
        // Top Products
        Order.aggregate([
            {
                $match: {
                    status: 'Delivered',
                    paymentStatus: 'Paid'
                }
            },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: {
                        productId: '$orderedItems.product',
                        productName: '$productDetails.productName'
                    },
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { 
                        $sum: { 
                            $multiply: ['$orderedItems.quantity', '$orderedItems.price'] 
                        }
                    }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]),

        // Top Categories
        Order.aggregate([
            {
                $match: {
                    status: 'Delivered',
                    paymentStatus: 'Paid'
                }
            },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: '$categoryDetails' },
            {
                $group: {
                    _id: {
                        categoryId: '$productDetails.category',
                        categoryName: '$categoryDetails.name' // Assuming your category schema has a 'name' field
                    },
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { 
                        $sum: { 
                            $multiply: ['$orderedItems.quantity', '$orderedItems.price'] 
                        }
                    }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]),

        // Top Brands
        Order.aggregate([
            {
                $match: {
                    status: 'Delivered',
                    paymentStatus: 'Paid'
                }
            },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.brand',
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { 
                        $sum: { 
                            $multiply: ['$orderedItems.quantity', '$orderedItems.price'] 
                        }
                    }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ])
    ]);

    res.json({
        overall: {
            totalSales: overall[0]?.totalSales || 0,
            totalOrders: overall[0]?.totalOrders || 0,
            totalDiscount: overall[0]?.totalDiscount || 0
        },
        today: {
            reports: todayReport.map(report => ({
                date: report._id,
                orderCount: report.orderCount,
                totalSales: report.totalSales,
                totalDiscount: report.totalDiscount,
                totalItems: report.totalItems
            }))
        },
        coupons: {
            active: activeCoupons,
            inactive: inactiveCoupons
        },
        topProducts: topProducts.map(product => ({
            name: product._id.productName,
            quantity: product.totalQuantity,
            revenue: product.totalRevenue
        })),
        topCategories: topCategories.map(category => ({
            name: category._id.categoryName || 'Unknown Category',
            quantity: category.totalQuantity,
            revenue: category.totalRevenue
        })),
        topBrands: topBrands.map(brand => ({
            name: brand._id || 'Unknown Brand',
            quantity: brand.totalQuantity,
            revenue: brand.totalRevenue
        }))
    });

    
    }catch(error){

        console.error('Error fetching initial sales data:', error);
        res.status(500).json({ message: 'Error fetching sales data' });
    
    }
}





function getDateRangeQuery(reportType, startDate, endDate) {
    let queryConditions = {};
    let dateFormat = 'YYYY-MM-DD';

    switch (reportType) {
        case 'daily':
            queryConditions.createdOn = {
                $gte: moment().startOf('day').toDate(),
                $lte: moment().endOf('day').toDate()
            };
            break;
        case 'weekly':
            queryConditions.createdOn = {
                $gte: moment().startOf('week').toDate(),
                $lte: moment().endOf('week').toDate()
            };
            break;
        case 'monthly':
            queryConditions.createdOn = {
                $gte: moment().startOf('month').toDate(),
                $lte: moment().endOf('month').toDate()
            };
            break;
        case 'yearly':
            queryConditions.createdOn = {
                $gte: moment().startOf('year').toDate(),
                $lte: moment().endOf('year').toDate()
            };
            dateFormat = 'YYYY-MM';
            break;
        case 'custom':
            if (!startDate || !endDate) {
                throw new Error('Start and end dates are required for custom range');
            }
            queryConditions.createdOn = {
                $gte: moment(startDate).startOf('day').toDate(),
                $lte: moment(endDate).endOf('day').toDate()
            };
            break;
        default:
            throw new Error('Invalid report type');
    }

    return { queryConditions, dateFormat };
}

const validateReportRequest = (req, res, next) => {
    const { reportType, startDate, endDate } = req.method === 'GET' ? req.query : req.body;
    
    if (!reportType) {
        return res.status(400).json({ message: 'Report type is required' });
    }

    const validReportTypes = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
    if (!validReportTypes.includes(reportType)) {
        return res.status(400).json({ message: 'Invalid report type' });
    }

    if (reportType === 'custom') {
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start and end dates are required for custom range' });
        }
        if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        if (moment(endDate).isBefore(startDate)) {
            return res.status(400).json({ message: 'End date cannot be before start date' });
        }
    }

    next();
};

async function generateSalesReportData(reportType, startDate, endDate) {
    try {
        const { queryConditions, dateFormat } = getDateRangeQuery(reportType, startDate, endDate);

        const [salesReport, overallSummary] = await Promise.all([
            Order.aggregate([
                { 
                    $match: { 
                        ...queryConditions,
                        status: 'Delivered' 
                    }
                },
                
                    // $group: {
                    //     _id: { $dateToString: { format: dateFormat, date: "$createdOn" } },
                    //     orderCount: { $sum: 1 },
                    //     totalSales: { $sum: "$totalPrice" },
                    //     totalDiscount: { $sum: { $add: ["$discount", "$couponDiscount"] } },
                    //     totalItems: { $sum: { $size: "$items" } }
                    // }


                    {
                        $unwind: '$orderedItems' // Decompose the array to individual items
                    },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdOn' } },
                            orderCount: { $sum: 1 },
                            totalSales: { $sum: '$finalAmount' },
                            totalDiscount: { $sum: { $add: ['$discount', '$couponDiscount'] } },
                            totalItems: { $sum: '$orderedItems.quantity' } // Sum all quantities
                        }
                    }

                ,
                { $sort: { _id: 1 } }
            ]),
            Order.aggregate([
                { 
                    $match: { 
                        ...queryConditions,
                        status: 'Delivered' 
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: "$totalPrice" },
                        totalOrders: { $sum: 1 },
                        totalDiscount: { $sum: "$discount" }
                    }
                }



                

            ])
        ]);

        const [activeCoupons, inactiveCoupons] = await Promise.all([
            Coupon.countDocuments({ isListed: true }),
            Coupon.countDocuments({ isListed: false })
        ]);

        return {
            reports: salesReport.map(item => ({
                date: item._id,
                orderCount: item.orderCount,
                totalSales: item.totalSales,
                totalDiscount: item.totalDiscount,
                netSales: item.totalSales - item.totalDiscount,
                totalItems: item.totalItems
            })),
            totalSales: overallSummary[0]?.totalSales || 0,
            totalOrders: overallSummary[0]?.totalOrders || 0,
            totalDiscount: overallSummary[0]?.totalDiscount || 0,
            activeCoupons,
            inactiveCoupons
        };
    } catch (error) {
        console.error('Error generating sales report data:', error);
        throw error;
    }
}

const generateSalesReport = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.body;
        const reportData = await generateSalesReportData(reportType, startDate, endDate);
        res.json(reportData);
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ message: 'Error generating sales report' });
    }
};

const addPageIfNeeded = (doc, currentY, pageHeight) => {
    if (currentY > pageHeight - 100) {
        doc.addPage();
        return doc.y;
    }
    return currentY;
};

const downloadSalesReportPDF = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.query;
        const salesData = await generateSalesReportData(reportType, startDate, endDate);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${moment().format('YYYY-MM-DD')}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Sales Report', { align: 'center' });
        let currentY = doc.y + 20;

        // Report Details
        doc.fontSize(12)
           .text(`Report Type: ${reportType.toUpperCase()}`, 50, currentY)
           .text(`Generated On: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, 50, currentY + 20);
        
        currentY = doc.y + 30;
        currentY = addPageIfNeeded(doc, currentY, doc.page.height);

        // Summary Section
        doc.fontSize(14).text('Summary', 50, currentY);
        currentY = doc.y + 10;
        
        doc.fontSize(12)
           .text(`Total Sales: ₹${salesData.totalSales.toFixed(2)}`, 50, currentY)
           .text(`Total Orders: ${salesData.totalOrders}`, 50, currentY + 20)
           .text(`Total Discount: ₹${salesData.totalDiscount.toFixed(2)}`, 50, currentY + 40);

        currentY = doc.y + 30;
        currentY = addPageIfNeeded(doc, currentY, doc.page.height);

        // Sales Details Table
        doc.fontSize(14).text('Sales Details', 50, currentY);
        currentY = doc.y + 10;

        const tableHeaders = ['Date', 'Orders', 'Total Sales', 'Discount', 'Net Sales'];
        const columnWidths = [100, 80, 100, 100, 100];
        
        // Table Header
        doc.fontSize(10);
        tableHeaders.forEach((header, i) => {
            const x = 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
            doc.text(header, x, currentY, { width: columnWidths[i], align: 'center' });
        });

        currentY = doc.y + 10;
        doc.moveTo(50, currentY).lineTo(530, currentY).stroke();
        currentY += 10;

        // Table Rows
        doc.fontSize(9);
        for (const report of salesData.reports) {
            currentY = addPageIfNeeded(doc, currentY, doc.page.height);

            const rowData = [
                report.date,
                report.orderCount.toString(),
                `₹${report.totalSales.toFixed(2)}`,
                `₹${report.totalDiscount.toFixed(2)}`,
                `₹${report.netSales.toFixed(2)}`
            ];

            rowData.forEach((data, i) => {
                const x = 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
                doc.text(data, x, currentY, { width: columnWidths[i], align: 'center' });
            });
            currentY = doc.y + 10;
        }

        doc.end();
    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({ message: 'Error generating PDF report' });
    }
};

const downloadSalesReportExcel = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.query;
        const salesData = await generateSalesReportData(reportType, startDate, endDate);

        const worksheetData = [
            ['Sales Report', `Type: ${reportType}`, `Generated: ${moment().format('YYYY-MM-DD')}`],
            ['Total Sales', `₹${salesData.totalSales.toFixed(2)}`],
            ['Total Orders', salesData.totalOrders],
            ['Total Discount', `₹${salesData.totalDiscount.toFixed(2)}`],
            [],
            ['Date', 'Orders', 'Total Sales', 'Discount', 'Net Sales']
        ];

        salesData.reports.forEach(report => {
            worksheetData.push([
                report.date,
                report.orderCount,
                report.totalSales,
                report.totalDiscount,
                report.netSales
            ]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        
        // Format currency columns
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = 6; R <= range.e.r; R++) {
            ['C', 'D', 'E'].forEach(col => {
                const cell = worksheet[`${col}${R + 1}`];
                if (cell) {
                    cell.z = '₹#,##0.00';
                }
            });
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${moment().format('YYYY-MM-DD')}.xlsx`);
        res.send(excelBuffer);
    } catch (error) {
        console.error('Error generating Excel report:', error);
        res.status(500).json({ message: 'Error generating Excel report' });
    }
};

module.exports = {
    getSalesPage,
    generateSalesReport,
    downloadSalesReportPDF,
    downloadSalesReportExcel,
    validateReportRequest
};