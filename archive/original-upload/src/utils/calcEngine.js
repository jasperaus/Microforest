export default function calcEngine(inputs, coefs) {
  const {
    area, zone, species, years
  } = inputs;
  const {
    sequestration, cooling, pm_removal_g_m2_yr,
    biodiversity_factor, canopy_growth
  } = coefs;

  const seqBase = sequestration[zone].baseline_tC * sequestration[zone].miyawaki_factor;
  const results = { carbon: [], biodiversity: [], cooling: [], pmRemoval: [] };
  let cumCarbon = 0;

  for (let y = 1; y <= years; y++) {
    const canopyPct = canopy_growth[`year${y}`] ?? canopy_growth.year5;
    const annualC = (area / 10000) * seqBase;
    cumCarbon += annualC;
    const bioIdx = species * biodiversity_factor;
    const coolDeg = cooling.coeff_per_canopy_pct * canopyPct;
    const pmYr = pm_removal_g_m2_yr * area;

    results.carbon.push({ year: y, annual: annualC, cumulative: cumCarbon });
    results.biodiversity.push({ year: y, index: bioIdx });
    results.cooling.push({ year: y, reduction: coolDeg });
    results.pmRemoval.push({ year: y, grams: pmYr });
  }

  return results;
}