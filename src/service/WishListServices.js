const WishModel = require("../models/WishModel");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const WishListService = async (req) => {
    try {
        let user_id = new mongoose.Types.ObjectId(req.headers.user_id);

        let matchStage = { $match: { userID: user_id } };

        let JoinStageProduct = {
            $lookup: {
                from: "products",
                localField: "productID",
                foreignField: "_id",
                as: "product",
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
        let JoinStageCategory = {
            $lookup: {
                from: "categories",
                localField: "product.categoryID",
                foreignField: "_id",
                as: "category",
            },
        };

        // Log data after each stage
        let data = await WishModel.aggregate([
            matchStage,
            JoinStageProduct,
            { $project: { userID: 1, product: 1, brand: 1, category: 1 } } // Only include fields for debugging
        ]);
        //console.log("Data after Join and Project Stages:", JSON.stringify(data));

        data = await WishModel.aggregate([
            matchStage,
            JoinStageProduct,
            JoinStageBrand,
            JoinStageCategory,
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
            { $project: { userID: 0, createdAt: 0, updatedAt: 0, "product._id": 0, "product.categoryID": 0, "product.brandID": 0, "brand._id": 0, "category._id": 0 } }
        ]);

       // console.log("Aggregated Data:", JSON.stringify(data));

        if (data.length > 0) {
            return { status: "success", message: "Wish list Found.", data: data };
        } else {
            return { status: "fail", message: "No data found.", data: [] };
        }
    } catch (error) {
        console.error("Error in WishListService:", error);
        return { status: "fail", message: "Something went wrong.", data: error };
    }
};

const SaveWishListService = async (req) => {
    try {
        let user_id = req.headers.user_id;
        let reqBody = req.body;
        reqBody.userID = user_id;
        await WishModel.updateOne(reqBody, { $set: reqBody }, { upsert: true });
        return { status: "success", message: "Wish list save success." };
    } catch (error) {
        return { status: "fail", message: "Something went wrong.", data: error };
    }
};

const RemoveWishListService = async (req) => {
    try {
        let user_id = req.headers.user_id;
        let reqBody = req.body;
        reqBody.userID = user_id;
        await WishModel.deleteOne(reqBody, { $set: reqBody });
        return { status: "success", message: "Wish list removed success." };
    } catch (error) {
        return { status: "fail", message: "Something went wrong.", data: error };
    }
};



module.exports = {
  WishListService,
  SaveWishListService,
  RemoveWishListService,
};
