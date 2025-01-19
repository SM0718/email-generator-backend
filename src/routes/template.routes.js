import { Router } from "express";
import {
    addTemplate,
    getUserTemplates
} from '../controllers/template.controller.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/add-template").post(verifyJWT, addTemplate)
router.route("/get-user-templates").get(verifyJWT, getUserTemplates); 

// // secured routes
// router.route("/logout").post(verifyJWT, logoutUser)
// router.route("/current-user").get(verifyJWT, getCurrentUser)

export default router