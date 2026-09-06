'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const NOAA_ORIGIN = 'https://services.swpc.noaa.gov'
const ANIMATION_FEED_URL = `${NOAA_ORIGIN}/products/animations/suvi-primary-195.json`
const LATEST_SUVI_IMAGE_URL = `${NOAA_ORIGIN}/images/animations/suvi/primary/195/latest.png`
const STATIC_SOLAR_IMAGE_URL = '/images/decorative/goes-suvi-195-fallback.png'
const FRAME_DURATION_MS = 160
const FRAME_REFRESH_MS = 5 * 60 * 1000
const TRANSPARENT_BLACK_THRESHOLD = 18
const SOFT_EDGE_THRESHOLD = 46
const MIN_VISIBLE_PIXELS = 512
const MIN_VISIBLE_PIXEL_RATIO = 0.01

type SuviFrame = {
  url?: string
}

type LoadedFrame = {
  image: HTMLImageElement
  src: string
}

function getFrameUrl(frame: SuviFrame) {
  if (!frame.url) {
    return null
  }

  return new URL(frame.url, NOAA_ORIGIN).toString()
}

function preloadImage(src: string) {
  return new Promise<LoadedFrame>((resolve, reject) => {
    const image = new window.Image()

    image.crossOrigin = 'anonymous'
    image.onload = () => resolve({ image, src })
    image.onerror = reject
    image.src = src
  })
}

async function preloadFrames(frameUrls: string[]) {
  const preloadResults = await Promise.allSettled(frameUrls.map((src) => preloadImage(src)))

  return preloadResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
}

function getSafeFrame(frames: LoadedFrame[], index: number) {
  return frames[index] ?? null
}

function getObjectPositionRatio(position: string) {
  const [horizontal = '50%', vertical = '50%'] = position.split(' ')

  function toRatio(value: string) {
    if (value === 'left' || value === 'top') {
      return 0
    }

    if (value === 'right' || value === 'bottom') {
      return 1
    }

    if (value === 'center') {
      return 0.5
    }

    if (value.endsWith('%')) {
      return Number.parseFloat(value) / 100
    }

    return 0.5
  }

  return {
    x: toRatio(horizontal),
    y: toRatio(vertical),
  }
}

function getBackgroundAlpha(red: number, green: number, blue: number) {
  const brightness = Math.max(red, green, blue)

  if (brightness <= TRANSPARENT_BLACK_THRESHOLD) {
    return 0
  }

  if (brightness >= SOFT_EDGE_THRESHOLD) {
    return 255
  }

  return Math.round(
    ((brightness - TRANSPARENT_BLACK_THRESHOLD) /
      (SOFT_EDGE_THRESHOLD - TRANSPARENT_BLACK_THRESHOLD)) *
      255,
  )
}

function getPixelBrightness(data: Uint8ClampedArray, pixelIndex: number) {
  const dataIndex = pixelIndex * 4

  return Math.max(data[dataIndex] ?? 0, data[dataIndex + 1] ?? 0, data[dataIndex + 2] ?? 0)
}

function createBackgroundMask(data: Uint8ClampedArray, width: number, height: number) {
  const pixelCount = width * height
  const backgroundMask = new Uint8Array(pixelCount)
  const queue: number[] = []

  function addPixel(pixelIndex: number) {
    if (backgroundMask[pixelIndex] || getPixelBrightness(data, pixelIndex) > SOFT_EDGE_THRESHOLD) {
      return
    }

    backgroundMask[pixelIndex] = 1
    queue.push(pixelIndex)
  }

  for (let x = 0; x < width; x += 1) {
    addPixel(x)
    addPixel((height - 1) * width + x)
  }

  for (let y = 0; y < height; y += 1) {
    addPixel(y * width)
    addPixel(y * width + width - 1)
  }

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const pixelIndex = queue[queueIndex]

    if (pixelIndex === undefined) {
      continue
    }

    const x = pixelIndex % width
    const y = Math.floor(pixelIndex / width)

    if (x > 0) {
      addPixel(pixelIndex - 1)
    }

    if (x < width - 1) {
      addPixel(pixelIndex + 1)
    }

    if (y > 0) {
      addPixel(pixelIndex - width)
    }

    if (y < height - 1) {
      addPixel(pixelIndex + width)
    }
  }

  return backgroundMask
}

function createMainSolarMask(data: Uint8ClampedArray, width: number, height: number) {
  const pixelCount = width * height
  const visited = new Uint8Array(pixelCount)
  const mainMask = new Uint8Array(pixelCount)
  let largestComponent: number[] = []

  function isVisible(pixelIndex: number) {
    return (data[pixelIndex * 4 + 3] ?? 0) > 0
  }

  for (let startIndex = 0; startIndex < pixelCount; startIndex += 1) {
    if (visited[startIndex] || !isVisible(startIndex)) {
      continue
    }

    const component: number[] = []
    const queue = [startIndex]
    visited[startIndex] = 1

    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const pixelIndex = queue[queueIndex]

      if (pixelIndex === undefined) {
        continue
      }

      const x = pixelIndex % width
      const y = Math.floor(pixelIndex / width)
      component.push(pixelIndex)

      const neighbors = [
        x > 0 ? pixelIndex - 1 : null,
        x < width - 1 ? pixelIndex + 1 : null,
        y > 0 ? pixelIndex - width : null,
        y < height - 1 ? pixelIndex + width : null,
      ]

      for (const neighbor of neighbors) {
        if (neighbor === null || visited[neighbor] || !isVisible(neighbor)) {
          continue
        }

        visited[neighbor] = 1
        queue.push(neighbor)
      }
    }

    if (component.length > largestComponent.length) {
      largestComponent = component
    }
  }

  for (const pixelIndex of largestComponent) {
    mainMask[pixelIndex] = 1
  }

  return mainMask
}

function removeBlackBackground(image: HTMLImageElement, width: number, height: number) {
  const sourceCanvas = document.createElement('canvas')
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })

  if (!sourceContext) {
    return null
  }

  sourceCanvas.width = width
  sourceCanvas.height = height
  sourceContext.drawImage(image, 0, 0, width, height)

  const imageData = sourceContext.getImageData(0, 0, width, height)
  const { data } = imageData
  const backgroundMask = createBackgroundMask(data, width, height)
  let visiblePixels = 0

  for (let index = 0; index < data.length; index += 4) {
    const pixelIndex = index / 4
    const red = data[index] ?? 0
    const green = data[index + 1] ?? 0
    const blue = data[index + 2] ?? 0
    const alpha = data[index + 3] ?? 255
    const nextAlpha = backgroundMask[pixelIndex]
      ? Math.min(alpha, getBackgroundAlpha(red, green, blue))
      : alpha

    data[index + 3] = nextAlpha

    if (nextAlpha > 0) {
      visiblePixels += 1
    }
  }

  const minimumVisiblePixels = Math.max(
    MIN_VISIBLE_PIXELS,
    width * height * MIN_VISIBLE_PIXEL_RATIO,
  )

  if (visiblePixels < minimumVisiblePixels) {
    return null
  }

  const solarMask = createMainSolarMask(data, width, height)

  for (let index = 0; index < data.length; index += 4) {
    if (!solarMask[index / 4]) {
      data[index + 3] = 0
    }
  }

  sourceContext.putImageData(imageData, 0, 0)

  return sourceCanvas
}

export function GoesSolarAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frames, setFrames] = useState<LoadedFrame[]>([])
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [hasCanvasFrame, setHasCanvasFrame] = useState(false)
  const [fallbackSrc, setFallbackSrc] = useState(STATIC_SOLAR_IMAGE_URL)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const drawFrame = useCallback((frame: LoadedFrame | null) => {
    const canvas = canvasRef.current

    if (!canvas || !frame) {
      return false
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return false
    }

    const rect = canvas.getBoundingClientRect()
    const pixelRatio = window.devicePixelRatio || 1
    const canvasWidth = Math.max(1, Math.round(rect.width * pixelRatio))
    const canvasHeight = Math.max(1, Math.round(rect.height * pixelRatio))

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth
      canvas.height = canvasHeight
    }

    const imageRatio = frame.image.naturalWidth / frame.image.naturalHeight
    const canvasRatio = canvasWidth / canvasHeight
    const drawHeight = imageRatio > canvasRatio ? canvasWidth / imageRatio : canvasHeight
    const drawWidth = imageRatio > canvasRatio ? canvasWidth : canvasHeight * imageRatio
    const objectPosition = getObjectPositionRatio(window.getComputedStyle(canvas).objectPosition)
    const drawX = (canvasWidth - drawWidth) * objectPosition.x
    const drawY = (canvasHeight - drawHeight) * objectPosition.y

    const transparentFrame = removeBlackBackground(
      frame.image,
      frame.image.naturalWidth,
      frame.image.naturalHeight,
    )

    if (!transparentFrame) {
      return false
    }

    context.clearRect(0, 0, canvasWidth, canvasHeight)
    context.drawImage(transparentFrame, drawX, drawY, drawWidth, drawHeight)
    setHasCanvasFrame(true)
    return true
  }, [])

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    function updateMotionPreference() {
      setPrefersReducedMotion(motionQuery.matches)
    }

    updateMotionPreference()
    motionQuery.addEventListener('change', updateMotionPreference)

    return () => motionQuery.removeEventListener('change', updateMotionPreference)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadFrames() {
      try {
        const response = await fetch(ANIMATION_FEED_URL, { cache: 'no-store' })

        if (!response.ok) {
          throw new Error('Unable to load SUVI animation feed.')
        }

        const data = (await response.json()) as SuviFrame[]
        const frameUrls = data.map(getFrameUrl).filter((url): url is string => Boolean(url))
        const preloadedFrames = await preloadFrames(frameUrls)

        if (!isMounted || preloadedFrames.length === 0) {
          return
        }

        setFrames(preloadedFrames)
        setCurrentFrameIndex(preloadedFrames.length - 1)
        drawFrame(getSafeFrame(preloadedFrames, preloadedFrames.length - 1))
      } catch {
        try {
          const latestFrame = await preloadImage(LATEST_SUVI_IMAGE_URL)

          if (!isMounted) {
            return
          }

          setFrames([latestFrame])
          setCurrentFrameIndex(0)
          setFallbackSrc(LATEST_SUVI_IMAGE_URL)
          drawFrame(latestFrame)
        } catch {
          if (!isMounted) {
            return
          }

          setFrames([])
          setCurrentFrameIndex(0)
          setHasCanvasFrame(false)
          setFallbackSrc(STATIC_SOLAR_IMAGE_URL)
        }
      }
    }

    loadFrames()
    const refreshInterval = window.setInterval(loadFrames, FRAME_REFRESH_MS)

    return () => {
      isMounted = false
      window.clearInterval(refreshInterval)
    }
  }, [drawFrame])

  useEffect(() => {
    if (frames.length === 0) {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      drawFrame(getSafeFrame(frames, currentFrameIndex))
    })

    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [currentFrameIndex, drawFrame, frames])

  useEffect(() => {
    if (frames.length === 0) {
      return
    }

    if (prefersReducedMotion || frames.length === 1) {
      setCurrentFrameIndex(frames.length - 1)
      drawFrame(getSafeFrame(frames, frames.length - 1))
      return
    }

    const animationInterval = window.setInterval(() => {
      setCurrentFrameIndex((previousIndex) => {
        const nextIndex = (previousIndex + 1) % frames.length

        drawFrame(getSafeFrame(frames, nextIndex))

        return nextIndex
      })
    }, FRAME_DURATION_MS)

    return () => window.clearInterval(animationInterval)
  }, [drawFrame, frames, prefersReducedMotion])

  return (
    <>
      <img
        alt=""
        className={`hero-image solar-animation-fallback ${
          hasCanvasFrame ? 'solar-animation-fallback-hidden' : ''
        }`}
        decoding="async"
        src={fallbackSrc}
      />
      <canvas className="hero-image solar-animation-canvas" ref={canvasRef} />
    </>
  )
}
