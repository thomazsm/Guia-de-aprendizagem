/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CALENDARIO_2026 = {
  "1º Bimestre": { inicio: "2026-02-02", termino: "2026-04-20" },
  "2º Bimestre": { inicio: "2026-04-22", termino: "2026-06-26" },
  "3º Bimestre": { inicio: "2026-07-13", termino: "2026-09-18" },
  "4º Bimestre": { inicio: "2026-09-21", termino: "2026-12-23" },
};

export type BimestreKey = keyof typeof CALENDARIO_2026;
