const mongoose = require('mongoose');
const CartModel = require('../models/CartModel');
const ProfileModel = require('../models/ProfileModel');
const InvoiceModel = require('../models/InvoiceModel');
const InvoiceProductModel = require('../models/InvoiceProductModel');
const PaymentSettingModel = require('../models/PaymentSettingModel');

const ObjectId = mongoose.Types.ObjectId;

const FormData = require('form-data');
const axios = require('axios');

const CreateInvoiceService = async (req) => {
    try {
        let user_id = new ObjectId(req.headers.user_id);
        let cust_email = req.headers.email;

        // Match stage for user ID
        let matchStage = { $match: { userID: user_id } };

        // Join stages
        let JoinStageProduct = {
            $lookup: {
                from: "products",
                localField: "productID",
                foreignField: "_id",
                as: "product",
            },
        };
        let JoinStageCategory = {
            $lookup: {
                from: "categories",
                localField: "product.categoryID",
                foreignField: "_id",
                as: "category",
            },
        };
        let JoinStageBrand = {
            $lookup: {
                from: "brands",
                localField: "product.brandID",
                foreignField: "_id",
                as: "brand",
            },
        };

        // Unwind stages
        let UnwindStageProduct = { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } };
        let UnwindStageCategory = { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } };
        let UnwindStageBrand = { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } };

        // Fetch Cart Products with aggregation
        let CartProducts = await CartModel.aggregate([
            matchStage,
            JoinStageProduct,
            JoinStageCategory,
            JoinStageBrand,
            UnwindStageProduct,
            UnwindStageCategory,
            UnwindStageBrand,
            { $project: { userID: 1, product: 1, category: 1, brand: 1, qty: 1, color: 1, size: 1 } } // Only include necessary fields
        ]);

        // Calculate total amount and VAT
        let totalAmount = 0;
        CartProducts.forEach((element) => {
            let price = element.product.discount ? parseFloat(element.product.discountPrice) : parseFloat(element.product.price);
            totalAmount += parseFloat(element.qty) * price;
        });

        let vat = totalAmount * 0.05; // 5% VAT
        let payable = totalAmount + vat;

        // Prepare customer and shipping details
        let Profile = await ProfileModel.aggregate([matchStage]);
        let cus_details = `Name: ${Profile[0].cus_name}, Email: ${cust_email}, Address: ${Profile[0].cus_add}, Phone: ${Profile[0].cus_phone}`;
        let ship_details = `Name: ${Profile[0].ship_name}, City: ${Profile[0].ship_city}, Address: ${Profile[0].ship_add}, Phone: ${Profile[0].ship_phone}`;

        // Generate transaction and other IDs
        let tran_id = Math.floor(10000000 + Math.random() * 9000000);
        let val_id = 0;
        let delivery_status = "pending";
        let payment_status = "pending";

        // Create Invoice
        let createInvoice = await InvoiceModel.create({
            userID: user_id,
            payable: payable,
            cus_details: cus_details,
            ship_details: ship_details,
            tran_id: tran_id,
            val_id: val_id,
            delivery_status: delivery_status,
            payment_status: payment_status,
            total: totalAmount,
            vat: vat,
        });

        // Create Invoice Product entries
        let invoice_id = createInvoice._id;

        CartProducts.forEach(async (element) => {
            await InvoiceProductModel.create({
                userID: user_id,
                productID: element.productID,
                invoiceID: invoice_id,
                color: element.color,
                price: element.product.discount ? element.product.discountPrice : element.product.price,
                qty: element.qty,
                size: element.size,
            });
        });

        // Remove items from Cart
        await CartModel.deleteMany({ userID: user_id });

        // Prepare SSL payment
        let PaymentSettings = await PaymentSettingModel.find();

        const form = new FormData();
        form.append("store_id", PaymentSettings[0].store_id);
        form.append("store_passwd", PaymentSettings[0].store_passwd);
        form.append("total_amount", payable.toString());
        form.append("currency", PaymentSettings[0].currency);
        form.append("tran_id", tran_id);
        form.append("success_url", `${PaymentSettings[0].success_url}/${tran_id}`);
        form.append("fail_url", `${PaymentSettings[0].fail_url}/${tran_id}`);
        form.append("cancel_url", `${PaymentSettings[0].cancel_url}/${tran_id}`);
        form.append("ipn_url", `${PaymentSettings[0].ipn_url}/${tran_id}`);
        form.append("cus_name", Profile[0].cus_name);
        form.append("cus_email", cust_email);
        form.append("cus_add1", Profile[0].cus_add);
        form.append("cus_add2", Profile[0].cus_add);
        form.append("cus_city", Profile[0].cus_city);
        form.append("cus_state", Profile[0].cus_state);
        form.append("cus_postcode", Profile[0].cus_postCode);
        form.append("cus_country", Profile[0].cus_country);
        form.append("cus_phone", Profile[0].cus_phone);
        form.append("cus_fax", Profile[0].cus_phone);
        form.append("shipping_method", "YES");
        form.append("ship_name", Profile[0].ship_name);
        form.append("ship_add1", Profile[0].ship_add);
        form.append("ship_area", Profile[0].ship_add);
        form.append("ship_city", Profile[0].ship_city);
        form.append("ship_postcode", Profile[0].ship_postCode);
        form.append("ship_state", Profile[0].ship_state);
        form.append("ship_country", Profile[0].ship_country);
        form.append("product_name", "Computer");
        form.append("product_category", "Electronic");
        form.append("product_profile", "General");
        form.append("product_amount", 10);

        let SSLRes = await axios.post(PaymentSettings[0].init_url, form);

        return { status: "success", data: SSLRes.data };
    } catch (e) {
        console.error("Error in CreateInvoiceService:", e);
        return { status: "fail", message: "Something went wrong", error: e };
    }
};


