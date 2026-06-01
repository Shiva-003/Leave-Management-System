import ApiError from "./ApiError.js";
import logger from "../logger.js";

const globalErrorHandler = (error, req, res, next) => {
  if (!error) return;

  logger.error(error.message, { path: req.path, method: req.method, stack: error.stack });
  
  if (!(error instanceof ApiError)) {
    return res
      .status(500)
      .json(new ApiError(500, error.message ?? "Internal Server Error"));
  }


  return res
    .status(error.statusCode ?? 500)
    .json(new ApiError(error.statusCode ?? 500, error.message));
};

export default globalErrorHandler;
