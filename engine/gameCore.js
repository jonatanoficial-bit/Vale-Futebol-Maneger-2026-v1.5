/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/gameCore.js — núcleo do jogo (estado + calendário + fluxo de jogo)
   -------------------------------------------------------
   Regras:
   - Alterações sempre compatíveis com saves (normalize no load)
   - Sem remover campos antigos: apenas adicionar defaults
   - Match flow (próximo jogo) deve ser determinístico o suficiente
   ======================================================= */

export class GameCore {
  constructor({ packs, slots }) {
    this.packs = packs;
    this.slots = slots;

    this.activeSlot = null;
    this.activePackId = null;

    this.state = null; // estado carregado do slot
    this.activeMatch = null; // { event, fixture, competitionKey, matchDayId }
  }

  // -------------------------
  // Boot / Load / Normalize
  // -------------------------
  boot() {
    // cria estado mínimo para navegação inicial
    this.state = {
      screen: "cover",
      selectedPackId: null,
      selectedSlot: null,
      career: null
    };
    return this.state;
  }

  setScreen(screen) {
    this._ensureState();
    this.state.screen = screen;
    return this.state;
  }

  selectPack(packId) {
    this._ensureState();
    this.state.selectedPackId = packId;
    this.activePackId = packId;
    return this.state;
  }

  selectSlot(slotId) {
    this._ensureState();
    this.state.selectedSlot = slotId;
    this.activeSlot = slotId;
    return this.state;
  }

  createCareer({ avatarId, name, country, role, clubId }) {
    this._ensureState();

    const nowISO = new Date().toISOString();
    const seasonYear = 2026;

    const career = {
      version: 2,
      createdAt: nowISO,
      updatedAt: nowISO,

      seasonYear,
      currentDate: `${seasonYear}-01-01`,

      profile: { avatarId, name, country },
      role,
      clubId,

      // histórico de partidas (para tabela/estatísticas futuras)
      matchHistory: [],

      // cache de “último jogo”
      lastMatch: null,

      // pontos/recompensas (placeholder)
      userXP: 0,
      userLevel: 1
    };

    this.state.career = career;
    this._save();
    return this.state;
  }

  loadFromSlot(slotId) {
    this.selectSlot(slotId);

    const loaded = this.slots.load(slotId);
    if (!loaded) return null;

    this.state = loaded;
    this._normalizeLoadedState();
    return this.state;
  }

  _normalizeLoadedState() {
    // garante compatibilidade com saves anteriores
    this._ensureState();

    if (!this.state.career) return;

    const c = this.state.career;

    if (!c.version) c.version = 1;
    if (!c.seasonYear) c.seasonYear = 2026;
    if (!c.currentDate) c.currentDate = `${c.seasonYear}-01-01`;

    if (!c.matchHistory || !Array.isArray(c.matchHistory)) c.matchHistory = [];
    if (!c.lastMatch) c.lastMatch = null;

    if (c.userXP == null) c.userXP = 0;
    if (c.userLevel == null) c.userLevel = 1;

    if (!c.profile) c.profile = { avatarId: 0, name: "Jogador", country: "Brasil" };

    // garante campos de UI
    if (!this.state.screen) this.state.screen = "lobby";

    this._save();
  }

  _ensureState() {
    if (!this.state) this.boot();
  }

  // -------------------------
  // Pack data helpers
  // -------------------------
  getPack() {
    const pid = this.activePackId || this.state?.selectedPackId || null;
    if (!pid) return null;
    return this.packs.getPack(pid);
  }

  getClubs() {
    return this.getPack()?.clubs || [];
  }

  getPlayers() {
    return this.getPack()?.players || [];
  }

  getClubById(id) {
    const clubs = this.getClubs();
    return clubs.find(c => String(c.id) === String(id)) || null;
  }

  getPlayersForTeam(clubId) {
    const players = this.getPlayers();
    return players.filter(p => String(p.clubId) === String(clubId));
  }