const PaymentFailService = async (req) => {
    try {
        let trxID = req.params.trxID;
        await InvoiceModel.updateOne({tran_id:trxID},{payment_status:"fail"});
        return {status: 'success', data: ''}
    } catch(e) {
        return {status: 'Fail', message: 'Something went wrong', error: e}
    }
}

const PaymentCancelService = async (req) => {
    try {
        let trxID = req.params.trxID;
        await InvoiceModel.updateOne({tran_id:trxID},{payment_status:"cancel"});
        return {status: 'success', data: ''}
    } catch(e) {
        return {status: 'Fail', message: 'Something went wrong', error: e}
    }
}

const PaymentSuccessService = async (req) => {
    try {
        let trxID = req.params.trxID;
        await InvoiceModel.updateOne({tran_id:trxID},{payment_status:"success"});
        return {status: 'success', data: ''}
    } catch(e) {
        return {status: 'Fail', message: 'Something went wrong', error: e}
    }
}

const PaymentIPNService = async (req) => {
    try {
        let trxID = req.params.trxID;
        let status = req.body['status'];
        await InvoiceModel.updateOne({tran_id:trxID},{payment_status: status});
        return {status: 'success', data: ''}
    } catch(e) {
        return {status: 'Fail', message: 'Something went wrong', error: e}
    }
}

const InvoiceListService = async (req) => {
    try {
        let user_id = new ObjectId(req.headers.user_id);

        // Calculate total payable & vat
        let matchStages = {$match:{userID: user_id}};
        let invoice = await InvoiceModel.aggregate([matchStages]);
        
        return {status: 'success', data: invoice}
    } catch(e) {
        return {status: 'Fail', message: 'Something went wrong', error: e}
    }
}

const InvoiceProductListService = async (req) => {
    try {
        let user_id = new ObjectId(req.headers.user_id);
        let invoice_id = new ObjectId(req.params.invoice_id);

        let products = await InvoiceProductModel.find({
            userID: user_id,
            invoiceID: invoice_id
        });

        return { status: 'success',Data:products };
    } catch (e) {
        console.error("Detailed Error:", e);
        return { status: 'fail', message: 'Something went wrong', error: e };
    }
}


module.exports = {
    CreateInvoiceService,
    PaymentFailService,
    PaymentCancelService,
    PaymentIPNService,
    PaymentSuccessService,
    InvoiceListService,
    InvoiceProductListService
}