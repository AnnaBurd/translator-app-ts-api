import Doc from "../../models/Doc.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";

/* Handle retrieving for a user a single document from database */
export const retrieveUserDocument = async (
  ownerId: string,
  docSlug: string
) => {
  const doc = await Doc.findOne({
    slug: docSlug,
    deleted: { $ne: true },
    owner: ownerId,
  });

  if (!doc)
    throw new AppError(
      AppErrorName.ResourceNotFoundError,
      "Document not found"
    );

  return doc;
};