  // -------------------------
  // Calendar (blocos) — (já existia na base)
  // -------------------------
  getCareer() {
    return this.state?.career || null;
  }

  getCurrentDate() {
    return this.getCareer()?.currentDate || "2026-01-01";
  }

  setCurrentDate(isoDate) {
    const c = this.getCareer();
    if (!c) return null;
    c.currentDate = isoDate;
    c.updatedAt = new Date().toISOString();
    this._save();
    return c.currentDate;
  }

  // Retorna eventos “blocos” (Estaduais/CdB etc.) + jogos do clube na Série
  getCalendarEvents() {
    const c = this.getCareer();
    if (!c) return [];

    const seasonYear = c.seasonYear || 2026;

    // blocos fixos (placeholder — igual estava)
    const blocks = [
      { date: `${seasonYear}-01-08`, label: "Estaduais", phase: "Rodadas" },
      { date: `${seasonYear}-01-15`, label: "Estaduais", phase: "Rodadas" },
      { date: `${seasonYear}-01-22`, label: "Estaduais", phase: "Rodadas" },
      { date: `${seasonYear}-01-29`, label: "Estaduais", phase: "Rodadas" },
      { date: `${seasonYear}-02-05`, label: "Estaduais", phase: "Rodadas" },
      { date: `${seasonYear}-02-12`, label: "Estaduais", phase: "Rodadas" },
      { date: `${seasonYear}-02-19`, label: "Estaduais", phase: "Rodadas" },
      { date: `${seasonYear}-02-26`, label: "Estaduais", phase: "Rodadas" },
      { date: `${seasonYear}-03-05`, label: "Estaduais", phase: "Finais" },
      { date: `${seasonYear}-03-12`, label: "Estaduais", phase: "Finais" }
    ].map(b => ({ type: "block", ...b }));

    // Série A/B: usa fixtures simplificadas (placeholder)
    // A entrega atual não gera tabela ainda; só “próximo jogo do clube”.
    const serieStart = `${seasonYear}-04-06`;
    const clubId = c.clubId;

    // cria um “próximo jogo” determinístico simples:
    // FLA x SAO (como no seu print) quando o clube existir e a data >= serieStart
    const fixtures = [];
    fixtures.push({
      type: "match",
      competition: "Série A",
      matchDay: 1,
      date: serieStart,
      homeId: "FLA",
      awayId: "SAO"
    });

    // Filtra só jogos do clube, se bater com home/away
    // (por enquanto o clubeId do seu save pode ser real, mas os ids do pack podem ser diferentes.
    // então exibimos o fixture mesmo assim no calendário para a demo.)
    const matches = fixtures.map(f => ({
      ...f,
      clubInvolved: (String(f.homeId) === String(clubId) || String(f.awayId) === String(clubId)) || true
    }));

    return [...blocks, ...matches].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Próximo jogo do “clube” (match mais próximo >= currentDate)
  getNextClubMatch() {
    const c = this.getCareer();
    if (!c) return null;

    const cur = c.currentDate;
    const events = this.getCalendarEvents().filter(e => e.type === "match" && e.date >= cur);
    if (!events.length) return null;

    // retorna o primeiro por data
    const next = events.sort((a, b) => a.date.localeCompare(b.date))[0];

    return {
      date: next.date,
      competition: next.competition,
      matchDay: next.matchDay,
      fixture: {
        homeId: next.homeId,
        awayId: next.awayId
      }
    };
  }

  // -------------------------
  // MATCH FLOW (ENTREGA ATUAL)
  // -------------------------
  openNextMatch() {
    const next = this.getNextClubMatch();
    if (!next) return null;

    // seta data para a data do jogo
    this.setCurrentDate(next.date);

    this.activeMatch = {
      event: next,
      fixture: next.fixture,
      competitionKey: next.competition,
      matchDayId: next.matchDay
    };

    return this.activeMatch;
  }

  getActiveMatch() {
    return this.activeMatch;
  }

  clearActiveMatch() {
    this.activeMatch = null;
  }

  simulateActiveMatch({ quality = "MEDIO" } = {}) {
    if (!this.activeMatch) return null;
    const c = this.getCareer();
    if (!c) return null;

    if (!window.MatchEngine || typeof window.MatchEngine.simulateMatch !== "function") {
      throw new Error("MatchEngine não está disponível. Verifique se engine/match.js está carregado no index.html.");
    }

    const { homeId, awayId } = this.activeMatch.fixture;

    const homeName = this._resolveTeamName(homeId);
    const awayName = this._resolveTeamName(awayId);

    const homePlayers = this._resolveTeamPlayers(homeId);
    const awayPlayers = this._resolveTeamPlayers(awayId);

    const homeTeam = this._buildTeamForMatch(homeId, homeName, homePlayers);
    const awayTeam = this._buildTeamForMatch(awayId, awayName, awayPlayers);

    const options = {
      quality,
      // seeds/opções futuras aqui sem quebrar compatibilidade
    };

    const result = window.MatchEngine.simulateMatch(homeTeam, awayTeam, options);

    const report = {
      date: this.activeMatch.event.date,
      competition: this.activeMatch.event.competition,
      matchDay: this.activeMatch.event.matchDay,

      homeId,
      awayId,
      homeName,
      awayName,

      goalsHome: result?.score?.home ?? 0,
      goalsAway: result?.score?.away ?? 0,

      stats: result?.stats || null,
      highlights: result?.highlights || [],
      ratings: result?.playerRatings || null,
      motm: result?.motm || null
    };

    // salva no histórico
    c.matchHistory.push(report);
    c.lastMatch = report;
    c.updatedAt = new Date().toISOString();

    // limpa active match depois de simular (pra evitar duplicar)
    this.clearActiveMatch();

    this._save();
    return report;
  }

  _buildTeamForMatch(teamId, name, players) {
    const xi = (players || []).slice().sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)).slice(0, 11);

