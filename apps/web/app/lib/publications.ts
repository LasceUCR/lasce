export type Publication = {
  slug: string
  title: string
  authors: string
  venue: string
  year: string
  abstract: string
  href: string
}

// Mock data for publications till the backend is ready. Modeled on the real
// publication record of Dr. Carolina Salas-Matamoros (UCR / CINESPA), whose
// work on ROSAC and CME propagation is representative of LASCE's output —
// see https://www.researchgate.net/profile/Carolina-Salas-Matamoros
// `abstract` is the real, verbatim abstract of each paper (or, for the ROSAC
// item, the opening line of the source article) — the card clamps it to two
// lines, it is not pre-truncated here.
export const publications: Publication[] = [
  {
    slug: 'microwave-radio-emissions-proxy-cme-speed',
    title:
      'Microwave radio emissions as a proxy for coronal mass ejection speed in arrival predictions of interplanetary coronal mass ejections at 1 AU',
    authors: 'C. Salas-Matamoros, L. Klein, G. Trottet',
    venue: 'Journal of Space Weather and Space Climate',
    year: '2017',
    abstract:
      'The propagation of a coronal mass ejection (CME) to the Earth takes between about 15 h and several days. We explore whether observations of non-thermal microwave bursts, produced by near-relativistic electrons via the gyrosynchrotron process, can be used to predict travel times of interplanetary coronal mass ejections (ICMEs) from the Sun to the Earth. In a first step, a relationship is established between the CME speed measured by SoHO/LASCO near the solar limb and the fluence of the microwave burst.',
    href: 'https://www.swsc-journal.org/articles/swsc/full_html/2017/01/swsc160027/swsc160027.html',
  },
  {
    slug: 'statistical-relationship-cme-speed-soft-xray',
    title: 'On the Statistical Relationship Between CME Speed and Soft X-Ray Flux and Fluence of the Associated Flare',
    authors: 'C. Salas-Matamoros, L. Klein',
    venue: 'Solar Physics',
    year: '2015',
    abstract:
      'Both observation and theory reveal a close relationship between the kinematics of coronal mass ejections (CMEs) and the thermal energy release traced by the related soft X-ray (SXR) emission. The major problem of empirical studies of this relationship is the distortion of the CME speed by the projection effect in the coronagraphic measurements. We present a re-assessment of the statistical relationship between CME velocities and SXR parameters, using the SOHO/LASCO catalog and GOES whole Sun observations during the period 1996 to 2008.',
    href: 'https://doi.org/10.1007/s11207-015-0677-0',
  },
  {
    slug: 'geometrical-description-interplanetary-propagation-cmes',
    title: 'A geometrical description for interplanetary propagation of Earth-directed CMEs based on radiative proxies',
    authors: 'C. Salas-Matamoros, J. Sánchez-Guevara',
    venue: 'Monthly Notices of the Royal Astronomical Society',
    year: '2021',
    abstract:
      'We present a 3D geometrical model to describe the propagation and expansion of coronal mass ejections (CMEs) in the interplanetary space based on radiative proxies to be implemented in previous procedures that use SXR and microwave emissions to estimate the Earth-directed CME propagation speed. We carefully selected a sample of 45 well-defined CME-ICME events to evaluate our model.',
    href: 'https://doi.org/10.1093/mnras/stab1232',
  },
  {
    slug: 'rosac-radiotelescopio-observatorio-santa-cruz',
    title: 'Radiotelescopio del Observatorio de Santa Cruz (ROSAC)',
    authors: 'LASCE',
    venue: 'Nota institucional, Vicerrectoría de Investigación UCR',
    year: '2022',
    abstract:
      'A research project is studying how to convert a gigantic antenna that was originally used to monitor a satellite, into a radio telescope that will help to study the stars. This is the antenna currently installed at the UCR Experimental Farm in Santa Cruz (FESC).',
    href: 'https://vinv.ucr.ac.cr/en/news/ucr-will-have-its-own-radio-telescope-explore-cosmos',
  },
]
