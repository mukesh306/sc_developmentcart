const express = require("express");
const router = express.Router();
const SchoolercategoryController = require("../controllers/SchoolercategoryController");
const auth = require('../middleware/auth');


router.post("/schooler/Categorycreate", auth, SchoolercategoryController.createSchoolercategory);
router.get("/schooler/allcategory", SchoolercategoryController.getAllSchoolercategories);
router.get("/schooler/category/:id", SchoolercategoryController.getSchoolercategoryById);
router.put("/schooler/Categoryupdate/:id", auth, SchoolercategoryController.updateSchoolercategory);
router.delete("/schooler/Categorydelete/:id", auth, SchoolercategoryController.deleteSchoolercategory);




router.post("/schooler/groupcreate", auth, SchoolercategoryController.createSchoolergroup);

router.get("/schooler/allgroup", auth,SchoolercategoryController.getAllSchoolergroups);
router.get("/schooler/group/:id", SchoolercategoryController.getSchoolergroupById);
router.put("/schooler/groupupdate/:id", auth, SchoolercategoryController.updateSchoolergroup);
router.delete("/schooler/groupdelete/:id", auth, SchoolercategoryController.deleteSchoolergroup);


module.exports = router;
