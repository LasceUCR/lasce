import { PRODUCTION_ENV_VALUES } from '../const'

export default function isProduction(): boolean {
  return PRODUCTION_ENV_VALUES.includes(process.env.NODE_ENV as string)
}
