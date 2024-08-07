const {
    UserOTPService,
    VerifyOTPService,
    SaveProfileService,
    ReadProfileService
} = require('../service/UserServices');

exports.UserOTP = async (req,res) => {
    let result = await UserOTPService(req);
    return res.status(200).json(result);
}

exports.VerifyLogin = async (req, res) => {
    try {
        let result = await VerifyOTPService(req);

        if (result.status === "success") {
            // Set Cookie
            let cookieOption = {
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                httpOnly: true // Secure the cookie
            };
            // Set Cookie With Response
            res.cookie('token', result.token, cookieOption);
        }

        // Send the result back to the client
        res.json(result);
    } catch (error) {
        console.error('Error in VerifyLogin:', error); // Log the error
        res.status(500).json({ status: 'fail', message: 'Internal Server Error', data: error.message || error });
    }
};


exports.UserLogout = async (req,res) => {
    let cookieOptions = {
        expires: new Date(Date.now()-24*60*60*1000),
        httpOnly: false
    };
    res.cookie('token','',cookieOptions);
    return res.status(200).json({status:'success'});
}

exports.CreateProfile = async (req,res) => {
    let result = await SaveProfileService(req);
    return res.status(200).json(result); 
}

exports.UpdateProfile = async (req,res) => {
    let result = await SaveProfileService(req);
    return res.status(200).json(result);
}

exports.ReadProfile = async (req,res) => {
    let result = await ReadProfileService(req);
    return res.status(200).json(result);
}