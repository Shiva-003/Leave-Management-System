import ApiError from "./ApiError";

const globalErrorHandler = (error, req, res, next) => {
  if (!error) return;
  if (!(error instanceof ApiError)) {
    return res
      .status(500)
      .send(new ApiError(500, error.message ?? "Internal Server Error"));
  }

  console.log(`[${process.env.SERVICE_NAME}] error message`, error.message);

  return res
    .status(error.statusCode ?? 500)
    .send(new ApiError(error.statusCode ?? 500, error.message));
};

export default globalErrorHandler;
