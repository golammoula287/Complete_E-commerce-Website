const { WishListService, SaveWishListService, RemoveWishListService } = require("../service/WishListServices")

exports.WishList = async (req,res) => {
    let result = await WishListService(req);
    return res.status(200).json(result);
}

exports.SaveWishList = async (req,res) => {
    let result = await SaveWishListService(req);
    return res.status(200).json(result);
}

// exports.RemoveWishList = async (req,res) => {
//     let result = await RemoveWishListService(req);
//     return res.status(200).json(result);
// }

exports.RemoveWishList = async (req, res) => {
    try {
        let result = await RemoveWishListService(req);

        if (result.status === "success") {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result); // Or 404 if it's not found
        }
    } catch (error) {
        // In case an unexpected error occurs, return a 500 status
        return res.status(500).json({ status: "fail", message: "Internal server error.", data: error.message });
    }
};
