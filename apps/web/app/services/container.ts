import type { IAssetStorage } from './storage'
import { MinioAssetStorage } from './storage/implementations/MinioAsssetStorage'

export const assetStorage: IAssetStorage = new MinioAssetStorage()
