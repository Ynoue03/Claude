// Subida de nível do campeão (regras do SRD 5.2) e a história em português, sem marcar gênero.
import { GolpeId, Resultado, GOLPE } from "./combate";
import { Lutador, modAtr, recursosDoNivel } from "./ficha";
import { Dados, mod } from "./rng";
import { CLASSE, ClasseId, ESPACOS, ESPECIE, EspecieId, PODERES, Atributo } from "./tabelas";

export type SubidaNivel = {
  antes: Lutador;
  depois: Lutador;
  rolagemPV: { dado: number; valor: number; con: number; anao: number; ganho: number; texto: string };
  novosPoderes: [string, string][];
  aumentos: Partial<Record<Atributo, number>>;
  espacosAntes: number[];
  espacosDepois: number[];
  historia: string;
};

const POVO: Record<EspecieId, string> = {
  humano: "do povo humano",
  elfo: "do povo élfico",
  anao: "do povo anão",
  halfling: "do povo halfling",
  gnomo: "do povo gnomo",
  orc: "do povo orc",
  tiefling: "de sangue infernal",
  draconato: "de sangue dracônico",
  golias: "do povo golias",
};

const CLASSE_FRASE: Record<ClasseId, string> = {
  guerreiro: "com a disciplina de quem vive da espada",
  barbaro: "com a fúria das tribos",
  paladino: "com um juramento sagrado",
  patrulheiro: "com o arco e o faro de caçador",
  ladino: "com passos de sombra",
  monge: "com punhos treinados no mosteiro",
  mago: "com um grimório de fogo e trovão",
  feiticeiro: "com magia correndo no sangue",
  bruxo: "com um pacto sombrio",
  clerigo: "com a luz de um deus",
  druida: "com a força das florestas",
  bardo: "com um alaúde e uma língua afiada",
};

const NUM = ["nenhum", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze"];

const nomeGolpe = (g: GolpeId, l: Lutador) => {
  if (g === "ataque" || g === "oportunidade" || g === "descuidado" || g === "surtoAcao" || g === "furtivo")
    return l.arma.id === "punhos" ? "um soco" : `um golpe de ${l.arma.nome.toLowerCase()}`;
  if (g === "artes" || g === "rajadaGolpes") return "um golpe de artes marciais";
  if (g === "flecha") return "uma flecha";
  return GOLPE[g].nome.toLowerCase().replace("!", "");
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const escreverHistoria = (l: Lutador, nivelNovo: number, res: Resultado, lutadores: Lutador[], novos: [string, string][], seed: number) => {
  const r = new Dados(seed ^ 0x51ed);
  const origem = cap(r.pick(ESPECIE[l.especie].origem));
  const frases: string[] = [];
  frases.push(`${origem}, ${l.nome}, ${POVO[l.especie]}, entrou na arena ${CLASSE_FRASE[l.classe]}.`);
  if (l.descricao) frases.push(`Nas palavras de quem criou: ${l.descricao}.`);
  const n = res.abates[l.id].length;
  const partes: string[] = [];
  if (n > 0) partes.push(`derrubou ${NUM[n] ?? n} ${n === 1 ? "rival" : "rivais"}`);
  const md = res.maiorDano[l.id];
  if (res.criticos[l.id] > 0) partes.push(`acertou ${res.criticos[l.id] === 1 ? "um crítico" : `${NUM[res.criticos[l.id]]} críticos`}`);
  else if (md) partes.push(`acertou ${md.valor} de dano em ${lutadores[md.alvo].nome}`);
  const menor = res.menorPV[l.id];
  if (menor <= Math.max(3, l.pvMax * 0.3)) partes.push(`resistiu com ${menor} PV`);
  if (partes.length) {
    const ultima = partes.pop() as string;
    frases.push(cap(partes.length ? `${partes.join(", ")} e ${ultima}` : ultima) + ".");
  }
  if (res.golpeFinal && res.golpeFinal.ator === l.id)
    frases.push(`O golpe final foi ${nomeGolpe(res.golpeFinal.golpe, l)} em ${lutadores[res.golpeFinal.alvo].nome}.`);
  const generico = (n: string) => /^(ESTILO|AUMENTO|\+2|PAU PRA|MAGIAS DE)/.test(n);
  const destaque = novos.filter((p) => !generico(p[0]))[0] ?? novos[0];
  if (destaque) {
    const [nome, desc] = destaque;
    frases.push(`Agora, no nível ${nivelNovo}, ganhou ${nome.toLowerCase()}: ${desc}.`);
  } else frases.push(`Agora, no nível ${nivelNovo}, ficou mais resistente.`);
  return frases.join(" ");
};

export const subirNivel = (campeao: Lutador, r: Dados, res: Resultado, lutadores: Lutador[], seed: number): SubidaNivel => {
  const antes: Lutador = JSON.parse(JSON.stringify(campeao));
  const depois: Lutador = JSON.parse(JSON.stringify(campeao));
  const novo = antes.nivel + 1;
  depois.nivel = novo;
  const info = CLASSE[antes.classe];

  // atributos: só no nível 4 (Aumento de Atributo: +2 no principal, máx. 20)
  const aumentos: Partial<Record<Atributo, number>> = {};
  if (novo === 4 || novo === 8) {
    const p = info.prioridade[0];
    const ganho = Math.min(2, 20 - depois.atrib[p]);
    if (ganho > 0) {
      depois.atrib[p] += ganho;
      aumentos[p] = ganho;
    }
    if (ganho < 2) {
      const s = info.prioridade[1];
      const g2 = Math.min(2 - ganho, 20 - depois.atrib[s]);
      if (g2 > 0) {
        depois.atrib[s] += g2;
        aumentos[s] = g2;
      }
    }
  }

  // PV: dado de vida + CON (mínimo 1)
  const valor = r.d(info.dadoVida);
  const con = modAtr(depois, "CON");
  const anao = depois.especie === "anao" ? 1 : 0;
  // se a CON subiu no nível 4, os PV de todos os níveis anteriores sobem junto
  const retro = aumentos.CON ? (mod(depois.atrib.CON) - mod(antes.atrib.CON)) * antes.nivel : 0;
  const ganho = Math.max(1, valor + con) + anao + retro;
  depois.pvMax = antes.pvMax + ganho;
  const texto = `d${info.dadoVida} = ${valor} ${con >= 0 ? "+" : "−"} ${Math.abs(con)} CON${anao ? " + 1 Robustez Anã" : ""} = +${ganho} PV`;
  depois.historicoPV = antes.historicoPV.concat([`Nível ${novo}: ${texto}`]);

  const novosPoderes = PODERES[antes.classe][Math.min(5, novo)] ?? [];
  depois.poderesExtras = antes.poderesExtras.concat(novosPoderes.map((p) => p[0]));
  if (antes.classe === "patrulheiro" && novo === 2) depois.estilo = "Arquearia";
  depois.recursos = recursosDoNivel(depois);
  const espacosAntes = ESPACOS[info.conjurador][Math.min(5, antes.nivel)];
  const espacosDepois = ESPACOS[info.conjurador][Math.min(5, novo)];
  const historia = escreverHistoria(antes, novo, res, lutadores, novosPoderes, seed);
  return {
    antes,
    depois,
    rolagemPV: { dado: info.dadoVida, valor, con, anao, ganho, texto },
    novosPoderes,
    aumentos,
    espacosAntes,
    espacosDepois,
    historia,
  };
};
