import BaseError from "@/app/errors/BaseError";

export default class InvalidServiceConfigurationError extends BaseError {
  constructor(message: string) {
    super(message, 500, "INVALID_SERVICE_CONFIGURATION", true)
  }
}