import { expect, test } from '@playwright/test'

import { footerContent } from '@/app/lib/footer'
import { galleryAlbumList, galleryAlbums } from '@/app/lib/gallery'
import { researchAreas } from '@/app/lib/research-areas'

// `group` names the desktop header disclosure a route sits behind, if any.
const publicRoutes: { label: string; path: string; heading: string; group?: string }[] = [
  { label: 'Inicio', path: '/', heading: 'Exploramos el Sol para comprender el clima espacial' },
  { label: 'Nosotros', path: '/nosotros', heading: 'Quiénes somos' },
  {
    label: 'Colaboraciones e Iniciativas',
    path: '/colaboraciones-e-iniciativas',
    heading: 'Colaboraciones e Iniciativas',
  },
  { label: 'Investigación', path: '/investigacion', heading: 'Investigación' },
  {
    label: 'Herramientas científicas',
    path: '/herramientas-cientificas',
    heading: 'Herramientas científicas',
    group: 'Recursos',
  },
  { label: 'Datos', path: '/datos', heading: 'Datos' },
  { label: 'Galería', path: '/galeria', heading: 'Galería', group: 'Recursos' },
  { label: 'Noticias', path: '/noticias', heading: 'Noticias' },
  { label: 'Contacto', path: '/contacto', heading: 'Contacto' },
]

const areaCards = [
  { name: 'Física solar', path: '/fisica-solar' },
  { name: 'Clima espacial', path: '/clima-espacial' },
  { name: 'ROSAC', path: '/radioastronomia' },
  { name: 'Herramientas científicas', path: '/herramientas-cientificas' },
  { name: 'Datos y análisis', path: '/datos' },
  { name: 'Divulgación', path: '/noticias' },
] as const

const workAreaRoutes = [
  { path: '/fisica-solar', heading: 'Astrofísica solar' },
  { path: '/clima-espacial', heading: 'Clima espacial' },
  { path: '/radioastronomia', heading: 'Radioastronomía' },
] as const

test('loads the public landing page without authentication', async ({ page }) => {
  const response = await page.goto('/')

  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Exploramos el Sol para comprender el clima espacial',
    }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/acceso')
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', {
      name: 'Administración',
      exact: true,
    }),
  ).toHaveCount(0)
  expect(new URL(page.url()).pathname).toBe('/')
})

for (const route of workAreaRoutes) {
  test(`opens ${route.path} directly without a login redirect`, async ({ page }) => {
    const response = await page.goto(route.path)

    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe(route.path)
    expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
  })
}

for (const route of publicRoutes) {
  test(`opens ${route.path} directly without a login redirect`, async ({ page }) => {
    const response = await page.goto(route.path)

    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe(route.path)
    expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
  })
}

