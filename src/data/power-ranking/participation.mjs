const modes = new Set(['native', 'forms', 'closed']);
export const PART_075C_FORMS_URL = 'https://forms.gle/GXDBxCsLsVKDTqas9';

function isApprovedFormsUrl(value) {
  return value === PART_075C_FORMS_URL;
}

/**
 * Editorial switch for the Power Ranking presentation only. It never changes
 * the Worker kill switch and deliberately refuses a Forms mode without the
 * real, reviewed Google Forms URL for the current campaign.
 */
export function defineParticipationConfig({ mode, formsUrl = null, formsCutover = null }) {
  if (!modes.has(mode)) throw new Error('El modo de participación debe ser native, forms o closed.');
  if (mode === 'forms' && !isApprovedFormsUrl(formsUrl)) {
    throw new Error('El modo forms exige la única URL HTTPS aprobada de Google Forms para PART-075C.');
  }
  if (mode !== 'forms' && formsUrl !== null) throw new Error('La URL de Forms solo se declara mientras el modo forms está activo.');
  return Object.freeze({ mode, formsUrl, formsCutover });
}

// Cambiar este valor requiere una decisión editorial explícita. PART-075C
// autoriza únicamente PART_075C_FORMS_URL para un corte manual de contingencia.
export const participationConfig = defineParticipationConfig({
  mode: 'native',
  formsUrl: null,
  formsCutover: null,
});
