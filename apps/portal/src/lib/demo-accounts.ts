/** Seeded demo patients per clinic slug — mirrors scripts/provision-demo.ts; keep in sync when that changes. */
export const DEMO_PATIENTS: Record<string, { name: string; phone: string }[]> = {
  demo: [
    { name: "Jean Baptiste", phone: "+2305700001" },
    { name: "Priya Ramdin", phone: "+2305700002" },
    { name: "Kevin Lim", phone: "+2305700003" },
  ],
  solo: [
    { name: "Rajesh Goolab", phone: "+2305800001" },
    { name: "Marie Laval", phone: "+2305800002" },
  ],
};
