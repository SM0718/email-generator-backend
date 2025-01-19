import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { Template } from "../models/template.model.js";
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const addTemplate = asyncHandler(async (req, res) => {
    try {
      const { structure } = req.body;
      const userId = req?.user?._id // Assuming `req.user` contains the authenticated user info
        console.log(structure)
      if (!structure) {
        return res.status(400).json({ message: 'Template structure is required' });
      }
  
      const newTemplate = new Template({
        structure,
        owner: userId,
      });
  
      const savedTemplate = await newTemplate.save();
      return res.status(201).json(new ApiResponse(201, savedTemplate, 'Template saved successfully'));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to save template', error: error.message });
    }
  })

const getUserTemplates = asyncHandler(async (req, res) => {
    try {
      const userId = req?.user?._id; // Assuming `req.user` contains the authenticated user info
  
      const userTemplates = await Template.find({ owner: userId }).sort({ createdAt: -1 }); // Sorted by latest
      return res.status(200).json({ message: 'User templates retrieved successfully', data: userTemplates });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Failed to retrieve templates', error: error.message });
    }
  })

export {
    addTemplate,
    getUserTemplates
}