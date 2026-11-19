(() => {
  const url = new URL(location.href);
  if (url.searchParams.get('sample') !== '1') return;
  const F1 = window.F1;
  const first = entries => Object.fromEntries(Object.entries(entries).map(([id, v]) => [id, { v, ok: true }]));
  const student = { cls: '1A', num: '01', name: '示範同學' };
  const current = F1.get('f1dt:L1');
  if (!F1.get('f1-preview:sample-loaded') || !current) {
    const robot = first({ arm: 'R', deli: 'R', vac: 'R', lift: 'A', door: 'A', rc: 'N', fan: 'N', claw: 'N', orn: 'N' });
    robot.arm = { v: 'A', ok: false };
    F1.put('f1dt:L1', {
      v: 1, badges: {}, items: {
        fill: { val: { 0: 'sense', 1: 'environment', 2: 'decisions', 3: 'program', 4: 'actions' }, first: 5, tries: 1 },
        robot: { first: robot },
        match: { picked: { 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e' }, first: 5 },
        d1: { v: '運動會可以測試機械人的平衡和反應，將來可用來救災。' },
        d2: { v: '機械人可以代替人搬運重物，但維修和保養需要成本。' },
        ipo: { first: first({ us: 'in', line: 'in', btn: 'in', cam: 'in', mb: 'pr', prog: 'pr', motor: 'ou', led: 'ou', buz: 'ou', servo: 'ou' }) },
        log: { v: '' },
      },
    });
    F1.put('f1-preview:sample-loaded', true);
  }
  F1.put('f1dt:student', student);
  url.searchParams.delete('sample');
  history.replaceState(null, '', url);
})();
