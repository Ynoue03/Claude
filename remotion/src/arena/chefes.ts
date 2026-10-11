// Chefes (a cada 10 episódios): criaturas grandes do SRD 5.2, com ficha simplificada para uma luta
// contra 16 heróis de nível baixo. Eles entram na luta de todos contra todos como o 17º lutador.
import type { Atributo, ClasseId, EspecieId, TipoDano } from "./regras.ts";
import type { Visual } from "./personagem.ts";
import type { Efeito } from "./combate.ts";

export type ChefeId = "MINOTAURO" | "GRIFO" | "HIDRA" | "GIGANTE" | "DRAGAO" | "QUIMERA" | "ALDRIC";
export const ORDEM_CHEFES: ChefeId[] = ["MINOTAURO", "GRIFO", "HIDRA", "GIGANTE", "QUIMERA", "DRAGAO"];

export type AtaqueChefe = { nome: string; acerto: number; n: number; d: number; bonus: number; tipo: TipoDano; fx: Efeito };
export type EspecialChefe =
  | { k: "investida"; nome: string; extraN: number; extraD: number }
  | { k: "rasante"; nome: string }
  | { k: "cabecas"; nome: string }
  | { k: "pedra"; nome: string; acerto: number; n: number; d: number; bonus: number }
  | { k: "sopro"; nome: string; n: number; d: number; cd: number; tipo: TipoDano; alcance: number }
  | { k: "abjurar"; nome: string; cd: number; atributo: Atributo; alcance: number; max: number };

// Chefe que é um personagem de verdade (ficha de classe): desenhado como herói, em tamanho de chefe
export type HeroiChefe = {
  classe: ClasseId;
  especie: EspecieId;
  nivel: number;
  prof: number;
  slots: number[]; // espaços de magia por círculo
  curaMaos: number; // reserva de Cura pelas Mãos
  aura: { nome: string; dano: number; alcance: number }; // dano em quem está perto, no começo do turno dele
  bonusSalv: number; // Aura de Proteção
  visual: Visual;
  pvRolagens: string[];
  titulo: string; // linha de baixo no cartão do chefe
};

export type Chefe = {
  id: ChefeId;
  nome: string;
  ca: number;
  pv: number;
  atributos: { FOR: number; DES: number; CON: number; INT: number; SAB: number; CAR: number };
  deslocamento: number; // pés
  voa: boolean; // ignora ataques de oportunidade ao se mover
  raio: number; // px: corpo (alcance e espaço em volta) — 3× o do primeiro desenho, como o sprite
  ataques: AtaqueChefe[];
  especial: EspecialChefe;
  recarga: number; // especial volta com d6 >= recarga
  resistencias: TipoDano[];
  fonte: string; // de onde vem a ficha
  heroi?: HeroiChefe;
  turnos?: number; // turnos por rodada (padrão 2: na iniciativa e no meio da rodada)
};

