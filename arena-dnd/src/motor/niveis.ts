// Progressão por nível (SRD 5.2): o que cada classe pode usar em cada nível e o que ganha ao subir.
// Todos os lutadores começam no nível 1; só o campeão sobe (ver subirNivel em personagem.ts).
import type { ClasseId, EspecieId } from "./srd";

export const profDe = (nivel: number) => (nivel >= 17 ? 6 : nivel >= 13 ? 5 : nivel >= 9 ? 4 : nivel >= 5 ? 3 : 2);
// truques: 1 dado nos níveis 1–4, 2 no 5–10, 3 no 11–16, 4 no 17+
export const dadosTruque = (nivel: number) => (nivel >= 17 ? 4 : nivel >= 11 ? 3 : nivel >= 5 ? 2 : 1);

const COMPLETO: [number, number, number][] = [[2, 0, 0], [3, 0, 0], [4, 2, 0], [4, 3, 0], [4, 3, 2], [4, 3, 3]];
const MEIO: [number, number, number][] = [[2, 0, 0], [2, 0, 0], [3, 0, 0], [3, 0, 0], [4, 2, 0], [4, 2, 0]];
const PACTO: [number, number, number][] = [[1, 0, 0], [2, 0, 0], [0, 2, 0], [0, 2, 0], [0, 0, 2], [0, 0, 2]];

export const espacosDe = (classe: ClasseId, nivel: number): [number, number, number] => {
  const i = Math.min(nivel, 6) - 1;
  if (["mago", "feiticeiro", "clerigo", "druida", "bardo"].includes(classe)) return [...COMPLETO[i]] as [number, number, number];
  if (classe === "paladino" || classe === "patrulheiro") return [...MEIO[i]] as [number, number, number];
  if (classe === "bruxo") return [...PACTO[i]] as [number, number, number];
  return [0, 0, 0];
};

// magias (ids de MAGIAS) liberadas por nível
const MAGIAS_NIVEL: Partial<Record<ClasseId, [number, string][]>> = {
  mago: [[1, "raioDeFogo"], [1, "misseisMagicos"], [1, "ondaTrovejante"], [3, "raioArdente"], [5, "bolaDeFogo"], [5, "relampago"]],
  feiticeiro: [[1, "raioDeGelo"], [1, "raioDeFogo"], [1, "orbeCromatico"], [3, "raioArdente"], [3, "despedacar"], [5, "bolaDeFogo"]],
  bruxo: [[1, "rajadaMistica"], [1, "bruxaria"], [3, "despedacar"], [5, "toqueVampirico"]],
  clerigo: [[1, "chamaSagrada"], [1, "raioGuia"], [1, "palavraCurativa"], [1, "curarFerimentos"], [3, "armaEspiritual"], [5, "guardioes"]],
  druida: [[1, "produzirChama"], [1, "chicoteEspinhos"], [1, "ondaTrovejante"], [1, "palavraCurativa"], [3, "raioLunar"], [5, "convocarRelampagos"]],
  bardo: [[1, "zombaria"], [1, "sussurros"], [1, "ondaTrovejante"], [1, "palavraCurativa"], [3, "despedacar"]],
  paladino: [[1, "curarFerimentos"]],
  patrulheiro: [[1, "marcaCacador"], [1, "curarFerimentos"]],
};
export const magiasDe = (classe: ClasseId, nivel: number) => (MAGIAS_NIVEL[classe] ?? []).filter(([n]) => n <= nivel).map(([, id]) => id);
export const magiasNovas = (classe: ClasseId, nivel: number) => (MAGIAS_NIVEL[classe] ?? []).filter(([n]) => n === nivel).map(([, id]) => id);

