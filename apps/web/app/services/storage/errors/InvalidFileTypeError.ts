import BaseError from '@/app/errors/BaseError'

export default class InvalidFileTypeError extends BaseError {
  constructor(filename: string, contentType: string) {
    const message = `File "${filename}" has an invalid content type: ${contentType}`
    super(message, 415, 'INVALID_FILE_TYPE', false)
    this.name = 'InvalidFileTypeError'
  }
}
