import { Request, RequestHandler } from "express";
import {
  EditOption,
  translateBlockContent,
} from "../../services/translation/translation.js";
import { retrieveUserDocument } from "./retrieveUserDocument.js";
import { Block } from "../../models/Doc.js";
import User from "../../models/User.js";

import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import logger from "../../utils/logger.js";

import { MAX_INPUT_LENGTH } from "../../config.js";

const MAX_BLOCK_INPUT_LENGTH = MAX_INPUT_LENGTH ? +MAX_INPUT_LENGTH : 3000;

const verifyTokensUsageIsAllowed = ()

const handleNewBlock = async (req: Request, doc: { content: string[] }) => {
  // Limit the length of the input text
  const inputBlock: Block = req.body.block;
  if (inputBlock.text.length > MAX_BLOCK_INPUT_LENGTH)
    inputBlock.text = inputBlock.text.slice(0, MAX_BLOCK_INPUT_LENGTH);

  // Find the index of the block within the document
  const inputBlockIndex = req.body.blockPositionIndex ?? doc.content.length;
  if (inputBlockIndex < 0 || inputBlockIndex > doc.content.length)
    throw new AppError(AppErrorName.ValidationError, "Invalid block index");
};

/* Handle editions of a document - adding new paragraphs, editing existing ones, deleting */
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
        await handleNewBlock(req, doc);
        break;
      case EditOption.editOriginalBlock:
        // await handleEditBlock(req.body.block);
        break;
      case EditOption.removeBlocks:
        // await handleDeleteBlock(req.body.block);
        break;
      default:
        throw new AppError(
          AppErrorName.ValidationError,
          `Invalid edit option. Valid options are: ${Object.keys(EditOption)}`
        );
    }

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