test('navigates through every public option and exposes the active page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' })

  for (const route of publicRoutes) {
    const link = navigation.getByRole('link', { name: route.label, exact: true })
    const summary = route.group ? navigation.locator('summary', { hasText: route.group }) : null

    if (summary) await summary.click()
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${route.path === '/' ? '/$' : `${route.path}$`}`))

    // Choosing a grouped link closes its disclosure: reopen it to read the marker,
    // then leave it closed for the next route.
    if (summary) await summary.click()
    await expect(link).toHaveAttribute('aria-current', 'page')
    if (summary) await page.keyboard.press('Escape')
  }
})

test('displays space weather information without authentication', async ({ page }) => {
  const response = await page.goto('/clima-espacial')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/clima-espacial')
  expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)

  await expect(page.getByRole('heading', { level: 1, name: 'Clima espacial' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Qué es el clima espacial/ })).toBeVisible()
  await expect(page.getByText(/No es el clima atmosférico cotidiano/)).toBeVisible()
  await expect(page.getByRole('heading', { name: /Del Sol a la Tierra/ })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Por qué estudiarlo desde Costa Rica/ }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /Qué compone el clima espacial/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Actividad solar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Viento solar', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'El Sol y el clima espacial' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'El trabajo de LASCE' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Indicadores actuales' })).toHaveCount(0)
  await expect(page.getByText('Datos simulados')).toHaveCount(0)
  await expect(page.getByText('Contenido en preparación')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/acceso')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /clima espacial/i,
  )
})

test('displays solar astrophysics information without authentication', async ({ page }) => {
  const response = await page.goto('/fisica-solar')

  expect(response?.status()).toBe(200)
  expect(new URL(page.url()).pathname).toBe('/fisica-solar')
  expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)

  await expect(page.getByRole('heading', { level: 1, name: 'Astrofísica solar' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Qué estudia la astrofísica solar/ }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Actividad solar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Relación Sol-Tierra' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'El trabajo de LASCE en astrofísica solar' }),
  ).toBeVisible()
  await expect(page.getByText(/Laboratorio de Astrofísica Solar y Clima Espacial/)).toBeVisible()
  await expect(page.getByText('Contenido en preparación')).toHaveCount(0)
  await expect(page.getByText('Contenido temporal')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/acceso')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /actividad solar/i,
  )
})

test('returns to the work areas section from space weather', async ({ page }) => {
  await page.goto('/clima-espacial')

  await page.getByRole('link', { name: 'Volver a las áreas de trabajo' }).click()

  await expect(page).toHaveURL(/\/#areas-de-trabajo/)
  await expect(page.getByRole('heading', { name: 'Áreas y accesos principales' })).toBeVisible()
  expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)
})

test('returns to the work areas section from solar astrophysics', async ({ page }) => {
  await page.goto('/fisica-solar')

  await page.getByRole('link', { name: 'Volver a las áreas de trabajo' }).click()

  await expect(page).toHaveURL(/\/#areas-de-trabajo/)
  await expect(page.getByRole('heading', { name: 'Áreas y accesos principales' })).toBeVisible()
  expect(page.url()).not.toMatch(/\/(login|auth|acceso)(\/|$)/)
})

for (const card of areaCards) {
  test(`opens the public route from the ${card.name} card`, async ({ page }) => {
    await page.goto('/')

    const link = page.locator('.area-card').filter({ hasText: card.name })
    await expect(link).toHaveAttribute('href', card.path)
    await link.click()

    await expect(page).toHaveURL(new RegExp(`${card.path}$`))
  })
}

test('lists every research area and opens its detail page', async ({ page }) => {
  const response = await page.goto('/investigacion')

  expect(response?.status()).toBe(200)

  for (const area of researchAreas) {
    await expect(page.getByRole('article', { name: area.title })).toBeVisible()
  }

  const [first] = researchAreas
  if (!first) throw new Error('researchAreas is empty')

  await page.getByRole('link', { name: `Conozca más sobre esta área (${first.title})` }).click()

  await expect(page).toHaveURL(new RegExp(`/investigacion/areas/${first.slug}$`))
  await expect(page.getByRole('heading', { level: 1, name: first.title })).toBeVisible()
})

test('navigates with the mobile menu and closes it afterwards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const menu = page.locator('.mobile-menu')
  await page.getByLabel('Abrir navegación', { exact: true }).click()
  await expect(menu).toHaveAttribute('open', '')

  const navigation = page.getByRole('navigation', { name: 'Navegación móvil' })
  const newsLink = navigation.getByRole('link', { name: 'Noticias', exact: true })
  await newsLink.click()

  await expect(page).toHaveURL(/\/noticias$/)
  await expect(menu).not.toHaveAttribute('open', '')

  await page.getByLabel('Abrir navegación', { exact: true }).click()
  await expect(
    page
      .getByRole('navigation', { name: 'Navegación móvil' })
      .getByRole('link', { name: 'Noticias', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
})

test('shows the UCR, CINESPA and LASCE brand without overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const header = page.locator('.site-header')
  await expect(header.getByAltText('Universidad de Costa Rica')).toBeVisible()
  await expect(header.getByAltText('Centro de Investigaciones Espaciales')).toBeVisible()
  await expect(header.getByAltText('Laboratorio de Ciencias Espaciales')).toBeVisible()

  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(fits).toBe(true)
})

test('keeps the brand clear of the desktop navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  const brandBox = await page.getByRole('banner').locator('.brand').boundingBox()
  const navBox = await page.getByRole('navigation', { name: 'Navegación principal' }).boundingBox()

  expect(brandBox).not.toBeNull()
  expect(navBox).not.toBeNull()
  if (brandBox && navBox) {
    expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(navBox.x)
  }
})

test('displays the back button at the bottom of the gallery index and returns home', async ({
  page,
}) => {
  await page.goto('/galeria')

  const backLink = page.getByRole('link', { name: 'Volver al inicio' })
  const heading = page.getByRole('heading', { level: 1, name: 'Galería' })

  await expect(backLink).toBeVisible()
  const backBox = await backLink.boundingBox()
  const headingBox = await heading.boundingBox()
  expect(backBox && headingBox && backBox.y > headingBox.y).toBeTruthy()

  await backLink.click()
  await expect(page).toHaveURL(/\/$/)
})

test('displays the back button at the bottom of an album page and returns to gallery', async ({
  page,
}) => {
  await page.goto('/galeria/rosac')

  const backLink = page.getByRole('link', { name: 'Volver a la galería' })
  const heading = page.getByRole('heading', { level: 1, name: galleryAlbums.rosac.title })

  await expect(backLink).toBeVisible()
  const backBox = await backLink.boundingBox()
  const headingBox = await heading.boundingBox()
  expect(backBox && headingBox && backBox.y > headingBox.y).toBeTruthy()

  await backLink.click()
  await expect(page).toHaveURL(/\/galeria$/)
})

for (const album of galleryAlbumList) {
  test(`opens the ${album.slug} album from the gallery index`, async ({ page }) => {
    await page.goto('/galeria')

    await expect(page.getByRole('heading', { level: 2, name: album.title })).toBeVisible()
    await page.getByRole('link', { name: new RegExp(album.title) }).click()

    await expect(page).toHaveURL(new RegExp(`/galeria/${album.slug}$`))
    await expect(page.getByRole('heading', { level: 1, name: album.title })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /^Ver a tama\u00f1o completo:/ }).first(),
    ).toBeVisible()
  })

  for (const subAlbum of album.subAlbums) {
    test(`opens the ${album.slug}/${subAlbum.slug} sub-album and returns to its album`, async ({
      page,
    }) => {
      await page.goto(`/galeria/${album.slug}`)

      await page.getByRole('link', { name: new RegExp(subAlbum.title) }).click()

      await expect(page).toHaveURL(new RegExp(`/galeria/${album.slug}/${subAlbum.slug}$`))
      await expect(page.getByRole('heading', { level: 1, name: subAlbum.title })).toBeVisible()
      await expect(
        page.getByText(`${subAlbum.media.length} archivos en este \u00e1lbum`),
      ).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Sub\u00e1lbumes' })).toHaveCount(0)

      const backLink = page.getByRole('link', { name: `Volver a ${album.title}` })
      await expect(backLink).toBeVisible()
      const backBox = await backLink.boundingBox()
      const headingBox = await page
        .getByRole('heading', { level: 1, name: subAlbum.title })
        .boundingBox()
      expect(backBox && headingBox && backBox.y > headingBox.y).toBeTruthy()

      await backLink.click()

      await expect(page).toHaveURL(new RegExp(`/galeria/${album.slug}$`))
    })
  }
}

test('shows real photographs rather than placeholder frames', async ({ page }) => {
  await page.goto('/galeria/rosac')

  const images = page.locator('.media-grid img')

  await expect(images.first()).toBeVisible()
  expect(await images.count()).toBe(galleryAlbums.rosac.media.length)
})

test('opens and closes the album lightbox with the keyboard', async ({ page }) => {
  await page.goto('/galeria/rosac')

  const [first] = galleryAlbums.rosac.media
  const tile = page.getByRole('button', {
    name: `Ver a tamaño completo: ${first.title}`,
  })
  await tile.click()

  const lightbox = page.getByRole('dialog')
  await expect(lightbox).toBeVisible()
  await expect(lightbox.getByRole('heading', { level: 2 })).toHaveText(first.title)
  await expect(lightbox.getByText(`Subido por: ${first.uploader}`)).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(tile).toBeFocused()
})

test('walks through the album lightbox with the next control', async ({ page }) => {
  await page.goto('/galeria/rosac')

  const [first, second] = galleryAlbums.rosac.media
  await page
    .getByRole('button', {
      name: `Ver a tamaño completo: ${first.title}`,
    })
    .click()

  const lightbox = page.getByRole('dialog')
  await lightbox.getByRole('button', { name: 'Siguiente' }).click()

  await expect(lightbox.getByRole('heading', { level: 2 })).toHaveText(second.title)
  await expect(lightbox.getByText(`Formato: ${second.format}`)).toBeVisible()

  await lightbox.getByRole('button', { name: 'Anterior' }).click()
  await expect(lightbox.getByRole('heading', { level: 2 })).toHaveText(first.title)
})

test('returns 404 for an album that does not exist', async ({ page }) => {
  const response = await page.goto('/galeria/album-inexistente')

  expect(response?.status()).toBe(404)
})

test('returns 404 for a sub-album that does not exist', async ({ page }) => {
  const response = await page.goto('/galeria/rosac/subalbum-inexistente')

  expect(response?.status()).toBe(404)
})

test('returns 404 for an unknown public route', async ({ page }) => {
  const response = await page.goto('/ruta-publica-inexistente')

  expect(response?.status()).toBe(404)
})

test('displays research collaborations', async ({ page }) => {
  const response = await page.goto('/colaboraciones-e-iniciativas')

  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('heading', { level: 2, name: 'Colaboraciones de investigación' }),
  ).toBeVisible()

  await expect(
    page.getByRole('heading', { level: 3, name: 'Instituto Tecnológico de Costa Rica' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 3, name: 'Facultad de Ciencias Exactas y Tecnología' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Colaboraciones e Iniciativas' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sitio oficial de la ISWI' })).toHaveAttribute(
    'href',
    'https://www.unoosa.org/oosa/en/ourwork/psa/bssi/iswi.html',
  )
  await expect(page.getByRole('combobox', { name: 'Tipo de colaboración' })).toHaveCount(0)
})

for (const route of publicRoutes) {
  test(`shows the legal and institutional footer on ${route.path}`, async ({ page }) => {
    await page.goto(route.path)

    const footer = page.getByRole('contentinfo')
    await expect(footer.getByText(/© \d{4} /)).toBeVisible()

    const institutions = footer.getByRole('list', { name: footerContent.institutionsLabel })
    for (const institution of footerContent.institutions) {
      await expect(institutions.getByText(institution.label, { exact: true })).toBeVisible()

      if (institution.href) {
        await expect(
          institutions.getByRole('link', { name: institution.label, exact: true }),
        ).toHaveAttribute('href', institution.href)
      }
    }

    const { partnerLogo } = footerContent
    await expect(footer.getByRole('img', { name: partnerLogo.name })).toBeVisible()
    await expect(footer.getByRole('link', { name: partnerLogo.name })).toHaveAttribute(
      'href',
      partnerLogo.href,
    )

    // Legal information sits beside the footer navigation, never inside it.
    await expect(footer.getByRole('navigation').getByText(/©/)).toHaveCount(0)
  })
}

test('keeps the footer readable on a phone without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const footer = page.getByRole('contentinfo')
  await footer.scrollIntoViewIfNeeded()
  await expect(footer.getByText(/© \d{4} /)).toBeVisible()
  await expect(footer.getByRole('list', { name: footerContent.institutionsLabel })).toBeVisible()

  // The links and the ISWI logo share one row on a phone: links left, logo right, no overlap.
  const logo = footer.getByRole('img', { name: footerContent.partnerLogo.name })
  await expect(logo).toBeVisible()
  const logoBox = await logo.boundingBox()
  const navigationBox = await footer.getByRole('navigation').boundingBox()
  expect(logoBox).not.toBeNull()
  expect(navigationBox).not.toBeNull()
  if (logoBox && navigationBox) {
    expect(navigationBox.x + navigationBox.width).toBeLessThanOrEqual(logoBox.x)
    expect(logoBox.x + logoBox.width).toBeLessThanOrEqual(390)
  }

  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  expect(fits).toBe(true)
})
