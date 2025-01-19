const asyncHandler = (requestHandler) => {
    return (rej, res, next) => {
        Promise.resolve(requestHandler(rej, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler }