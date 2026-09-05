import BaseError from "@/app/errors/BaseError"
import { MAX_ASSET_BYTES } from ".."

export default class InvalidFileSizeError extends BaseError {
  constructor(filename: string, sizeBytes: number) {
    const message = `File "${filename}" exceeds the maximum allowed size of ${MAX_ASSET_BYTES} bytes. Actual size: ${sizeBytes} bytes.`
    super(message, 413, "INVALID_FILE_SIZE", false)
    this.name = 'InvalidFileSizeError'
  }
}