import ApiError from "./ApiError.js";

const globalErrorHandler = (error, req, res, next) => {
  if (!error) return;

  console.log(`[${process.env.SERVICE_NAME}] error:`, error.message);
  
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
