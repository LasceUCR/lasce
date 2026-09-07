export default class BaseError extends Error {
  private readonly _statusCode: number
  private readonly _errorCode: string
  private readonly _isFatal: boolean

  get statusCode(): number {
    return this._statusCode
  }

  get errorCode(): string {
    return this._errorCode
  }

  get isFatal(): boolean {
    return this._isFatal
  }

  constructor(message: string, statusCode: number, errorCode: string, isFatal: boolean = false) {
    super(message)
    this._statusCode = statusCode
    this._errorCode = errorCode
    this._isFatal = isFatal
  }
}