export const CHEFES: Record<ChefeId, Chefe> = {
  MINOTAURO: {
    id: "MINOTAURO",
    nome: "Minotauro",
    ca: 14,
    pv: 145,
    atributos: { FOR: 18, DES: 11, CON: 16, INT: 6, SAB: 16, CAR: 9 },
    deslocamento: 40,
    voa: false,
    raio: 42,
    ataques: [
      { nome: "MACHADO GRANDE", acerto: 6, n: 2, d: 12, bonus: 4, tipo: "cortante", fx: "corteGrande" },
      { nome: "CHIFRADA", acerto: 6, n: 2, d: 8, bonus: 4, tipo: "perfurante", fx: "estocada" },
    ],
    especial: { k: "investida", nome: "INVESTIDA", extraN: 2, extraD: 8 },
    recarga: 5,
    resistencias: [],
    fonte: "Minotaur (SRD 5.2)",
  },
  GRIFO: {
    id: "GRIFO",
    nome: "Grifo",
    ca: 12,
    pv: 135,
    atributos: { FOR: 18, DES: 15, CON: 16, INT: 2, SAB: 13, CAR: 8 },
    deslocamento: 40,
    voa: true,
    raio: 45,
    ataques: [
      { nome: "BICO", acerto: 6, n: 1, d: 8, bonus: 4, tipo: "perfurante", fx: "estocada" },
      { nome: "GARRAS", acerto: 6, n: 2, d: 6, bonus: 4, tipo: "cortante", fx: "corte" },
    ],
    especial: { k: "rasante", nome: "RASANTE" },
    recarga: 5,
    resistencias: [],
    fonte: "Griffon (SRD 5.2)",
  },
  HIDRA: {
    id: "HIDRA",
    nome: "Hidra",
    ca: 15,
    pv: 120,
    atributos: { FOR: 20, DES: 12, CON: 20, INT: 2, SAB: 10, CAR: 7 },
    deslocamento: 30,
    voa: false,
    raio: 54,
    ataques: [
      { nome: "MORDIDA", acerto: 8, n: 1, d: 10, bonus: 5, tipo: "perfurante", fx: "estocada" },
      { nome: "MORDIDA", acerto: 8, n: 1, d: 10, bonus: 5, tipo: "perfurante", fx: "estocada" },
      { nome: "MORDIDA", acerto: 8, n: 1, d: 10, bonus: 5, tipo: "perfurante", fx: "estocada" },
    ],
    especial: { k: "cabecas", nome: "FÚRIA DAS CABEÇAS" },
    recarga: 5,
    resistencias: [],
    fonte: "Hydra (SRD 5.2)",
  },
  GIGANTE: {
    id: "GIGANTE",
    nome: "Gigante da Colina",
    ca: 13,
    pv: 100,
    atributos: { FOR: 21, DES: 8, CON: 19, INT: 5, SAB: 9, CAR: 6 },
    deslocamento: 40,
    voa: false,
    raio: 48,
    ataques: [
      { nome: "CLAVA GRANDE", acerto: 8, n: 3, d: 8, bonus: 5, tipo: "concussao", fx: "impacto" },
      { nome: "CLAVA GRANDE", acerto: 8, n: 3, d: 8, bonus: 5, tipo: "concussao", fx: "impacto" },
    ],
    especial: { k: "pedra", nome: "ARREMESSO DE PEDRA", acerto: 8, n: 3, d: 10, bonus: 5 },
    recarga: 4,
    resistencias: [],
    fonte: "Hill Giant (SRD 5.2)",
  },
  QUIMERA: {
    id: "QUIMERA",
    nome: "Quimera",
    ca: 14,
    pv: 90,
    atributos: { FOR: 19, DES: 11, CON: 19, INT: 3, SAB: 14, CAR: 10 },
    deslocamento: 30,
    voa: true,
    raio: 48,
    ataques: [
      { nome: "MORDIDA", acerto: 7, n: 2, d: 6, bonus: 4, tipo: "perfurante", fx: "estocada" },
      { nome: "CHIFRES", acerto: 7, n: 1, d: 12, bonus: 4, tipo: "concussao", fx: "impacto" },
      { nome: "GARRAS", acerto: 7, n: 2, d: 6, bonus: 4, tipo: "cortante", fx: "corte" },
    ],
    especial: { k: "sopro", nome: "SOPRO DE FOGO", n: 7, d: 8, cd: 15, tipo: "fogo", alcance: 70 },
    recarga: 5,
    resistencias: [],
    fonte: "Chimera (SRD 5.2)",
  },
  DRAGAO: {
    id: "DRAGAO",
    nome: "Dragão Vermelho",
    ca: 18,
    pv: 110,
    atributos: { FOR: 23, DES: 10, CON: 21, INT: 14, SAB: 11, CAR: 19 },
    deslocamento: 40,
    voa: true,
    raio: 60,
    ataques: [
      { nome: "MORDIDA", acerto: 9, n: 2, d: 10, bonus: 6, tipo: "perfurante", fx: "estocada" },
      { nome: "GARRAS", acerto: 9, n: 2, d: 6, bonus: 6, tipo: "cortante", fx: "corteGrande" },
    ],
    especial: { k: "sopro", nome: "SOPRO DE FOGO", n: 6, d: 6, cd: 14, tipo: "fogo", alcance: 110 },
    recarga: 5,
    resistencias: ["fogo"],
    fonte: "Young Red Dragon (SRD 5.2)",
  },
  // Paladino caído nível 20, criado com a gente para o LENDAS #9 (regras do Paladino e do Golias no SRD 5.2;
  // o poder sagrado do Juramento da Devoção virou necrótico). PV = d10 máximo no 1º nível + média nos outros.
  ALDRIC: {
    id: "ALDRIC",
    nome: "Sir Aldric",
    ca: 19, // placas 18 + Estilo de Luta: Defesa
    pv: 204, // 10+4 no NV 1 + 19 × (6+4)
    atributos: { FOR: 20, DES: 10, CON: 18, INT: 10, SAB: 14, CAR: 20 },
    deslocamento: 45, // Golias 35 + Forma Grande 10
    voa: false,
    raio: 30,
    ataques: [
      { nome: "MONTANTE", acerto: 11, n: 2, d: 6, bonus: 5, tipo: "cortante", fx: "corteGrande" },
      { nome: "MONTANTE", acerto: 11, n: 2, d: 6, bonus: 5, tipo: "cortante", fx: "corteGrande" },
    ],
    especial: { k: "abjurar", nome: "ABJURAR INIMIGOS", cd: 19, atributo: "SAB", alcance: 240, max: 5 },
    recarga: 6,
    resistencias: [],
    fonte: "Paladino 20 · Golias (SRD 5.2)",
    turnos: 1,
    heroi: {
      classe: "PALADINO",
      especie: "GOLIAS",
      nivel: 20,
      prof: 6,
      slots: [4, 3, 3, 3, 2],
      curaMaos: 100,
      aura: { nome: "AURÉOLA PROFANA", dano: 11, alcance: 120 }, // CAR + proficiência, aura de 30 pés
      bonusSalv: 5, // Aura de Proteção: + CAR
      pvRolagens: ["NV 1: d10 máximo = 10 +4 CON = 14 PV", "NV 2–20: média 6 +4 CON = +10 PV por nível (×19) = +190 PV"],
      titulo: "PALADINO CAÍDO",
      visual: {
        pele: "#8a8478",
        cabelo: "#d8d8e0",
        estiloCabelo: "careca",
        barba: "longa",
        olho: "#c070ff",
        marca: "tatuagem",
        roupa: "#1c1822",
        roupa2: "#7a3cc4",
        couro: "#2a2026",
        metal: "#3a3644",
        cabeca: "elmoChifres",
        pluma: "",
        corpo: "placas",
        tabardo: true,
        ombreiras: true,
        capa: "#5a2a8a",
        peleOmbros: false,
        arma: "montante",
        escudo: "",
        brasao: "#7a3cc4",
        orbe: "",
        aljava: false,
        mascara: false,
        magia: "#a050f0",
        altura: 1.1,
      },
    },
  },
};

