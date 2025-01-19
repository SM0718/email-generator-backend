import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}



const registerUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    console.log(email, password)
    try {
        // Ensure all required fields are provided
        if ([email, password].some((field) => field?.trim() === "")) {
            throw new ApiError(400, "All fields are required");
        }
        
        // Password validation regex (at least 8 characters, 1 number, and 1 special character)
        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
        if (!password || !passwordRegex.test(password)) {
            throw new ApiError(400, "Password must be at least 8 characters long, contain at least one number and one special character.");
        }

        // Check if the user already exists by username or email
        const existedUser = await User.findOne({
            $or: [{ email: email }]
        });

        if (existedUser) {
            throw new ApiError(409, "User with this email or username already exists");
        }

        // Create the user with email and password
        const user = await User.create({ email, password });

        // Retrieve user without password and refreshToken for response
        const createdUser = await User.findById(user._id).select("-password -refreshToken");

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }

        // Respond with the created user details
        const response = { user: createdUser };
        
        return res.status(201).json(
            new ApiResponse(200, response, "User registered successfully")
        );
    } catch (error) {
        throw new ApiError(500, `Failed to create user: ${error.message}`);
    }
});


const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    try {
        // Ensure email and password are provided
        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            throw new ApiError(404, "User does not exist");
        }

        // Validate password
        const isPasswordValid = await user.isPasswordCorrect(password);

        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid email or password");
        }

        // Generate access and refresh tokens
        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        // Exclude password and refreshToken from the response
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    {
                        user: loggedInUser,
                        accessToken,
                        refreshToken
                    },
                    "User logged in successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, `Failed to login user: ${error.message}`);
    }
});


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: 'None'
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword, confirmNewPassword} = req.body

    if(newPassword !== confirmNewPassword) {
        throw new ApiError(400, "New Password and Confirm Passwords Doesn't Match")
    }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;

    // Check if the password meets the criteria
    if (!newPassword || !passwordRegex.test(newPassword)) {
        throw new ApiError(400, "'Password must be at least 8 characters long, contain at least one number and one special character.'")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req, res) => {
    console.log("Inside Current User")
    try {
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
    } catch (error) {
        throw new ApiError(401, "User not logged in")
    }
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

//Pending Test
const getOrderHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    getOrderHistory,
}