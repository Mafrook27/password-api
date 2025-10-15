function validate(schema) {
  return (req, res, next) => {

    //  console.log('🔍 Validation Check:', {
    //   url: req.url,
    //   contentType: req.get('content-type'),
    //   hasBody: !!req.body,
    //   bodyKeys: req.body ? Object.keys(req.body) : []
    // });

    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        //   console.error('❌ Invalid body structure:', {
        //   type: typeof req.body,
        //   isArray: Array.isArray(req.body),
        //   value: req.body
        // });

        const error = new Error("Invalid request body. Expected JSON object.");
        error.statusCode = 400;
        throw error;
      }

      const { error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        //  console.error('❌ Validation failed:', error.details.map(e => e.message));

        const validationError = new Error("Validation failed");
        validationError.statusCode = 400;
        validationError.details = error.details.map((err) => err.message);
        throw validationError;
      }

      next();
    } catch (err) {
      const response = {
        success: false,
        message: err.message,
      };

      if (err.details) {
        response.errors = err.details;
      }

      res.status(err.statusCode || 500).json(response);
    }
  };
}

module.exports = { validate };