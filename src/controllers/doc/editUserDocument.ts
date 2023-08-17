import { Request, RequestHandler, Response } from "express";
import {
  APIMessage,
  EditOption,
  translateBlockContent,
} from "../../services/translation/translation.js";
import { retrieveUserDocument } from "./retrieveUserDocument.js";
import { Block, IDoc } from "../../models/Doc.js";
import User, { IUser, IUserMethods } from "../../models/User.js";

import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import logger from "../../utils/logger.js";
import { Document, Types } from "mongoose";

import { promptSettings } from "../../services/translation/translation.config.js";

const MAX_BLOCK_INPUT_LENGTH = promptSettings.maxInputLength || 3000;

/* Check user account and throw an error if the user is not allowed to use tokens, otherwise return user document */
const verifyTokensUsageIsAllowed = async (documentOwner: any) => {
  const user = await User.findById(documentOwner, {
    tokensLimit: 1,
    tokensUsedTotal: 1,
    isBlocked: 1,
    tokensUsedMonth: 1,
    wordsTranslatedMonth: 1,
  });

  if (!user)
    throw new AppError(
      AppErrorName.AppError,
      "Can not allow tokens usage. User is not found."
    );

  if (user.isBlocked)
    throw new AppError(
      AppErrorName.BlockedUsage,
      "Can not allow tokens usage. User account is blocked."
    );

  if (user.tokensLimit === 0)
    throw new AppError(
      AppErrorName.NotActivatedAccount,
      "Can not allow tokens usage. User account is not activated yet."
    );

  if (user.tokensUsedTotal >= user.tokensLimit)
    throw new AppError(
      AppErrorName.RunOutOfTokens,
      "Can not allow tokens usage. User has run out of tokens."
    );

  return user;
};

/* Increment tokens usage and words counts for user account and for a document */
const updateTokensUsageStatistics = async (
  doc: Document<unknown, {}, IDoc> & IDoc & { _id: Types.ObjectId },
  newMessages: APIMessage[],
  inputBlock: Block,
  owner: Document<unknown, {}, IUser> &
    Omit<IUser & { _id: Types.ObjectId }, keyof IUserMethods> &
    IUserMethods
) => {
  const tokensUsed = newMessages.reduce((sum, msg) => {
    return msg.tokens ? sum + msg.tokens : sum;
  }, 0);

  const tokensUsedAdjustedForLimit =
    owner.tokensUsedTotal + tokensUsed > owner.tokensLimit
      ? owner.tokensLimit - owner.tokensUsedTotal
      : tokensUsed;

  const wordsCount = inputBlock.text.match(/([^\s]+)/g)?.length || 0;

  doc.tokensUsed += tokensUsed; // Can result in small inaccuracy if working on the same document from different devices

  await User.findByIdAndUpdate(owner._id, {
    $inc: {
      tokensUsedTotal: tokensUsedAdjustedForLimit,
      tokensUsedMonth: tokensUsedAdjustedForLimit,
      wordsTranslatedMonth: wordsCount,
    },
  });
};

const handleNewBlock = async (
  req: Request,
  res: Response,
  doc: Document<unknown, {}, IDoc> & IDoc & { _id: Types.ObjectId }
) => {
  // Limit the length of the input text
  const inputBlock: Block = req.body.block;
  if (inputBlock.text.length > MAX_BLOCK_INPUT_LENGTH)
    inputBlock.text = inputBlock.text.slice(0, MAX_BLOCK_INPUT_LENGTH);

  // Find the index of the block within the document
  const inputBlockIndex = req.body.blockPositionIndex ?? doc.content.length;
  if (inputBlockIndex < 0 || inputBlockIndex > doc.content.length)
    throw new AppError(AppErrorName.ValidationError, "Invalid block index");

  // Check if the user has tokens to use
  const user = await verifyTokensUsageIsAllowed(doc.owner);

  // Translate the block
  const [translatedBlock, newMessages] = await translateBlockContent(
    inputBlock,
    doc.messagesHistory,
    {
      originalLanguage: doc.lang,
      targetLanguage: doc.translationLang,
      type: EditOption.newOriginalBlock,
    }
  );

  // Save results and history of prompts to the database
  doc.content.splice(inputBlockIndex, 0, inputBlock);
  doc.translationContent.splice(inputBlockIndex, 0, translatedBlock);
  doc.messagesHistory.push(...newMessages);

  // Update tokens usage statistics
  await updateTokensUsageStatistics(doc, newMessages, inputBlock, user);

  await doc.save();

  // Send results back to user
  return res.status(200).json({
    status: "success",
    data: translatedBlock,
  });
};

const handleEditBlock = async (
  req: Request,
  res: Response,
  doc: Document<unknown, {}, IDoc> & IDoc & { _id: Types.ObjectId }
) => {
  // Limit the length of the input text
  const inputBlock: Block = req.body.block;
  if (inputBlock.text.length > MAX_BLOCK_INPUT_LENGTH)
    inputBlock.text = inputBlock.text.slice(0, MAX_BLOCK_INPUT_LENGTH);

  // Find the index of the block within the document
  const inputBlockIndex = doc.content.findIndex(
    (block) => block.blockId === inputBlock.blockId
  );
  if (inputBlockIndex < 0 || inputBlockIndex > doc.content.length)
    throw new AppError(AppErrorName.ValidationError, "Invalid block index");

  // Check if the user has tokens to use
  const user = await verifyTokensUsageIsAllowed(doc.owner);

  // Translate the block
  const [translatedBlock, newMessages] = await translateBlockContent(
    inputBlock,
    doc.messagesHistory,
    {
      originalLanguage: doc.lang,
      targetLanguage: doc.translationLang,
      type: EditOption.editOriginalBlock,
    }
  );

  // Save results and history of prompts to the database
  doc.content.splice(inputBlockIndex, 1, inputBlock);
  doc.translationContent.splice(inputBlockIndex, 1, translatedBlock);

  // Do not use in prompt messages that were relevant to the block before it was edited
  doc.messagesHistory.forEach((message) => {
    if (
      message.attachToPrompt &&
      message.relevantBlockId === inputBlock.blockId
    ) {
      message.attachToPrompt = false;
    }
  });

  doc.messagesHistory.push(...newMessages);

  // Update tokens usage statistics
  await updateTokensUsageStatistics(doc, newMessages, inputBlock, user);

  await doc.save();

  // Send results back to user
  return res.status(200).json({
    status: "success",
    data: translatedBlock,
  });
};

const handleDeleteBlocks = async (
  req: Request,
  res: Response,
  doc: Document<unknown, {}, IDoc> & IDoc & { _id: Types.ObjectId }
) => {
  const blockToDeleteIds = req.body.blockIds as string[];

  doc.content = doc.content.filter(
    (block) => !blockToDeleteIds.includes(block.blockId)
  );
  doc.translationContent = doc.translationContent.filter(
    (block) => !blockToDeleteIds.includes(block.blockId)
  );

  await doc.save();

  // Send results back to user
  return res.status(200).json({
    status: "success",
    data: [],
    message: "Blocks deleted successfully",
  });
};

/* Handle editions of a document - adding new paragraphs, editing existing ones, deleting */

/**
 * @swagger
 * /api/docs/{docSlug}:
 *  patch:
 *   description: Change document's content by adding new paragraphs, editing existing paragraphs, or deleting paragraphs. <br/> <br/> <b>Important:</b> This endpoint translates content for new/changed blocks, so if the account has no tokens left the update will fail.
 *   tags: [Documents]
 *   security:
 *   - bearerAuth: []
 *   parameters:
 *   - in: path
 *   name: docSlug
 *   schema:
 *     type: string
 *     required: true
 *     description: Slug of the document, for example, new-document-12sd2
 *   requestBody:
 *    required: true
 *    content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            editOption:
 *              enum: [newOriginalBlock, editOriginalBlock, removeBlocks]
 *            inputBlock:
 *               type: object
 *               properties:
 *                  blockId:
 *                    type: string
 *                    example: 5f9a2c7b9d1
 *                  text:
 *                    type: string
 *                    example: This is a new paragraph.
 *            blockPositionIndex:
 *              type: number
 *              example: 2
 *    responses:
 *      200:
 *        description: Successfully updated document's content
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              status:
 *                type: string
 *                example: success
 *              data:
 *                type: object
 *                properties:
 *                  _id:
 *                    type: string
 *                    example: 5f9a2c7b9d1e8e2d1c0f8b9c
 *                  title:
 *                    type: string
 *                    example: Updated Document
 */

export const editUserDocument: RequestHandler = async (req, res, next) => {
  try {
    // Get the document from the database
    const doc = await retrieveUserDocument(
      req.currentUserId!,
      req.params.docSlug
    );

    // Get edition option from the request
    const editOption: EditOption =
      req.body.translationOption || EditOption.newOriginalBlock;

    logger.verbose(
      `request to editUserDocument ${doc.slug}: 
      edit option = ${req.body.editOption}, 
      block = ${req.body.block.blockId}, 
      blockPositionIndex = ${req.body.blockPositionIndex}`
    );

    switch (editOption) {
      case EditOption.newOriginalBlock:
        await handleNewBlock(req, res, doc);
        break;
      case EditOption.editOriginalBlock:
        await handleEditBlock(req, res, doc);
        break;
      case EditOption.removeBlocks:
        await handleDeleteBlocks(req, res, doc);
        break;
      default:
        throw new AppError(
          AppErrorName.ValidationError,
          `Invalid edit option. Valid options are: ${Object.keys(EditOption)}`
        );
    }
  } catch (error) {
    logger.error(`Error in editUserDocument: ${(error as Error).message}`);

    next(error);
  }
};