// Ficha do chefe contra heróis mais fortes (ordens que começam no nível N): +1 de acerto por nível acima do 1,
// dados de dano × (1 + 0,25 por nível) e CD do especial +1 a cada 2 níveis. Nível 1 = ficha original.
export const fichaChefe = (id: ChefeId, nivel = 1): Chefe => {
  const c = CHEFES[id];
  if (nivel <= 1) return c;
  const k = nivel - 1;
  const dados = (n: number) => Math.round(n * (1 + FORCA_POR_NIVEL * k));
  const e = c.especial;
  return {
    ...c,
    ataques: c.ataques.map((a) => ({ ...a, acerto: a.acerto + k, n: dados(a.n) })),
    especial: e.k === "sopro" ? { ...e, n: dados(e.n), cd: e.cd + Math.floor(k / 2) } : e.k === "pedra" ? { ...e, acerto: e.acerto + k, n: dados(e.n) } : e.k === "investida" ? { ...e, extraN: dados(e.extraN) } : e,
  };
};
export const FORCA_POR_NIVEL = 0.25;
// chefe do episódio: o campo "chefe" do JSON, ou um da ordem a cada 10 episódios
export const chefeDoEpisodio = (ep: { numero: number; versao?: number; chefe?: ChefeId | "" }): ChefeId | null => {
  if (ep.chefe) return ep.chefe;
  if ((ep.versao ?? 1) < 3 || ep.numero % 10 !== 0) return null;
  return ORDEM_CHEFES[(ep.numero / 10 - 1) % ORDEM_CHEFES.length];
};
