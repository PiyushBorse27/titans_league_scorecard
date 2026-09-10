import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 3001;

const DEFAULT_SCORES = () => ({
  lever: false,
  boxTransfer: [false, false, false, false, false],
  powerPlaced: false,
  realityPlaced: false,
  mindPlaced: false,
  spacePlaced: false,
  soulPlaced: false,
  silverStones: [false, false, false],
  allSilverBonus: false,
  towers: [false, false, false],
  titanOrb: false
});

let state = {
  timer: {
    timeLeft: 300,
    isRunning: false,
    mode: 'match' // 'match' or 'setup'
  },
  redData: {
    scores: DEFAULT_SCORES(),
    metadata: { teamName: 'Team Tech Titans', matchNo: 'M-01', driverName: '', refereeName: '' },
    retries: 0,
    penalties: 0
  },
  blueData: {
    scores: DEFAULT_SCORES(),
    metadata: { teamName: 'Cyber Warriors', matchNo: 'M-01', driverName: '', refereeName: '' },
    retries: 0,
    penalties: 0
  }
};

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', clients: wss ? wss.clients.size : 0 }));
});

const wss = new WebSocketServer({ server });

function broadcastState() {
  const payload = JSON.stringify({ type: 'STATE_UPDATE', state });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Server-side synchronized timer loop
setInterval(() => {
  if (state.timer.isRunning && state.timer.timeLeft > 0) {
    state.timer.timeLeft -= 1;
    if (state.timer.timeLeft === 0) {
      state.timer.isRunning = false;
    }
    broadcastState();
  }
}, 1000);

wss.on('connection', (ws) => {
  console.log('Client connected to Titans Sync Server');
  // Send current state to newly connected client
  ws.send(JSON.stringify({ type: 'STATE_UPDATE', state }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'UPDATE_SCORES':
          if (data.alliance === 'red') {
            state.redData.scores = data.scores;
          } else if (data.alliance === 'blue') {
            state.blueData.scores = data.scores;
          }
          break;

        case 'UPDATE_METADATA':
          if (data.alliance === 'red') {
            state.redData.metadata = { ...state.redData.metadata, ...data.metadata };
          } else if (data.alliance === 'blue') {
            state.blueData.metadata = { ...state.blueData.metadata, ...data.metadata };
          }
          break;

        case 'UPDATE_RETRY_PENALTY':
          if (data.alliance === 'red') {
            if (data.retries !== undefined) state.redData.retries = data.retries;
            if (data.penalties !== undefined) state.redData.penalties = data.penalties;
          } else if (data.alliance === 'blue') {
            if (data.retries !== undefined) state.blueData.retries = data.retries;
            if (data.penalties !== undefined) state.blueData.penalties = data.penalties;
          }
          break;

        case 'TIMER_CONTROL':
          if (data.action === 'START') {
            state.timer.isRunning = true;
          } else if (data.action === 'PAUSE') {
            state.timer.isRunning = false;
          } else if (data.action === 'RESET') {
            state.timer.isRunning = false;
            state.timer.mode = data.mode || state.timer.mode;
            state.timer.timeLeft = state.timer.mode === 'match' ? 300 : 60;
            
            // Automatically reset scores to 0 for both teams on match reset
            state.redData.scores = DEFAULT_SCORES();
            state.redData.retries = 0;
            state.redData.penalties = 0;
            state.blueData.scores = DEFAULT_SCORES();
            state.blueData.retries = 0;
            state.blueData.penalties = 0;
          }
          break;

        case 'RESET_ALL_ALLIANCE':
          if (data.alliance === 'red') {
            state.redData.scores = DEFAULT_SCORES();
            state.redData.retries = 0;
            state.redData.penalties = 0;
          } else if (data.alliance === 'blue') {
            state.blueData.scores = DEFAULT_SCORES();
            state.blueData.retries = 0;
            state.blueData.penalties = 0;
          }
          break;

        default:
          break;
      }

      broadcastState();
    } catch (e) {
      console.error('Error parsing client message', e);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Titans League Sync Server running on port ${PORT}`);
});
