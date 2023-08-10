import { RequestHandler } from "express";
import Doc from "../../models/Doc.js";

/* Handle deleting a single document -> does not delete document from the database, only marks it as deleted */
export const deleteUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const ownerId = req.currentUserId!;
    const docSlug = req.params.docSlug;

    await Doc.findOneAndUpdate(
      { slug: docSlug, owner: ownerId },
      { deleted: true }
    );

    res.status(204).json({ status: "success", data: "deleted" });
  } catch (error) {
    next(error);
  }
};