export type Poder = { nivel: number; nome: string; desc: string };
// habilidades de classe (o pergaminho mostra todas até o nível atual; as do nível novo em verde)
export const PODERES: Record<ClasseId, Poder[]> = {
  barbaro: [
    { nivel: 1, nome: "Fúria", desc: "+2 de dano e resistência a golpes físicos" },
    { nivel: 1, nome: "Defesa sem Armadura", desc: "CA 10 + DES + CON" },
    { nivel: 2, nome: "Ataque Descuidado", desc: "vantagem nos ataques, mas os inimigos também" },
    { nivel: 2, nome: "Sentido de Perigo", desc: "vantagem contra o que pode ver" },
    { nivel: 3, nome: "Frenesi", desc: "ataca ainda mais com a fúria (3 usos)" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Força" },
    { nivel: 5, nome: "Ataque Extra", desc: "dois ataques por ação" },
    { nivel: 5, nome: "Movimento Rápido", desc: "+10 pés de deslocamento" },
  ],
  bardo: [
    { nivel: 1, nome: "Inspiração de Bardo", desc: "d6 extra para um aliado" },
    { nivel: 2, nome: "Pau pra Toda Obra", desc: "metade da proficiência em tudo" },
    { nivel: 3, nome: "Colégio do Conhecimento", desc: "palavras cortantes e magias de 2º círculo" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Carisma" },
    { nivel: 5, nome: "Fonte de Inspiração", desc: "inspiração vira d8" },
  ],
  clerigo: [
    { nivel: 1, nome: "Ordem Divina", desc: "magias sagradas de 1º círculo" },
    { nivel: 2, nome: "Centelha Divina", desc: "1d8 + SAB de luz sagrada em um alvo" },
    { nivel: 3, nome: "Domínio da Vida", desc: "curas mais fortes e magias de 2º círculo" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Sabedoria" },
    { nivel: 5, nome: "Destruir Mortos-Vivos", desc: "magias de 3º círculo" },
  ],
  druida: [
    { nivel: 1, nome: "Ordem Primal", desc: "magias da natureza de 1º círculo" },
    { nivel: 2, nome: "Forma Selvagem", desc: "assume a forma de uma fera" },
    { nivel: 3, nome: "Círculo da Terra", desc: "magias de 2º círculo" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Sabedoria" },
    { nivel: 5, nome: "Magia de 3º círculo", desc: "convoca relâmpagos" },
  ],
  guerreiro: [
    { nivel: 1, nome: "Estilo de Luta", desc: "Arma Grande ou Defesa" },
    { nivel: 1, nome: "Retomar o Fôlego", desc: "recupera 1d10 + nível de PV" },
    { nivel: 2, nome: "Surto de Ação", desc: "uma ação extra por descanso" },
    { nivel: 3, nome: "Crítico Aprimorado", desc: "crítico com 19 ou 20" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Força" },
    { nivel: 5, nome: "Ataque Extra", desc: "dois ataques por ação" },
  ],
  monge: [
    { nivel: 1, nome: "Artes Marciais", desc: "golpes desarmados de d6" },
    { nivel: 1, nome: "Defesa sem Armadura", desc: "CA 10 + DES + SAB" },
    { nivel: 2, nome: "Foco do Monge", desc: "Rajada de Golpes: 2 socos extras" },
    { nivel: 2, nome: "Movimento sem Armadura", desc: "+10 pés de deslocamento" },
    { nivel: 3, nome: "Defletir Ataques", desc: "reduz o dano de golpes físicos" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Destreza" },
    { nivel: 5, nome: "Golpe Atordoante", desc: "o alvo perde o turno (CON)" },
    { nivel: 5, nome: "Ataque Extra", desc: "dois ataques por ação; golpes de d8" },
  ],
  paladino: [
    { nivel: 1, nome: "Cura pelas Mãos", desc: "reserva de 5 PV por nível" },
    { nivel: 2, nome: "Destruição Divina", desc: "+2d8 radiante no acerto" },
    { nivel: 2, nome: "Estilo de Luta", desc: "Defesa: +1 de CA" },
    { nivel: 3, nome: "Canalizar Divindade", desc: "juramento sagrado" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Força" },
    { nivel: 5, nome: "Ataque Extra", desc: "dois ataques por ação" },
  ],
  patrulheiro: [
    { nivel: 1, nome: "Inimigo Favorito", desc: "Marca do Caçador: +1d6 por acerto" },
    { nivel: 2, nome: "Estilo de Luta: Arquearia", desc: "+2 nos ataques à distância" },
    { nivel: 3, nome: "Presa do Caçador", desc: "+1d8 em alvo ferido" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Destreza" },
    { nivel: 5, nome: "Ataque Extra", desc: "duas flechas por ação" },
  ],
  ladino: [
    { nivel: 1, nome: "Ataque Furtivo", desc: "+1d6 com vantagem" },
    { nivel: 2, nome: "Ação Ardilosa", desc: "corre ou se esconde como ação bônus" },
    { nivel: 3, nome: "Mira Firme", desc: "vantagem se não se mover; furtivo 2d6" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Destreza" },
    { nivel: 5, nome: "Esquiva Sobrenatural", desc: "metade do dano de um ataque; furtivo 3d6" },
  ],
  feiticeiro: [
    { nivel: 1, nome: "Feitiçaria Inata", desc: "magia que nasce no sangue" },
    { nivel: 2, nome: "Fonte de Magia", desc: "pontos de feitiçaria e Metamagia" },
    { nivel: 3, nome: "Feitiçaria Dracônica", desc: "CA 13 + DES e magias de 2º círculo" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Carisma" },
    { nivel: 5, nome: "Magia de 3º círculo", desc: "Bola de Fogo" },
  ],
  bruxo: [
    { nivel: 1, nome: "Magia de Pacto", desc: "1 espaço que volta a cada descanso" },
    { nivel: 2, nome: "Rajada Agonizante", desc: "+CAR no dano da Rajada Mística" },
    { nivel: 3, nome: "Dádiva do Pacto", desc: "magias de 2º círculo" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Carisma" },
    { nivel: 5, nome: "Magia de 3º círculo", desc: "Toque Vampírico; Rajada com 2 feixes" },
  ],
  mago: [
    { nivel: 1, nome: "Grimório", desc: "Escudo e Armadura Arcana" },
    { nivel: 2, nome: "Erudito", desc: "especialista em magia arcana" },
    { nivel: 3, nome: "Escola de Evocação", desc: "magias de 2º círculo" },
    { nivel: 4, nome: "Aumento de Atributo", desc: "+2 em Inteligência" },
    { nivel: 5, nome: "Magia de 3º círculo", desc: "Bola de Fogo e Relâmpago" },
  ],
};

export const TRACOS_ESPECIE: Record<EspecieId, Poder[]> = {
  humano: [{ nivel: 1, nome: "Inspiração Heroica", desc: "rerrola um ataque" }, { nivel: 1, nome: "Vigoroso", desc: "+2 PV por nível" }],
  elfo: [{ nivel: 1, nome: "Linhagem da Floresta", desc: "35 pés de deslocamento" }],
  anao: [{ nivel: 1, nome: "Robustez Anã", desc: "+1 PV por nível, resiste a veneno" }],
  halfling: [{ nivel: 1, nome: "Sortudo", desc: "rerrola o 1 no d20" }],
  gnomo: [{ nivel: 1, nome: "Astúcia Gnômica", desc: "vantagem contra magias mentais" }],
  orc: [{ nivel: 1, nome: "Resistência Implacável", desc: "fica com 1 PV uma vez" }, { nivel: 1, nome: "Surto de Adrenalina", desc: "corre e ganha PV temporários" }],
  tiefling: [{ nivel: 1, nome: "Legado Infernal", desc: "resiste a fogo" }, { nivel: 3, nome: "Repreensão Infernal", desc: "2d10 de fogo em quem o ferir" }],
  draconato: [{ nivel: 1, nome: "Arma de Sopro", desc: "cone de 1d10 (2d10 no nível 5)" }],
  golias: [{ nivel: 1, nome: "Resistência da Pedra", desc: "reduz 1d12 + CON de um golpe" }],
};

export const poderesAte = (classe: ClasseId, especie: EspecieId, nivel: number) =>
  [...TRACOS_ESPECIE[especie], ...PODERES[classe]].filter((p) => p.nivel <= nivel);
export const poderesNovos = (classe: ClasseId, especie: EspecieId, nivel: number) =>
  [...TRACOS_ESPECIE[especie], ...PODERES[classe]].filter((p) => p.nivel === nivel);
