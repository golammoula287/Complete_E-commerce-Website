const CartModel = require("../models/CartModel");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const CartListService = async (req) => {
  try {
    // Convert user_id from headers to ObjectId
    let user_id = new ObjectId(req.headers.user_id);
    
    // Define stages of the aggregation pipeline
    let matchStage = { $match: { userID: user_id } };
    let JoinStageProduct = {
      $lookup: {
        from: 'products',
        localField: 'productID',
        foreignField: '_id',
        as: 'product',
      },
    };
    let JoinStageBrand = {
      $lookup: {
        from: 'brands',
        localField: 'product.brandID',
        foreignField: '_id',
        as: 'brand',
      },
    };
    let JoinStageCategory = {
      $lookup: {
        from: 'categories',
        localField: 'product.categoryID',
        foreignField: '_id',
        as: 'category',
      },
    };

    // Handle potential issues with unwind
    let unwindProductStage = { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } };
    let unwindBrandStage = { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } };
    let unwindCategoryStage = { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } };

    // Define projection stage
    let ProjectionStages = {
      $project: {
        userID: 0,
        createdAt: 0,
        updatedAt: 0,
        'product._id': 0,
        'product.categoryID': 0,
        'product.brandID': 0,
        'brand._id': 0,
        'category._id': 0,
      },
    };

    // Aggregate data
    let data = await CartModel.aggregate([
      matchStage,
      JoinStageProduct,
      JoinStageBrand,
      JoinStageCategory,
      unwindProductStage,
      unwindBrandStage,
      unwindCategoryStage,
      ProjectionStages,
    ]);

    //console.log('Aggregated Data:', JSON.stringify(data));

    return { status: 'success', message: 'Cart list Found.', data: data };
  } catch (error) {
    console.error('Error in CartListService:', error);
    return { status: 'fail', message: 'Something went wrong.', data: error };
  }
};

module.exports = CartListService;

const SaveCartListService = async (req) => {
  try {
    let user_id = req.headers.user_id;
    let reqBody = req.body;
    reqBody.userID = user_id;
    await CartModel.create(reqBody);
    return { status: "success", message: "Cartlist saved successfully." };
  } catch (err) {
    return { status: "fail", message: "Something went wrong." };
  }
};

const UpdateCartListService = async (req) => {
  try {
    let user_id = req.headers.user_id;
    let reqBody = req.body;
    let cartID = req.params.cartID;
    reqBody.userID = user_id;
    const data = await CartModel.updateOne({_id: cartID, userID: user_id}, {$set: reqBody});
    return { status: "success", message: "Cartlist updated successfully.", data:data };
  } catch (err) {
    return { status: "fail", message: "Something went wrong." };
  }
};

const RemoveCartListService = async (req) => {
  try {
    let user_id = req.headers.user_id;
    let reqBody = req.body;
    reqBody.userID = user_id;
    await CartModel.deleteOne(reqBody);
    return { status: "success", message: "Cart list removed successfully." };
  } catch (err) {
    return { status: "fail", message: "Something went wrong." };
  }
};

module.exports = {
  CartListService,
  SaveCartListService,
  UpdateCartListService,
  RemoveCartListService,
};
