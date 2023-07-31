import e, { RequestHandler } from "express";
import Doc, { Block } from "../models/Doc.js";
import {
  EditOption,
  translateBlockContent,
} from "../services/translation/translation.js";

import logger from "../utils/logger.js";
import User from "../models/User.js";
import { AppError, AppErrorName } from "../middlewares/errorHandler.js";

// TODO: filter
// TODO: filter only relevant data

// TODO: count dollars according to tokens usage and set application hard limit!

// TODO: fix all data and error messages that application returns - make sure that no sensitive data slips out

// TODO: tab through all pages and make sure that all outlines are in similar style

// TODO: message admin on user registration, email users when their plans was changed

// TODO: user profile - change email or password

// TODO: refactor code and remove console.logs

// TODO: hosting and githup representation

// TODO: error messages and animations

// TODO: dynamic module imports to reduce bundle size

// TODO: rename store to datastore service

// TODO: messaging and email service

// TODO: try GPT-4

// TODO: implement edits of the translation

// TODO: implement error pages

// TODO: allow to store documents in local storage (ask for permission in upload form

// TODO: implement undo and redo

// TODO: implement document rename / duplicate / delete functionality

// TODO: count usage in dollars and add hard and soft limits

export const createNewDocument: RequestHandler = async (req, res, next) => {
  try {
    // Validate data
    // TODO: reuse yup schema?

    const newdocdata = {
      title: req.body.title,
      lang: req.body.lang,
      translationLang: req.body.translationLang,
      owner: req.currentUserId,
    };

    // Save new document to database
    const newDocument = await new Doc(newdocdata).save();

    res.status(201).json({ status: "success", data: newDocument });
  } catch (error) {
    logger.error(
      `🔥 Could not create new document. (${(error as Error).message}`
    );
    next(error);
  }
};

// Get preview information for a number of user's documents, paginated with default limit of 10 documents per page, recently changed documents come first
export const getUserDocuments: RequestHandler = async (req, res, next) => {
  try {
    // Use user-specified or defaul page number and number of items per page
    const { page: userRequestedPage, limit: userRequestedLimit } = req.query;
    const pageNumber = parseInt(userRequestedPage as string) || 1;
    const itemsPerPage = parseInt(userRequestedLimit as string) || 10;
    if (pageNumber < 1 || itemsPerPage < 1)
      throw new AppError(
        AppErrorName.ValidationError,
        "Invalid page number or number of items, accept only positive integers"
      );

    // Fetch relevant documents data from the database (note - does not fetch the whole document content)
    const userDocuments = await Doc.find(
      {
        owner: req.currentUserId,
        deleted: { $ne: true },
      },
      {
        title: 1,
        slug: 1,
        changedAt: 1,
        createdAt: 1,
        lang: 1,
        translationLang: 1,
        content: { $slice: 1 },
        translationContent: { $slice: 1 },
      }
    )
      .sort({ changedAt: -1 })
      .limit(itemsPerPage)
      .skip((pageNumber - 1) * itemsPerPage);

    // Also fetch total number of documents for pagination
    const count = await Doc.countDocuments({
      owner: req.currentUserId,
      deleted: { $ne: true },
    });

    // Transform data into the expected format
    const data = userDocuments.map((doc) => {
      return {
        title: doc.title,
        slug: doc.slug,
        lang: doc.lang,
        translationLang: doc.translationLang,
        changedAt: doc.changedAt,
        createdAt: doc.createdAt,
        textPreview: doc.content[0]?.text.slice(0, 200) || "",
        translationPreview: doc.translationContent[0]?.text.slice(0, 200) || "",
      };
    });

    res.status(200).json({
      status: "success",
      data,
      currentPage: pageNumber,
      totalPages: Math.ceil(count / itemsPerPage),
    });
  } catch (error) {
    logger.error(
      `🔥 Could not get user's documents. (${(error as Error).message}`
    );
    next(error);
  }
};

const getUserDocument = async (ownerId: string, docSlug: string) => {
  // Fetch document from database and make dure that requested document belongs to user
  // const doc = await Doc.findById(docId);

  const doc = await Doc.findOne({
    slug: docSlug,
    deleted: { $ne: true },
    owner: ownerId,
  });

  // console.log("getUserDocument", ownerId, docSlug, doc);
  if (!doc)
    throw new Error(
      "Could not get a document, it could have been already deleted"
    );

  return doc;
};

export const readUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await getUserDocument(req.currentUserId!, req.params.docSlug);

    res.status(200).json({ status: "success", data: doc });
  } catch (error) {
    next(error);
  }
};