    const overall = this._calcTeamOverall(xi);

    return {
      id: String(teamId),
      name,
      overall,
      players: xi.map(p => ({
        id: String(p.id ?? p.playerId ?? p.name ?? Math.random()),
        name: p.name || p.nome || "Jogador",
        position: p.position || p.pos || "UNK",
        overall: Number(p.overall ?? p.ovr ?? 60)
      }))
    };
  }

  _calcTeamOverall(xi) {
    if (!xi || !xi.length) return 60;
    const sum = xi.reduce((acc, p) => acc + Number(p.overall ?? p.ovr ?? 60), 0);
    return Math.round(sum / xi.length);
  }

  _resolveTeamName(teamId) {
    // tenta achar no pack por id
    const club = this.getClubById(teamId);
    if (club?.name) return club.name;

    // fallback para ids curtos tipo FLA/SAO
    const map = {
      FLA: "Flamengo",
      SAO: "São Paulo",
      PAL: "Palmeiras",
      COR: "Corinthians"
    };
    return map[String(teamId)] || String(teamId);
  }

  _resolveTeamPlayers(teamId) {
    // tenta buscar do pack
    const fromPack = this.getPlayersForTeam(teamId);
    if (fromPack && fromPack.length) return fromPack;

    // fallback: gera elenco fake determinístico simples (não quebra o projeto)
    const base = 55 + (String(teamId).charCodeAt(0) % 12);
    const list = [];
    for (let i = 1; i <= 18; i++) {
      list.push({
        id: `${teamId}-${i}`,
        name: `${teamId} Player ${i}`,
        position: i === 1 ? "GK" : (i <= 5 ? "DEF" : i <= 11 ? "MID" : "ATT"),
        overall: base + (i % 10)
      });
    }
    return list;
  }

  // -------------------------
  // Save
  // -------------------------
  _save() {
    if (!this.activeSlot) return;
    if (!this.state) return;
    this.slots.save(this.activeSlot, this.state);
  }
}