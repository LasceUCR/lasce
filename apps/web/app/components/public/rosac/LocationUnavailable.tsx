import { MapPinOff } from 'lucide-react'

import styles from './RosacInfoPage.module.css'

export interface LocationUnavailableProps {
  message: string
}

export function LocationUnavailable({ message }: LocationUnavailableProps) {
  return (
    <div className={`${styles.locationMapUnavailable} surface-card`} role="status">
      <MapPinOff aria-hidden="true" size={22} strokeWidth={1.8} />
      <p>{message}</p>
    </div>
  )
}
