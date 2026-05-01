const request = require('supertest');
const app = require('../server/server');
const scoreStore = require('../server/data/scoreStore');

describe('Game API', () => {
  beforeEach(() => {
    scoreStore.resetAll();
  });

  test('POST /api/game/start starts a new game', async () => {
    const response = await request(app)
      .post('/api/game/start')
      .send({ playerSymbol: 'X', difficulty: 'impossible', matchMode: 3 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.game.status).toBe('playing');
    expect(response.body.data.game.board).toHaveLength(9);
    expect(response.body.data.game.playerSymbol).toBe('X');
    expect(response.body.data.game.aiSymbol).toBe('O');
  });

  test('POST /api/game/reset clears game state and score', async () => {
    await request(app)
      .post('/api/game/start')
      .send({ playerSymbol: 'X', difficulty: 'impossible', matchMode: 3 });

    const response = await request(app)
      .post('/api/game/reset')
      .send({})
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.game.status).toBe('idle');
    expect(response.body.data.game.score).toEqual({ wins: 0, losses: 0, draws: 0 });
  });

  test('POST /api/game/move accepts a valid player move and triggers AI', async () => {
    await request(app)
      .post('/api/game/start')
      .send({ playerSymbol: 'X', difficulty: 'impossible', matchMode: 3 });

    const response = await request(app)
      .post('/api/game/move')
      .send({ index: 0 })
      .expect(200);

    const game = response.body.data.game;
    const markedCells = game.board.filter(Boolean).length;

    expect(response.body.success).toBe(true);
    expect(game.board[0]).toBe('X');
    expect(markedCells).toBe(2);
    expect(game.status).toBe('playing');
    expect(game.currentTurn).toBe('X');
    expect(response.body.data.aiMove).toEqual(expect.any(Number));
    expect(response.body.data.phrolovaSkill).toMatchObject({
      name: expect.any(String),
      dialogue: expect.any(String),
      effect: expect.any(String),
    });
  });

  test('GET /api/game/score returns score and match data', async () => {
    const response = await request(app)
      .get('/api/game/score')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.score).toEqual({ wins: 0, losses: 0, draws: 0 });
    expect(response.body.data.match.mode).toBe(3);
  });

  test('POST /api/game/difficulty updates difficulty', async () => {
    const response = await request(app)
      .post('/api/game/difficulty')
      .send({ difficulty: 'hard' })
      .expect(200);

    expect(response.body.data.difficulty).toBe('hard');
  });

  test('difficulty list includes Maestro of the Lost Beyond', async () => {
    const response = await request(app)
      .post('/api/game/difficulty')
      .send({ difficulty: 'maestro' })
      .expect(200);

    expect(response.body.data.difficulty).toBe('maestro');
  });

  test('POST /api/game/start preserves maestro difficulty in game state', async () => {
    const response = await request(app)
      .post('/api/game/start')
      .send({ playerSymbol: 'X', difficulty: 'maestro', matchMode: 3 })
      .expect(200);

    expect(response.body.data.game.difficulty).toBe('maestro');
  });

  test('POST /api/game/move returns maestroAbility when ability activates', async () => {
    await request(app)
      .post('/api/game/start')
      .send({ playerSymbol: 'X', difficulty: 'maestro', matchMode: 3 });

    let game;
    let response;
    for (let turn = 0; turn < 5; turn += 1) {
      const index = game
        ? game.board.findIndex((cell) => !cell)
        : 0;
      response = await request(app).post('/api/game/move').send({ index }).expect(200);
      game = response.body.data.game;
      if (response.body.data.maestroAbility || game.status !== 'playing') break;
    }

    expect(response.body.data).toHaveProperty('maestroAbility');
    expect(response.body.data.maestroAbility).toEqual(expect.any(Object));
    expect(response.body.data.maestroAbility.name).toEqual(expect.any(String));
  });

  test('POST /api/game/match-mode updates match mode', async () => {
    const response = await request(app)
      .post('/api/game/match-mode')
      .send({ mode: 5 })
      .expect(200);

    expect(response.body.data.matchMode).toBe(5);
    expect(response.body.data.match.targetWins).toBe(3);
  });
});