export const editUserDocument: RequestHandler = async (req, res, next) => {
  try {
    // Get requested document from the database
    const doc = await getUserDocument(req.currentUserId!, req.params.docSlug);

    console.log(
      " ✍🏻✍🏻✍🏻editUserDocument",
      req.body.block,
      req.body.editOption,
      req.body.blockPositionIndex
    );

    const editOption: EditOption =
      req.body.translationOption || EditOption.newOriginalBlock;

    // console.log("inputBlock", inputBlock);
    // console.log("editOption", editOption);
    // console.log("inputBlockIndex", inputBlockIndex);

    if (
      editOption === EditOption.newOriginalBlock ||
      editOption === EditOption.editOriginalBlock
    ) {
      // Get input data
      const inputBlock: Block = req.body.block;

      // Make sure that block length is acceptable, even though on the frontend block length is limited
      if (inputBlock.text.length > 3000)
        inputBlock.text = inputBlock.text.slice(0, 3000);

      const inputBlockIndex: number =
        editOption === EditOption.newOriginalBlock
          ? req.body.blockPositionIndex ?? doc.content.length
          : doc.content.findIndex(
              (block) => block.blockId === inputBlock.blockId
            );

      if (inputBlockIndex === -1) throw new Error("Block not found");

      // Make sure tokens usage is within limits
      const owner = await User.findById(doc.owner, {
        tokensLimit: 1,
        tokensUsedTotal: 1,
        isBlocked: 1,
        tokensUsedMonth: 1,
        wordsTranslatedMonth: 1,
      });
      if (!owner) throw new Error("User was already deleted.");
      if (owner.isBlocked)
        throw new AppError(AppErrorName.BlockedUsage, "User is blocked.");

      if (owner.tokensLimit === 0)
        throw new AppError(
          AppErrorName.NotActivatedAccount,
          "Tokens usage is not granted yet."
        );

      if (owner.tokensUsedTotal >= owner.tokensLimit)
        throw new AppError(AppErrorName.RunOutOfTokens, "Run out of tokens.");

      // Update translation after original text was changed
      const [translatedBlock, newMessages] = await translateBlockContent(
        inputBlock,
        doc.messagesHistory,
        {
          originalLanguage: doc.lang,
          targetLanguage: doc.translationLang,
          type: editOption,
        }
      );

      // Save results and history to the database

      doc.content.splice(
        inputBlockIndex,
        editOption === EditOption.newOriginalBlock ? 0 : 1,
        inputBlock
      );
      doc.translationContent.splice(
        inputBlockIndex,
        editOption === EditOption.newOriginalBlock ? 0 : 1,
        translatedBlock
      );

      if (editOption !== EditOption.newOriginalBlock) {
        doc.messagesHistory.forEach((message) => {
          if (
            message.attachToPrompt &&
            message.relevantBlockId === inputBlock.blockId
          ) {
            message.attachToPrompt = false;
          }
        });
      }

      doc.messagesHistory.push(...newMessages);

      const tokensUsed = newMessages.reduce((sum, msg) => {
        return msg.tokens ? sum + msg.tokens : sum;
      }, 0);
      doc.tokensUsed += tokensUsed;

      // TODO: updating tokens usage on user acc each time and query user acc each time?
      // Can go with a separate document for user's tokens usage and balance?
      // Update token usage balance on user's account:
      // owner.tokensUsedMonth += tokensUsed;
      // owner.tokensUsedTotal += tokensUsed;
      // console.log("owner.tokensUsedTotal", owner.tokensUsedTotal);
      // owner.wordsTranslatedMonth +=
      //   inputBlock.text.match(/([^\s]+)/g)?.length ?? 0;

      const numberOfWords = inputBlock.text.match(/([^\s]+)/g)?.length || 0;
      const tokensToAdd =
        owner.tokensUsedTotal + tokensUsed > owner.tokensLimit
          ? owner.tokensLimit - owner.tokensUsedTotal
          : tokensUsed;

      // console.log("owner.wordsTranslatedMonth", owner.wordsTranslatedMonth);
      if (owner.tokensUsedTotal > owner.tokensLimit)
        owner.tokensUsedTotal = owner.tokensLimit;

      // console.log("owner", owner);

      await User.findByIdAndUpdate(owner._id, {
        $inc: {
          tokensUsedTotal: tokensToAdd,
          tokensUsedMonth: tokensToAdd,
          wordsTranslatedMonth: numberOfWords,
        },
      });

      console.log("doc save");

      await doc?.save();

      // Send results back to user
      return res.status(200).json({
        status: "success",
        data: translatedBlock,
      });
    }

    if (editOption === EditOption.removeBlocks) {
      const blockIds = req.body.blockIds as string[];

      doc.content = doc.content.filter(
        (block) => !blockIds.includes(block.blockId)
      );
      doc.translationContent = doc.translationContent.filter(
        (block) => !blockIds.includes(block.blockId)
      );

      await doc.save();
    }

    res.status(400).json({
      status: "failure",
      message: `Invalid edit option. Valid options are: ${Object.keys(
        EditOption
      )}`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const ownerId = req.currentUserId!;
    const docSlug = req.params.docSlug;

    // await Doc.deleteOne({ _id: docId, owner: ownerId });
    await Doc.findOneAndUpdate(
      { slug: docSlug, owner: ownerId },
      { deleted: true }
    );

    res.status(204).json({ status: "success", data: "deleted" });
  } catch (error) {
    next(error);
  }
};
