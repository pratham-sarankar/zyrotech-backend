import express from "express";
import { auth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import Group from "../models/Group";

const router = express.Router();

// All group routes require authentication
router.use(auth);

/**
 * @route POST /api/groups
 * @desc Create a new group
 * @access Private
 */
router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;

    // Validate required field
    if (!name) {
      throw new AppError("Group name is required", 400, "missing-group-name");
    }

    // Check if group with same name already exists
    const existingGroup = await Group.findOne({ name: name.trim() });
    if (existingGroup) {
      throw new AppError(
        "Group with this name already exists",
        409,
        "group-name-exists"
      );
    }

    // Create new group
    const group = await Group.create({
      name: name.trim(),
    });

    // Transform response
    const transformedGroup: any = {
      ...group.toObject(),
      id: group._id,
    };
    delete transformedGroup._id;
    delete transformedGroup.__v;

    res.status(201).json({
      status: "success",
      message: "Group created successfully",
      data: transformedGroup,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/groups
 * @desc Get all groups
 * @access Private
 */
router.get("/", async (_req, res, next) => {
  try {
    const groups = await Group.find({}).select("-__v").sort({ name: 1 });

    // Transform response
    const transformedGroups = groups.map((group) => {
      const transformedGroup: any = {
        ...group.toObject(),
        id: group._id,
      };
      delete transformedGroup._id;
      return transformedGroup;
    });

    res.status(200).json({
      status: "success",
      data: transformedGroups,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/groups/:id
 * @desc Get specific group
 * @access Private
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id).select("-__v");

    if (!group) {
      throw new AppError("Group not found", 404, "group-not-found");
    }

    // Transform response
    const transformedGroup: any = {
      ...group.toObject(),
      id: group._id,
    };
    delete transformedGroup._id;

    res.status(200).json({
      status: "success",
      data: transformedGroup,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/groups/:id
 * @desc Update a group
 * @access Private
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validate required field
    if (!name) {
      throw new AppError("Group name is required", 400, "missing-group-name");
    }

    // Check if group exists
    const existingGroup = await Group.findById(id);
    if (!existingGroup) {
      throw new AppError("Group not found", 404, "group-not-found");
    }

    // Check if another group with same name already exists
    const duplicateGroup = await Group.findOne({
      name: name.trim(),
      _id: { $ne: id },
    });
    if (duplicateGroup) {
      throw new AppError(
        "Group with this name already exists",
        409,
        "group-name-exists"
      );
    }

    // Update group
    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
      },
      { new: true, runValidators: true }
    );

    // Transform response
    const transformedGroup: any = {
      ...updatedGroup!.toObject(),
      id: updatedGroup!._id,
    };
    delete transformedGroup._id;
    delete transformedGroup.__v;

    res.status(200).json({
      status: "success",
      message: "Group updated successfully",
      data: transformedGroup,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/groups/:id
 * @desc Delete a group
 * @access Private
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if group exists
    const group = await Group.findById(id);
    if (!group) {
      throw new AppError("Group not found", 404, "group-not-found");
    }

    // TODO: Check if any bots are using this group before deletion
    // For now, we'll allow deletion but you might want to add this check later

    await Group.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Group deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
