// 調校／驗證模擬器：跑幾個標準巡線程式，看看哪些能完成一圈
const S = require('../sim/engine.js');

function lineFollower(cfg) {
  // cfg: {fwd, corr:'stop'|'back'|'slow', back, slow, tier:false}
  return async function (a) {
    await a.init('i');
    await a.pause('p', 1000);
    for (;;) {
      a.check();
      const M = await a.line('m', 2), L1 = await a.line('l1', 1), R1 = await a.line('r1', 3);
      let L2 = 0, R2 = 0;
      if (M === 1) { await a.motor('f', 'A', 1, cfg.fwd); }
      else if (L1 === 1) {
        if (cfg.corr === 'back') { await a.motor('x', 'L', -1, cfg.back); await a.motor('x', 'R', 1, cfg.fwd); }
        else if (cfg.corr === 'stop') { await a.stop('x', 'L'); await a.motor('x', 'R', 1, cfg.fwd); }
        else { await a.motor('x', 'L', 1, cfg.slow); await a.motor('x', 'R', 1, cfg.fwd); }
      } else if (R1 === 1) {
        if (cfg.corr === 'back') { await a.motor('x', 'L', 1, cfg.fwd); await a.motor('x', 'R', -1, cfg.back); }
        else if (cfg.corr === 'stop') { await a.motor('x', 'L', 1, cfg.fwd); await a.stop('x', 'R'); }
        else { await a.motor('x', 'L', 1, cfg.fwd); await a.motor('x', 'R', 1, cfg.slow); }
      } else if (cfg.tier && (L2 = await a.line('l2', 0)) === 1) {
        await a.motor('x', 'L', -1, cfg.back2); await a.motor('x', 'R', 1, cfg.fwd2 || cfg.fwd);
      } else if (cfg.tier && (R2 = await a.line('r2', 4)) === 1) {
        await a.motor('x', 'L', 1, cfg.fwd2 || cfg.fwd); await a.motor('x', 'R', -1, cfg.back2);
      } else {
        await a.stop('s', 'A');
      }
      await a.foreverGap();
    }
  };
}

async function trial(scene, cfg, seed, realism = true, limit = 240) {
  const E = new S.Engine({ scene, seed, realism });
  const R = new S.Runner(E, {});
  R.limit = limit;
  let res = 'running';
  const watch = new Promise(resolve => {
    // 每 0.5 秒檢查一次（用 hooks.pace 會變慢，所以改用 setInterval 的方式不行；直接在 step 外判斷）
    resolve();
  });
  // 監察：覆寫 step，偵測完成或失敗
  const origStep = E.step.bind(E);
  E.step = function (dt) {
    origStep(dt);
    if (E.prog.laps >= 1 && res === 'running') { res = 'lap'; R.stop(); }
    if (E.offLineTime > 2.5 && res === 'running') { res = 'off'; R.stop(); }
    if (E.warnings.offpaper && res === 'running') { res = 'offpaper'; R.stop(); }
    if (res === 'running' && E.t > 8 && !E.moving() && E.cmd.L === 0 && E.cmd.R === 0) { res = 'stopped'; R.stop(); }
  };
  await R.run(lineFollower(cfg));
  if (R.timeout && res === 'running') res = 'timeout';
  return { res, t: +E.t.toFixed(1), lap: E.lapTimes[0] ? +E.lapTimes[0].toFixed(1) : null, frac: +E.progressFraction().toFixed(2), sharp: E.sharpTurns, maxOff: +E.maxOff.toFixed(1) };
}

(async () => {
  const seeds = ['1A-01', '1A-02', '1B-15', '1C-30', '1D-07', 'demo', '1E-22', '1F-11'];
  const configs = [
    ['③ fwd 20 / back 10 (起步)', { fwd: 20, corr: 'back', back: 10 }],
    ['② stop / fwd 20', { fwd: 20, corr: 'stop' }],
    ['① slow 10 / fwd 20', { fwd: 20, corr: 'slow', slow: 10 }],
    ['② stop / fwd 40', { fwd: 40, corr: 'stop' }],
    ['③ fwd 40 back 20', { fwd: 40, corr: 'back', back: 20 }],
    ['③ fwd 60 back 30', { fwd: 60, corr: 'back', back: 30 }],
    ['③ fwd 80 back 40', { fwd: 80, corr: 'back', back: 40 }],
    ['③ fwd 100 back 50', { fwd: 100, corr: 'back', back: 50 }],
    ['分層 ②+③ fwd 20', { fwd: 20, corr: 'stop', tier: true, back2: 10 }],
    ['分層 ②+③ fwd 40', { fwd: 40, corr: 'stop', tier: true, back2: 20 }],
    ['分層 ②+③ fwd 60', { fwd: 60, corr: 'stop', tier: true, back2: 30 }],
    ['分層 ②+③ fwd 80', { fwd: 80, corr: 'stop', tier: true, back2: 40 }],
  ];
  const scenes = process.argv[2] ? process.argv[2].split(',') : ['oval', 'sharp'];
  for (const sc of scenes) {
    console.log('\n=== ' + sc + ' ===');
    for (const [name, cfg] of configs) {
      const rows = [];
      for (const sd of seeds) rows.push(await trial(sc, cfg, sd));
      const ok = rows.filter(r => r.res === 'lap').length;
      console.log(name.padEnd(26), ok + '/' + rows.length, rows.map(r => r.res === 'lap' ? 'lap ' + r.lap + 's/急' + r.sharp : r.res + '@' + r.frac).join(' | '));
    }
  }
})();
