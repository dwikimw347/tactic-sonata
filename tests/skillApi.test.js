const request = require('supertest');
const app = require('../server/server');
const gameController = require('../server/controllers/gameController');
const scoreStore = require('../server/data/scoreStore');
const { createSkillState } = require('../server/services/playerSkillService');

function putThreatGameInStore() {
  const game = gameController.createGame({ playerSymbol: 'X', difficulty: 'easy', matchMode: 3 });
  game.board = [
    'O', 'O', null,
    'X', null, null,
    null, null, 'X',
  ];
  game.currentTurn = 'X';
  game.status = 'playing';
  game.winner = null;
  game.winningPattern = [];
  game.history = [
    { by: 'player', symbol: 'X', index: 3 },
    { by: 'ai', symbol: 'O', index: 0, strategy: 'random' },
    { by: 'player', symbol: 'X', index: 8 },
    { by: 'ai', symbol: 'O', index: 1, strategy: 'random' },
  ];
  game.skills = createSkillState();
  scoreStore.setCurrentGame(game);
  return game;
}

describe('Skill API', () => {
  beforeEach(() => {
    scoreStore.resetAll();
  });

  test('GET /api/game/skills returns skill usage status', async () => {
    await request(app)
      .post('/api/game/start')
      .send({ playerSymbol: 'X', difficulty: 'impossible', matchMode: 3 });

    const response = await request(app)
      .get('/api/game/skills')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.skills.insight.remaining).toBe(2);
    expect(response.body.data.skills.undo.remaining).toBe(1);
    expect(response.body.data.skills.harmonyShield.remaining).toBe(1);
  });

  test('POST /api/game/skill/insight returns a legal bestMoveIndex', async () => {
    putThreatGameInStore();

    const response = await request(app)
      .post('/api/game/skill/insight')
      .send({})
      .expect(200);

    const { bestMoveIndex, game } = response.body.data;

    expect(response.body.success).toBe(true);
    expect(bestMoveIndex).toBe(2);
    expect(game.skills.insight.remaining).toBe(1);
    expect(game.board[bestMoveIndex]).toBeNull();
  });

  test('POST /api/game/skill/undo restores the board and keeps score unchanged', async () => {
    await request(app)
      .post('/api/game/start')
      .send({ playerSymbol: 'X', difficulty: 'impossible', matchMode: 3 });

    await request(app)
      .post('/api/game/move')
      .send({ index: 0 });

    const beforeScore = scoreStore.getScore();
    const response = await request(app)
      .post('/api/game/skill/undo')
      .send({})
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.game.board[0]).toBeNull();
    expect(response.body.data.game.history).toHaveLength(0);
    expect(scoreStore.getScore()).toEqual(beforeScore);
  });

  test('POST /api/game/skill/shield detects a threat and arms Harmony Shield', async () => {
    putThreatGameInStore();

    const response = await request(app)
      .post('/api/game/skill/shield')
      .send({})
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.isThreatDetected).toBe(true);
    expect(response.body.data.blockMoveIndex).toBe(2);
    expect(response.body.data.skills.harmonyShield.active).toBe(true);
  });

  test('POST /api/game/skill/shield can place the defensive block', async () => {
    putThreatGameInStore();

    const response = await request(app)
      .post('/api/game/skill/shield')
      .send({ use: true })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.blockMoveIndex).toBe(2);
    expect(response.body.data.game.board[2]).toBe('X');
    expect(response.body.data.game.history.some((move) => move.skill === 'harmonyShield')).toBe(true);
  });
});
